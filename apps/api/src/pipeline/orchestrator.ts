import { createHash, randomUUID } from 'node:crypto';
import {
  buildDraft,
  buildNarrative,
  buildPlan,
  deriveDetails,
  discoveryQueryFor as coreDiscoveryQueryFor,
  knownDomainsFor,
  mergeDetails,
  triage,
  type AgentStep,
  type CaseFile,
  type Channel,
  type EvidenceItem,
  type IncidentDetails,
  type MonitorBinding,
  type ReporterProfile,
  type UploadedEvidence,
} from '@reclaim/core';
import { config, hasPublicTunnel } from '../env.js';
import { bus, log, setStatus } from '../bus.js';
import { adoptCase, getCase, insertCase, insertEvidence, insertMonitor, listMonitors, updateCase } from '../store.js';
import * as tf from '../tinyfish/client.js';

/* ------------------------------------------------------------------ schemas */
/* Only the keywords TinyFish allows: anyOf, enum, format, items, maxItems,
   maximum, minItems, minimum, nullable, properties, propertyOrdering, required, type. */

const ARCHAEOLOGY_SCHEMA = {
  type: 'object',
  properties: {
    page_title: { type: 'string' },
    operator: { type: 'string' },
    has_form: { type: 'boolean' },
    form_url: { type: 'string', nullable: true },
    report_types: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    fields: {
      type: 'array',
      maxItems: 40,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          name: { type: 'string' },
          required: { type: 'boolean' },
          kind: {
            type: 'string',
            enum: ['text', 'textarea', 'select', 'radio', 'date', 'email', 'tel', 'file', 'checkbox', 'number', 'unknown'],
          },
          options: { type: 'array', items: { type: 'string' }, maxItems: 25 },
        },
        required: ['label', 'required'],
      },
    },
    evidence_requests: { type: 'array', items: { type: 'string' }, maxItems: 12 },
    notes: { type: 'string', nullable: true },
  },
  required: ['page_title', 'operator', 'has_form', 'fields'],
};

const FILL_SCHEMA = {
  type: 'object',
  properties: {
    filled: {
      type: 'array',
      maxItems: 40,
      items: {
        type: 'object',
        properties: {
          label: { type: 'string' },
          value: { type: 'string' },
          status: { type: 'string', enum: ['filled', 'not_found', 'blocked'] },
        },
        required: ['label', 'status'],
      },
    },
    missing: { type: 'array', items: { type: 'string' }, maxItems: 20 },
    notes: { type: 'string', nullable: true },
  },
  required: ['filled'],
};

const SUBMIT_SCHEMA = {
  type: 'object',
  properties: {
    submitted: { type: 'boolean' },
    reference: { type: 'string', nullable: true },
    confirmation: { type: 'string', nullable: true },
    final_url: { type: 'string', nullable: true },
    error: { type: 'string', nullable: true },
  },
  required: ['submitted'],
};

/* --------------------------------------------------------- demo portal map */
/** Sandboxed clones of the real forms so the demo never depends on a third party. */
const DEMO_PORTALS: Record<string, string> = {
  instagram: 'instagram.html',
  facebook: 'instagram.html',
  x: 'reddit.html',
  reddit: 'reddit.html',
  whatsapp: 'instagram.html',
  cybercrime_portal: 'cybercrime.html',
  cybercrime_fraud: 'bank.html',
  bank_fraud: 'bank.html',
  local_police: 'cybercrime.html',
  take_it_down: 'takedown.html',
  takedown_ccri: 'takedown.html',
  stopncci: 'takedown.html',
  removeher: 'takedown.html',
  redo: 'takedown.html',
  desexualise: 'takedown.html',
  c2pa: 'takedown.html',
  ncmec: 'takedown.html',
  adult_platforms: 'takedown.html',
  google_url_removal: 'search-removal.html',
  bing_url_removal: 'search-removal.html',
  data_broker_removal: 'search-removal.html',
  hibp: 'search-removal.html',
  women_commission: 'cybercrime.html',
  police_women_helpline: 'cybercrime.html',
  cert_ind: 'cybercrime.html',
  telegram: 'reddit.html',
  youtube: 'instagram.html',
  tiktok: 'instagram.html',
  google: 'instagram.html',
  email: 'instagram.html',
  linkedin: 'instagram.html',
};

