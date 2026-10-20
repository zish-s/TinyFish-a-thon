import type { Redaction } from '../types.js';
import { mask, placeholderFor } from './entities.js';

/**
 * Privacy-by-default redaction.
 *
 * Everything the victim types is useful to the classifier, but a lot of it is
 * dangerous to hand to a form automatically (address, Aadhaar, bank account).
 * So we keep two views of the incident:
 *   - the raw text, used locally for triage;
 *   - the redacted text, used for any text we send to a model, a shareable
 *     summary, or a portal the user has not explicitly unlocked.
 */

interface Rule {
  type: Redaction['type'];
  regex: RegExp;
  /** Higher wins when two rules match overlapping text. */
  priority: number;
  maskValue?: (m: RegExpMatchArray) => string;
  /** Reject a match (returns false) - used to keep phone numbers out of amounts. */
  validate?: (m: RegExpMatchArray) => boolean;
}

const digitCount = (value: string) => value.replace(/\D/g, '').length;

const RULES: Rule[] = [
  {
    type: 'email',
    regex: /\b[\w.+-]+@[\w-]+\.[\w.-]{2,}\b/g,
    priority: 90,
  },
  {
    type: 'upi',
    regex: /\b[\w.\-]{2,}@(?:ok(?:hdfcbank|icici|axis|sbi|kotak|indus|yesbank|paytm)|ybl|upi|paytm|phonepe|ibl|apl|upiid)\b/gi,
    priority: 92,
  },
  {
    type: 'account_number',
    regex: /\b(?:\d[ -]?){13,19}\b/g,
    priority: 80,
    validate: (m) => digitCount(m[0]) >= 13 && digitCount(m[0]) <= 19,
    maskValue: (m) => `****${m[0].replace(/\D/g, '').slice(-4)}`,
  },
  {
    type: 'identity',
    regex: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
    priority: 85,
    maskValue: (m) => `XXXX XXXX ${m[0].replace(/\D/g, '').slice(-4)}`,
  },
  {
    type: 'amount',
    regex: /(?:₹|\$|£|€|rs\.?|inr|usd|eur|gbp)\s?\d[\d,]*(?:\.\d{1,2})?|\b\d[\d,]*(?:\.\d{1,2})?\s?(?:rupees|rupiah|rs\.?|inr|dollars?|usd|euros?|eur|pounds?|gbp)\b/gi,
    priority: 78,
  },
  {
    type: 'phone',
    regex: /(?:\+\d{1,3}[\s.-]?)?\b\d{1,3}(?:[\s.-]\d{2,5}){1,4}\b/g,
    priority: 70,
    validate: (m) => {
      const d = digitCount(m[0]);
      return d >= 10 && d <= 15;
    },
  },
  {
    type: 'address',
    regex: /\b(?:my address is|i live at|lives at|residing at|resides at|address[:\s-]+|stay(?:ing)? at|shifted to)\s+([^.;\n]{6,80})/gi,
    priority: 60,
  },
  {
    type: 'identity',
    regex: /\b(?:my name is|i am|i'm|this is|name[:\s-]+)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})\b/g,
    priority: 55,
    maskValue: (m) => m[1] ?? m[0],
  },
  {
    type: 'date',
    regex: /\b(?:date of birth|dob|born on)\b[:\s-]*([0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}|[0-9]{1,2}\s+\w+\s+[0-9]{4})/gi,
    priority: 58,
  },
  {
    type: 'location',
    regex: /\b(?:location|city|district|pincode|pin code|postcode)\b[:\s-]+([^\n.;]{4,60})/gi,
    priority: 50,
  },
];

export function redact(text: string): { text: string; redactions: Redaction[] } {
  interface Span {
    start: number;
    end: number;
    type: Redaction['type'];
    preview: string;
    priority: number;
  }

  const spans: Span[] = [];

  for (const rule of RULES) {
    const re = new RegExp(rule.regex.source, rule.regex.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m[0].length === 0) {
        re.lastIndex += 1;
        continue;
      }
      const inner = m[1];
      if (rule.validate && !rule.validate(m)) continue;
      const start = inner && m[0].startsWith(inner) ? m.index + m[0].indexOf(inner) : m.index;
      const value = inner ?? m[0];
      spans.push({
        start,
        end: start + value.length,
        type: rule.type,
        preview: rule.maskValue ? rule.maskValue(m) : mask(value),
        priority: rule.priority,
      });
    }
  }

  // Resolve overlaps: highest priority wins, then longest.
  spans.sort((a, b) => b.priority - a.priority || b.end - b.start - (a.end - a.start));
  const accepted: Span[] = [];
  for (const span of spans) {
    if (accepted.some((s) => span.start < s.end && span.end > s.start)) continue;
    accepted.push(span);
  }
  accepted.sort((a, b) => a.start - b.start);

  const counters = new Map<string, number>();
  const redactions: Redaction[] = [];
  let out = '';
  let cursor = 0;

  for (const span of accepted) {
    out += text.slice(cursor, span.start);
    const key = `${span.type}:${span.preview}`;
    const n = (counters.get(key) ?? 0) + 1;
    counters.set(key, n);
    const placeholder = placeholderFor(span.type, n);
    out += placeholder;
    redactions.push({ type: span.type, placeholder, preview: span.preview });
    cursor = span.end;
  }
  out += text.slice(cursor);

  return { text: out, redactions };
}
