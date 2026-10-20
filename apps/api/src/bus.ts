import { EventEmitter } from 'node:events';
import type { AgentStep, CaseFile, Channel, EvidenceItem, MonitorBinding } from '@reclaim/core';

export type CaseEvent =
  | { type: 'status'; status: CaseFile['status']; message?: string }
  | { type: 'log'; level: 'info' | 'warn' | 'error' | 'success'; message: string; ts: string }
  | { type: 'step'; step: AgentStep }
  | { type: 'channel'; channel: Channel }
  | { type: 'evidence'; item: EvidenceItem }
  | { type: 'monitor'; monitor: MonitorBinding }
  | { type: 'case'; caseFile: CaseFile }
  | { type: 'done' };

/**
 * Per-case event bus. The browser opens one SSE stream per case and receives
 * every step, channel update, evidence record and monitor binding as it
 * happens - this is what makes the agent visible instead of narrated.
 */
class CaseBus extends EventEmitter {
  private buffers = new Map<string, CaseEvent[]>();
  private history: CaseEvent[] = [];

  publish(caseId: string, event: CaseEvent) {
    const list = this.buffers.get(caseId) ?? [];
    list.push(event);
    this.buffers.set(caseId, list.slice(-300));
    this.history.push(event);
    if (this.history.length > 2000) this.history = this.history.slice(-1500);
    this.emit(caseId, event);
    this.emit('*', event);
  }

  subscribe(caseId: string, listener: (event: CaseEvent) => void): () => void {
    this.on(caseId, listener);
    return () => this.off(caseId, listener);
  }

  replay(caseId: string): CaseEvent[] {
    return this.buffers.get(caseId) ?? [];
  }
}

export const bus = new CaseBus();
bus.setMaxListeners(100);

export const log = (caseId: string, level: 'info' | 'warn' | 'error' | 'success', message: string) =>
  bus.publish(caseId, { type: 'log', level, message, ts: new Date().toISOString() });

export const setStatus = (caseId: string, status: CaseFile['status'], message?: string) =>
  bus.publish(caseId, { type: 'status', status, message });
