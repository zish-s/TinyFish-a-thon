import { useState } from 'react';
import type { Channel } from '@reclaim/core';
import { SectionTitle, Tag, hostOf, type Tone } from './ui';
import { ArrowCurve, Sparkles } from './Doodles';

const GROUPS: Array<{ kind: string; title: string; blurb: string }> = [
  { kind: 'platform', title: 'Remove it from the platform', blurb: 'Where the account or post actually lives.' },
  { kind: 'authority', title: 'Create a legal record', blurb: 'What a bank, a cyber cell or a court will accept.' },
  { kind: 'financial', title: 'Stop the money', blurb: 'Freezes and disputes. These have hard clocks.' },
  { kind: 'protection', title: 'Take it down before it spreads', blurb: 'Upload it once, and they pull every copy back.' },
  { kind: 'support', title: 'Shrink the blast radius', blurb: 'De-index and de-verify so people stop finding it.' },
];

const STATUS: Record<string, { tone: Tone; label: string }> = {
  planned: { tone: 'neutral', label: 'not started' },
  analysed: { tone: 'sky', label: 'form read' },
  ready: { tone: 'butter', label: 'ready to file' },
  submitted: { tone: 'mint', label: 'filed' },
  skipped: { tone: 'neutral', label: 'skipped' },
  failed: { tone: 'rose', label: 'failed' },
  manual: { tone: 'butter', label: 'manual step' },
};

/** Channels where the work happens on someone else's site. */
const EXTERNAL_KINDS = new Set(['protection', 'support']);