export function demoPortalUrl(channelId: string, baseUrl?: string): string | null {
  const file = DEMO_PORTALS[channelId];
  if (!file) return null;
  const base = (baseUrl ?? config.publicBaseUrl).replace(/\/$/, '');
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)/.test(base) && !/^https:\/\//.test(base)) return null;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(base) && !hasPublicTunnel) return null;
  return `${base}/demo-portals/${file}`;
}

/* ---------------------------------------------------------------- utilities */

function hashChain(prevHash: string, payload: unknown): string {
  return createHash('sha256').update(prevHash).update(JSON.stringify(payload)).digest('hex');
}

export function addEvidence(caseId: string, item: Omit<EvidenceItem, 'id' | 'hash' | 'prevHash' | 'capturedAt'>): EvidenceItem {
  const caseFile = getCase(caseId)!;
  const prevHash = caseFile.evidence.at(-1)?.hash ?? 'GENESIS';
  const capturedAt = new Date().toISOString();
  const full: EvidenceItem = {
    ...item,
    id: randomUUID(),
    capturedAt,
    prevHash,
    hash: hashChain(prevHash, { ...item, capturedAt }),
  };
  caseFile.evidence.push(full);
  updateCase(caseFile);
  insertEvidence(caseId, full);
  bus.publish(caseId, { type: 'evidence', item: full });
  return full;
}

function saveAndPublish(caseId: string) {
  const caseFile = getCase(caseId)!;
  updateCase(caseFile);
  bus.publish(caseId, { type: 'case', caseFile });
  return caseFile;
}

/**
 * The case a request is working on.
 *
 * On a serverless platform each request may land on a different instance with
 * no memory of the last one, so the client sends the case with the request
 * and the server works on that copy. Locally it falls back to the store.
 */
function resolveCase(caseId: string, provided?: CaseFile): CaseFile {
  if (provided) {
    // The client's copy is the working copy; keep this instance in step with it.
    adoptCase(provided);
    return provided;
  }
  const stored = getCase(caseId);
  if (!stored) throw new Error('case not found');
  return stored;
}

function channelOf(caseId: string, channelId: string, provided?: CaseFile): Channel {
  const caseFile = resolveCase(caseId, provided);
  const channel = caseFile.plan.channels.find((c) => c.id === channelId);
  if (!channel) throw new Error(`Unknown channel ${channelId}`);
  return channel;
}

/* -------------------------------------------------------------- case create */

export function createCase(
  text: string,
  profile: ReporterProfile,
  country: string,
  keep: boolean,
): CaseFile {
  const triaged = triage(text);
  // What the person already told us in the story: the handle, the platform,
  // the date, the place, the amount. The case file starts from that, and the
  // person corrects it afterwards.
  const details = deriveDetails(triaged, profile);
  const plan = buildPlan(triaged, profile, country, details);
  const now = new Date().toISOString();
  const id = randomUUID();

  const caseFile: CaseFile = {
    id,
    createdAt: now,
    updatedAt: now,
    title: buildTitle(triaged, plan),
    incident: triaged,
    plan,
    evidence: [],
    status: 'triaged',
    country,
    profile,
    details,
  };

  insertCase(caseFile, keep);
  bus.publish(id, { type: 'case', caseFile });
  return caseFile;
}

function buildTitle(triageResult: CaseFile['incident'], plan: CaseFile['plan']): string {
  const primary = triageResult.labels[0]?.label ?? 'incident';
  const target =
    triageResult.entities.find((e) => e.type === 'platform')?.value ??
    triageResult.entities.find((e) => e.type === 'handle')?.value ??
    'unknown target';
  return `${primary.replace(/_/g, ' ')} - ${target} (${plan.channels.length} channels)`;
}

/* ------------------------------------------------------- live discovery */

function scoreSearchResult(result: tf.SearchResult, knownDomains: string[]): number {
  let score = 0;
  let host = '';
  try {
    host = new URL(result.url).hostname.replace(/^www\./, '');
  } catch {
    host = result.site_name ?? '';
  }
  if (knownDomains.some((d) => host === d || host.endsWith(`.${d}`))) score += 60;
  if (/\.(gov|gov\.[a-z]{2}|ac\.uk|edu\.[a-z]{2})$/.test(host)) score += 35;
  if (host.endsWith('.nic.in') || host.endsWith('.gov.in')) score += 35;
  if (/\b(report|reporting|complaint|abuse|grievance|submit|case|takedown|remove|help)\b/i.test(result.title)) score += 14;
  if (/\b(report|complaint|abuse|grievance)\b/i.test(result.snippet ?? '')) score += 8;
  score += Math.max(0, 12 - result.position);
  return score;
}

