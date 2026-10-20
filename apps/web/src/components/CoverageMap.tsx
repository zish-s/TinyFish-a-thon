import { useState } from 'react';
import type { Channel } from '@redress/core';
import { SectionTitle, Tag, type Tone } from './ui';

const GROUPS: Array<{ kind: string; title: string; blurb: string }> = [
  { kind: 'platform', title: 'Remove it from the platform', blurb: 'Where the account or post actually lives.' },
  { kind: 'authority', title: 'Create a legal record', blurb: 'What a bank, a cyber cell or a court will accept.' },
  { kind: 'financial', title: 'Stop the money', blurb: 'Freezes and disputes. These have hard clocks.' },
  { kind: 'protection', title: 'Arm your protection', blurb: 'Services that pull the content back if it is uploaded later.' },
  { kind: 'support', title: 'Shrink the blast radius', blurb: 'De-index and de-verify so people stop finding it.' },
];

const STATUS: Record<string, { tone: Tone; label: string }> = {
  planned: { tone: 'slate', label: 'not started' },
  analysed: { tone: 'sky', label: 'form read' },
  ready: { tone: 'amber', label: 'ready to file' },
  submitted: { tone: 'brand', label: 'filed' },
  skipped: { tone: 'slate', label: 'skipped' },
  failed: { tone: 'rose', label: 'failed' },
  manual: { tone: 'amber', label: 'manual step' },
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
    <div className="space-y-10">
      {gaps.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
          <h3 className="text-sm font-bold text-amber-900">Still missing</h3>
          <div className="mt-3 space-y-3">
            {gaps.map((gap) => (
              <div key={gap.id}>
                <p className="text-sm font-semibold text-amber-900">{gap.title}</p>
                <p className="mt-0.5 text-[13px] leading-relaxed text-amber-800/90">{gap.detail}</p>
                <p className="mt-1 text-[13px] font-medium text-amber-900">→ {gap.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {GROUPS.map((group, index) => {
        const items = visible.filter((c) => c.kind === group.kind);
        if (!items.length) return null;
        return (
          <section key={group.kind}>
            <SectionTitle
              eyebrow={String(index + 1).padStart(2, '0')}
              title={group.title}
              action={<span className="text-[13px] text-slate-400">{group.blurb}</span>}
            />
            <div className="space-y-2.5">
              {items.map((channel) => {
                const status = STATUS[channel.status] ?? STATUS.planned;
                const isOpen = open === channel.id;
                const missing = channel.requiredFields.filter((f) => f.required && !channel.draft[f.name]);
                return (
                  <div key={channel.id} className="card overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setOpen(isOpen ? null : channel.id)}
                      className="flex w-full items-start gap-4 px-5 py-4 text-left transition hover:bg-slate-50/70"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[15px] font-semibold text-slate-900">{channel.name}</span>
                          <Tag tone={status.tone}>{status.label}</Tag>
                          {channel.priority === 'later' && <Tag tone="slate">later</Tag>}
                          {channel.reference && <Tag tone="brand">{channel.reference}</Tag>}
                          {missing.length > 0 && <Tag tone="amber">{missing.length} to fill</Tag>}
                        </div>
                        <p className="mt-1 text-[13.5px] leading-relaxed text-slate-500">{channel.why}</p>
                        <p className="mt-1.5 truncate font-mono text-[11.5px] text-slate-400">{channel.url}</p>
                      </div>
                      <span className="mt-1 shrink-0 text-xs text-slate-300">{isOpen ? '▾' : '▸'}</span>
                    </button>

                    {isOpen && (
                      <div className="border-t border-slate-200 bg-slate-50/60 px-5 py-5">
                        {channel.slaNote && (
                          <p className="mb-4 text-[13px] leading-relaxed text-slate-600">
                            <span className="font-semibold text-slate-800">Timing: </span>
                            {channel.slaNote}
                          </p>
                        )}

                        {channel.requiredFields.length > 0 && (
                          <>
                            <p className="eyebrow mb-2">What the agent will type</p>
                            <div className="mb-4 space-y-1.5">
                              {channel.requiredFields.map((f) => {
                                const value = channel.draft[f.name] ?? '';
                                const isMissing = f.required && !value;
                                return (
                                  <div
                                    key={f.name}
                                    className={`rounded-lg border px-3.5 py-2 ${
                                      isMissing ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white'
                                    }`}
                                  >
                                    <div className="text-[12px] text-slate-500">{f.label}</div>
                                    <div
                                      className={`mt-0.5 font-mono text-[12.5px] ${
                                        isMissing ? 'text-amber-700' : 'text-slate-800'
                                      }`}
                                    >
                                      {isMissing
                                        ? 'needs your input'
                                        : value.length > 120
                                          ? `${value.slice(0, 120)}...`
                                          : value}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        )}

                        {channel.requiredEvidence.length > 0 && (
                          <>
                            <p className="eyebrow mb-1.5">Evidence it asks for</p>
                            <ul className="mb-4 space-y-1">
                              {channel.requiredEvidence.map((e) => (
                                <li key={e} className="flex gap-2 text-[13px] text-slate-600">
                                  <span className="text-brand-600">•</span>
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {channel.error && (
                          <p className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[13px] text-amber-800">
                            {channel.error}
                          </p>
                        )}

                        {channel.alternates && channel.alternates.length > 0 && (
                          <div className="mb-4">
                            <p className="eyebrow mb-1.5">Also found live</p>
                            <div className="flex flex-col gap-1">
                              {channel.alternates.map((alt) => (
                                <a key={alt.url} href={alt.url} target="_blank" rel="noreferrer" className="link">
                                  {alt.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <a href={channel.url} target="_blank" rel="noreferrer" className="btn-outline">
                            Open the page
                          </a>
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={busyChannel === channel.id}
                            onClick={() => onAnalyse(channel.id)}
                          >
                            {channel.status === 'analysed' ? 'Re-read the form' : 'Read the form'}
                          </button>
                          <button
                            type="button"
                            className="btn-outline"
                            disabled={busyChannel === channel.id}
                            onClick={() => onFile(channel.id, false)}
                          >
                            Fill it
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            disabled={busyChannel === channel.id}
                            onClick={() => onFile(channel.id, true)}
                          >
                            Fill &amp; submit
                          </button>
                          {channel.status !== 'skipped' && (
                            <button type="button" className="btn-quiet" onClick={() => onSkip(channel.id)}>
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
          </section>
        );
      })}

      {laterCount > 0 && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4">
          <p className="text-[13.5px] text-slate-500">
            <span className="font-semibold text-slate-800">{laterCount} more</span> worth doing once the urgent ones are
            done - pre-emptive protection, de-indexing and credential checks.
          </p>
          <button type="button" className="btn-outline shrink-0" onClick={() => setShowLater((v) => !v)}>
            {showLater ? 'Hide' : 'Show'}
          </button>
        </div>
      )}
    </div>
  );
}
