import type {
  Channel,
  ChannelField,
  CoverageGap,
  CoveragePlan,
  IncidentLabel,
  TriageResult,
} from './types.js';
import {
  AUTHORITY_CHANNELS,
  EMERGENCY_BY_COUNTRY,
  PLATFORM_CHANNELS,
  PROTECTION_CHANNELS,
  labelName,
  lookupLocation,
} from './taxonomy.js';
import type { ReporterProfile } from './triage.js';

const PLATFORM_ENTITY_TO_CHANNEL: Record<string, string> = {
  Instagram: 'instagram',
  Facebook: 'facebook',
  WhatsApp: 'whatsapp',
  'X (Twitter)': 'x',
  LinkedIn: 'linkedin',
  Telegram: 'telegram',
  YouTube: 'youtube',
  TikTok: 'tiktok',
  Google: 'google',
  Email: 'email',
};

/** Which platforms a label usually lives on. Used when the user does not name one. */
const LABEL_PLATFORM_DEFAULTS: Partial<Record<IncidentLabel, string[]>> = {
  impersonation: ['instagram', 'facebook', 'x'],
  financial_fraud: ['whatsapp', 'instagram'],
  image_misuse: ['instagram', 'facebook'],
  harassment: ['instagram', 'whatsapp', 'x'],
  hate_speech: ['x', 'facebook', 'instagram'],
  stalking: ['instagram', 'facebook'],
  doxxing: ['instagram', 'facebook', 'x'],
  misinformation: ['x', 'facebook'],
  defamation: ['x', 'facebook', 'linkedin'],
  child_safety: ['instagram', 'facebook'],
  account_takeover: ['instagram', 'whatsapp', 'email'],
  sextortion: ['instagram', 'whatsapp'],
  counterfeit: ['instagram', 'linkedin'],
  romance_scam: ['instagram', 'telegram', 'whatsapp'],
};

const LABEL_AUTHORITY: Partial<Record<IncidentLabel, string[]>> = {
  financial_fraud: ['cybercrime_fraud', 'bank_fraud'],
  romance_scam: ['cybercrime_fraud', 'bank_fraud'],
  account_takeover: ['cert_ind', 'bank_fraud'],
  child_safety: ['ncmec'],
  sextortion: ['ncmec'],
  doxxing: ['local_police'],
  hate_speech: ['women_commission'],
  harassment: ['women_commission', 'police_women_helpline'],
  stalking: ['women_commission', 'police_women_helpline'],
};

function findEntity(triage: TriageResult, type: string): string | undefined {
  return triage.entities.find((e) => e.type === type)?.value;
}

export function buildNarrative(triage: TriageResult, profile: ReporterProfile): string {
  const parts: string[] = [];
  const platform = findEntity(triage, 'platform');
  const target = findEntity(triage, 'url') ?? findEntity(triage, 'handle');
  const amount = findEntity(triage, 'amount');
  const date = findEntity(triage, 'date');
  const location = findEntity(triage, 'location');

  parts.push(
    `On ${date ?? 'the date of this complaint'}, I discovered${platform ? ` on ${platform}` : ''} that ${
      target ? `the account/post at ${target}` : 'an account or post'
    } is ${labelName(triage.primaryLabel).toLowerCase()}.`,
  );

  const secondary = triage.labels
    .filter((l) => l.probability >= 0.5 && l.label !== triage.primaryLabel)
    .slice(0, 2)
    .map((l) => labelName(l.label).toLowerCase());
  if (secondary.length) {
    parts.push(`The same content also involves ${secondary.join(' and ')}.`);
  }

  if (amount) {
    parts.push(
      `A financial loss of approximately ${amount} has occurred and I am reporting it within 24 hours so that a freeze can be attempted.`,
    );
  }

  if (triage.hardSignals.includes('threat_to_safety')) {
    parts.push('The account has made explicit threats against me and I do not feel safe.');
  }
  if (triage.hardSignals.includes('minor_involved')) {
    parts.push('A minor is involved and this needs to be escalated immediately.');
  }
  if (triage.hardSignals.includes('intimate_content')) {
    parts.push('Intimate content is being used to coerce me. Please treat this as an urgent privacy and extortion matter.');
  }

  parts.push(
    'I have preserved screenshots, the account link and the timestamps of the content, and I am available to provide the original device for examination.',
  );

  if (profile.city) parts.push(`I am currently based in ${profile.city}.`);

  return parts.join(' ');
}

