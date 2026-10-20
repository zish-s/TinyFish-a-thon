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

export const api = {
  createCase: (text: string, profile: Profile, country: string) =>
    fetch('/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, profile, country }),
    }).then((r) => json<CaseFile>(r)),

  getCase: (id: string) => fetch(`/api/cases/${id}`).then((r) => json<{ caseFile: CaseFile; monitors: MonitorBinding[] }>(r)),

  discover: (id: string, sandbox: boolean) =>
    fetch(`/api/cases/${id}/discover`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sandbox }),
    }).then((r) => json<{ started: boolean }>(r)),

  analyse: (id: string, channelId: string) =>
    fetch(`/api/cases/${id}/channels/${channelId}/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => json<{ started: boolean }>(r)),

  file: (id: string, channelId: string, submit: boolean, values?: Record<string, string>) =>
    fetch(`/api/cases/${id}/channels/${channelId}/file`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ submit, values }),
    }).then((r) => json<{ started: boolean }>(r)),

  skip: (id: string, channelId: string) =>
    fetch(`/api/cases/${id}/channels/${channelId}/skip`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }).then((r) => json<{ ok: boolean }>(r)),

  armMonitors: (id: string) =>
    fetch(`/api/cases/${id}/monitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }).then((r) => json<{ started: boolean }>(r)),

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
