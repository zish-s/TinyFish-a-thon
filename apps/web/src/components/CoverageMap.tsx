import { useState } from 'react';
import type { Channel } from '@redress/core';
import { Panel, Pill, StatusDot } from './ui';

const KIND_ORDER: Array<{ kind: string; title: string; blurb: string }> = [
  { kind: 'platform', title: 'Remove it from the platform', blurb: 'The account or post has to go from where it lives.' },
  { kind: 'authority', title: 'Create a legal record', blurb: 'What a bank, a cyber cell or a court will accept.' },
  { kind: 'financial', title: 'Stop the money', blurb: 'Freezes, disputes and reversals - these have hard clocks.' },
  { kind: 'protection', title: 'Arm your protection', blurb: 'Pre-emptive services that pull the content back later.' },
  { kind: 'support', title: 'Shrink the blast radius', blurb: 'De-index and de-verify so people stop finding it.' },
  { kind: 'escalation', title: 'Escalate', blurb: 'For when a form is not enough.' },
];

const STATUS_TONE: Record<string, { tone: 'idle' | 'busy' | 'ok' | 'warn' | 'error'; label: string }> = {
  planned: { tone: 'idle', label: 'not started' },
  analysed: { tone: 'warn', label: 'form read' },
  ready: { tone: 'busy', label: 'ready to file' },
  submitted: { tone: 'ok', label: 'filed' },
  skipped: { tone: 'idle', label: 'skipped' },
  failed: { tone: 'error', label: 'failed' },
  manual: { tone: 'warn', label: 'manual step' },
};

