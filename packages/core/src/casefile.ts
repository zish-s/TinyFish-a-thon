import type { CaseFile, IncidentDetails, ReporterProfile, SuspectDetails, TriageResult } from './types.js';
import { labelName } from './taxonomy.js';

/**
 * Everything the printable case file is built from.
 *
 * The point of this module is that the case file is a *record*, not a
 * dashboard: it says who is complaining, what happened, when and where, who
 * was responsible, what evidence exists, and where the complaint has already
 * been filed. The machine's own reading of the story is an annexure, not the
 * document.
 */

/** A reference in the shape an office would use. */
export function caseReference(caseFile: CaseFile): string {
  const year = new Date(caseFile.createdAt).getFullYear();
  return `RYN-${year}-${caseFile.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
}

/** The complaint type(s), in words an official would use. */
export function complaintTypes(caseFile: CaseFile): string[] {
  const active = caseFile.incident.activeLabels?.length
    ? caseFile.incident.activeLabels
    : [caseFile.incident.primaryLabel];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const label of active) {
    const name = labelName(label);
    if (seen.has(name)) continue;
    seen.add(name);
    out.push(name);
  }
  return out;
}

/** A date the way a police file writes it. */
export function formatCaseDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
}

/** URL segments that are never a profile. */
const NON_PROFILE_SEGMENTS = new Set([
  'p',
  'reel',
  'reels',
  'posts',
  'share',
  'login',
  'home',
  'explore',
  'watch',
  'search',
  'about',
  'privacy',
  'terms',
  'help',
  'settings',
  'stories',
  'status',
  'photo',
  'photos',
  'video',
  'videos',
  'story',
  'tv',
  'i',
]);

/**
 * The username behind a profile link.
 *
 * People paste "instagram.com/rahul.finance.2024" far more often than they
 * type "@rahul.finance.2024", and the account is the single most wanted
 * particular in the whole file.
 */
export function handleFromUrl(url: string): string | undefined {
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const last = segments[segments.length - 1];
    if (!last) return undefined;
    if (NON_PROFILE_SEGMENTS.has(last.toLowerCase())) return undefined;
    if (!/^[A-Za-z0-9._-]{2,}$/.test(last)) return undefined;
    if (/\.(com|net|org|in|co|gov|uk)$/i.test(last)) return undefined;
    return last.replace(/^@/, '');
  } catch {
    return undefined;
  }
}

/** Handles, links, platforms and the like, as found in the story. */
export function deriveSuspect(incident: TriageResult): SuspectDetails {
  const handles = incident.entities.filter((e) => e.type === 'handle').map((e) => e.value);
  const urls = incident.entities.filter((e) => e.type === 'url').map((e) => e.value);
  const platform = incident.entities.find((e) => e.type === 'platform')?.value;
  const identifiers = incident.entities
    .filter((e) => e.type === 'phone' || e.type === 'email' || e.type === 'upi' || e.type === 'account_number')
    .map((e) => e.value);
  // No @handle in the story? The link usually carries it.
  if (!handles.length) {
    for (const url of urls) {
      const handle = handleFromUrl(url);
      if (handle && !handles.includes(handle)) handles.push(handle);
    }
  }
  return {
    handles: handles.length ? handles : undefined,
    urls: urls.length ? urls : undefined,
    platform,
    identifiers: identifiers.length ? identifiers.join(', ') : undefined,
  };
}

/**
 * Fills the blank particulars from what the story already said, so the case
 * file is never empty on a field the person has already typed somewhere.
 */
export function deriveDetails(incident: TriageResult, profile: ReporterProfile): IncidentDetails {
  const suspect = deriveSuspect(incident);
  const place = incident.entities.find((e) => e.type === 'location')?.value;
  const date = incident.entities.find((e) => e.type === 'date')?.value;
  const amount = incident.entities.find((e) => e.type === 'amount')?.value;
  return {
    date,
    place,
    amount,
    mode: suspect.platform || suspect.urls || suspect.handles?.length ? 'online' : undefined,
    description: incident.raw,
    suspect,
  };
}

/** Merges what the person typed over what we guessed, without losing either. */
export function mergeDetails(base: IncidentDetails | undefined, next: IncidentDetails): IncidentDetails {
  const merged: IncidentDetails = { ...(base ?? {}), ...next };
  if (base?.suspect || next.suspect) {
    merged.suspect = { ...(base?.suspect ?? {}), ...(next.suspect ?? {}) };
  }
  // An emptied field means the person removed it on purpose.
  for (const key of Object.keys(next) as (keyof IncidentDetails)[]) {
    if (next[key] === undefined) delete merged[key];
  }
  if (merged.suspect) {
    for (const key of Object.keys(merged.suspect) as (keyof SuspectDetails)[]) {
      if (merged.suspect[key] === undefined) delete merged.suspect[key];
    }
  }
  return merged;
}

/**
 * The statement of the complainant, in the first person, in the order a
 * police file reads: what happened, when, where, what it cost, what is
 * still going on.
 */
export function statementText(caseFile: CaseFile): string {
  const details = caseFile.details ?? {};
  const profile = caseFile.profile ?? {};
  const name = profile.name?.trim();
  const address = [profile.address, profile.city, profile.state].filter(Boolean).join(', ');
  const types = complaintTypes(caseFile);

  const parts: string[] = [];

  if (name) parts.push(`I, ${name}${address ? `, residing at ${address}` : ''}, state as follows.`);

  const when = [formatCaseDate(details.date), details.time].filter(Boolean).join(' at ');
  const where = details.place?.trim();
  const whereText = where ? (when ? ` on ${when} at ${where}` : ` at ${where}`) : when ? ` on ${when}` : '';

  const body =
    details.description?.trim() ||
    caseFile.incident.raw?.trim() ||
    'The incident described in this case file occurred as set out in the particulars above.';

  // The complaint type reads better as a short list than as the full set the
  // classifier produced; the rest is in the annexure.
  const named = types.slice(0, 3);
  const complaint =
    named.length === 0
      ? 'an online offence'
      : named.length === 1
        ? `an offence of ${named[0].toLowerCase()}`
        : `offences of ${named.slice(0, -1).map((t) => t.toLowerCase()).join(', ')} and ${named[named.length - 1].toLowerCase()}`;

  parts.push(`I complain that ${complaint} occurred${whereText}. ${body}`);

  if (details.mode) {
    const modeText =
      details.mode === 'online'
        ? 'The act was committed online, over the internet.'
        : details.mode === 'offline'
          ? 'The act was committed in person, at the place stated above.'
          : 'The act was committed both online and in person.';
    parts.push(modeText);
  }

  if (details.frequency) parts.push(`This has happened ${details.frequency}.`);
  if (details.ongoing) parts.push('It is still going on.');

  if (details.amount) {
    parts.push(
      `The amount involved in this matter is ${details.amount}, and I am reporting it within 24 hours so that a freeze can be attempted.`,
    );
  }

  const suspect = details.suspect ?? {};
  const suspectParts: string[] = [];
  if (suspect.handles?.length) {
    suspectParts.push(
      `the account${suspect.handles.length > 1 ? 's' : ''} ${suspect.handles.map((h) => `"${h}"`).join(', ')}`,
    );
  }
  if (suspect.platform) suspectParts.push(`on ${suspect.platform}`);
  if (suspect.urls?.length) suspectParts.push(`(link: ${suspect.urls.join(' ; ')})`);
  if (suspect.identifiers) suspectParts.push(`- other identifiers: ${suspect.identifiers}`);
  if (suspectParts.length) {
    parts.push(`The person or account responsible is ${suspectParts.join(' ')}.`);
  }
  if (suspect.description) parts.push(suspect.description);

  if (details.additional) parts.push(details.additional);

  parts.push(
    'The screenshots, videos and other records attached to this case file are true copies of what I hold on my device. I am available to provide the original device, the original files and any further information required by the investigating officer.',
  );

  return parts.filter(Boolean).join(' ');
}

export interface FilingRow {
  /** The office or platform the complaint went to. */
  name: string;
  /** platform / authority / financial / ... */
  kind: string;
  /** The official page it was filed on. */
  url: string;
  /** submitted / ready / failed / manual / skipped / planned */
  status: string;
  /** The acknowledgement or reference number, when there is one. */
  reference?: string;
  /** When it was filed. */
  filedAt?: string;
  /** Why this place was on the list. */
  why?: string;
  /** What this portal asked us to attach. */
  requiredEvidence?: string[];
}

/** Every place the complaint has been filed, and every place it still has to go. */
export function filingRows(caseFile: CaseFile): FilingRow[] {
  return caseFile.plan.channels.map((channel) => ({
    name: channel.name,
    kind: channel.kind,
    url: channel.url,
    status: channel.status,
    reference: channel.reference,
    filedAt: channel.filedAt,
    why: channel.why,
    requiredEvidence: channel.requiredEvidence,
  }));
}

/** The particulars an official will want, and whether we have them. */
export function detailsCompleteness(details: IncidentDetails | undefined, profile: ReporterProfile) {
  const d = details ?? {};
  const suspect = d.suspect ?? {};
  return {
    name: Boolean(profile.name?.trim()),
    contact: Boolean(profile.phone?.trim() || profile.email?.trim()),
    address: Boolean(profile.address?.trim() || profile.city?.trim()),
    date: Boolean(d.date?.trim()),
    place: Boolean(d.place?.trim()),
    account: Boolean(suspect.handles?.length || suspect.urls?.length || suspect.identifiers?.trim()),
    description: Boolean(d.description?.trim() || d.additional?.trim()),
  };
}

/** The fields a police station asks for that nobody has filled in yet. */
export function missingParticulars(details: IncidentDetails | undefined, profile: ReporterProfile): string[] {
  const c = detailsCompleteness(details, profile);
  const out: string[] = [];
  if (!c.date) out.push('the date of the incident');
  if (!c.place) out.push('the place where it happened');
  if (!c.account) out.push('the account or handle used');
  if (!c.description) out.push('your own description of what happened');
  return out;
}
