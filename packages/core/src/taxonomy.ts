import type { IncidentLabel, ChannelKind, ChannelField } from './types.js';

export interface IncidentType {
  id: IncidentLabel;
  name: string;
  blurb: string;
  /** Words that strongly indicate this type. Used by the rule engine. */
  signals: string[];
}

export const INCIDENT_TYPES: IncidentType[] = [
  {
    id: 'impersonation',
    name: 'Impersonation / fake account',
    blurb: 'Someone is using your name, photo or identity on a platform.',
    signals: ['fake', 'impersonat', 'pretend', 'posing', 'lookalike', 'clone', 'my name', 'using my identity'],
  },
  {
    id: 'financial_fraud',
    name: 'Financial fraud / money lost',
    blurb: 'Money was moved, promised, or is being scammed out of you.',
    signals: ['scam', 'fraud', 'money', 'lost', 'paid', 'upi', 'cheque', 'transfer', 'refund', 'investment'],
  },
  {
    id: 'image_misuse',
    name: 'Image / video misuse',
    blurb: 'Your photos or videos were reused without consent (incl. AI/deepfakes).',
    signals: ['photo', 'picture', 'video', 'image', 'deepfake', 'reel', 'meme', 'without my consent', 'photoshopped'],
  },
  {
    id: 'harassment',
    name: 'Harassment / threats / bullying',
    blurb: 'Abusive messages, threats, bullying or sustained targeting.',
    signals: ['harass', 'abuse', 'threatening', 'bully', 'troll', 'trolling', 'comments', 'abusive', 'insult'],
  },
  {
    id: 'hate_speech',
    name: 'Hate speech / identity attack',
    blurb: 'Attacks targeting your religion, caste, gender, disability or community.',
    signals: ['slur', 'racist', 'casteist', 'hate', 'communal', 'sexist', 'religious', 'disabled', 'phobe'],
  },
  {
    id: 'stalking',
    name: 'Stalking / real-time location',
    blurb: 'Being followed, tracked, or located in real time.',
    signals: ['following', 'tracking', 'location', 'gps', 'spotted', 'showed up', 'route', 'where i live'],
  },
  {
    id: 'doxxing',
    name: 'Personal information exposure (doxxing)',
    blurb: 'Your home address, ID, phone, workplace or family details were published.',
    signals: ['address', 'dox', 'published my', 'phone number', 'home', 'workplace', 'aadhaar', 'pan card', 'id proof'],
  },
  {
    id: 'misinformation',
    name: 'Misinformation / fake news about you',
    blurb: 'False stories are circulating that you did not do.',
    signals: ['fake news', 'rumour', 'rumor', 'misleading', 'false information', 'viral video', 'wrongly accused'],
  },
  {
    id: 'defamation',
    name: 'Defamation / reputational harm',
    blurb: 'Statements that damage your reputation, profession or standing.',
    signals: ['defam', 'reputation', 'maligned', 'called me', 'spread lies', 'ruined my', 'my business'],
  },
  {
    id: 'child_safety',
    name: 'Child safety',
    blurb: 'A minor is involved, or child sexual abuse material is involved.',
    signals: ['child', 'minor', 'kid', 'underage', 'school', 'student', 'csam', 'nudity of'],
  },
  {
    id: 'account_takeover',
    name: 'Account takeover / hacking',
    blurb: 'Someone got into your account, email or phone.',
    signals: ['hacked', 'hacking', 'takeover', 'account access', 'unknown login', 'password', 'otp', 'my email was'],
  },
  {
    id: 'sextortion',
    name: 'Sextortion / blackmail',
    blurb: 'Intimate content or private data is being used to blackmail you.',
    signals: ['blackmail', 'sextort', 'intimate', 'nude', 'nudes', 'private photos', 'leak unless', 'extort'],
  },
  {
    id: 'counterfeit',
    name: 'Counterfeit goods / fake business',
    blurb: 'Counterfeit products, fake jobs, fake business or impersonation of a brand.',
    signals: ['counterfeit', 'fake product', 'duplicate', 'bootleg', 'replica', 'fake job', 'fake invoice'],
  },
  {
    id: 'romance_scam',
    name: 'Romance / relationship scam',
    blurb: 'A relationship that turned out to be a financial or identity fraud.',
    signals: ['boyfriend', 'girlfriend', 'online relationship', 'dating', 'catfish', 'never met', 'love'],
  },
];

export const LABEL_NAMES: Record<IncidentLabel, string> = Object.fromEntries(
  INCIDENT_TYPES.map((t) => [t.id, t.name]),
) as Record<IncidentLabel, string>;

/** Platforms a report can be filed on. */
export interface PlatformChannelDef {
  id: string;
  name: string;
  kind: ChannelKind;
  /** Domains we trust to be the platform's own reporting surface. */
  domains: string[];
  /** Search query used to discover the live reporting page. */
  discoveryQuery: string;
  /** Why this platform matters, shown to the user. */
  purpose: string;
  /** Typical fields the platform asks for. */
  fields: ChannelField[];
  slaHours: number | null;
  slaNote: string;
  requiresLogin: boolean;
}