/**
 * Finds the live, official reporting surface for every planned channel.
 * Nothing is hard-coded: if a ministry moves its page, the next run finds the
 * new one. Search is free within TinyFish's daily allowance.
 */
export async function discoverChannels(
  caseId: string,
  sandbox: boolean,
  publicBaseUrl?: string,
  provided?: CaseFile,
): Promise<CaseFile> {
  const caseFile = resolveCase(caseId, provided);
  setStatus(caseId, 'planning', 'Looking up the live official portals and helplines');
  log(caseId, 'info', `Discovery: ${caseFile.plan.channels.length} channels to verify (TinyFish Search)`);

  const domainsFor = (id: string): string[] => knownDomainsFor(id);

  await Promise.all(
    caseFile.plan.channels.map(async (channel) => {
      const query = channel.discoveryQuery ?? discoveryQueryFor(channel);
      try {
        const res = await tf.search(query, {
          location: caseFile.country === 'IN' ? 'IN' : 'US',
          language: 'en',
          purpose: `Find the current official reporting page for ${channel.name} so a victim can file a complaint there.`,
        });
        const ranked = [...res.results]
          .map((r) => ({ r, score: scoreSearchResult(r, domainsFor(channel.id)) }))
          .sort((a, b) => b.score - a.score);

        const best = ranked[0]?.r;
        if (best) {
          channel.alternates = ranked.slice(1, 4).map(({ r }) => ({ title: r.title, url: r.url }));
          const isKnown = domainsFor(channel.id).some((d) => best.url.includes(d));
          const isGov = /\.(gov|gov\.[a-z]{2}|nic\.in)/.test(best.url);
          if (isKnown || isGov || channel.source === 'seed') {
            // Prefer the discovered URL when it is on a domain we trust, or when
            // the seed URL was a bare homepage.
            if (isKnown || isGov || channel.url.split('/').filter(Boolean).length <= 1) {
              channel.url = best.url;
              channel.source = 'discovered';
            }
          }
          channel.trust = Math.min(0.99, 0.55 + (isKnown ? 0.35 : 0) + (isGov ? 0.1 : 0));
        }
        bus.publish(caseId, { type: 'channel', channel });
        log(caseId, 'success', `${channel.name}: ${channel.url} (${channel.source})`);
      } catch (err) {
        log(caseId, 'warn', `${channel.name}: live lookup failed (${(err as Error).message}) - keeping the seed URL`);
      }
    }),
  );

  if (sandbox) {
    caseFile.sandbox = true;
    for (const channel of caseFile.plan.channels) {
      const url = demoPortalUrl(channel.id, publicBaseUrl);
      if (url) {
        channel.url = url;
        channel.source = 'seed';
      }
    }
    log(caseId, 'info', 'Sandbox mode: agents are driving the bundled demo portals');
  }

  setStatus(caseId, 'ready', 'Live portals verified');
  return saveAndPublish(caseId);
}

function discoveryQueryFor(channel: Channel): string {
  return coreDiscoveryQueryFor(channel.id, channel.name);
}
/* -------------------------------------------------------- form archaeology */

/**
 * The differentiator: instead of shipping a hard-coded list of "fields the
 * Instagram form has", we ask a live web agent to READ the actual form on the
 * actual page right now. Forms change; the agent follows them.
 */
