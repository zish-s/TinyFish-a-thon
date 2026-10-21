import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  INCIDENT_TYPES,
  PLATFORM_CHANNELS,
  AUTHORITY_CHANNELS,
  PROTECTION_CHANNELS,
  EMERGENCY_BY_COUNTRY,
  triage,
  type CaseFile,
  type IncidentDetails,
} from '@reclaim/core';
import { bus, type CaseEvent } from './bus.js';
import { config, hasPublicTunnel, hasTinyFish } from './env.js';
import { getCase, listCases, deleteCase } from './store.js';
import * as orch from './pipeline/orchestrator.js';
import { renderCaseFile } from './casereport/pdf.js';
import { dropFile, getFile, putFile } from './casereport/uploads.js';
import * as tf from './tinyfish/client.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// Works from both `src/` (tsx dev) and `dist/` (compiled): the portal files
// live in `apps/api/demo-portals`.
const DEMO_DIR = path.resolve(here, '..', 'demo-portals');

const profileSchema = z
  .object({
    name: z.string().optional(),
    email: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    idType: z.string().optional(),
    idNumber: z.string().optional(),
  })
  .default({});

/** The particulars of the incident, as the reporter stated them. */
const detailsSchema = z.object({
  date: z.string().optional(),
  time: z.string().optional(),
  place: z.string().optional(),
  mode: z.enum(['online', 'offline', 'both']).optional(),
  ongoing: z.boolean().optional(),
  amount: z.string().optional(),
  frequency: z.string().optional(),
  description: z.string().optional(),
  additional: z.string().optional(),
  suspect: z
    .object({
      handles: z.array(z.string()).optional(),
      platform: z.string().optional(),
      urls: z.array(z.string()).optional(),
      identifiers: z.string().optional(),
      description: z.string().optional(),
    })
    .optional(),
});

const createCaseSchema = z.object({
  text: z.string().min(8, 'Tell us a little more so we can triage it.'),
  profile: profileSchema,
  country: z.string().length(2).optional(),
  details: detailsSchema.optional(),
});

function sse(reply: FastifyReply) {
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
}

/**
 * The URL this server is reachable at, as the outside world sees it. On Vercel
 * that is the deployment URL, which is exactly what the TinyFish remote
 * browser needs to reach the bundled demo portals.
 */
function publicBaseUrl(request: FastifyRequest): string {
  const forwardedProto = (request.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0];
  const proto = forwardedProto ?? (request.protocol || 'https');
  const host =
    (request.headers['x-forwarded-host'] as string | undefined)?.split(',')[0] ?? request.headers.host ?? '';
  if (host && !/^localhost|^127\.0\.0\.1/.test(host)) return `${proto}://${host}`;
  return config.publicBaseUrl;
}

function send(reply: FastifyReply, event: CaseEvent) {
  reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
}

/**
 * Opens a streamed response on the current request.
 *
 * Every agent action is one request that stays open for the whole run, so the
 * events and the result travel on the same connection. That is what makes the
 * app work on a serverless platform, where a second request would land on a
 * different instance with no memory of the first.
 */
function openStream(reply: FastifyReply) {
  reply.hijack();
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  return (event: unknown) => {
    try {
      reply.raw.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      /* the client went away */
    }
  };
}

