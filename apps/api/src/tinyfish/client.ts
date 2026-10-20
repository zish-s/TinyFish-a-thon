import { config } from '../env.js';

/**
 * Thin, dependency-light client for the five TinyFish surfaces we use:
 * Search (live portal discovery), Fetch (evidence snapshots), Agent (form
 * archaeology + filing), Monitor (follow-up tracking) and Wallet (credits).
 *
 * Everything is server side. The API key never leaves this process.
 */

const AGENT_BASE = 'https://agent.tinyfish.ai';
const SEARCH_BASE = 'https://api.search.tinyfish.ai';
const FETCH_BASE = 'https://api.fetch.tinyfish.ai';

export class TinyFishError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly helpUrl?: string,
  ) {
    super(message);
    this.name = 'TinyFishError';
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'X-API-Key': config.tinyfishKey,
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });
  const text = await res.text();
  if (!res.ok) {
    let code: string | undefined;
    let msg = text.slice(0, 400);
    try {
      const parsed = JSON.parse(text);
      code = parsed?.error?.code ?? parsed?.code;
      msg = parsed?.error?.message ?? parsed?.message ?? msg;
    } catch {
      /* keep raw text */
    }
    if (res.status === 401 || code === 'MISSING_API_KEY' || code === 'INVALID_API_KEY') {
      throw new TinyFishError(
        'TinyFish is not configured on this deployment. Add TINYFISH_API_KEY as an environment variable and redeploy.',
        res.status,
        code,
      );
    }
    throw new TinyFishError(`TinyFish ${res.status}: ${msg}`, res.status, code);
  }
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return { raw: text } as unknown as T;
  }
}

/* ------------------------------------------------------------------ search */

export interface SearchResult {
  position: number;
  site_name: string;
  title: string;
  snippet: string;
  url: string;
  date?: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  page: number;
}

export async function search(
  query: string,
  opts: { location?: string; language?: string; includeDomains?: string[]; purpose?: string } = {},
): Promise<SearchResponse> {
  const url = new URL(SEARCH_BASE);
  url.searchParams.set('query', query);
  url.searchParams.set('location', opts.location ?? config.country);
  url.searchParams.set('language', opts.language ?? config.lang);
  if (opts.includeDomains?.length) url.searchParams.set('include_domains', opts.includeDomains.join(','));
  if (opts.purpose) url.searchParams.set('purpose', opts.purpose);
  return request<SearchResponse>(url.toString(), { method: 'GET' });
}

/* ------------------------------------------------------------------- fetch */

export interface FetchResult {
  results?: Array<{
    url: string;
    final_url: string;
    title: string;
    description: string | null;
    language: string;
    format: string;
    text: string;
    latency_ms: number;
  }>;
  errors?: Array<{ url: string; error: string }>;
  request_id?: string;
}

export async function fetchContents(urls: string[], format: 'json' | 'markdown' | 'html' = 'markdown', ttl?: number) {
  return request<FetchResult>(FETCH_BASE, {
    method: 'POST',
    body: JSON.stringify({ urls, format, ...(ttl === undefined ? {} : { ttl }) }),
  });
}

/* ------------------------------------------------------------------- agent */

export type AgentEvent =
  | { type: 'STARTED'; run_id: string; timestamp: string }
  | { type: 'STREAMING_URL'; run_id: string; streaming_url: string; timestamp: string }
  | { type: 'PROGRESS'; run_id: string; purpose: string; timestamp: string }
  | { type: 'HEARTBEAT'; run_id: string; timestamp: string }
  | {
      type: 'COMPLETE';
      run_id: string;
      status: 'COMPLETED' | 'FAILED' | 'CANCELLED';
      result?: unknown;
      error?: { code?: string; message?: string; help_url?: string };
      timestamp: string;
    };

export type AgentCompleteEvent = Extract<AgentEvent, { type: 'COMPLETE' }>;