export async function analyseChannel(
  caseId: string,
  channelId: string,
  publicBaseUrl?: string,
  provided?: CaseFile,
): Promise<Channel> {
  const caseFile = resolveCase(caseId, provided);
  const channel = channelOf(caseId, channelId, provided);
  if (!channel.url) {
    channel.status = 'manual';
    channel.error = 'We could not find an official page for this one. Open it from the link, or skip it.';
    saveAndPublish(caseId);
    log(caseId, 'warn', `${channel.name}: no live page found - marked as a manual step`);
    return channel;
  }  const targetUrl =
    caseFile.sandbox ? demoPortalUrl(channel.id, publicBaseUrl) ?? channel.url : channel.url;
  const stepId = randomUUID();

  const step: AgentStep = {
    id: stepId,
    channelId: channel.id,
    channelName: channel.name,
    purpose: `Reading the live ${channel.name} form`,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  bus.publish(caseId, { type: 'step', step });
  setStatus(caseId, 'planning', `Analysing ${channel.name}`);

  const goal = [
    `You are helping a victim file a report. Your job is to READ a real reporting form and describe it exactly.`,
    ``,
    `Start page: ${targetUrl}`,
    ``,
    `Do exactly this:`,
    `1. Open the page. If it links to a reporting / complaint / abuse / grievance form, follow that link.`,
    `2. If you hit a login wall, do NOT log in. Set has_form to false and put the login URL in notes.`,
    `3. Read the form. For EVERY input, select, textarea, radio and file field record:`,
    `   - label: the exact visible label of the field`,
    `   - name: the html name or id attribute if visible in the page source, otherwise a sensible snake_case name`,
    `   - required: true if the form marks it required`,
    `   - kind: one of text, textarea, select, radio, date, email, tel, file, checkbox, number, unknown`,
    `   - options: for a select or radio field, the visible option values. For every other kind, leave it out.`,
    `4. Record the report categories the form offers and any evidence it asks the user to attach.`,
    `5. Do NOT type into the form. Do NOT submit anything.`,
    `6. Work quickly. If the page asks you to log in or sign up, stop immediately and say so - do not keep trying.`,
    ``,
    `Return the result as JSON matching the requested schema.`,
  ].join('\n');

  try {
    const final = await tf.runAgent((event) => {
      if (event.type === 'STREAMING_URL') {
        step.streamingUrl = event.streaming_url;
        bus.publish(caseId, { type: 'step', step: { ...step } });
      }
      if (event.type === 'PROGRESS') {
        step.purpose = event.purpose || step.purpose;
        bus.publish(caseId, { type: 'step', step: { ...step } });
      }
    }, {
      url: targetUrl,
      goal,
      outputSchema: ARCHAEOLOGY_SCHEMA,
      countryCode: caseFile.country === 'IN' ? 'IN' : 'US',
      maxDurationSeconds: 200,
    });

    step.finishedAt = new Date().toISOString();

    if (final.status !== 'COMPLETED') {
      step.status = 'failed';
      step.error = (final as { error?: { message?: string } }).error?.message ?? 'run failed';
      bus.publish(caseId, { type: 'step', step });
      log(caseId, 'warn', `${channel.name}: form analysis failed`);
      return channel;
    }

    const spec = final.result as {
      page_title?: string;
      operator?: string;
      has_form?: boolean;
      form_url?: string | null;
      report_types?: string[];
      fields?: Array<{ label: string; name?: string; required?: boolean; kind?: string; options?: string[] }>;
      evidence_requests?: string[];
      notes?: string | null;
    };

    if (spec?.has_form && spec.fields?.length) {
      // The label is what the agent reads reliably; its idea of the html `name`
      // can be nonsense (a URL, a uuid), so we key everything off the label.
      const live = spec.fields.map((f) => ({
        name: slug(f.label),
        label: f.label,
        required: Boolean(f.required),
        kind: (f.kind ?? 'unknown') as Channel['requiredFields'][number]['kind'],
        options: f.options?.length ? f.options : undefined,
      }));
      channel.requiredFields = live;
      // The agent may rename fields (it returns the visible label, not the
      // html name), so the draft is rebuilt against the fields the live page
      // actually has.
      const narrative =
        channel.narrative ?? buildNarrative(caseFile.incident, caseFile.profile, caseFile.details);
      channel.draft = buildDraft(live, caseFile.incident, caseFile.profile, narrative, caseFile.details);
      channel.requiredEvidence = spec.evidence_requests?.length ? spec.evidence_requests : channel.requiredEvidence;
      channel.status = 'analysed';
      channel.url = spec.form_url || channel.url;
      log(caseId, 'success', `${channel.name}: live form read - ${live.length} fields (${spec.operator ?? 'unknown operator'})`);
      addEvidence(caseId, {
        label: `${channel.name} - live form specification`,
        kind: 'extraction',
        url: channel.url,
        content: JSON.stringify(spec, null, 2),
      });
    } else {
      step.status = 'done';
      channel.status = 'manual';
      channel.error = channel.url.includes('help.instagram.com') ||
        channel.url.includes('facebook.com') ||
        channel.url.includes('help.x.com')
        ? `${channel.name} asks you to log in before you can report, so the agent cannot fill it. Open the link and file it yourself, or turn on Practice mode to try it on a copy.`
        : `${channel.name} has no form the agent could read on that page. Open the link and file it yourself, or turn on Practice mode to try it on a copy.`;
      log(
        caseId,
        'warn',
        `${channel.name}: ${channel.error}`,
      );
    }

    step.result = spec;
    step.status = 'done';
    bus.publish(caseId, { type: 'step', step });
  } catch (err) {
    step.status = 'failed';
    step.error = (err as Error).message;
    step.finishedAt = new Date().toISOString();
    bus.publish(caseId, { type: 'step', step });
    log(caseId, 'error', `${channel.name}: ${(err as Error).message}`);
  }

  saveAndPublish(caseId);
  return channelOf(caseId, channelId);
}

function slug(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40);
}