export function CoverageMap({
  channels,
  gaps,
  onAnalyse,
  onFile,
  onSkip,
  busyChannel,
}: {
  channels: Channel[];
  gaps: Array<{ id: string; title: string; detail: string; severity: string; action: string }>;
  onAnalyse: (channelId: string) => void;
  onFile: (channelId: string, submit: boolean) => void;
  onSkip: (channelId: string) => void;
  busyChannel: string | null;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [showLater, setShowLater] = useState(false);
  const laterCount = channels.filter((c) => c.priority === 'later').length;
  const visible = showLater ? channels : channels.filter((c) => c.priority !== 'later');

  return (
    <div className="space-y-4">
      {laterCount > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-ink-700/70 bg-ink-900/60 px-4 py-2.5">
          <p className="text-[12.5px] text-slate-400">
            <span className="font-semibold text-slate-200">{laterCount} more</span> channels are worth doing once the
            urgent ones are done - pre-emptive protection, de-indexing and credential checks.
          </p>
          <button type="button" className="btn-ghost shrink-0 text-xs" onClick={() => setShowLater((v) => !v)}>
            {showLater ? 'Hide them' : 'Show them'}
          </button>
        </div>
      )}

      {gaps.length > 0 && (
        <Panel title="What is still missing">
          <div className="space-y-3">
            {gaps.map((gap) => (
              <div
                key={gap.id}
                className={`rounded-xl border p-4 ${
                  gap.severity === 'blocker'
                    ? 'border-rose-500/40 bg-rose-500/[0.07]'
                    : gap.severity === 'important'
                      ? 'border-alert-500/35 bg-alert-500/[0.06]'
                      : 'border-ink-600 bg-ink-950/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <h4 className="text-sm font-semibold text-slate-100">{gap.title}</h4>
                  <Pill tone={gap.severity === 'blocker' ? 'rose' : gap.severity === 'important' ? 'alert' : 'neutral'}>
                    {gap.severity}
                  </Pill>
                </div>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-400">{gap.detail}</p>
                <p className="mt-2 text-[12.5px] font-medium text-brand-300">→ {gap.action}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {KIND_ORDER.map((group) => {
        const items = visible.filter((c) => c.kind === group.kind);
        if (!items.length) return null;
        return (
          <Panel key={group.kind} title={group.title} action={<span className="text-[11px] text-slate-500">{group.blurb}</span>}>
            <div className="space-y-2.5">
              {items.map((channel) => {
                const status = STATUS_TONE[channel.status] ?? STATUS_TONE.planned;
                const isOpen = open === channel.id;
                const missing = channel.requiredFields.filter((f) => f.required && !channel.draft[f.name]);
                return (
                  <div key={channel.id} className="panel-inset overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : channel.id)}
                      className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition hover:bg-ink-800/40"
                    >
                      <div className="mt-1">
                        <StatusDot tone={status.tone} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-100">{channel.name}</span>
                          <Pill tone={channel.priority === 'now' ? 'brand' : 'neutral'}>
                            {channel.priority === 'now' ? 'do now' : 'also consider'}
                          </Pill>
                          <Pill tone={channel.source === 'discovered' ? 'sky' : 'neutral'}>
                            {channel.source === 'discovered' ? 'live lookup' : 'seeded'}
                          </Pill>
                          {channel.reference && <Pill tone="sky">{channel.reference}</Pill>}
                          {missing.length > 0 && <Pill tone="alert">{missing.length} field(s) need you</Pill>}
                        </div>
                        <p className="mt-1 text-[12.5px] leading-relaxed text-slate-400">{channel.why}</p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="truncate font-mono">{channel.url}</span>
                          {channel.slaHours !== null && (
                            <span
                              className={
                                channel.slaHours <= 24
                                  ? 'font-semibold text-alert-400'
                                  : channel.slaHours <= 72
                                    ? 'text-slate-400'
                                    : 'text-slate-500'
                              }
                            >
                              {channel.slaHours === 0 ? 'immediate' : `${channel.slaHours}h clock`}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="mt-1 shrink-0 text-slate-600">{isOpen ? '▾' : '▸'}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-ink-700/60 bg-ink-950/50 px-4 py-4">
                        {channel.slaNote && (
                          <p className="mb-3 text-[12px] leading-relaxed text-slate-400">
                            <span className="font-semibold text-slate-300">Clock: </span>
                            {channel.slaNote}
                          </p>
                        )}

                        {channel.requiredFields.length > 0 && (
                          <>
                            <p className="label mb-2">What the agent will type</p>
                            <div className="mb-4 space-y-1.5">
                              {channel.requiredFields.map((f) => {
                                const value = channel.draft[f.name] ?? '';
                                const isMissing = f.required && !value;
                                return (
                                  <div
                                    key={f.name}
                                    className={`flex flex-col gap-0.5 rounded-lg border px-3 py-2 sm:flex-row sm:items-center sm:justify-between ${
                                      isMissing ? 'border-alert-500/40 bg-alert-500/[0.06]' : 'border-ink-700 bg-ink-900/60'
                                    }`}
                                  >
                                    <span className="text-[12.5px] text-slate-400">{f.label}</span>
                                    <span
                                      className={`font-mono text-[12px] ${
                                        isMissing ? 'text-alert-400' : 'text-slate-200'
                                      }`}
                                    >
                                      {isMissing ? 'needs your input' : value.length > 90 ? `${value.slice(0, 90)}...` : value}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {channel.requiredEvidence.length > 0 && (
                          <>
                            <p className="label mb-1.5">Evidence the portal asks for</p>
                            <ul className="mb-4 space-y-1">
                              {channel.requiredEvidence.map((e) => (
                                <li key={e} className="flex gap-2 text-[12.5px] text-slate-400">
                                  <span className="text-brand-500">▸</span>
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {channel.error && (
                          <p className="mb-3 rounded-lg border border-rose-500/30 bg-rose-500/[0.07] px-3 py-2 text-[12.5px] text-rose-300">
                            {channel.error}
                          </p>
                        )}

                        {channel.alternates && channel.alternates.length > 0 && (
                          <div className="mb-4">
                            <p className="label mb-1.5">Also found live</p>
                            <div className="flex flex-col gap-1">
                              {channel.alternates.map((alt) => (
                                <a
                                  key={alt.url}
                                  href={alt.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="truncate font-mono text-[11.5px] text-slate-500 hover:text-brand-300"
                                >
                                  {alt.title} - {alt.url}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busyChannel === channel.id}
                            onClick={() => onAnalyse(channel.id)}
                          >
                            {channel.status === 'analysed' ? 'Re-read live form' : 'Read the live form'}
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={busyChannel === channel.id}
                            onClick={() => onFile(channel.id, false)}
                          >
                            Fill it (do not submit)
                          </button>
                          <button
                            type="button"
                            className="btn-ghost"
                            disabled={busyChannel === channel.id}
                            onClick={() => onFile(channel.id, true)}
                          >
                            Fill &amp; submit
                          </button>
                          {channel.status !== 'skipped' && (
                            <button type="button" className="btn-ghost" onClick={() => onSkip(channel.id)}>
                              Skip
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
        );
      })}
    </div>
  );
}
