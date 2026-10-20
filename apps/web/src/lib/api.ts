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

  discover: (id: string, sandbox: boolean, current: CaseFile, onEvent: (e: CaseEvent) => void) =>
    streamAction(`/api/cases/${id}/discover`, { sandbox, case: current }, onEvent),

  analyse: (id: string, channelId: string, current: CaseFile, onEvent: (e: CaseEvent) => void) =>
    streamAction(`/api/cases/${id}/channels/${channelId}/analyse`, { case: current }, onEvent),

  file: (
    id: string,
    channelId: string,
    submit: boolean,
    current: CaseFile,
    onEvent: (e: CaseEvent) => void,
  ) => streamAction(`/api/cases/${id}/channels/${channelId}/file`, { submit, case: current }, onEvent),

  armMonitors: (id: string, current: CaseFile, onEvent: (e: CaseEvent) => void) =>
    streamAction(`/api/cases/${id}/monitors`, { case: current }, onEvent),

  updateDetails: (id: string, profile: Profile, current: CaseFile) =>
    fetch(`/api/cases/${id}/details`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...profile, case: current }),
    }).then((r) => json<{ caseFile: CaseFile }>(r)),

  updateFields: (id: string, channelId: string, values: Record<string, string>, current: CaseFile) =>
    fetch(`/api/cases/${id}/channels/${channelId}/fields`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ values, case: current }),
    }).then((r) => json<{ channel: Channel; caseFile: CaseFile }>(r)),

  skip: (id: string, channelId: string, current: CaseFile) =>
    fetch(`/api/cases/${id}/channels/${channelId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case: current }),
    }).then((r) => json<{ ok: boolean; caseFile: CaseFile }>(r)),

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