/* -------------------------------------------------------------- filing */

export async function fileChannel(
  caseId: string,
  channelId: string,
  options: { submit: boolean; values?: Record<string, string> },
  publicBaseUrl?: string,
  provided?: CaseFile,
): Promise<Channel> {
  const caseFile = resolveCase(caseId, provided);
  const channel = channelOf(caseId, channelId, provided);
  const values = { ...channel.draft, ...(options.values ?? {}) };
  const missing = channel.requiredFields.filter((f) => f.required && !values[f.name]);
  if (!channel.url) {
    channel.status = 'manual';
    channel.error = 'We could not find an official page for this one. Open it from the link, or skip it.';
    saveAndPublish(caseId);
    return channel;
  }
  const targetUrl =
    caseFile.sandbox ? demoPortalUrl(channel.id, publicBaseUrl) ?? channel.url : channel.url;

  const stepId = randomUUID();
  const step: AgentStep = {
    id: stepId,
    channelId: channel.id,
    channelName: channel.name,
    purpose: `Filling the ${channel.name} form`,
    status: 'running',
    startedAt: new Date().toISOString(),
  };
  bus.publish(caseId, { type: 'step', step });
  setStatus(caseId, 'filing', `Filing with ${channel.name}`);

  if (missing.length) {
    log(
      caseId,
      'warn',
      `${channel.name}: ${missing.length} field${missing.length === 1 ? '' : 's'} the form marks as required are still empty (${missing
        .map((m) => m.label)
        .join(', ')}) - the agent will not guess them`,
    );
  }

  const fieldTable = channel.requiredFields
    .map((f) => `- ${f.label}${f.required ? ' (required)' : ''}: ${values[f.name] ? values[f.name] : '(leave empty)'}`)
    .join('\n');

  const fillGoal = [
    `You are filing a report for a victim who has already reviewed and approved the values below.`,
    ``,
    `Start page: ${targetUrl}`,
    ``,
    `Fill the form using the VISIBLE LABELS (the names below are hints, the visible label is what matters).`,
    `Values:`,
    fieldTable,
    ``,
    `Rules:`,
    `- Use the exact strings given. Do not paraphrase, do not reformat, do not add text of your own.`,
    `- Fill EVERY field you can, even if other fields will end up empty. A partly filled form is far better than an empty one,`,
    `  and you must not stop just because something is missing.`,
    `- If a field is not on the page, skip it and list it under missing.`,
    `- If the form marks a field as required and you have no value for it, leave that one empty and list it under missing.`,
    `  Only those are the ones the victim must supply - everything else you should still fill in.`,
    `- A contact field (email, mobile, phone) that you could not fill does NOT need the victim, as long as you filled`,
    `  another contact field on the same form. Leave the empty one blank, do not list it as missing, and mention it in notes.`,
    `- Do NOT click Submit, Send, File, Report or any final confirmation button. Stop once the form is filled.`,
    `- Return JSON matching the requested schema.`,
  ].join('\n');

  try {
    const final = await tf.runAgent((event) => {
      if (event.type === 'STREAMING_URL') {
        step.streamingUrl = event.streaming_url;
        bus.publish(caseId, { type: 'step', step: { ...step } });
      }
      if (event.type === 'PROGRESS') {
        step.purpose = event.purpose || step.purpose;
        bus.publish(caseId, { type: 'step', step: { ...step } });
      }
    }, {
      url: channel.url,
      goal: fillGoal,
      outputSchema: FILL_SCHEMA,
      countryCode: caseFile.country === 'IN' ? 'IN' : 'US',
      maxDurationSeconds: 260,
    });

    const fillResult = final.result as {
      filled?: Array<{ label: string; value: string; status: string }>;
      missing?: string[];
      notes?: string;
    };
    const missingOnForm = fillResult?.missing ?? [];
    // The agent does not always populate the `filled` array, so the count is
    // derived from our own field list: everything except what it said it could
    // not fill. Its own summary is kept and shown to the user.
    const total = channel.requiredFields.length;
    const filled = Math.max(0, total - missingOnForm.length);

    channel.fillResult = {
      filled,
      total,
      missing: missingOnForm,
      note: fillResult?.notes,
    };

    log(
      caseId,
      'success',
      `${channel.name}: the agent filled ${filled} of ${total} field${total === 1 ? '' : 's'}`,
    );

    if (missingOnForm.length) {
      channel.error = `The agent filled everything it could. ${missingOnForm.length} field${
        missingOnForm.length === 1 ? '' : 's'
      } that the form marks as required still need${missingOnForm.length === 1 ? 's' : ''} you: ${missingOnForm.join(', ')}`;
      channel.status = 'ready';
    } else {
      channel.error = undefined;
      channel.status = 'ready';
    }

    step.result = fillResult;
    step.status = 'done';
    step.finishedAt = new Date().toISOString();
    bus.publish(caseId, { type: 'step', step });

    if (!options.submit) {
      saveAndPublish(caseId);
      return channelOf(caseId, channelId);
    }

    // ---- submit -----------------------------------------------------------
    const submitStep: AgentStep = {
      id: randomUUID(),
      channelId: channel.id,
      channelName: channel.name,
      purpose: `Submitting the ${channel.name} report`,
      status: 'running',
      startedAt: new Date().toISOString(),
    };
    bus.publish(caseId, { type: 'step', step: submitStep });

    const submitGoal = [
      `The form is now filled. Click the final Submit / Send / File complaint button exactly once.`,
      ``,
      `Current page: ${targetUrl}`,
      ``,
      `After the page responds, read the confirmation text and capture any reference number, ticket id, complaint id, docket number or case number shown on the page. Also record the final URL after submission.`,
      `If the submit failed, say so in error and explain what the page said.`,
      `Return JSON matching the requested schema.`,
    ].join('\n');

    const submitted = await tf.runAgent((event) => {
      if (event.type === 'STREAMING_URL') {
        submitStep.streamingUrl = event.streaming_url;
        bus.publish(caseId, { type: 'step', step: { ...submitStep } });
      }
      if (event.type === 'PROGRESS') {
        submitStep.purpose = event.purpose || submitStep.purpose;
        bus.publish(caseId, { type: 'step', step: { ...submitStep } });
      }
    }, {
      url: channel.url,
      goal: submitGoal,
      outputSchema: SUBMIT_SCHEMA,
      countryCode: caseFile.country === 'IN' ? 'IN' : 'US',
      maxDurationSeconds: 200,
    });

    const result = submitted.result as {
      submitted?: boolean;
      reference?: string | null;
      confirmation?: string | null;
      final_url?: string | null;
      error?: string | null;
    };

    submitStep.status = 'done';
    submitStep.finishedAt = new Date().toISOString();
    submitStep.result = result;
    bus.publish(caseId, { type: 'step', step: submitStep });

    if (result?.submitted) {
      channel.status = 'submitted';
      channel.reference = result.reference ?? undefined;
      channel.filedAt = new Date().toISOString();
      channel.error = undefined;
      log(caseId, 'success', `${channel.name}: submitted${result.reference ? ` - reference ${result.reference}` : ''}`);
      addEvidence(caseId, {
        label: `${channel.name} - submission confirmation`,
        kind: 'reference',
        url: result.final_url ?? channel.url,
        content: [result.confirmation, result.reference ? `Reference: ${result.reference}` : null, result.final_url]
          .filter(Boolean)
          .join('\n'),
      });
    } else {
      channel.status = 'failed';
      channel.error = result?.error ?? 'The page did not confirm the submission.';
      log(caseId, 'error', `${channel.name}: ${channel.error}`);
    }
  } catch (err) {
    step.status = 'failed';
    step.error = (err as Error).message;
    step.finishedAt = new Date().toISOString();
    bus.publish(caseId, { type: 'step', step });
    channel.status = 'failed';
    channel.error = (err as Error).message;
    log(caseId, 'error', `${channel.name}: ${(err as Error).message}`);
  }

  setStatus(caseId, 'filed', 'Report filed');
  const live = getCase(caseId)!;
  live.status = 'filed';
  saveAndPublish(caseId);
  return channelOf(caseId, channelId);
}

