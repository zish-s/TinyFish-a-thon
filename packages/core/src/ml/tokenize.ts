/**
 * Tokenisation + light normalisation for the triage classifier.
 *
 * Deliberately dependency-free and deterministic: the classifier must run in
 * the browser, in the API, and in the offline test harness with identical
 * results, and the whole model has to be explainable token by token.
 */

export const STOPWORDS = new Set([
  'a', 'about', 'after', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at', 'be', 'been', 'being', 'but',
  'by', 'can', 'could', 'did', 'do', 'does', 'doing', 'dont', 'for', 'from', 'get', 'got', 'had', 'has', 'have',
  'he', 'her', 'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just', 'me',
  'more', 'most', 'my', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'out',
  'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we',
  'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'would', 'you', 'your',
  'yours', 'im', 'ive', 'id', 'ur', 'pls', 'plz', 'thx', 'u', 'r', 'wanna', 'gonna', 'dont', 'doesnt', 'didnt',
  'cant', 'wont', 'isnt', 'wasnt', 'theyre', 'someone', 'somebody', 'thing', 'stuff', 'lot', 'really',
  'very', 'keep', 'like', 'know', 'want', 'need', 'even', 'also', 'still', 'much', 'many', 'make', 'made', 'going',
]);

/**
 * Domain synonym folding. Maps surface forms onto a canonical token so the
 * model does not need thousands of training examples to learn that
 * "pic" and "photograph" mean the same thing.
 */
export const SYNONYMS: Record<string, string> = {
  // identity
  pic: 'photo', pics: 'photo', photo: 'photo', photos: 'photo', photograph: 'photo', photographs: 'photo',
  picture: 'photo', pictures: 'photo', image: 'photo', images: 'photo', video: 'video', videos: 'video', reel: 'video',
  reels: 'video', selfie: 'photo', dp: 'photo',
  // impersonation
  fake: 'fake', imposter: 'impersonation', impersonator: 'impersonation', impersonating: 'impersonation',
  impersonate: 'impersonation', impersonation: 'impersonation', lookalike: 'impersonation', clone: 'impersonation',
  pretending: 'impersonation', posing: 'impersonation', masquerade: 'impersonation',
  // money
  money: 'money', cash: 'money', rupee: 'money', rupees: 'money', rs: 'money', inr: 'money', dollar: 'money',
  dollars: 'money', usd: 'money', eur: 'money', payment: 'money', paid: 'money', pay: 'money', paying: 'money',
  transaction: 'money', transferred: 'money', transfer: 'money', refund: 'money', lost: 'money', amount: 'money',
  // fraud
  scam: 'scam', scammed: 'scam', fraud: 'fraud', fraudster: 'fraud', cheating: 'fraud', cheated: 'fraud',
  swindle: 'fraud', phishing: 'phishing', investment: 'investment', crypto: 'crypto', bitcoin: 'crypto',
  // harassment
  harassment: 'harassment', harassed: 'harassment', harasses: 'harassment', abusing: 'abuse', abuse: 'abuse',
  abused: 'abuse', bullying: 'bully', bully: 'bully', bullied: 'bully', threatening: 'threat', threat: 'threat',
  threatened: 'threat', threats: 'threat', trolling: 'troll', troll: 'troll', abusive: 'abuse', insults: 'insult',
  // doxxing
  address: 'address', dox: 'doxxing', doxxing: 'doxxing', aadhaar: 'aadhaar', adharkart: 'aadhaar',
  idproof: 'idproof', passport: 'idproof', phone: 'phone', phonenumber: 'phone', mobile: 'phone', number: 'phone',
  workplace: 'workplace', office: 'workplace', school: 'school', college: 'college',
  // platforms
  insta: 'instagram', instagram: 'instagram', ig: 'instagram', facebook: 'facebook', fb: 'facebook',
  whatsapp: 'whatsapp', wa: 'whatsapp', twitter: 'twitter', x: 'twitter', linkedin: 'linkedin',
  telegram: 'telegram', youtube: 'youtube', tiktok: 'tiktok', kiktok: 'tiktok', reddit: 'reddit',
  // safety
  minor: 'minor', child: 'child', kids: 'child', kid: 'child', underage: 'minor', schoolgirl: 'child',
  schoolboy: 'child', csam: 'csam', nudes: 'nude', nude: 'nude', naked: 'nude', intimate: 'intimate',
  blackmail: 'blackmail', blackmailing: 'blackmail', extort: 'blackmail', extortion: 'blackmail',
  sextortion: 'sextortion',
  // account
  hacked: 'hacked', hacking: 'hacked', hack: 'hacked', takeover: 'takeover', password: 'password',
  passwords: 'password', otp: 'otp', login: 'login', unauthorized: 'unauthorized', unauthorised: 'unauthorized',
  // misc verbs
  sent: 'sent', messaging: 'message', message: 'message', messages: 'message', commenting: 'message',
  posted: 'post', posting: 'post', post: 'post', posts: 'post', calling: 'call', called: 'call', call: 'call',
  // emotional
  scared: 'scared', afraid: 'scared', threaten: 'threat', dead: 'threat', kill: 'threat',
};

/** Simple suffix stripper - enough to fold plurals/gerunds without a stemmer dep. */
export function stem(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('ing') && token.length > 6) return token.slice(0, -3);
  if (token.endsWith('ied') && token.length > 5) return token.slice(0, -3) + 'y';
  if (token.endsWith('ed') && token.length > 5) return token.slice(0, -2);
  if (token.endsWith('es') && token.length > 5) return token.slice(0, -2);
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 4) return token.slice(0, -1);
  return token;
}

export function normaliseToken(raw: string): string | null {
  let t = raw.toLowerCase();
  t = t.replace(/[^a-z0-9₹@.\-]/g, '');
  if (!t) return null;
  if (STOPWORDS.has(t)) return null;
  if (SYNONYMS[t]) return SYNONYMS[t];
  // try synonym on stem, then stem
  const stemmed = stem(t);
  if (SYNONYMS[stemmed]) return SYNONYMS[stemmed];
  if (stemmed.length < 3) return null;
  return stemmed;
}

export interface Token {
  /** Canonical token used by the model. */
  token: string;
  /** The surface form the user actually wrote (for explanations). */
  surface: string;
  /** 0-based position in the original text. */
  index: number;
}

export function tokenize(text: string): Token[] {
  const out: Token[] = [];
  const re = /[A-Za-z0-9₹@._-]+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const surface = m[0];
    const token = normaliseToken(surface);
    if (token) out.push({ token, surface, index: m.index });
  }
  return out;
}

/** Bigram features: "money lost" is much stronger evidence than either word alone. */
export function bigrams(tokens: Token[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < tokens.length; i += 1) {
    out.push(`${tokens[i].token} ${tokens[i + 1].token}`);
  }
  return out;
}