export async function registerRoutes(app: FastifyInstance) {
  /* ------------------------------------------------------------- health */
  app.get('/api/health', async () => {
    let wallet: { balance: string; currency: string } | null = null;
    if (hasTinyFish) {
      try {
        const w = await tf.getWallet();
        wallet = { balance: w.available_balance, currency: w.currency };
      } catch {
        wallet = null;
      }
    }
    return {
      ok: true,
      tinyfish: { configured: hasTinyFish, wallet },
      tunnel: { public: hasPublicTunnel, baseUrl: config.publicBaseUrl },
      country: config.country,
    };
  });

  /* ------------------------------------------------------------- triage */
  app.post('/api/triage', async (request) => {
    const body = z.object({ text: z.string().min(4) }).parse(request.body);
    return triage(body.text);
  });

  /* ------------------------------------------------------------- cases */
  app.post('/api/cases', async (request, reply) => {
    const body = createCaseSchema.parse(request.body);
    // A report is never written to a server-side store. It lives in this
    // process's memory and disappears with it. `RECLAIM_PERSIST=1` is a
    // developer-only opt-in for local experiments, and it is never set on a
    // deployment.
    const keep = process.env.RECLAIM_PERSIST === '1';
    const caseFile = orch.createCase(body.text, body.profile, body.country ?? config.country, keep);
    // What the person filled in on the form wins over what we guessed.
    if (body.details) orch.updateIncidentDetails(caseFile.id, body.details, caseFile);
    reply.code(201);
    return caseFile;
  });

  app.delete('/api/cases/:id', async (request) => {
    const { id } = request.params as { id: string };
    return deleteCase(id);
  });

  app.get('/api/cases', async () => ({ cases: listCases() }));

  app.get('/api/cases/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const caseFile = getCase(id);
    if (!caseFile) {
      reply.code(404);
      return { error: 'case not found' };
    }
    return { caseFile, monitors: orch.monitorsFor(id) };
  });

  /* ------------------------------------------------------------- stream */
  app.get('/api/cases/:id/stream', (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    if (!getCase(id)) {
      reply.code(404);
      return reply.send({ error: 'case not found' });
    }
    sse(reply);
    for (const event of bus.replay(id)) send(reply, event);
    const unsubscribe = bus.subscribe(id, (event) => send(reply, event));
    const keepAlive = setInterval(() => reply.raw.write(': ping\n\n'), 15000);
    request.raw.on('close', () => {
      clearInterval(keepAlive);
      unsubscribe();
    });
  });

  /* ----------------------------------------------------------- discover */
  app.post('/api/cases/:id/discover', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ sandbox: z.boolean().optional(), case: z.any().optional() })
      .parse(request.body ?? {});
    const send = openStream(reply);
    const unsubscribe = bus.subscribe(id, (event) => send(event));
    try {
      const updated = await orch.discoverChannels(id, Boolean(body.sandbox), publicBaseUrl(request), body.case);
      send({ type: 'case', caseFile: updated });
    } catch (err) {
      send({ type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() });
    } finally {
      unsubscribe();
      reply.raw.end();
    }
  });

  /* ----------------------------------------------------------- analyse */
  app.post('/api/cases/:id/channels/:channelId/analyse', async (request, reply) => {
    const { id, channelId } = request.params as { id: string; channelId: string };
    const body = z.object({ case: z.any().optional() }).parse(request.body ?? {});
    const send = openStream(reply);
    const unsubscribe = bus.subscribe(id, (event) => send(event));
    try {
      const updated = await orch.analyseChannel(id, channelId, publicBaseUrl(request), body.case);
      send({ type: 'case', caseFile: updated });
    } catch (err) {
      send({ type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() });
    } finally {
      unsubscribe();
      reply.raw.end();
    }
  });

  /* -------------------------------------------------------------- file */
  app.post('/api/cases/:id/channels/:channelId/file', async (request, reply) => {
    const { id, channelId } = request.params as { id: string; channelId: string };
    const body = z
      .object({
        submit: z.boolean().default(false),
        values: z.record(z.string(), z.string()).optional(),
        case: z.any().optional(),
      })
      .parse(request.body ?? {});
    const send = openStream(reply);
    const unsubscribe = bus.subscribe(id, (event) => send(event));
    try {
      const updated = await orch.fileChannel(id, channelId, body, publicBaseUrl(request), body.case);
      send({ type: 'case', caseFile: updated });
    } catch (err) {
      send({ type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() });
    } finally {
      unsubscribe();
      reply.raw.end();
    }
  });

  /* ----------------------------------------------------------- monitors */
  app.post('/api/cases/:id/monitors', async (request, reply) => {    const { id } = request.params as { id: string };
    const body = z
      .object({ sandbox: z.boolean().optional(), case: z.any().optional() })
      .parse(request.body ?? {});
    const send = openStream(reply);
    const unsubscribe = bus.subscribe(id, (event) => send(event));
    try {
      const updated = await orch.armMonitors(id, Boolean(body.sandbox), body.case);
      send({ type: 'case', caseFile: updated });
    } catch (err) {
      send({ type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() });
    } finally {
      unsubscribe();
      reply.raw.end();
    }
  });

  app.post('/api/cases/:id/channels/:channelId/skip', async (request) => {    const { id, channelId } = request.params as { id: string; channelId: string };
    const caseFile = getCase(id);
    if (!caseFile) throw new Error('case not found');
    const channel = caseFile.plan.channels.find((c) => c.id === channelId);
    if (channel) {
      channel.status = 'skipped';
      bus.publish(id, { type: 'channel', channel });
    }
    return { ok: true };
  });

  app.get('/api/cases/:id/monitors', async (request) => {
    const { id } = request.params as { id: string };
    return { monitors: orch.monitorsFor(id) };
  });

  /* ---------------------------------------------------------- case file */
  app.get('/api/cases/:id/casefile.pdf', async (request, reply) => {
    const { id } = request.params as { id: string };
    const caseFile = getCase(id);
    if (!caseFile) {
      reply.code(404);
      return reply.send({ error: 'case not found' });
    }
    const pdf = await renderCaseFile(caseFile, orch.monitorsFor(id));
    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="ReclaimYourNet-case-${id.slice(0, 8)}.pdf"`);
    return reply.send(pdf);
  });

  /* ------------------------------------------------------------ pricing */
  app.get('/api/pricing', async () => ({
    currency: 'INR',
    note: 'Free for the person who was hurt. The money comes from the organisations that receive the reports.',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        unit: 'always',
        for: 'Anyone reporting something that happened to them.',
        includes: [
          'We find every place it has to be reported',
          'We open the real form and fill it in for you',
          'File on 2 places',
          'Download the case file as a PDF',
        ],
        limit: '2 places per report',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 499,
        unit: 'per month',
        for: 'Someone handling their own case, or helping someone else through one.',
        includes: [
          'File on unlimited places',
          'The agent submits every form for you',
          'A safe copy of every page and every reference number',
          'We keep checking whether the content actually came down',
          'One-click takedown for morphed images, and protection for the future',
        ],
        limit: '10 pages watched per case',
      },
      {
        id: 'team',
        name: 'For organisations',
        price: 4999,
        unit: 'per person, per month',
        for: 'NGOs, student unions, victim-support groups and campus safety teams.',
        includes: [
          'Everything in Pro',
          'Handle many cases at once and assign them to people',
          'One shared folder of evidence, ready to export',
          'A list of which reports are overdue',
        ],
        limit: 'Yearly billing available',
      },
      {
        id: 'api',
        name: 'For banks and platforms',
        price: 49999,
        unit: 'per month, plus usage',
        for: 'Trust and safety teams, fraud desks and compliance teams.',
        includes: [
          'One API call: incident in, regulator-ready case file out',
          'The live map of where to report, for every country you operate in',
          'Alerts when a report goes past its deadline',
          'An audit trail they can hand to a regulator',
          'Webhooks for every case and every takedown check',
        ],
        limit: 'Usage billed at cost - the free search allowance is passed through',
      },
    ],
    unitEconomics: {
      'What one report costs us': 'About Rs 25-50. That is the agent reading each form, filling it in and submitting it.',
      'What searching costs us': 'Nothing. TinyFish allows 12,000 free searches a day.',
      'What watching a page costs us': 'About Rs 12 a month for one page we keep checking.',
      'So a Pro plan at Rs 499': 'Keeps about 90 paise of every rupee. It is why the free tier can stay free.',
    },
  }));

  /* ---------------------------------------------------------- edit details */
  app.post('/api/cases/:id/details', async (request) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({
        name: z.string().optional(),
        email: z.string().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        idType: z.string().optional(),
        idNumber: z.string().optional(),
        details: detailsSchema.optional(),
        case: z.any().optional(),
      })
      .parse(request.body ?? {});
    const { case: _case, details, ...profile } = body;
    let caseFile = orch.resolveCaseFor(id, body.case);
    if (Object.keys(profile).length) caseFile = orch.updateDetails(id, profile, caseFile);
    if (details) caseFile = orch.updateIncidentDetails(id, details, caseFile);
    return { caseFile };
  });

  /* ------------------------------------------------------- evidence files */
  /**
   * The reporter attaches a file to the case: a screenshot, a video, a
   * receipt. The bytes are hashed and kept; the case carries the hash.
   */
  app.post('/api/cases/:id/evidence', async (request, reply) => {
    const { id } = request.params as { id: string };
    const fields: Record<string, string> = {};
    let upload: { name: string; type: string; data: Buffer } | null = null;

    for await (const part of request.parts()) {
      if (part.type === 'file') {
        const data = await part.toBuffer();
        upload = { name: part.filename || 'evidence', type: part.mimetype || 'application/octet-stream', data };
      } else {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }

    if (!upload) {
      reply.code(400);
      return reply.send({ error: 'no file was received' });
    }
    if (!upload.data.length) {
      reply.code(400);
      return reply.send({ error: 'the file was empty' });
    }

    // The case travels with the request, because on a serverless platform
    // this instance may never have seen the report before.
    const provided = fields.case ? (JSON.parse(fields.case) as CaseFile) : undefined;
    const caseFile = orch.resolveCaseFor(id, provided);

    const stored = putFile(upload.name, upload.type, upload.data);
    const record = {
      id: randomUUID(),
      name: upload.name,
      type: upload.type,
      size: stored.size,
      hash: stored.hash,
      description: (fields.description ?? '').trim(),
      capturedAt: (fields.capturedAt ?? '').trim() || undefined,
      uploadedAt: new Date().toISOString(),
      url: `/api/cases/${id}/evidence/${stored.hash.slice(0, 12)}`,
    };
    const updated = orch.attachUpload(id, record, caseFile);
    return { caseFile: updated, upload: record };
  });

  /** The bytes of a file the reporter attached. */
  app.get('/api/cases/:id/evidence/:token', async (request, reply) => {
    const { id, token } = request.params as { id: string; token: string };
    const caseFile = getCase(id);
    const upload = (caseFile?.uploads ?? []).find((u) => u.url?.endsWith(token));
    const file = upload ? getFile(upload.hash) : undefined;
    if (!upload || !file) {
      reply.code(404);
      return reply.send({ error: 'file not found' });
    }
    reply.header('Content-Type', file.type || 'application/octet-stream');
    reply.header('Content-Disposition', `inline; filename="${file.name}"`);
    return reply.send(file.data);
  });

  /** A file is withdrawn from the annexures. */
  app.post('/api/cases/:id/evidence/withdraw', async (request) => {
    const { id } = request.params as { id: string };
    const body = z
      .object({ uploadId: z.string(), case: z.any().optional() })
      .parse(request.body ?? {});
    const caseFile = orch.resolveCaseFor(id, body.case);
    const updated = orch.withdrawUpload(id, body.uploadId, caseFile);
    const withdrawn = (updated.uploads ?? []).find((u) => u.id === body.uploadId);
    if (withdrawn) dropFile(withdrawn.hash);
    return { caseFile: updated };
  });

  /* ---------------------------------------------------------- edit fields */
  app.patch('/api/cases/:id/channels/:channelId/fields', async (request) => {
    const { id, channelId } = request.params as { id: string; channelId: string };
    const body = z.object({ values: z.record(z.string(), z.string()), case: z.any().optional() }).parse(request.body ?? {});
    if (!getCase(id)) throw new Error('case not found');
    const channel = orch.updateChannelFields(id, channelId, body.values, body.case);
    return { channel, caseFile: getCase(id) };
  });

  /* ------------------------------------------------------ transcription */
  /**
   * Voice input, arranged around TinyFish.
   *
   * The microphone has to be the *user's* - a cloud browser cannot reach it.
   * So the browser records locally, and the TinyFish agent does the rest: it
   * opens the transcription page, uploads the recording through the page's own
   * file field, and reads the transcript back out of the page.
   */
  const recordings = new Map<string, { name: string; type: string; data: Buffer }>();
  let recordingSeq = 0;

  app.get('/api/audio/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const rec = recordings.get(id);
    if (!rec) {
      reply.code(404);
      return reply.send({ error: 'recording not found' });
    }
    reply.header('Content-Type', rec.type || 'audio/webm');
    return reply.send(rec.data);
  });

  /**
   * The transcription page calls this with the file it received. If an
   * OpenAI-compatible speech endpoint is configured we use it; otherwise we
   * say so plainly rather than returning a fake transcript.
   */
  app.post('/api/stt', async (request, reply) => {
    const file = (request as any).file as { filename: string; mimetype: string; buffer: Buffer } | undefined;
    if (!file) {
      reply.code(400);
      return reply.send({ error: 'no file' });
    }
    if (!config.llm.key) {
      return reply.send({
        transcript: '',
        error:
          'No speech-to-text service is configured for this deployment. Set LLM_API_KEY and LLM_BASE_URL to an OpenAI-compatible endpoint that supports /audio/transcriptions (for example Groq with whisper-large-v3).',
      });
    }
    try {
      const form = new FormData();
      form.append('file', new Blob([file.buffer], { type: file.mimetype }), file.filename);
      form.append('model', process.env.STT_MODEL ?? 'whisper-large-v3');
      const res = await fetch(`${config.llm.baseUrl.replace(/\/$/, '')}/audio/transcriptions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${config.llm.key}` },
        body: form,
      });
      const json = (await res.json()) as { text?: string; error?: { message?: string } };
      if (!res.ok) return reply.send({ transcript: '', error: json.error?.message ?? `HTTP ${res.status}` });
      return reply.send({ transcript: (json.text ?? '').trim() });
    } catch (err) {
      return reply.send({ transcript: '', error: (err as Error).message });
    }
  });

  app.post('/api/transcribe', async (request, reply) => {
    const file = (request as any).file as { filename: string; mimetype: string; buffer: Buffer } | undefined;
    if (!file) {
      reply.code(400);
      return reply.send({ error: 'no audio file received' });
    }

    const id = `rec-${Date.now()}-${++recordingSeq}`;
    recordings.set(id, { name: file.filename, type: file.mimetype, data: file.buffer });

    const base = publicBaseUrl(request);
    const audioUrl = `${base}/api/audio/${id}`;
    const page = `${base}/demo-portals/transcribe.html?src=${encodeURIComponent(audioUrl)}`;

    const goal = [
      'Transcribe an audio recording.',
      `1. Open ${page}`,
      '   The page fetches the recording itself and starts transcribing.',
      '2. Wait for the text box below the buttons to fill in.',
      '3. Read that text out of the text box and return it as the transcript.',
      'If the text box shows an error instead of a transcript, return that error text as the transcript.',
    ].join('\n');

    try {
      const final = await tf.runAgent(() => undefined, {
        url: page,
        goal,
        outputSchema: {
          type: 'object',
          properties: {
            transcript: { type: 'string' },
            error: { type: 'string', nullable: true },
          },
          required: ['transcript'],
        },
        maxDurationSeconds: 180,
      });
      const result = (final.result ?? {}) as { transcript?: string; error?: string | null };
      recordings.delete(id);
      return reply.send({
        transcript: (result.transcript ?? '').trim(),
        error: result.error ?? null,
        via: 'tinyfish-agent',
      });
    } catch (err) {
      recordings.delete(id);
      return reply.send({ transcript: '', error: (err as Error).message, via: 'tinyfish-agent' });
    }
  });

  /**
   * Every mutating action goes through this one route.
   *
   * It is a single path segment on purpose: a serverless platform routes
   * `/api/action` reliably, while deep paths depend on how the platform
   * handles catch-all functions. The action and its arguments travel in the
   * body, and the whole run is streamed back on the same connection.
   */
  app.post('/api/action', async (request, reply) => {
    const body = z
      .object({
        action: z.enum(['discover', 'analyse', 'file', 'monitors', 'details', 'fields', 'skip', 'withdraw']),
        id: z.string(),
        channelId: z.string().optional(),
        sandbox: z.boolean().optional(),
        submit: z.boolean().optional(),
        values: z.record(z.string(), z.string()).optional(),
        uploadId: z.string().optional(),
        profile: profileSchema.optional(),
        details: detailsSchema.optional(),
        case: z.any().optional(),
      })
      .parse(request.body ?? {});

    const { id, action, channelId } = body;
    const send = openStream(reply);
    const unsubscribe = bus.subscribe(id, (event) => send(event));

    try {
      let updated: CaseFile | undefined;
      switch (action) {
        case 'discover':
          updated = await orch.discoverChannels(id, Boolean(body.sandbox), publicBaseUrl(request), body.case);
          break;
        case 'analyse':
          await orch.analyseChannel(id, channelId!, publicBaseUrl(request), body.case);
          updated = orch.resolveCaseFor(id, body.case);
          break;
        case 'file':
          await orch.fileChannel(
            id,
            channelId!,
            { submit: Boolean(body.submit), values: body.values },
            publicBaseUrl(request),
            body.case,
          );
          updated = orch.resolveCaseFor(id, body.case);
          break;
        case 'monitors':
          updated = await orch.armMonitors(id, Boolean(body.sandbox), body.case);
          break;
        case 'details': {
          let working = orch.resolveCaseFor(id, body.case);
          if (body.profile) working = orch.updateDetails(id, body.profile, working);
          if (body.details) working = orch.updateIncidentDetails(id, body.details, working);
          updated = working;
          break;
        }
        case 'fields':
          orch.updateChannelFields(id, channelId!, body.values ?? {}, body.case);
          updated = orch.resolveCaseFor(id, body.case);
          break;
        case 'skip':
          orch.skipChannel(id, channelId!, body.case);
          updated = orch.resolveCaseFor(id, body.case);
          break;
        case 'withdraw': {
          const working = orch.resolveCaseFor(id, body.case);
          updated = orch.withdrawUpload(id, body.uploadId!, working);
          const withdrawn = (updated.uploads ?? []).find((u) => u.id === body.uploadId);
          if (withdrawn) dropFile(withdrawn.hash);
          break;
        }
      }
      if (updated) send({ type: 'case', caseFile: updated });
    } catch (err) {
      send({ type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() });
    } finally {
      unsubscribe();
      reply.raw.end();
    }
  });

  /* ------------------------------------------------------------- case file */
  /**
   * The case travels with the request. On a serverless platform the case may
   * live on a different instance by now, and the PDF must not be the thing
   * that breaks at the end of the demo.
   */
  app.post('/api/casefile', async (request, reply) => {
    const body = z.object({ id: z.string().optional(), case: z.any().optional() }).parse(request.body ?? {});
    const caseFile = (body.case as CaseFile | undefined) ?? (body.id ? getCase(body.id) : null);
    if (!caseFile) {
      reply.code(404);
      return reply.send({ error: 'case not found' });
    }
    const pdf = await renderCaseFile(caseFile, orch.monitorsFor(caseFile.id));
    reply.header('Content-Type', 'application/pdf');
    reply.header(
      'Content-Disposition',
      `attachment; filename="reclaim-your-net-case-${caseFile.id.slice(0, 8)}.pdf"`,
    );
    return reply.send(pdf);
  });

  /* ------------------------------------------------------------- catalogue */
  app.get('/api/catalogue', async () => ({
    incidentTypes: INCIDENT_TYPES,
    platforms: PLATFORM_CHANNELS,
    authorities: AUTHORITY_CHANNELS,
    protections: PROTECTION_CHANNELS,
    emergency: EMERGENCY_BY_COUNTRY,
  }));

  /* ------------------------------------------------------- demo portals */
  app.get('/demo-portals/:file', (request, reply) => {
    const { file } = request.params as { file: string };
    const safe = path.basename(file);
    const target = path.join(DEMO_DIR, safe);
    if (!safe.endsWith('.html') || !existsSync(target)) {
      reply.code(404);
      return reply.send({ error: 'not found' });
    }
    reply.header('Content-Type', 'text/html; charset=utf-8');
    return reply.send(createReadStream(target));
  });
}