/* -------------------------------------------------------------- monitors */

/**
 * The part nobody else does: after filing, keep watching. A Page monitor
 * re-checks the reported URL, a Topic monitor watches for a clone of the
 * account appearing elsewhere. If the content is still up, we say so.
 */
export async function armMonitors(
  caseId: string,
  sandbox = false,
  provided?: CaseFile,
): Promise<CaseFile> {
  const caseFile = resolveCase(caseId, provided);
  const filed = caseFile.plan.channels.filter((c) => c.status === 'submitted');
  if (!filed.length) {
    log(caseId, 'warn', 'No submitted channel to monitor yet');
    return caseFile;
  }
  if (caseFile.sandbox) {
    log(caseId, 'info', 'Sandbox mode: monitors are armed on the demo portals');
  }

  for (const channel of filed) {
    const target = channel.url;
    if (!target) continue;
    try {
      const created = await tf.createMonitor({
        type: 'fetch',
        name: `ReclaimYourNet - ${channel.name} - ${caseId.slice(0, 8)}`,
        config: { url: target, format: 'markdown', links: true },
        schedule_cron: '0 */6 * * *',
        purpose: `The reported content on ${channel.name} was taken down, removed, or the page now shows a takedown notice.`,
      });
      const monitor = created.monitor;
      const binding = {
        id: monitor.id,
        channelId: channel.id,
        channelName: channel.name,
        type: 'page' as const,
        target,
        purpose: 'Content removed or takedown notice appears',
        status: monitor.status,
        createdAt: new Date().toISOString(),
      };
      insertMonitor(caseId, binding);
      rememberMonitor(caseFile, binding);
      bus.publish(caseId, {
        type: 'monitor',
        monitor: binding,
      });
      log(caseId, 'success', `Monitor armed on ${channel.name} (every 6 hours)`);
    } catch (err) {
      log(caseId, 'warn', `Could not arm a monitor for ${channel.name}: ${(err as Error).message}`);
    }
  }

  // Topic monitor: catch a clone appearing somewhere else.
  const handle = caseFile.incident.entities.find((e) => e.type === 'handle')?.value;
  const platform = caseFile.incident.entities.find((e) => e.type === 'platform')?.value;
  if (handle && platform) {
    try {
      const created = await tf.createMonitor({
        type: 'search',
        name: `ReclaimYourNet - clone watch - ${caseFile.id.slice(0, 8)}`,
        config: { query: `"${handle}" ${platform}`, recency_minutes: 10080, result_limit: 5 },
        schedule_cron: '0 */6 * * *',
        purpose: `A new page or post impersonating ${handle} on ${platform} appears.`,
      });
      const monitor = created.monitor;
      const binding = {
        id: monitor.id,
        channelId: 'clone_watch',
        channelName: `Clone watch (${platform})`,
        type: 'topic' as const,
        target: `"${handle}" ${platform}`,
        purpose: `A new impersonation of ${handle} appears`,
        status: monitor.status,
        createdAt: new Date().toISOString(),
      };
      insertMonitor(caseId, binding);
      rememberMonitor(caseFile, binding);
      log(caseId, 'success', `Clone watch armed for @${handle}`);
    } catch (err) {
      log(caseId, 'warn', `Could not arm the clone watch: ${(err as Error).message}`);
    }
  }

  caseFile.status = 'monitoring';
  setStatus(caseId, 'monitoring', 'Follow-up monitoring armed');
  return saveAndPublish(caseId);
}

