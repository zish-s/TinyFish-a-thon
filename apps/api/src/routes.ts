import { createReadStream, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { INCIDENT_TYPES, PLATFORM_CHANNELS, AUTHORITY_CHANNELS, PROTECTION_CHANNELS, EMERGENCY_BY_COUNTRY, triage } from '@redress/core';
import { bus, type CaseEvent } from './bus.js';
import { config, hasPublicTunnel, hasTinyFish } from './env.js';
import { getCase, listCases } from './store.js';
import * as orch from './pipeline/orchestrator.js';
import { renderCaseFile } from './casereport/pdf.js';
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
  })
  .default({});

const createCaseSchema = z.object({
  text: z.string().min(8, 'Tell us a little more so we can triage it.'),
  profile: profileSchema,
  country: z.string().length(2).optional(),
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
    const caseFile = orch.createCase(body.text, body.profile, body.country ?? config.country);
    reply.code(201);
    return caseFile;
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
  app.post('/api/cases/:id/discover', async (request) => {
    const { id } = request.params as { id: string };
    const body = z.object({ sandbox: z.boolean().optional() }).parse(request.body ?? {});
    if (!getCase(id)) throw new Error('case not found');
    // Fire and forget: progress arrives over the SSE stream.
    orch
      .discoverChannels(id, Boolean(body.sandbox), publicBaseUrl(request))
      .catch((err) => bus.publish(id, { type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() }));
    return { started: true };
  });

  /* ----------------------------------------------------------- analyse */
  app.post('/api/cases/:id/channels/:channelId/analyse', async (request) => {
    const { id, channelId } = request.params as { id: string; channelId: string };
    if (!getCase(id)) throw new Error('case not found');
    orch
      .analyseChannel(id, channelId, publicBaseUrl(request))
      .catch((err) => bus.publish(id, { type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() }));
    return { started: true };
  });

  /* -------------------------------------------------------------- file */
  app.post('/api/cases/:id/channels/:channelId/file', async (request) => {
    const { id, channelId } = request.params as { id: string; channelId: string };
    const body = z
      .object({ submit: z.boolean().default(false), values: z.record(z.string(), z.string()).optional() })
      .parse(request.body ?? {});
    if (!getCase(id)) throw new Error('case not found');
    orch
      .fileChannel(id, channelId, body, publicBaseUrl(request))
      .catch((err) => bus.publish(id, { type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() }));
    return { started: true };
  });

  app.post('/api/cases/:id/channels/:channelId/skip', async (request) => {
    const { id, channelId } = request.params as { id: string; channelId: string };
    const caseFile = getCase(id);
    if (!caseFile) throw new Error('case not found');
    const channel = caseFile.plan.channels.find((c) => c.id === channelId);
    if (channel) {
      channel.status = 'skipped';
      bus.publish(id, { type: 'channel', channel });
    }
    return { ok: true };
  });

  /* ----------------------------------------------------------- monitors */
  app.post('/api/cases/:id/monitors', async (request) => {
    const { id } = request.params as { id: string };
    const body = z.object({ sandbox: z.boolean().optional() }).parse(request.body ?? {});
    if (!getCase(id)) throw new Error('case not found');
    orch
      .armMonitors(id, Boolean(body.sandbox))
      .catch((err) => bus.publish(id, { type: 'log', level: 'error', message: String(err), ts: new Date().toISOString() }));
    return { started: true };
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
    reply.header('Content-Disposition', `attachment; filename="redress-case-${id.slice(0, 8)}.pdf"`);
    return reply.send(pdf);
  });

  /* ------------------------------------------------------------ pricing */
  app.get('/api/pricing', async () => ({
    currency: 'USD',
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        unit: 'forever',
        for: 'Anyone who needs to report one incident',
        includes: [
          'Full triage and channel plan',
          'Live official portal discovery',
          'File on up to 2 channels',
          'Case file export (PDF)',
        ],
        limit: '2 channels per case',
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 4.99,
        unit: 'per month',
        for: 'People handling a case on their own, or supporting someone else',
        includes: [
          'Unlimited channels',
          'Agent pre-fills and submits every form',
          'Tamper-evident evidence vault with hash chain',
          'Follow-up monitors with takedown confirmation',
          'Pre-emptive protection arming (NCII / morphed content)',
          'Printable case file for police and banks',
        ],
        limit: '10 monitored pages per case',
      },
      {
        id: 'team',
        name: 'Redress for Teams',
        price: 49,
        unit: 'per seat / month',
        for: 'NGOs, victim-support organisations, campus safety and community teams',
        includes: [
          'Everything in Pro',
          'Multi-case workspace and assignment',
          'Shared evidence vault with export',
          'Escalation templates and SLA tracking',
        ],
        limit: 'Annual contract available',
      },
      {
        id: 'api',
        name: 'Redress API (Banks & Platforms)',
        price: 499,
        unit: 'per month + usage',
        for: 'Trust & Safety, fraud and compliance teams',
        includes: [
          'Redress orchestration API: incident in, regulator-ready case file out',
          'Live channel graph per jurisdiction, refreshed on every request',
          'SLA clocks and breach alerts',
          'Audit-grade evidence chain exportable to regulators',
          'Webhooks for case status and monitor events',
        ],
        limit: 'Usage billed at cost - free search allowance passed through',
      },
    ],
    unitEconomics: {
      consumerProCost: '$0.31 per case in TinyFish credits (search is free, agent runs dominate)',
      apiCost: '$0.02 - $0.25 per orchestrated case depending on channel count',
    },
  }));

  /* ---------------------------------------------------------- catalogue */
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