function valueForField(
  field: ChannelField,
  triage: TriageResult,
  profile: ReporterProfile,
  narrative: string,
): string {
  // Match on the visible label first - that is what a human (and the web
  // agent) actually sees - and fall back to the field name.
  const label = field.label.toLowerCase().replace(/\*/g, '').trim();
  const name = field.name.toLowerCase();
  const lower = `${label} ${name}`;

  if (/category|issue type|type of problem|what is the problem|^reason$/.test(lower)) {
    const options = field.options ?? [];
    if (options.length) {
      const primary = labelName(triage.primaryLabel).toLowerCase();
      const map: Record<string, string> = {
        impersonation: 'impersonation',
        financial_fraud: 'scam',
        image_misuse: 'impersonation',
        harassment: 'harassment',
        hate_speech: 'harassment',
        stalking: 'harassment',
        doxxing: 'harassment',
        misinformation: 'harassment',
        defamation: 'harassment',
        account_takeover: 'hacked',
        sextortion: 'harassment',
        counterfeit: 'scam',
        romance_scam: 'scam',
        child_safety: 'harassment',
      };
      const match =
        options.find((o) => o.toLowerCase().includes(primary.split(' ')[0])) ??
        options.find((o) => o.toLowerCase().includes(map[triage.primaryLabel] ?? ''));
      if (match) return match;
    }
    return options[0] ?? '';
  }

  switch (true) {
    case /username|profile link|profile url|post \/ profile|post url|link|target|account|url/.test(lower):
      return findEntity(triage, 'url') ?? findEntity(triage, 'handle') ?? '';
    case /email/.test(lower):
      return profile.email ?? '';
    case /mobile|phone|callback/.test(lower):
      return profile.phone ?? '';
    case /address|district/.test(lower):
      return profile.address ?? profile.city ?? '';
    case /city/.test(lower):
      return profile.city ?? '';
    case /amount|how much|lost/.test(lower):
      return findEntity(triage, 'amount') ?? '';
    case /date/.test(lower) && !/birth/.test(lower):
      return findEntity(triage, 'date') ?? new Date().toISOString().slice(0, 10);
    case /description|details|narrative|complaint|what happened|stories/.test(lower):
      return narrative;
    case /transaction|utr/.test(lower):
      return '';
    case /beneficiary|receiving/.test(lower):
      return findEntity(triage, 'upi') ?? findEntity(triage, 'phone') ?? '';
    case /last ?4|account number|card number/.test(lower):
      return findEntity(triage, 'account_number') ?? '';
    case /name/.test(lower):
      return profile.name ?? '';
    default:
      return '';
  }
}

function trustForUrl(url: string, knownDomains: string[]): number {
  let host = '';
  try {
    host = new URL(url).hostname.replace(/^www\./, '');
  } catch {
    host = url;
  }
  if (knownDomains.some((d) => host === d || host.endsWith(`.${d}`))) return 0.95;
  if (/\.(gov|gov\.[a-z]{2}|ac\.uk|edu\.[a-z]{2})$/.test(host)) return 0.92;
  if (host.endsWith('.nic.in')) return 0.9;
  if (host.endsWith('.org') || host.endsWith('.com') || host.endsWith('.net')) return 0.6;
  return 0.5;
}

/**
 * Builds the values for a set of form fields. Used twice: once for the
 * seeded field list, and again after the live agent has read the real form,
 * so the draft always matches the fields the page actually has.
 */
export function buildDraft(
  fields: ChannelField[],
  triage: TriageResult,
  profile: ReporterProfile,
  narrative: string,
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const field of fields) {
    draft[field.name] = valueForField(field, triage, profile, narrative);
  }
  return draft;
}