export function monitorsFor(caseId: string, provided?: CaseFile) {
  const merged = new Map<string, MonitorBinding>();
  for (const m of listMonitors(caseId)) merged.set(m.id, m);
  // The case file carries its own monitors, so they survive a serverless
  // platform handing the next request to a different instance.
  for (const m of provided?.monitors ?? []) merged.set(m.id, m);
  return [...merged.values()];
}

/** Keeps the monitor on the case file itself, not only in the server store. */
function rememberMonitor(caseFile: CaseFile, m: MonitorBinding) {
  const list = caseFile.monitors ?? [];
  caseFile.monitors = [...list.filter((x) => x.id !== m.id), m];
}

/** The case a request is working on, from the store or from the client. */
export function resolveCaseFor(caseId: string, provided?: CaseFile): CaseFile {
  return resolveCase(caseId, provided);
}

/** Marks a channel as deliberately skipped. */
export function skipChannel(caseId: string, channelId: string, provided?: CaseFile): Channel {
  const caseFile = resolveCase(caseId, provided);
  const channel = caseFile.plan.channels.find((c) => c.id === channelId);
  if (!channel) throw new Error(`Unknown channel ${channelId}`);
  channel.status = 'skipped';
  saveAndPublish(caseId);
  return channel;
}

/* ------------------------------------------------------- editing the case */