function detailsBlock(channel: Channel): string {
  const lines: string[] = [`Filing at ${hostOf(channel.url)}`, ''];
  for (const [key, value] of Object.entries(channel.draft ?? {})) {
    if (value) lines.push(`${key}: ${value}`);
  }
  return lines.join('\n');
}

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
  const [copied, setCopied] = useState<string | null>(null);

  const laterCount = channels.filter((c) => c.priority === 'later').length;
  const visible = showLater ? channels : channels.filter((c) => c.priority !== 'later');

  const copyDetails = async (channel: Channel) => {
    const text = detailsBlock(channel);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      area.remove();
    }
    setCopied(channel.id);
    setTimeout(() => setCopied((prev) => (prev === channel.id ? null : prev)), 2000);
  };

  return (
    <div className="space-y-10">
      {gaps.length > 0 && (
        <div className="rounded-3xl border border-butter-300/70 bg-butter-50/80 p-6">
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#7A5C0B]">
            <Sparkles className="h-4 w-4" />
            Still missing
          </h3>
          <div className="mt-3 space-y-4">
            {gaps.map((gap) => (
              <div key={gap.id}>
                <p className="text-sm font-semibold text-[#7A5C0B]">{gap.title}</p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-[#8A6A12]">{gap.detail}</p>
                <p className="mt-1.5 text-[13.5px] font-medium text-[#7A5C0B]">→ {gap.action}</p>
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
              action={<span className="text-[13px] text-muted-faint">{group.blurb}</span>}
            />
            <div className="space-y-3">
              {items.map((channel) => {
                const status = STATUS[channel.status] ?? STATUS.planned;
                const isOpen = open === channel.id;
                const missing = channel.requiredFields.filter((f) => f.required && !channel.draft[f.name]);
                const host = hostOf(channel.url);
                const external = EXTERNAL_KINDS.has(channel.kind);
                const needsUpload = channel.requiredFields.some((f) => f.kind === 'file');
                return (
                  <div key={channel.id} className="card overflow-hidden">
                    <div className="flex flex-wrap items-start gap-4 px-5 py-4 sm:px-6">
                      <button
                        type="button"
                        onClick={() => setOpen(isOpen ? null : channel.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          {channel.url ? (
                            <a
                              href={channel.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[15px] font-bold text-ink underline decoration-coral-300 decoration-2 underline-offset-4 transition hover:decoration-coral-500"
                            >
                              {channel.name}
                            </a>
                          ) : (
                            <span className="text-[15px] font-bold text-ink">{channel.name}</span>
                          )}
                          <Tag tone={status.tone}>{status.label}</Tag>
                          {channel.priority === 'later' && <Tag tone="lilac">later</Tag>}
                          {channel.reference && <Tag tone="mint">{channel.reference}</Tag>}
                          {missing.length > 0 && <Tag tone="butter">{missing.length} to fill</Tag>}
                        </div>
                        <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{channel.why}</p>
                        {host ? (
                          <a
                            href={channel.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1.5 inline-block font-mono text-[11.5px] text-coral-600 underline underline-offset-2 hover:text-coral-700"
                          >
                            {host} ↗
                          </a>
                        ) : (
                          <p className="mt-1.5 font-mono text-[11.5px] text-muted-faint">looking for the official page...</p>
                        )}
                      </button>

                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        {host ? (
                          <>
                            <a
                              href={channel.url}
                              target="_blank"
                              rel="noreferrer"
                              className="btn-primary !px-4 !py-2 !text-[13px]"
                            >
                              {external ? 'Open' : 'Go to site'}
                            </a>
                            <button
                              type="button"
                              onClick={() => setOpen(isOpen ? null : channel.id)}
                              className="btn-quiet !px-2.5 !py-2 !text-[13px]"
                            >
                              {isOpen ? 'Hide' : 'Details'}
                            </button>
                          </>
                        ) : (
                          <>
                            <Tag tone="butter">no page found</Tag>
                            <button
                              type="button"
                              onClick={() => onAnalyse(channel.id)}
                              className="btn-outline !px-3 !py-1.5 !text-[12.5px]"
                            >
                              Look again
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {isOpen && (
                      <div className="border-t border-hair-8 bg-canvas/70 px-5 py-5 sm:px-6">
                        {external && (
                          <div className="mb-4 flex items-start gap-3 rounded-2xl border border-lilac-100 bg-lilac-50/70 px-4 py-3">
                            <ArrowCurve className="mt-0.5 h-5 w-8 shrink-0 text-lilac-500" />
                            <p className="text-[13px] leading-relaxed text-muted">
                              This one runs on{' '}
                              <a
                                href={channel.url}
                                target="_blank"
                                rel="noreferrer"
                                className="font-semibold text-coral-600 underline underline-offset-2 hover:text-coral-700"
                              >
                                {host} ↗
                              </a>
                              , so we cannot file it from here. Open it in a new tab
                              {needsUpload ? ', upload the file, and paste your details' : ' and paste your details'} - we
                              have copied them for you.
                            </p>
                          </div>
                        )}

                        {channel.slaNote && (
                          <p className="mb-4 text-[13px] leading-relaxed text-muted">
                            <span className="font-semibold text-ink">Timing: </span>
                            {channel.slaNote}
                          </p>
                        )}

                        {channel.requiredFields.length > 0 && (
                          <>
                            <p className="eyebrow mb-2">Your details</p>
                            <div className="mb-4 space-y-1.5">
                              {channel.requiredFields.map((f) => {
                                const value = channel.draft[f.name] ?? '';
                                const isMissing = f.required && !value;
                                return (
                                  <div
                                    key={f.name}
                                    className={`rounded-2xl border px-4 py-2.5 ${
                                      isMissing ? 'border-butter-300 bg-butter-50/60' : 'border-hair-8 bg-white'
                                    }`}
                                  >
                                    <div className="text-[12px] text-muted">{f.label}</div>
                                    <div className={`mt-0.5 font-mono text-[12.5px] ${isMissing ? 'text-[#8A6A12]' : 'text-ink'}`}>
                                      {isMissing
                                        ? 'needs your input'
                                        : value.length > 140
                                          ? `${value.slice(0, 140)}...`
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
                            <p className="eyebrow mb-1.5">What they will ask you for</p>
                            <ul className="mb-4 space-y-1">
                              {channel.requiredEvidence.map((e) => (
                                <li key={e} className="flex gap-2 text-[13px] text-muted">
                                  <span className="text-coral-500">•</span>
                                  {e}
                                </li>
                              ))}
                            </ul>
                          </>
                        )}

                        {channel.error && (
                          <p className="mb-4 rounded-2xl border border-butter-300 bg-butter-50 px-4 py-2.5 text-[13px] text-[#7A5C0B]">
                            {channel.error}
                          </p>
                        )}

                        {channel.alternates && channel.alternates.length > 0 && (
                          <div className="mb-4">
                            <p className="eyebrow mb-1.5">Also found live</p>
                            <div className="flex flex-col gap-1">
                              {channel.alternates.map((alt) => (
                                <a
                                  key={alt.url}
                                  href={alt.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="link"
                                >
                                  {alt.title}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-outline"
                            onClick={() => copyDetails(channel)}
                          >
                            {copied === channel.id ? 'Copied' : 'Copy my details'}
                          </button>
                          {host && (
                            <a href={channel.url} target="_blank" rel="noreferrer" className="btn-primary">
                              Open {host}
                            </a>
                          )}
                          {!external && host && (
                            <>
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
                            </>
                          )}
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
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-hair-8 bg-white/70 px-6 py-5">
          <p className="text-[13.5px] text-muted">
            <span className="font-semibold text-ink">{laterCount} more</span> worth doing once the urgent ones are done -
            pre-emptive takedown, de-indexing and credential checks.
          </p>
          <button type="button" className="btn-outline" onClick={() => setShowLater((v) => !v)}>
            {showLater ? 'Hide' : 'Show them'}
          </button>
        </div>
      )}
    </div>
  );
}
