import { useEffect, useRef } from 'react';
import type { AgentStep } from '@redress/core';
import type { LogLine } from '../lib/api';
import { SectionTitle, Dot, Tag } from './ui';

const TONE = {
  pending: 'idle',
  running: 'busy',
  done: 'ok',
  failed: 'error',
} as const;

export function AgentTheatre({
  steps,
  logs,
  streamingUrl,
}: {
  steps: AgentStep[];
  logs: LogLine[];
  streamingUrl?: string;
}) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs.length]);

  const running = steps.find((s) => s.status === 'running');

  return (
    <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div>
        <SectionTitle
          eyebrow="Live"
          title="What the agent is doing"
          action={
            <span className="flex items-center gap-2 text-xs text-slate-500">
              <Dot tone={running ? 'busy' : 'idle'} />
              {running ? 'browser is live' : 'idle'}
            </span>
          }
        />
        {streamingUrl ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-900">
            <iframe title="Agent browser" src={streamingUrl} className="aspect-video w-full" />
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-center">
            <p className="text-sm text-slate-500">The agent's browser shows up here when it starts working.</p>
            <p className="mt-1 text-[13px] text-slate-400">Pick a channel and press “Read the form”.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <SectionTitle eyebrow="Steps" title="Timeline" />
          {steps.length === 0 ? (
            <p className="text-[13.5px] text-slate-400">Nothing yet.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((step) => (
                <li key={step.id} className="flex gap-3">
                  <div className="mt-1.5">
                    <Dot tone={TONE[step.status]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[14px] font-medium text-slate-800">{step.channelName}</span>
                      <span className="text-[11px] text-slate-400">
                        {step.finishedAt && step.startedAt
                          ? `${Math.max(0, Math.round((Date.parse(step.finishedAt) - Date.parse(step.startedAt)) / 1000))}s`
                          : step.status}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-slate-500">{step.purpose}</p>
                    {step.error && <p className="mt-0.5 text-[12px] text-rose-600">{step.error}</p>}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <SectionTitle eyebrow="Log" title="Run log" />
          <div
            ref={logRef}
            className="scroll-thin max-h-56 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 font-mono text-[12px] leading-relaxed"
          >
            {logs.length === 0 ? (
              <p className="text-slate-400">Waiting for the first event...</p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="shrink-0 text-slate-300">{new Date(line.ts).toLocaleTimeString()}</span>
                  <span
                    className={
                      line.level === 'error'
                        ? 'text-rose-600'
                        : line.level === 'warn'
                          ? 'text-amber-600'
                          : line.level === 'success'
                            ? 'text-brand-700'
                            : 'text-slate-500'
                    }
                  >
                    {line.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function StatusLine({ status }: { status: string }) {
  const tone = status === 'filed' ? 'brand' : status === 'failed' ? 'rose' : 'slate';
  return <Tag tone={tone as 'brand' | 'rose' | 'slate'}>{status}</Tag>;
}