/**
 * The person changed their own details (name, phone, city...). Every draft is
 * rebuilt so the forms carry the new values - but anything they typed by hand
 * is kept, because re-typing a description is exactly the work we are trying
 * to save them.
 */
export function updateDetails(caseId: string, profile: ReporterProfile, provided?: CaseFile): CaseFile {
  const caseFile = resolveCase(caseId, provided);
  caseFile.profile = { ...caseFile.profile, ...profile };
  rebuildDrafts(caseFile);
  saveAndPublish(caseId);
  return getCase(caseId)!;
}

/** A single field was typed by hand. */
export function updateChannelFields(
  caseId: string,
  channelId: string,
  values: Record<string, string>,
  provided?: CaseFile,
): Channel {
  const caseFile = resolveCase(caseId, provided);
  const channel = caseFile.plan.channels.find((c) => c.id === channelId);
  if (!channel) throw new Error(`Unknown channel ${channelId}`);
  channel.draft = { ...channel.draft, ...values };
  channel.overrides = { ...(channel.overrides ?? {}), ...values };
  saveAndPublish(caseId);
  return channel;
}

/**
 * The particulars of the incident were corrected or filled in.
 *
 * These are the fields a police station asks for first - when it happened,
 * where, which account, how much - so every draft is rebuilt against them.
 * Anything the person typed by hand is kept.
 */
export function updateIncidentDetails(
  caseId: string,
  details: IncidentDetails,
  provided?: CaseFile,
): CaseFile {
  const caseFile = resolveCase(caseId, provided);
  caseFile.details = mergeDetails(caseFile.details, details);
  rebuildDrafts(caseFile);
  saveAndPublish(caseId);
  return caseFile;
}

/**
 * A file the reporter attached to the case themselves - a screenshot, a
 * video, a receipt. It joins the case and the hash chain, so the copy that
 * goes to an authority can be shown to be the copy that was given here.
 */
export function attachUpload(caseId: string, upload: UploadedEvidence, provided?: CaseFile): CaseFile {
  const caseFile = resolveCase(caseId, provided);
  caseFile.uploads = [...(caseFile.uploads ?? []), upload];
  addEvidence(caseId, {
    label: `Complainant's evidence - ${upload.name}`,
    kind: 'upload',
    url: upload.url,
    content: [
      upload.description || 'Evidence furnished by the complainant',
      `File: ${upload.name} (${upload.type || 'file'}, ${upload.size} bytes)`,
      `SHA-256: ${upload.hash}`,
      upload.capturedAt ? `Captured: ${upload.capturedAt}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
  });
  saveAndPublish(caseId);
  return caseFile;
}

/**
 * A file is withdrawn. The chain keeps the record - removing an entry would
 * break every hash after it - but the file stops being an annexure.
 */
export function withdrawUpload(caseId: string, uploadId: string, provided?: CaseFile): CaseFile {
  const caseFile = resolveCase(caseId, provided);
  const uploads = caseFile.uploads ?? [];
  const upload = uploads.find((u) => u.id === uploadId);
  if (!upload) throw new Error('Unknown evidence file');
  upload.withdrawn = true;
  caseFile.uploads = uploads;
  addEvidence(caseId, {
    label: `Evidence withdrawn by the complainant - ${upload.name}`,
    kind: 'note',
    content: `The complainant withdrew this file from the annexures. SHA-256: ${upload.hash}`,
  });
  saveAndPublish(caseId);
  return caseFile;
}

/** Rebuilds every form draft from the incident, the profile and the particulars. */
function rebuildDrafts(caseFile: CaseFile) {
  const narrative = buildNarrative(caseFile.incident, caseFile.profile, caseFile.details);
  for (const channel of caseFile.plan.channels) {
    channel.draft = {
      ...buildDraft(
        channel.requiredFields,
        caseFile.incident,
        caseFile.profile,
        narrative,
        caseFile.details,
      ),
      ...(channel.overrides ?? {}),
    };
    channel.narrative = narrative;
  }
}
