import type { ExtractedEntity, EntityType } from '../types.js';

const PLATFORM_WORDS: Record<string, string> = {
  instagram: 'Instagram',
  insta: 'Instagram',
  facebook: 'Facebook',
  fb: 'Facebook',
  whatsapp: 'WhatsApp',
  twitter: 'X (Twitter)',
  x: 'X (Twitter)',
  linkedin: 'LinkedIn',
  telegram: 'Telegram',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  reddit: 'Reddit',
  snapchat: 'Snapchat',
  'amazon flipkart': 'Marketplace',
  amazon: 'Marketplace',
  flipkart: 'Marketplace',
};

const AMOUNT_RE = /((?:₹|\$|£|€|rs\.?|inr|usd|eur|gbp)\s?\d[\d,]*(?:\.\d{1,2})?|\d[\d,]*(?:\.\d{1,2})?\s?(?:rupees|rupiah|rs\.?|inr|dollars?|usd|euros?|eur|pounds?|gbp))/gi;
const URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const EMAIL_RE = /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/gi;
const UPI_RE = /\b[\w.\-]{2,}@(?:ok(?:hdfcbank|icici|axis|sbi|kotak|indus|yesbank|paytm)|ybl|upi|paytm|phonepe|ibl|apl|upiid)\b/gi;
const PHONE_RE = /(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?\d{2,4}[\s.-]?\d{2,4}[\s.-]?\d{2,4})/g;
const HANDLE_RE = /(?<![A-Za-z0-9])@[A-Za-z0-9._]{3,}/g;
const DATE_RE = /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))\b/gi;
const RELATIVE_DATE_RE = /\b(today|yesterday|tonight|last night|last week|this morning|this evening|recently|some days ago|months ago)\b/gi;
const CARD_RE = /\b(?:\d[ -]?){13,19}\b/g;
const AADHAAR_RE = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;

const PLACEHOLDER: Record<EntityType, string> = {
  amount: 'AMOUNT',
  platform: 'PLATFORM',
  url: 'URL',
  phone: 'PHONE',
  email: 'EMAIL',
  upi: 'UPI',
  handle: 'HANDLE',
  date: 'DATE',
  location: 'LOCATION',
  address: 'ADDRESS',
  identity: 'IDENTITY',
  account_number: 'ACCOUNT',
};

export function placeholderFor(type: EntityType, index: number): string {
  return `[${PLACEHOLDER[type]}_${index}]`;
}

function push(list: ExtractedEntity[], type: EntityType, raw: string, value?: string) {
  const trimmed = raw.trim();
  if (!trimmed) return;
  if (list.some((e) => e.type === type && e.value.toLowerCase() === (value ?? trimmed).toLowerCase())) return;
  list.push({ type, value: value ?? trimmed, raw: trimmed });
}

/** Detect obvious money movement, a hard signal for urgency. */
export function detectAmountLost(text: string): number | null {
  const re = new RegExp(AMOUNT_RE.source, 'gi');
  let best: number | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const nums = m[0].match(/\d[\d,]*(?:\.\d{1,2})?/g);
    if (!nums) continue;
    const value = Number(nums[0].replace(/,/g, ''));
    if (Number.isFinite(value) && value > 0 && (best === null || value > best)) best = value;
  }
  return best;
}

export function extractEntities(text: string): ExtractedEntity[] {
  const out: ExtractedEntity[] = [];

  // URLs first: they contain characters that confuse the other patterns.
  for (const m of text.matchAll(URL_RE)) push(out, 'url', m[0]);

  for (const m of text.matchAll(UPI_RE)) push(out, 'upi', m[0], m[0].toLowerCase());
  for (const m of text.matchAll(EMAIL_RE)) {
    if (!out.some((e) => e.type === 'upi' && e.raw === m[0])) push(out, 'email', m[0], m[0].toLowerCase());
  }
  for (const m of text.matchAll(HANDLE_RE)) {
    if (!out.some((e) => e.type === 'upi' && e.raw === m[0].toLowerCase())) {
      push(out, 'handle', m[0], m[0].replace(/^@/, ''));
    }
  }
  for (const m of text.matchAll(CARD_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 13 && digits.length <= 19) push(out, 'account_number', m[0], `****${digits.slice(-4)}`);
  }
  for (const m of text.matchAll(AADHAAR_RE)) {
    if (!out.some((e) => e.type === 'account_number' && e.raw === m[0])) {
      push(out, 'identity', m[0], `XXXX XXXX ${m[0].replace(/\D/g, '').slice(-4)}`);
    }
  }
  for (const m of text.matchAll(AMOUNT_RE)) {
    const nums = m[0].match(/\d[\d,]*(?:\.\d{1,2})?/g);
    const value = nums ? Number(nums[0].replace(/,/g, '')) : 0;
    push(out, 'amount', m[0], Number.isFinite(value) ? String(value) : m[0]);
  }
  for (const m of text.matchAll(PHONE_RE)) {
    const digits = m[0].replace(/\D/g, '');
    if (digits.length >= 10 && digits.length <= 15) push(out, 'phone', m[0], `+${digits.slice(-10)}`);
  }
  for (const m of text.matchAll(DATE_RE)) push(out, 'date', m[0]);
  for (const m of text.matchAll(RELATIVE_DATE_RE)) push(out, 'date', m[0]);

  const lower = text.toLowerCase();
  for (const [key, name] of Object.entries(PLATFORM_WORDS)) {
    const re = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (re.test(lower)) push(out, 'platform', key, name);
  }

  // Location-ish: "in Delhi", "at Koramangala", "from Pune"
  const locRe = /\b(?:in|at|near|from|around)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})/g;
  for (const m of text.matchAll(locRe)) push(out, 'location', m[1], m[1]);

  return out;
}

export function mask(value: string, keep = 2): string {
  const v = value.replace(/\s+/g, ' ').trim();
  if (v.length <= keep * 2) return '*'.repeat(Math.max(v.length, 1));
  return `${v.slice(0, keep)}${'*'.repeat(Math.min(v.length - keep * 2, 8))}${v.slice(-keep)}`;
}