export const PLATFORM_CHANNELS: PlatformChannelDef[] = [
  {
    id: 'instagram',
    name: 'Instagram',
    kind: 'platform',
    domains: ['instagram.com', 'help.instagram.com', 'report.instagram.com'],
    discoveryQuery: 'Instagram official report account impersonation hacked help page',
    purpose: 'Remove the fake or abusive account or post from the platform itself.',
    fields: [
      { name: 'username', label: 'Username / profile link', required: true, kind: 'text' },
      { name: 'category', label: 'Report category', required: true, kind: 'select', options: ['Impersonation', 'Hacked account', 'Harassment', 'Scam / Fraud'] },
      { name: 'details', label: 'What happened', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Platform review queues usually move within 24-72h; preserve the link now.',
    requiresLogin: true,
  },
  {
    id: 'facebook',
    name: 'Facebook',
    kind: 'platform',
    domains: ['facebook.com', 'help.instagram.com', 'www.facebook.com'],
    discoveryQuery: 'Facebook official report fake profile impersonation form',
    purpose: 'Get the profile or content taken down on Facebook.',
    fields: [
      { name: 'profile_url', label: 'Profile link', required: true, kind: 'text' },
      { name: 'category', label: 'What is the problem', required: true, kind: 'select', options: ['Impersonation', 'Scam', 'Harassment'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Facebook escalates repeat offenders faster; report once with full evidence.',
    requiresLogin: true,
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp',
    kind: 'platform',
    domains: ['whatsapp.com', 'faq.whatsapp.com'],
    discoveryQuery: 'WhatsApp official report spam scam abuse contact support',
    purpose: 'Report the account sending the abuse or scam messages.',
    fields: [
      { name: 'number', label: 'Phone number (+country code)', required: true, kind: 'tel' },
      { name: 'category', label: 'Issue type', required: true, kind: 'select', options: ['Spam', 'Scam', 'Harassment', 'Impersonation'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Block + report together; a blocked report is still processed by WhatsApp.',
    requiresLogin: true,
  },
  {
    id: 'x',
    name: 'X (Twitter)',
    kind: 'platform',
    domains: ['help.x.com', 'x.com', 'support.twitter.com', 'twitter.com'],
    discoveryQuery: 'X Twitter official report impersonation safety form',
    purpose: 'Report impersonation, harassment or spam on X.',
    fields: [
      { name: 'post_url', label: 'Post / profile link', required: true, kind: 'text' },
      { name: 'category', label: 'Issue', required: true, kind: 'select', options: ['Impersonation', 'Harassment', 'Sensitive media'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'X de-lists verified impersonators faster when reported with a link.',
    requiresLogin: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    kind: 'platform',
    domains: ['linkedin.com', 'www.linkedin.com'],
    discoveryQuery: 'LinkedIn official report fake profile impersonation abuse form',
    purpose: 'Report the fake professional profile.',
    fields: [
      { name: 'profile_url', label: 'Profile link', required: true, kind: 'text' },
      { name: 'category', label: 'Issue', required: true, kind: 'select', options: ['Fake profile', 'Harassment', 'Scam'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 72,
    slaNote: 'Professional-profile removals typically take a few days.',
    requiresLogin: true,
  },
  {
    id: 'telegram',
    name: 'Telegram',
    kind: 'platform',
    domains: ['telegram.org', 'www.telegram.org'],
    discoveryQuery: 'Telegram official report spam abuse @support contact form',
    purpose: 'Report the channel, bot or account distributing the abuse.',
    fields: [
      { name: 'target', label: 'Username or channel link', required: true, kind: 'text' },
      { name: 'category', label: 'Issue', required: true, kind: 'select', options: ['Spam', 'Violence', 'Pornography', 'Other'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 48,
    slaNote: 'Telegram reacts faster with a channel/username than a screenshot alone.',
    requiresLogin: false,
  },
  {
    id: 'youtube',
    name: 'YouTube',
    kind: 'platform',
    domains: ['youtube.com', 'support.google.com', 'www.youtube.com'],
    discoveryQuery: 'YouTube official report impersonation harassment video form',
    purpose: 'Report the video or the channel impersonating you or abusing you.',
    fields: [
      { name: 'video_url', label: 'Video / channel link', required: true, kind: 'text' },
      { name: 'category', label: 'Issue', required: true, kind: 'select', options: ['Spam or misleading', 'Harassment or bullying', 'Impersonation', 'Nudity or sexual content'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 72,
    slaNote: 'Video removals usually need the exact URL plus a rights/impersonation claim.',
    requiresLogin: true,
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    kind: 'platform',
    domains: ['tiktok.com', 'www.tiktok.com'],
    discoveryQuery: 'TikTok official report impersonation harassment account form',
    purpose: 'Report the account or video.',
    fields: [
      { name: 'video_url', label: 'Video / profile link', required: true, kind: 'text' },
      { name: 'category', label: 'Issue', required: true, kind: 'select', options: ['Harassment or bullying', 'Impersonation', 'Scam', 'Sexually explicit content'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 72,
    slaNote: 'Report the video, not the account - video-level reports resolve faster.',
    requiresLogin: true,
  },
  {
    id: 'google',
    name: 'Google Account Security',
    kind: 'platform',
    domains: ['support.google.com', 'myaccount.google.com', 'accounts.google.com'],
    discoveryQuery: 'Google official account recovery hacked account support page',
    purpose: 'Regain and secure the email account that the attacker used to operate.',
    fields: [
      { name: 'email', label: 'Account email', required: true, kind: 'email' },
      { name: 'issue', label: 'What happened', required: true, kind: 'select', options: ['Someone else has access', 'I cannot sign in', 'Suspicious activity'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Lock the mailbox first - everything else (password resets, fake invoices) flows from it.',
    requiresLogin: true,
  },
  {
    id: 'email',
    name: 'Email provider abuse desk',
    kind: 'platform',
    domains: ['support.google.com', 'abuse.mail.ru', 'yahoo.com'],
    discoveryQuery: 'email provider official abuse report phishing account compromised form',
    purpose: 'Report the mailbox used to send the abuse or the phishing messages.',
    fields: [
      { name: 'email', label: 'Abusive mailbox', required: true, kind: 'email' },
      { name: 'issue', label: 'Issue', required: true, kind: 'select', options: ['Phishing', 'Account takeover', 'Harassment', 'Spam / scam'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Providers have a legal duty to act on abuse reports for mail they host.',
    requiresLogin: false,
  },
];

/** Official authority / regulator / bank channels. */
export interface AuthorityChannelDef {
  id: string;
  name: string;
  kind: ChannelKind;
  country: string;
  url: string;
  discoveryQuery: string;
  purpose: string;
  fields: ChannelField[];
  slaHours: number | null;
  slaNote: string;
  requiresLogin: boolean;
  /** Minimum severity required to include this channel. */
  minUrgency?: 'any' | 'high' | 'critical';
  /** Labels that make this channel relevant. Empty = relevant to any incident. */
  appliesTo?: IncidentLabel[];
}

export const AUTHORITY_CHANNELS: AuthorityChannelDef[] = [
  {
    id: 'cybercrime_portal',
    name: 'National Cyber Crime Reporting Portal',
    kind: 'authority',
    country: 'IN',
    url: 'https://cybercrime.gov.in/',
    discoveryQuery: 'official national cybercrime reporting portal complaints India cybercrime.gov.in',
    purpose: 'Creates a legal complaint record with a reference number usable by police and courts.',
    fields: [
      { name: 'name', label: 'Complainant name', required: true, kind: 'text' },
      { name: 'email', label: 'Email', required: true, kind: 'email' },
      { name: 'mobile', label: 'Mobile number', required: true, kind: 'tel' },
      { name: 'incident_date', label: 'Date of incident', required: true, kind: 'date' },
      { name: 'description', label: 'What happened', required: true, kind: 'textarea' },
      { name: 'amount', label: 'Amount lost (if any)', required: false, kind: 'text' },
      { name: 'address', label: 'Address / district', required: false, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Financial fraud complaints are triaged fastest; file within 24h for a chance at a freeze.',
    requiresLogin: false,
  },
  {
    id: 'cybercrime_fraud',
    name: 'Cyber Crime Financial Fraud (1930)',
    kind: 'financial',
    country: 'IN',
    url: 'https://cybercrime.gov.in/fraud/',
    discoveryQuery: 'cyber crime financial fraud report 1930 helpline official portal',
    purpose: 'Triggers a bank/payment freeze on money that left your account.',
    fields: [
      { name: 'transaction_id', label: 'Transaction / UTR id', required: false, kind: 'text' },
      { name: 'amount', label: 'Amount lost', required: true, kind: 'text' },
      { name: 'beneficiary', label: 'Beneficiary / receiving account details', required: true, kind: 'text' },
      { name: 'description', label: 'What happened', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Money can usually only be frozen if reported within 24 hours of the transaction.',
    requiresLogin: false,
  },
  {
    id: 'bank_fraud',
    name: 'Your bank / card issuer fraud cell',
    kind: 'financial',
    country: 'IN',
    url: 'https://www.rbi.org.in/',
    discoveryQuery: 'RBI ombudsman fraud complaint official card issuer fraud cell India',
    purpose: 'Disputes the transaction with the bank and blocks your card/credentials.',
    fields: [
      { name: 'account_last4', label: 'Card / account last 4 digits', required: true, kind: 'text' },
      { name: 'amount', label: 'Amount', required: true, kind: 'text' },
      { name: 'description', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Card issuer fraud cells answer fastest in the first 24-48 hours.',
    requiresLogin: true,
  },
  {
    id: 'local_police',
    name: 'Local police / cyber cell (FIR)',
    kind: 'authority',
    country: 'IN',
    url: 'https://www.mha.gov.in/',
    discoveryQuery: 'official cyber cell FIR online complaint India state police cybercrime',
    purpose: 'Creates a First Information Report - required for a court case, insurance or bank claim.',
    fields: [
      { name: 'name', label: 'Name', required: true, kind: 'text' },
      { name: 'mobile', label: 'Mobile', required: true, kind: 'tel' },
      { name: 'address', label: 'Address', required: true, kind: 'textarea' },
      { name: 'description', label: 'Narrative of the incident', required: true, kind: 'textarea' },
      { name: 'incident_date', label: 'Date of incident', required: true, kind: 'date' },
    ],
    slaHours: 24,
    slaNote: 'Money lost, threats and cases involving a minor need an FIR, not just a portal complaint.',
    requiresLogin: false,
  },
  {
    id: 'women_commission',
    name: 'National / State Commission for Women',
    kind: 'authority',
    country: 'IN',
    url: 'https://ncw.nic.in/',
    discoveryQuery: 'National Commission for Women official complaint portal India ncw.nic.in',
    purpose: 'Handles harassment, stalking and dowry-related complaints against women.',
    fields: [
      { name: 'name', label: 'Name', required: true, kind: 'text' },
      { name: 'email', label: 'Email', required: true, kind: 'text' },
      { name: 'mobile', label: 'Mobile', required: true, kind: 'tel' },
      { name: 'description', label: 'Complaint', required: true, kind: 'textarea' },
    ],
    slaHours: 72,
    slaNote: 'NCW takes up to a few weeks; file in parallel, not instead of, the police complaint.',
    requiresLogin: false,
  },
  {
    id: 'police_women_helpline',
    name: 'Police Women Helpline 181 / 1090',
    kind: 'support',
    country: 'IN',
    url: 'https://www.mha.gov.in/',
    discoveryQuery: 'official police women helpline 181 1090 India cybercrime helpline 1930',
    purpose: 'Immediate, operator-assisted help for harassment, stalking and threats.',
    fields: [{ name: 'mobile', label: 'Callback number', required: true, kind: 'tel' }],
    slaHours: 0,
    slaNote: 'A phone call, not a form - use the number and note the call in the evidence log.',
    requiresLogin: false,
  },
  {
    id: 'ncmec',
    name: 'Child safety reporting (NCMEC / Take It Down)',
    kind: 'authority',
    country: 'GLOBAL',
    url: 'https://report.cybertip.org/',
    discoveryQuery: 'NCMEC CyberTIC official report child sexual exploitation Take It Down official site',
    purpose: 'Removes child sexual abuse material and escalates to law enforcement worldwide.',
    fields: [
      { name: 'description', label: 'Description', required: true, kind: 'textarea' },
      { name: 'url', label: 'URL of the content', required: true, kind: 'text' },
    ],
    slaHours: 24,
    slaNote: 'CSAM content must be reported immediately; platforms are legally required to act on it.',
    requiresLogin: false,
  },
  {
    id: 'cert_ind',
    name: 'CERT-In',
    kind: 'authority',
    country: 'IN',
    url: 'https://www.cert-in.org.in/',
    discoveryQuery: 'CERT-In official report incident India cert-in.org.in contact',
    purpose: 'Escalates serious hacking or financial-fraud incidents to the national CERT.',
    fields: [
      { name: 'name', label: 'Name', required: true, kind: 'text' },
      { name: 'email', label: 'Email', required: true, kind: 'text' },
      { name: 'description', label: 'Technical details', required: true, kind: 'textarea' },
    ],
    slaHours: 48,
    slaNote: 'CERT-In acts on sustained campaigns and hacks, not on single complaints.',
    requiresLogin: false,
  },
];

/**
 * International, jurisdiction-neutral channels.
 *
 * Two families matter for the "harm is not over when the report is filed" problem:
 *  - PRE-EMPTIVE: you register your photo/video/identity FIRST; the service
 *    monitors the open web and takes the content down the moment it appears
 *    (including AI-morphed copies).
 *  - DE-INDEXING: you ask search engines to drop the URLs that host the harm,
 *    which removes the discovery path even if the host itself is slow.
 */
export const PROTECTION_CHANNELS: AuthorityChannelDef[] = [
  {
    id: 'take_it_down',
    name: 'NCMEC Take It Down',
    kind: 'protection',
    country: 'GLOBAL',
    url: 'https://takeitdown.ncmec.org/',
    discoveryQuery: 'NCMEC Take It Down official site remove AI generated images including morphed',
    purpose: 'You upload a photo or video; NCMEC removes it and any AI-morphed copy of it across platforms, and files reports to law enforcement.',
    fields: [
      { name: 'upload', label: 'Upload the image or video', required: true, kind: 'file' },
      { name: 'details', label: 'Details of the abuse', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Take It Down is specifically built to catch AI-generated and morphed images, and it acts on uploads within 24 hours.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['child_safety', 'sextortion', 'image_misuse'],
  },
  {
    id: 'takedown_ccri',
    name: 'Takedown (CCRI)',
    kind: 'protection',
    country: 'GLOBAL',
    url: 'https://takedown.ca/',
    discoveryQuery: 'Takedown CCRI Canada official remove intimate images including deepfake morphed',
    purpose: 'Upload once; Takedown monitors hundreds of sites and platforms and removes every copy, including AI-morphed versions, plus the search results that point to them.',
    fields: [
      { name: 'upload', label: 'Upload the image or video', required: true, kind: 'file' },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Removal of the first copy usually starts within 24 hours and continues for up to a year.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['sextortion', 'image_misuse'],
  },
  {
    id: 'stopncci',
    name: 'StopNCII',
    kind: 'protection',
    country: 'GLOBAL',
    url: 'https://stopncii.org/',
    discoveryQuery: 'StopNCII official site hash based removal AI morphed images platforms',
    purpose: 'Creates a cryptographic hash of your content. Platforms that have joined the network remove the content - and morphed versions of it - without ever storing the file.',
    fields: [{ name: 'upload', label: 'Upload the content to be hashed', required: true, kind: 'file' }],
    slaHours: 24,
    slaNote: 'Hash matching also removes re-uploads of the same content later.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['sextortion', 'image_misuse', 'child_safety'],
  },
  {
    id: 'removeher',
    name: 'RemoveHer',
    kind: 'protection',
    country: 'GLOBAL',
    url: 'https://removeher.org/',
    discoveryQuery: 'RemoveHer official site remove non consensual intimate images deepfake',
    purpose: 'Removes non-consensual intimate images - including deepfakes and morphed videos - from over a hundred sites in one submission.',
    fields: [
      { name: 'upload', label: 'Upload the image or video', required: true, kind: 'file' },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 48,
    slaNote: 'Covers 100+ sites, including the ones that reshare leaked content.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['sextortion', 'image_misuse'],
  },
  {
    id: 'c2pa',
    name: 'Content Credentials (C2PA) - sign your images',
    kind: 'protection',
    country: 'GLOBAL',
    url: 'https://contentcredentials.org/',
    discoveryQuery: 'C2PA Content Credentials official sign images provenance AI generated detect',
    purpose: 'Attaches verifiable provenance to your images, so a morphed copy of your photo can be traced back to the manipulation.',
    fields: [{ name: 'upload', label: 'Image to sign', required: true, kind: 'file' }],
    slaHours: 0,
    slaNote: 'A one-time defensive act that makes every future copy provably fake.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['image_misuse', 'misinformation'],
  },
  {
    id: 'google_url_removal',
    name: 'Google - request removal of a URL',
    kind: 'support',
    country: 'GLOBAL',
    url: 'https://support.google.com/websearch/workflow/9308722',
    discoveryQuery: 'Google official request removal of a URL search results support workflow',
    purpose: 'Removes the harm from Google Search results, which is usually how a leaked photo or a fake profile is found in the first place.',
    fields: [
      { name: 'url', label: 'URL to remove', required: true, kind: 'text' },
      { name: 'reason', label: 'Reason', required: true, kind: 'select', options: ['Personal information / doxxing', 'Sexually explicit content', 'Harassment', 'Deceptive or harmful content', 'Copyright'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 72,
    slaNote: 'De-indexing usually lands within a few days and is the fastest way to shrink the blast radius.',
    requiresLogin: true,
    minUrgency: 'any',
    appliesTo: ['doxxing', 'image_misuse', 'sextortion', 'child_safety'],
  },
  {
    id: 'bing_url_removal',
    name: 'Bing - request removal of a URL',
    kind: 'support',
    country: 'GLOBAL',
    url: 'https://www.bing.com/webmasters/help/remove-a-url-from-bing-index-6f3a6f1f',
    discoveryQuery: 'Bing official remove URL from index webmaster form',
    purpose: 'Same as Google but for Bing, Copilot and the Microsoft search surface.',
    fields: [
      { name: 'url', label: 'URL to remove', required: true, kind: 'text' },
      { name: 'reason', label: 'Reason', required: true, kind: 'select', options: ['Personal information', 'Sexually explicit content', 'Deceptive content'] },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 72,
    slaNote: 'Bing removal also covers answers surfaced by Microsoft Copilot.',
    requiresLogin: true,
    minUrgency: 'any',
    appliesTo: ['doxxing', 'image_misuse', 'sextortion', 'child_safety'],
  },
  {
    id: 'data_broker_removal',
    name: 'Data broker / people-search opt-out',
    kind: 'protection',
    country: 'GLOBAL',
    url: 'https://tldp.org/',
    discoveryQuery: 'official people search data broker opt out removal request site',
    purpose: 'Removes your address, phone and relatives from the people-search sites that fuel doxxing and stalking.',
    fields: [
      { name: 'url', label: 'Listing URL(s)', required: true, kind: 'text' },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 168,
    slaNote: 'Removal takes days to weeks, and new listings appear - so it must be re-armed periodically.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['doxxing', 'stalking'],
  },
  {
    id: 'hibp',
    name: 'Have I Been Pwned',
    kind: 'support',
    country: 'GLOBAL',
    url: 'https://haveibeenpwned.com/',
    discoveryQuery: 'Have I Been Pwned official breach notification domain monitoring',
    purpose: 'Tells you whether your email or phone leaked in a breach, which is how attackers seed the follow-up scam.',
    fields: [{ name: 'email', label: 'Email / phone to check', required: true, kind: 'email' }],
    slaHours: 0,
    slaNote: 'Instant. Read it first: it explains the shape of the attack that follows.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['account_takeover', 'financial_fraud'],
  },
  {
    id: 'adult_platforms',
    name: 'Host platforms where NCII spreads',
    kind: 'platform',
    country: 'GLOBAL',
    url: 'https://help.x.com/en/rules-and-policies',
    discoveryQuery: 'official abuse report form adult site Pornhub XVideos abuse desk',
    purpose: 'Reports the account that uploaded the leaked or morphed content to the host platform itself.',
    fields: [
      { name: 'url', label: 'URL of the content', required: true, kind: 'text' },
      { name: 'details', label: 'Details', required: true, kind: 'textarea' },
    ],
    slaHours: 24,
    slaNote: 'Host platforms have the fastest legal duty to act on NCII and morphed content.',
    requiresLogin: false,
    minUrgency: 'any',
    appliesTo: ['sextortion', 'child_safety'],
  },
];

/**
 * Indian cities and districts, mapped to the state whose police and state
 * commissions have jurisdiction over them.
 *
 * Why this matters: a First Information Report can only be registered by the
 * local station, and a State Women's Commission is a different body from the
 * national one. So the plan has to know which state the complainant is in -
 * otherwise the advice is "report to the police" without saying which police.
 */
export const INDIA_LOCATIONS: Record<string, { state: string; stateCode: string }> = {
  delhi: { state: 'Delhi', stateCode: 'DL' },
  gurugram: { state: 'Haryana', stateCode: 'HR' },
  gurgaon: { state: 'Haryana', stateCode: 'HR' },
  faridabad: { state: 'Haryana', stateCode: 'HR' },
  panipat: { state: 'Haryana', stateCode: 'HR' },
  karnal: { state: 'Haryana', stateCode: 'HR' },
  hisar: { state: 'Haryana', stateCode: 'HR' },
  rohtak: { state: 'Haryana', stateCode: 'HR' },
  sonipat: { state: 'Haryana', stateCode: 'HR' },
  ambala: { state: 'Haryana', stateCode: 'HR' },
  mumbai: { state: 'Maharashtra', stateCode: 'MH' },
  pune: { state: 'Maharashtra', stateCode: 'MH' },
  nashik: { state: 'Maharashtra', stateCode: 'MH' },
  thane: { state: 'Maharashtra', stateCode: 'MH' },
  navimumbai: { state: 'Maharashtra', stateCode: 'MH' },
  pimpri: { state: 'Maharashtra', stateCode: 'MH' },
  nagpur: { state: 'Maharashtra', stateCode: 'MH' },
  kolhapur: { state: 'Maharashtra', stateCode: 'MH' },
  aurangabad: { state: 'Maharashtra', stateCode: 'MH' },
  solapur: { state: 'Maharashtra', stateCode: 'MH' },
  bengaluru: { state: 'Karnataka', stateCode: 'KA' },
  bangalore: { state: 'Karnataka', stateCode: 'KA' },
  mysore: { state: 'Karnataka', stateCode: 'KA' },
  mangaluru: { state: 'Karnataka', stateCode: 'KA' },
  hubballi: { state: 'Karnataka', stateCode: 'KA' },
  belagavi: { state: 'Karnataka', stateCode: 'KA' },
  dharwad: { state: 'Karnataka', stateCode: 'KA' },
  hyderabad: { state: 'Telangana', stateCode: 'TS' },
  secunderabad: { state: 'Telangana', stateCode: 'TS' },
  warangal: { state: 'Telangana', stateCode: 'TS' },
  guntur: { state: 'Andhra Pradesh', stateCode: 'AP' },
  visakhapatnam: { state: 'Andhra Pradesh', stateCode: 'AP' },
  vijayawada: { state: 'Andhra Pradesh', stateCode: 'AP' },
  nellore: { state: 'Andhra Pradesh', stateCode: 'AP' },
  tirupati: { state: 'Andhra Pradesh', stateCode: 'AP' },
  chennai: { state: 'Tamil Nadu', stateCode: 'TN' },
  coimbatore: { state: 'Tamil Nadu', stateCode: 'TN' },
  madurai: { state: 'Tamil Nadu', stateCode: 'TN' },
  tiruchirappalli: { state: 'Tamil Nadu', stateCode: 'TN' },
  trichy: { state: 'Tamil Nadu', stateCode: 'TN' },
  salem: { state: 'Tamil Nadu', stateCode: 'TN' },
  tiruppur: { state: 'Tamil Nadu', stateCode: 'TN' },
  erode: { state: 'Tamil Nadu', stateCode: 'TN' },
  vellore: { state: 'Tamil Nadu', stateCode: 'TN' },
  thanjavur: { state: 'Tamil Nadu', stateCode: 'TN' },
  kolkata: { state: 'West Bengal', stateCode: 'WB' },
  howrah: { state: 'West Bengal', stateCode: 'WB' },
  siliguri: { state: 'West Bengal', stateCode: 'WB' },
  asansol: { state: 'West Bengal', stateCode: 'WB' },
  bardhaman: { state: 'West Bengal', stateCode: 'WB' },
  patna: { state: 'Bihar', stateCode: 'BR' },
  gaya: { state: 'Bihar', stateCode: 'BR' },
  muzaffarpur: { state: 'Bihar', stateCode: 'BR' },
  lucknow: { state: 'Uttar Pradesh', stateCode: 'UP' },
  noida: { state: 'Uttar Pradesh', stateCode: 'UP' },
  kanpur: { state: 'Uttar Pradesh', stateCode: 'UP' },
  agra: { state: 'Uttar Pradesh', stateCode: 'UP' },
  varanasi: { state: 'Uttar Pradesh', stateCode: 'UP' },
  prayagraj: { state: 'Uttar Pradesh', stateCode: 'UP' },
  allahabad: { state: 'Uttar Pradesh', stateCode: 'UP' },
  meerut: { state: 'Uttar Pradesh', stateCode: 'UP' },
  ghaziabad: { state: 'Uttar Pradesh', stateCode: 'UP' },
  moradabad: { state: 'Uttar Pradesh', stateCode: 'UP' },
  bareilly: { state: 'Uttar Pradesh', stateCode: 'UP' },
  saharanpur: { state: 'Uttar Pradesh', stateCode: 'UP' },
  aligarh: { state: 'Uttar Pradesh', stateCode: 'UP' },
  jaipur: { state: 'Rajasthan', stateCode: 'RJ' },
  jodhpur: { state: 'Rajasthan', stateCode: 'RJ' },
  udaipur: { state: 'Rajasthan', stateCode: 'RJ' },
  kota: { state: 'Rajasthan', stateCode: 'RJ' },
  ajmer: { state: 'Rajasthan', stateCode: 'RJ' },
  ahmedabad: { state: 'Gujarat', stateCode: 'GJ' },
  surat: { state: 'Gujarat', stateCode: 'GJ' },
  vadodara: { state: 'Gujarat', stateCode: 'GJ' },
  rajkot: { state: 'Gujarat', stateCode: 'GJ' },
  bhopal: { state: 'Madhya Pradesh', stateCode: 'MP' },
  indore: { state: 'Madhya Pradesh', stateCode: 'MP' },
  gwalior: { state: 'Madhya Pradesh', stateCode: 'MP' },
  jabalpur: { state: 'Madhya Pradesh', stateCode: 'MP' },
  raipur: { state: 'Chhattisgarh', stateCode: 'CG' },
  bhilai: { state: 'Chhattisgarh', stateCode: 'CG' },
  bhubaneswar: { state: 'Odisha', stateCode: 'OD' },
  cuttack: { state: 'Odisha', stateCode: 'OD' },
  rourkela: { state: 'Odisha', stateCode: 'OD' },
  ranchi: { state: 'Jharkhand', stateCode: 'JH' },
  jamshedpur: { state: 'Jharkhand', stateCode: 'JH' },
  dhanbad: { state: 'Jharkhand', stateCode: 'JH' },
  bokaro: { state: 'Jharkhand', stateCode: 'JH' },
  guwahati: { state: 'Assam', stateCode: 'AS' },
  dibrugarh: { state: 'Assam', stateCode: 'AS' },
  jorhat: { state: 'Assam', stateCode: 'AS' },
  shillong: { state: 'Meghalaya', stateCode: 'ML' },
  imphal: { state: 'Manipur', stateCode: 'MN' },
  kohima: { state: 'Nagaland', stateCode: 'NL' },
  aizawl: { state: 'Mizoram', stateCode: 'MZ' },
  itanagar: { state: 'Arunachal Pradesh', stateCode: 'AR' },
  gangtok: { state: 'Sikkim', stateCode: 'SK' },
  srinagar: { state: 'Jammu and Kashmir', stateCode: 'JK' },
  jammu: { state: 'Jammu and Kashmir', stateCode: 'JK' },
  chandigarh: { state: 'Chandigarh', stateCode: 'CH' },
  ludhiana: { state: 'Punjab', stateCode: 'PB' },
  amritsar: { state: 'Punjab', stateCode: 'PB' },
  jalandhar: { state: 'Punjab', stateCode: 'PB' },
  patiala: { state: 'Punjab', stateCode: 'PB' },
  dehradun: { state: 'Uttarakhand', stateCode: 'UK' },
  haridwar: { state: 'Uttarakhand', stateCode: 'UK' },
  shimla: { state: 'Himachal Pradesh', stateCode: 'HP' },
  thiruvananthapuram: { state: 'Kerala', stateCode: 'KL' },
  kochi: { state: 'Kerala', stateCode: 'KL' },
  thrissur: { state: 'Kerala', stateCode: 'KL' },
  kannur: { state: 'Kerala', stateCode: 'KL' },
  malappuram: { state: 'Kerala', stateCode: 'KL' },
  kozhikode: { state: 'Kerala', stateCode: 'KL' },
  portblair: { state: 'Andaman and Nicobar Islands', stateCode: 'AN' },
};

export interface LocationMatch {
  city: string;
  state: string;
  stateCode: string;
}

/** Finds the state that has jurisdiction over a city, if we know it. */
export function lookupLocation(city?: string): LocationMatch | null {
  if (!city) return null;
  const key = city.toLowerCase().replace(/[^a-z]/g, '');
  if (!key) return null;
  if (INDIA_LOCATIONS[key]) {
    return { city, state: INDIA_LOCATIONS[key].state, stateCode: INDIA_LOCATIONS[key].stateCode };
  }
  for (const [name, value] of Object.entries(INDIA_LOCATIONS)) {
    if (key.startsWith(name) || name.startsWith(key)) {
      return { city, state: value.state, stateCode: value.stateCode };
    }
  }
  return null;
}

/** Jurisdiction-specific emergency guidance surfaced to the user. */
export const EMERGENCY_BY_COUNTRY: Record<string, { police: string; cyber: string; note: string }> = {
  IN: { police: '112', cyber: '1930 (cyber financial fraud) / 1090 (women & children)', note: 'Dial 112 for imminent danger.' },
  US: { police: '911', cyber: 'IC3 (ic3.gov) / 2022 (identity theft)', note: 'For identity theft also file with the FTC at identitytheft.gov.' },
  GB: { police: '999', cyber: 'Action Fraud 0300 123 1200', note: 'Report to the platform first if the account is yours to lock.' },
  AU: { police: '000', cyber: 'Scamwatch / ReportCyber', note: 'eSafety covers image-based abuse.' },
  CA: { police: '911', cyber: 'RCMP / Canadian Anti-Fraud Centre', note: 'Contact your bank first for pending transactions.' },
  GLOBAL: { police: 'Local emergency number', cyber: 'National cybercrime reporting portal', note: '' },
};

export function labelName(label: IncidentLabel): string {
  return LABEL_NAMES[label] ?? label;
}

/** Domains we know belong to a channel, used to score live search results. */
export function knownDomainsFor(channelId: string): string[] {
  const platform = PLATFORM_CHANNELS.find((p) => p.id === channelId);
  if (platform) return platform.domains;
  const authority = [...AUTHORITY_CHANNELS, ...PROTECTION_CHANNELS].find((a) => a.id === channelId);
  if (authority) {
    try {
      return [new URL(authority.url).hostname.replace(/^www\./, '')];
    } catch {
      return [];
    }
  }
  return [];
}

/** The live search query used to discover a channel's current reporting page. */
export function discoveryQueryFor(channelId: string, channelName: string): string {
  const known: Record<string, string> = {
    instagram: 'Instagram official help report impersonation hacked account form',
    facebook: 'Facebook official report fake profile impersonation help page',
    whatsapp: 'WhatsApp official report spam scam abuse contact support form',
    x: 'X Twitter official report impersonation safety page',
    linkedin: 'LinkedIn official report fake profile impersonation abuse form',
    telegram: 'Telegram official report spam abuse support contact form',
    youtube: 'YouTube official report impersonation harassment video form',
    tiktok: 'TikTok official report impersonation harassment form',
    google: 'Google official account recovery hacked account support',
    email: 'email provider official abuse report phishing form',
    cybercrime_portal: 'National Cyber Crime Reporting Portal official India cybercrime.gov.in report complaint',
    cybercrime_fraud: 'official cyber financial fraud reporting portal India 1930 helpline',
    bank_fraud: 'RBI official ombudsman fraud complaint card issuer India',
    local_police: 'official cyber cell FIR complaint India state police cybercrime',
    women_commission: 'National Commission for Women official complaint portal India',
    police_women_helpline: 'official police women helpline 181 1090 India cybercrime helpline 1930',
    ncmec: 'NCMEC CyberTIC official report child sexual exploitation',
    cert_ind: 'CERT-In official report incident India contact',
    take_it_down: 'NCMEC Take It Down official remove AI morphed images',
    takedown_ccri: 'Takedown CCRI official remove intimate images deepfake',
    stopncci: 'StopNCII official hash based removal AI morphed content',
    removeher: 'RemoveHer official remove non consensual intimate images',
    c2pa: 'C2PA Content Credentials official sign images provenance',
    google_url_removal: 'Google official request removal of a URL search results form',
    bing_url_removal: 'Bing official remove URL from index webmaster form',
    data_broker_removal: 'official people search data broker opt out removal request',
    hibp: 'Have I Been Pwned official check breached account',
    adult_platforms: 'official abuse report form adult platform image removal',
  };
  return known[channelId] ?? `official report abuse form for ${channelName}`;
}

export function getIncidentType(id: IncidentLabel): IncidentType | undefined {
  return INCIDENT_TYPES.find((t) => t.id === id);
}
