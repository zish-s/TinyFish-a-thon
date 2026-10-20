import type { LabelScore, TriageResult } from '@redress/core';
import { Bar, Panel, Pill, Stat } from './ui';

const LABELS: Record<string, string> = {
  impersonation: 'Impersonation / fake account',
  financial_fraud: 'Financial fraud / money lost',
  image_misuse: 'Image or video misuse',
  harassment: 'Harassment / threats',
  hate_speech: 'Hate speech / identity attack',
  stalking: 'Stalking / location exposure',
  doxxing: 'Personal information exposure',
  misinformation: 'Misinformation / fake news',
  defamation: 'Defamation / reputational harm',
  child_safety: 'Child safety',
  account_takeover: 'Account takeover',
  sextortion: 'Sextortion / blackmail',
  counterfeit: 'Counterfeit goods / fake business',
  romance_scam: 'Romance / relationship scam',
};

const URGENCY_COPY: Record<string, { tone: 'rose' | 'alert' | 'brand'; title: string }> = {
  critical: { tone: 'rose', title: 'Act now' },
  high: { tone: 'alert', title: 'Time-sensitive' },
  normal: { tone: 'brand', title: 'Standard handling' },
};

export function TriagePanel({ triage }: { triage: TriageResult }) {
  const active = triage.labels.filter((l) => l.probability >= 0.45).slice(0, 4);
  const urgency = URGENCY_COPY[triage.urgency] ?? URGENCY_COPY.normal;
  const tones: Record<string, 'brand' | 'alert' | 'rose' | 'sky'> = {
    critical: 'rose',
    high: 'alert',
    normal: 'brand',
  };

  return (
    <div className="space-y-4">
      <Panel
        title="Machine triage"
        action={
          <div className="flex items-center gap-2">
            <Pill tone={urgency.tone}>{urgency.title}</Pill>
            {triage.needsReview && <Pill tone="sky">Low confidence - please check</Pill>}
          </div>
        }
      >
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="label mb-3">Detected incident types</p>
            <div className="space-y-3">
              {active.map((l: LabelScore) => (
                <div key={l.label}>
                  <div className="mb-1 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-slate-200">{LABELS[l.label] ?? l.label}</span>
                    <span className="font-mono text-xs text-slate-400">{Math.round(l.probability * 100)}%</span>
                  </div>
                  <Bar value={l.probability} tone={tones[triage.urgency] ?? 'brand'} />
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-500">evidence:</span>
                    {l.contributions
                      .filter((c) => c.weight > 0)
                      .slice(0, 4)
                      .map((c) => (
                        <span
                          key={c.token}
                          title={`log-odds contribution ${c.weight.toFixed(2)}`}
                          className="rounded-md bg-ink-800 px-1.5 py-0.5 font-mono text-[11px] text-brand-300"
                        >
                          {c.token}
                        </span>
                      ))}
                    {l.contributions.filter((c) => c.weight > 0).length === 0 && (
                      <span className="text-[11px] text-slate-600">weak signal</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="panel-inset p-4">
              <p className="label mb-2">Why this is urgent</p>
              <ul className="space-y-2">
                {triage.urgencyReasons.map((reason) => (
                  <li key={reason} className="flex gap-2 text-[12.5px] leading-relaxed text-slate-400">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-alert-500" />
                    {reason}
                  </li>
                ))}
              </ul>
            </div>

            {triage.hardSignals.length > 0 && (
              <div className="panel-inset p-4">
                <p className="label mb-2">Escalation signals</p>
                <div className="flex flex-wrap gap-1.5">
                  {triage.hardSignals.map((s) => (
                    <Pill key={s} tone="alert">
                      {s.replace(/_/g, ' ')}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {triage.redactions.length > 0 && (
          <div className="mt-5 border-t border-ink-700/60 pt-4">
            <p className="label mb-2">Masked in every shared summary</p>
            <div className="flex flex-wrap gap-1.5">
              {triage.redactions.map((r) => (
                <span key={r.placeholder} className="chip border-ink-600 bg-ink-800/70 font-mono text-[11px] text-slate-400">
                  {r.placeholder}
                  <span className="text-slate-600">({r.preview})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Entities extracted"
          value={triage.entities.length}
          hint={triage.entities.slice(0, 3).map((e) => `${e.type}: ${e.value}`).join(' · ') || 'none found'}
        />
        <Stat
          label="Signals"
          value={triage.hardSignals.length}
          hint={triage.hardSignals.slice(0, 3).join(', ') || 'no escalation signals'}
        />
        <Stat
          label="Primary type"
          value={<span className="text-[13px]">{LABELS[triage.primaryLabel] ?? triage.primaryLabel}</span>}
          hint="Drives the default channel set"
        />
      </div>
    </div>
  );
}