export function buildPlan(triage: TriageResult, profile: ReporterProfile, country = 'IN'): CoveragePlan {
  const narrative = buildNarrative(triage, profile);
  const activeLabels = triage.activeLabels?.length ? triage.activeLabels : [triage.primaryLabel];

  const channels: Channel[] = [];

  // ---- platform channels -------------------------------------------------
  const detected = triage.entities
    .filter((e) => e.type === 'platform')
    .map((e) => PLATFORM_ENTITY_TO_CHANNEL[e.value])
    .filter((id): id is string => Boolean(id));

  const platformIds: string[] = [];
  for (const id of detected) if (!platformIds.includes(id)) platformIds.push(id);
  for (const label of activeLabels) {
    for (const id of LABEL_PLATFORM_DEFAULTS[label] ?? []) {
      if (!platformIds.includes(id) && platformIds.length < 4) platformIds.push(id);
    }
  }

  for (const id of platformIds.slice(0, 4)) {
    const def = PLATFORM_CHANNELS.find((p) => p.id === id);
    if (!def) continue;
    const triggeredBy = activeLabels.filter((l) => (LABEL_PLATFORM_DEFAULTS[l] ?? []).includes(id) || detected.includes(id));
    channels.push({
      id: def.id,
      name: def.name,
      kind: def.kind,
      jurisdiction: 'GLOBAL',
      url: `https://${def.domains[0]}/`,
      why: def.purpose,
      triggeredBy: triggeredBy.length ? triggeredBy : activeLabels.slice(0, 1),
      requiredFields: def.fields,
      requiredEvidence: ['Screenshot of the content', 'The exact link', 'Date and time of the incident'],
      slaHours: def.slaHours,
      slaNote: def.slaNote,
      status: 'planned',
      source: 'seed',
      trust: trustForUrl(def.domains[0], def.domains),
      priority: 'now',
      draft: {},
    });
  }

  // ---- authority channels ------------------------------------------------
  const authorityIds = new Set<string>();
  for (const label of activeLabels) {
    for (const id of LABEL_AUTHORITY[label] ?? []) authorityIds.add(id);
  }
  if (triage.hardSignals.includes('money_lost')) {
    authorityIds.add('cybercrime_fraud');
    authorityIds.add('bank_fraud');
  }
  if (triage.hardSignals.includes('threat_to_safety')) authorityIds.add('local_police');
  if (triage.hardSignals.includes('minor_involved')) authorityIds.add('ncmec');
  if (triage.urgency === 'high' || triage.urgency === 'critical') authorityIds.add('cybercrime_portal');
  if (triage.urgency === 'critical') authorityIds.add('local_police');

  for (const def of AUTHORITY_CHANNELS) {
    if (!authorityIds.has(def.id)) continue;
    if (def.country !== 'IN' && def.country !== 'GLOBAL') continue;
    if (def.country === 'IN' && country !== 'IN') continue;
    if (def.minUrgency === 'critical' && triage.urgency !== 'critical') continue;
    if (def.minUrgency === 'high' && triage.urgency === 'normal') continue;
    const triggeredBy = activeLabels.filter((l) =>
      (def.appliesTo ?? []).length === 0 ? true : (def.appliesTo ?? []).includes(l),
    );
    channels.push({
      id: def.id,
      name: def.name,
      kind: def.kind,
      jurisdiction: def.country,
      url: def.url,
      why: def.purpose,
      triggeredBy: triggeredBy.length ? triggeredBy : activeLabels.slice(0, 1),
      requiredFields: def.fields,
      requiredEvidence: ['Screenshots of the offending content', 'A timeline of events', 'Your contact details'],
      slaHours: def.slaHours,
      slaNote: def.slaNote,
      status: 'planned',
      source: 'seed',
      trust: trustForUrl(def.url, []),
      priority: 'now',
      draft: {},
    });
  }

  // ---- pre-emptive protection channels ---------------------------------
  // These are the services you arm BEFORE the harm happens: upload once and
  // they pull your content back if it is ever uploaded - including morphed
  // or AI-generated copies.
  for (const def of PROTECTION_CHANNELS) {
    const applies = def.appliesTo ?? [];
    const rel = applies.length === 0 ? false : activeLabels.some((l) => applies.includes(l));
    if (!rel) continue;
    const triggeredBy = activeLabels.filter((l) => applies.includes(l));
    channels.push({
      id: def.id,
      name: def.name,
      kind: def.kind,
      jurisdiction: 'GLOBAL',
      url: def.url,
      why: def.purpose,
      triggeredBy,
      requiredFields: def.fields,
      requiredEvidence: ['The content itself (photo, video or file)'],
      slaHours: def.slaHours,
      slaNote: def.slaNote,
      status: 'planned',
      source: 'seed',
      trust: trustForUrl(def.url, []),
      priority: 'now',
      draft: {},
    });
  }

  // ---- local / state level channels -------------------------------------
  // A FIR can only be registered by the local station, and a State Women's
  // Commission is a different body from the national one. So when we know
  // which city the person is in, the plan points at *their* police and
  // *their* state commission - both resolved live, not hard-coded.
  if (country === 'IN' && profile.city) {
    const loc = lookupLocation(profile.city);
    if (loc) {
      channels.push({
        id: 'local_police_state',
        name: `${loc.city} police - ${loc.state}`,
        kind: 'authority',
        jurisdiction: loc.stateCode,
        url: '',
        region: loc.state,
        discoveryQuery: `${loc.city} police official site online FIR cyber crime cell ${loc.state}`,
        why: `A First Information Report has to come from the police station with jurisdiction over where you are - that is ${loc.city} police, ${loc.state}. Nobody else can register it for you.`,
        triggeredBy: activeLabels.slice(0, 2),
        requiredFields: [
          { name: 'name', label: 'Name', required: true, kind: 'text' },
          { name: 'mobile', label: 'Mobile', required: true, kind: 'tel' },
          { name: 'address', label: 'Address', required: true, kind: 'textarea' },
          { name: 'description', label: 'Narrative of the incident', required: true, kind: 'textarea' },
          { name: 'incident_date', label: 'Date of incident', required: true, kind: 'date' },
        ],
        requiredEvidence: ['Screenshots of the content', 'The exact link', 'Your ID proof'],
        slaHours: 24,
        slaNote: 'An FIR is the record everything else depends on. It is also the only thing a bank or a court will ask for.',
        status: 'planned',
        source: 'seed',
        trust: 0.9,
        priority: 'now',
        draft: {},
      });

      if (activeLabels.includes('harassment') || activeLabels.includes('stalking')) {
        channels.push({
          id: 'state_women_commission',
          name: `${loc.state} State Commission for Women`,
          kind: 'authority',
          jurisdiction: loc.stateCode,
          url: '',
          region: loc.state,
          discoveryQuery: `${loc.state} State Commission for Women official complaint portal`,
          why: `The State Commission for Women can act on harassment and stalking in ${loc.state} without you having to go to a police station first.`,
          triggeredBy: activeLabels.filter((l) => l === 'harassment' || l === 'stalking'),
          requiredFields: [
            { name: 'name', label: 'Name', required: true, kind: 'text' },
            { name: 'email', label: 'Email', required: true, kind: 'email' },
            { name: 'mobile', label: 'Mobile', required: true, kind: 'tel' },
            { name: 'description', label: 'Complaint', required: true, kind: 'textarea' },
          ],
          requiredEvidence: ['Screenshots', 'Dates of the incidents'],
          slaHours: 72,
          slaNote: 'Usually a few weeks. File it alongside the police complaint, not instead of it.',
          status: 'planned',
          source: 'seed',
          trust: 0.9,
          priority: 'now',
          draft: {},
        });
      }
    }
  }

  // ---- drafts ------------------------------------------------------------
  for (const channel of channels) {
    channel.draft = buildDraft(channel.requiredFields, triage, profile, narrative);
    channel.narrative = narrative;
  }

  // ---- gaps --------------------------------------------------------------
  const gaps: CoverageGap[] = [];
  const has = (id: string) => channels.some((c) => c.id === id);

  if (triage.hardSignals.includes('money_lost') && !has('local_police')) {
    gaps.push({
      id: 'no_fir',
      title: 'No police FIR in the plan',
      detail: 'Money was lost. A cybercrime portal complaint is not enough: banks and courts want an FIR, and only an FIR starts the clock on a refund claim.',
      severity: 'blocker',
      action: 'Add your local cyber cell / police station to the plan, or apply for an FIR at the station.',
    });
  }
  if (triage.hardSignals.includes('minor_involved')) {
    gaps.push({
      id: 'minor_report',
      title: 'Mandatory child-safety report',
      detail: 'Content involving a minor must be reported to the child-safety reporting body in addition to the police.',
      severity: 'blocker',
      action: 'Make sure the child-safety channel in your plan is submitted today.',
    });
  }
  if (triage.hardSignals.includes('threat_to_safety')) {
    const emergency = EMERGENCY_BY_COUNTRY[country] ?? EMERGENCY_BY_COUNTRY.GLOBAL;
    gaps.push({
      id: 'call_emergency',
      title: 'Call for immediate help',
      detail: `Your description mentions a threat. Forms take hours; a phone call does not. Emergency number: ${emergency.police}.`,
      severity: 'blocker',
      action: `Call ${emergency.police} now, then file the forms in this plan as the written record.`,
    });
  }
  if (triage.hardSignals.includes('identity_exposed')) {
    gaps.push({
      id: 'identity_rotate',
      title: 'Rotate the exposed identity documents',
      detail: 'If an Aadhaar/PAN/card number was published, filing alone is not enough - the credential has to be changed.',
      severity: 'important',
      action: 'Reissue the exposed document and close the old one.',
    });
  }

  const missingFields = channels.reduce(
    (acc, c) => acc + c.requiredFields.filter((f) => f.required && !c.draft[f.name]).length,
    0,
  );
  if (missingFields > 0) {
    gaps.push({
      id: 'missing_fields',
      title: `${missingFields} required field${missingFields === 1 ? '' : 's'} still need you`,
      detail: 'The agent will not guess a required field on a government or bank form. Fill the highlighted blanks and the agent will continue.',
      severity: 'important',
      action: 'Open the highlighted channels and complete the missing fields.',
    });
  }

  if (channels.length > 0 && !channels.some((c) => c.kind === 'authority') && triage.urgency !== 'normal') {
    gaps.push({
      id: 'no_authority',
      title: 'Only platform reports are planned',
      detail: 'Platform reports can remove content but do not create a legal record. For anything involving money, threats or identity, you also need an authority channel.',
      severity: 'important',
      action: 'Add the national cybercrime reporting portal for your country.',
    });
  }

  const estimatedMinutes = Math.max(4, channels.length * 3 + (triage.hardSignals.includes('money_lost') ? 15 : 0));

  // ---- prioritisation ----------------------------------------------------
  // A victim cannot do twenty things at once. The plan is ranked so the first
  // screen is the handful of steps that actually stop the harm, and the rest
  // stay visible as "also do this" rather than being hidden.
  const kindRank: Record<string, number> = {
    financial: 0,
    authority: 1,
    platform: 2,
    protection: 3,
    support: 4,
    escalation: 5,
  };
  const protectionIsUrgent =
    activeLabels.includes('sextortion') ||
    activeLabels.includes('child_safety') ||
    activeLabels.includes('image_misuse');

  channels.sort((a, b) => {
    const rankA = kindRank[a.kind] ?? 6;
    const rankB = kindRank[b.kind] ?? 6;
    const adjustedA = a.kind === 'protection' && protectionIsUrgent ? 2.5 : rankA;
    const adjustedB = b.kind === 'protection' && protectionIsUrgent ? 2.5 : rankB;
    if (adjustedA !== adjustedB) return adjustedA - adjustedB;
    const slaA = a.slaHours === null ? Number.MAX_SAFE_INTEGER : a.slaHours;
    const slaB = b.slaHours === null ? Number.MAX_SAFE_INTEGER : b.slaHours;
    return slaA - slaB;
  });

  const nowCount = Math.min(8, channels.length);
  channels.forEach((channel, index) => {
    channel.priority = index < nowCount ? 'now' : 'later';
  });

  return { channels, gaps, estimatedMinutes, jurisdiction: country };
}
