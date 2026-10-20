import type { AgentStep, CaseFile, Channel, EvidenceItem, MonitorBinding } from '@reclaim/core';

export type { AgentStep, CaseFile, Channel, EvidenceItem, MonitorBinding };

export type LogLine = {
  type: 'log';
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  ts: string;
};

export type CaseEvent =
  | { type: 'status'; status: CaseFile['status']; message?: string }
  | LogLine
  | { type: 'step'; step: AgentStep }
  | { type: 'channel'; channel: Channel }
  | { type: 'evidence'; item: EvidenceItem }
  | { type: 'monitor'; monitor: MonitorBinding }
  | { type: 'case'; caseFile: CaseFile }
  | { type: 'done' };

export interface Profile {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
}
const json = async <T,>(res: Response): Promise<T> => {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
};

/**
 * Every action is one request that stays open for the whole agent run and
 * streams its events back. That is what lets the app work on a serverless
 * platform: the case travels with the request, so nothing depends on the
 * server remembering the last one.
 */
export async function streamAction(
  path: string,
  body: Record<string, unknown>,
  onEvent: (event: CaseEvent) => void,
): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok || !res.body) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

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
        onEvent(JSON.parse(line.slice(5).trim()) as CaseEvent);
      } catch {
        /* ignore a malformed frame */
      }
    }
  }
}

/** Runs a quick action and returns the updated case from the stream. */
async function runAndCollect(body: Record<string, unknown>): Promise<CaseFile> {
  let updated: CaseFile | undefined;
  await streamAction('/api/action', body, (event) => {
    if (event.type === 'case') updated = event.caseFile;
  });
  if (!updated) throw new Error('The server did not return the updated report');
  return updated;
}

export const api = {
  createCase: (text: string, profile: Profile, country: string) =>
    fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, profile, country }),
    }).then((r) => json<CaseFile>(r)),

  deleteCase: (id: string) =>
    fetch(`/api/cases/${id}`, { method: 'DELETE' }).then((r) => json<{ deleted: boolean }>(r)),

  getCase: (id: string) => fetch(`/api/cases/${id}`).then((r) => json<{ caseFile: CaseFile; monitors: MonitorBinding[] }>(r)),

  /**
   * One endpoint for every action, streamed. The action and its arguments
   * travel in the body, and the run's events come back on the same connection.
   */
  action: (
    body: Record<string, unknown>,
    onEvent: (event: CaseEvent) => void,
  ) => streamAction('/api/action', body, onEvent),

  discover: (id: string, sandbox: boolean, current: CaseFile, onEvent: (e: CaseEvent) => void) =>
    streamAction('/api/action', { action: 'discover', id, sandbox, case: current }, onEvent),

  analyse: (id: string, channelId: string, current: CaseFile, onEvent: (e: CaseEvent) => void) =>
    streamAction('/api/action', { action: 'analyse', id, channelId, case: current }, onEvent),

  file: (
    id: string,
    channelId: string,
    submit: boolean,
    current: CaseFile,
    onEvent: (e: CaseEvent) => void,
  ) => streamAction('/api/action', { action: 'file', id, channelId, submit, case: current }, onEvent),

  armMonitors: (id: string, current: CaseFile, onEvent: (e: CaseEvent) => void) =>
    streamAction('/api/action', { action: 'monitors', id, case: current }, onEvent),

  updateDetails: (id: string, profile: Profile, current: CaseFile) =>
    runAndCollect({ action: 'details', id, profile, case: current }),

  updateFields: (id: string, channelId: string, values: Record<string, string>, current: CaseFile) =>
    runAndCollect({ action: 'fields', id, channelId, values, case: current }),

  skip: (id: string, channelId: string, current: CaseFile) =>
    runAndCollect({ action: 'skip', id, channelId, case: current }),

  caseFileUrl: (id: string) => `/api/casefile?id=${encodeURIComponent(id)}`,

  /** Downloads the case file. The case travels with the request. */
  downloadCaseFile: async (id: string, current: CaseFile) => {
    const res = await fetch('/api/casefile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, case: current }),
    });
    if (!res.ok) throw new Error(`Could not build the case file (${res.status})`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reclaim-your-net-case-${id.slice(0, 8)}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },

  health: () => fetch('/api/health').then((r) => json<any>(r)),
  pricing: () => fetch('/api/pricing').then((r) => json<any>(r)),
};

export function subscribeToCase(caseId: string, onEvent: (event: CaseEvent) => void): () => void {
  const source = new EventSource(`/api/cases/${caseId}/stream`);
  source.onmessage = (message) => {
    try {
      onEvent(JSON.parse(message.data) as CaseEvent);
    } catch {
      /* ignore malformed frame */
    }
  };
  source.onerror = () => {
    /* EventSource retries automatically */
  };
  return () => source.close();
}