export interface AgentRunOptions {
  url: string;
  goal: string;
  outputSchema?: Record<string, unknown>;
  browserProfile?: 'lite' | 'stealth';
  countryCode?: string;
  maxDurationSeconds?: number;
  signal?: AbortSignal;
}

/** Streams an agent run, invoking `onEvent` for every SSE frame. */
export async function runAgent(
  onEvent: (event: AgentEvent) => void,
  opts: AgentRunOptions,
): Promise<AgentCompleteEvent> {
  const body: Record<string, unknown> = { url: opts.url, goal: opts.goal };
  if (opts.outputSchema) body.output_schema = opts.outputSchema;
  if (opts.browserProfile) body.browser_profile = opts.browserProfile;
  if (opts.countryCode) body.proxy_config = { enabled: true, type: 'tinyfish', country_code: opts.countryCode };
  if (opts.maxDurationSeconds) body.agent_config = { max_duration_seconds: opts.maxDurationSeconds };

  const res = await fetch(`${AGENT_BASE}/v1/automation/run-sse`, {
    method: 'POST',
    headers: { 'X-API-Key': config.tinyfishKey, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: opts.signal,
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    if (res.status === 401) {
      throw new TinyFishError(
        'TinyFish is not configured on this deployment. Add TINYFISH_API_KEY as an environment variable and redeploy.',
        401,
        'MISSING_API_KEY',
      );
    }
    throw new TinyFishError(`TinyFish agent ${res.status}: ${text.slice(0, 300)}`, res.status);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let final: AgentCompleteEvent | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split('\n\n');
    buffer = frames.pop() ?? '';
    for (const frame of frames) {
      const line = frame.split('\n').find((l) => l.startsWith('data:'));
      if (!line) continue;
      try {
        const event = JSON.parse(line.slice(5).trim()) as AgentEvent;
        onEvent(event);
        if (event.type === 'COMPLETE') final = event;
      } catch {
        /* ignore malformed frame */
      }
    }
  }

  if (!final) throw new TinyFishError('TinyFish agent stream ended without a COMPLETE event', 500);
  return final;
}

export async function getRun(runId: string) {
  return request<Record<string, unknown>>(`${AGENT_BASE}/v1/runs/${runId}`, { method: 'GET' });
}

export async function listRuns(params: { status?: string; limit?: number } = {}) {
  const url = new URL(`${AGENT_BASE}/v1/runs`);
  if (params.status) url.searchParams.set('status', params.status);
  url.searchParams.set('limit', String(params.limit ?? 20));
  return request<Record<string, unknown>>(url.toString(), { method: 'GET' });
}

/* ---------------------------------------------------------------- monitor */

export interface MonitorRecord {
  id: string;
  name: string;
  type: 'fetch' | 'search';
  config: Record<string, unknown>;
  schedule_cron: string;
  status: string;
  last_error: string | null;
  created_at: string;
}

export async function createMonitor(input: {
  type: 'fetch' | 'search';
  name: string;
  config: Record<string, unknown>;
  schedule_cron: string;
  purpose?: string;
  webhook_url?: string;
}) {
  return request<{ monitor: MonitorRecord; run: unknown }>(`${AGENT_BASE}/v1/monitors`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function listMonitors() {
  return request<{ monitors: MonitorRecord[] }>(`${AGENT_BASE}/v1/monitors`, { method: 'GET' });
}

export async function runMonitorNow(id: string) {
  return request<{ run: unknown }>(`${AGENT_BASE}/v1/monitors/${id}/runs`, { method: 'POST' });
}

export async function deleteMonitor(id: string) {
  return request<{ deleted: boolean }>(`${AGENT_BASE}/v1/monitors/${id}`, { method: 'DELETE' });
}

/* ----------------------------------------------------------------- wallet */

export interface Wallet {
  available_balance: string;
  currency: string;
  rates?: { meters: Array<{ label: string; unit_amount: string; currency: string; per: string }> };
}

export async function getWallet(): Promise<Wallet> {
  return request<Wallet>(`${AGENT_BASE}/v1/wallet`, { method: 'GET' });
}
