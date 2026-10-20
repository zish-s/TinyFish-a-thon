import { useEffect, useRef } from 'react';
import type { AgentStep } from '@redress/core';
import type { LogLine } from '../lib/api';
import { Panel, StatusDot } from './ui';

const STEP_TONE: Record<string, { tone: 'idle' | 'busy' | 'ok' | 'warn' | 'error' }> = {
  pending: { tone: 'idle' },
  running: { tone: 'busy' },
  done: { tone: 'ok' },
  failed: { tone: 'error' },
};

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
    <div className="grid gap-4 xl:grid-cols-[1.25fr_1fr]">
      <Panel
        title="Live agent view"
        action={
          <span className="flex items-center gap-2 text-[11px] text-slate-500">
            {running ? (
              <>
                <StatusDot tone="busy" /> TinyFish browser is live
              </>
            ) : (
              <>
                <StatusDot tone="idle" /> idle
              </>
            )}
          </span>
        }
      >
        {streamingUrl ? (
          <div className="relative overflow-hidden rounded-xl border border-ink-700 bg-black">
            <iframe
              title="TinyFish live browser"
              src={streamingUrl}
              className="aspect-video w-full"
              allow="clipboard-read; clipboard-write"
            />
            <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent px-3 py-2 text-[11px] text-slate-300">
              <span className="font-mono">{running?.channelName ?? 'agent'}</span>
              <span className="font-mono text-slate-500">read-only preview</span>
            </div>
          </div>
        ) : (
          <div className="grid-lines flex aspect-video w-full flex-col items-center justify-center rounded-xl border border-dashed border-ink-700 text-center">
            <p className="text-sm text-slate-500">
              The agent's browser appears here the moment a run starts.
            </p>
            <p className="mt-1 text-[12px] text-slate-600">
              Pick a channel and press <span className="text-brand-300">Read the live form</span> or{' '}
              <span className="text-brand-300">Fill &amp; submit</span>.
            </p>
          </div>
        )}
      </Panel>

      <div className="space-y-4">
        <Panel title="Agent timeline">
          {steps.length === 0 ? (
            <p className="text-[13px] text-slate-500">No agent runs yet.</p>
          ) : (
            <ol className="space-y-2.5">
              {steps.map((step) => {
                const tone = STEP_TONE[step.status] ?? STEP_TONE.pending;
                return (
                  <li key={step.id} className="flex gap-3">
                    <div className="mt-1.5">
                      <StatusDot tone={tone.tone} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-[13px] font-medium text-slate-200">{step.channelName}</span>
                        <span className="font-mono text-[10.5px] text-slate-500">
                          {step.finishedAt && step.startedAt
                            ? `${Math.max(0, Math.round((Date.parse(step.finishedAt) - Date.parse(step.startedAt)) / 1000))}s`
                            : step.status}
                        </span>
                      </div>
                      <p className="text-[12px] leading-relaxed text-slate-500">{step.purpose}</p>
                      {step.error && <p className="mt-0.5 text-[11.5px] text-rose-300">{step.error}</p>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>

        <Panel title="Run log">
          <div ref={logRef} className="scroll-thin max-h-56 space-y-1 overflow-y-auto pr-1 font-mono text-[11.5px]">
            {logs.length === 0 ? (
              <p className="text-slate-600">Waiting for the first event...</p>
            ) : (
              logs.map((line, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-slate-600">{new Date(line.ts).toLocaleTimeString()}</span>
                  <span
                    className={
                      line.level === 'error'
                        ? 'text-rose-300'
                        : line.level === 'warn'
                          ? 'text-alert-400'
                          : line.level === 'success'
                            ? 'text-brand-300'
                            : 'text-slate-400'
                    }
                  >
                    {line.message}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
}
