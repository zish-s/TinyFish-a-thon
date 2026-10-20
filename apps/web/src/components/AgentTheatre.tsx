import { useEffect, useRef } from 'react';
import type { AgentStep } from '@reclaim/core';
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
            <span className="flex items-center gap-2 text-xs text-muted">
              <Dot tone={running ? 'busy' : 'idle'} />
              {running ? 'browser is live' : 'idle'}
            </span>
          }
        />
        {streamingUrl ? (
          <div className="overflow-hidden rounded-2xl border border-hair-8 bg-ink">
            <iframe title="Agent browser" src={streamingUrl} className="aspect-video w-full" />
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center rounded-2xl border border-dashed border-hair-12 bg-white text-center">
            <p className="text-sm text-muted">The agent's browser shows up here when it starts working.</p>
            <p className="mt-1 text-[13px] text-muted-faint">Pick a channel and press “Read the form”.</p>
          </div>
        )}
      </div>

      <div className="space-y-6">
        <div>
          <SectionTitle eyebrow="Steps" title="Timeline" />
          {steps.length === 0 ? (
            <p className="text-[13.5px] text-muted-faint">Nothing yet.</p>
          ) : (
            <ol className="space-y-3">
              {steps.map((step) => (
                <li key={step.id} className="flex gap-3">
                  <div className="mt-1.5">
                    <Dot tone={TONE[step.status]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[14px] font-medium text-ink">{step.channelName}</span>
                      <span className="text-[11px] text-muted-faint">
                        {step.finishedAt && step.startedAt
                          ? `${Math.max(0, Math.round((Date.parse(step.finishedAt) - Date.parse(step.startedAt)) / 1000))}s`
                          : step.status}
                      </span>
                    </div>
                    <p className="text-[13px] leading-relaxed text-muted">{step.purpose}</p>
                    {step.error && <p className="mt-0.5 text-[12px] text-[#A63A56]">{step.error}</p>}
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
            className="scroll-thin max-h-56 overflow-y-auto rounded-2xl border border-hair-8 bg-white p-4 font-mono text-[12px] leading-relaxed"
          >
            {logs.length === 0 ? (
              <p className="text-muted-faint">Waiting for the first event...</p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="shrink-0 text-muted-faint">{new Date(line.ts).toLocaleTimeString()}</span>
                  <span
                    className={
                      line.level === 'error'
                        ? 'text-[#A63A56]'
                        : line.level === 'warn'
                          ? 'text-[#8A6A12]'
                          : line.level === 'success'
                            ? 'text-[#1F7A5C]'
                            : 'text-muted'
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
  const tone = status === 'filed' ? 'mint' : status === 'failed' ? 'rose' : 'neutral';
  return <Tag tone={tone as 'mint' | 'rose' | 'neutral'}>{status}</Tag>;
}
