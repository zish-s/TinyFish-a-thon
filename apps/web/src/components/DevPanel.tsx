import { useState } from 'react';
import type { CaseFile } from '@reclaim/core';
import { describeLabel } from '@reclaim/core';
import { SectionTitle, Tag } from './ui';

function signedWeight(value: number): string {
  return value >= 0 ? `+${value.toFixed(2)}` : value.toFixed(2);
}

const chip = 'rounded-lg border border-hair-8 bg-canvas px-2 py-0.5 font-mono text-[11px] text-ink';

/**
 * The explainable model's own reading of the story, for people building or
 * judging ReclaimYourNet. Deliberately one click deeper than the main flow:
 * a person here to file a report never needs to see token weights, and the
 * panel ships closed because of that.
 */
export function DevPanel({ caseFile }: { caseFile: CaseFile }) {
  const [open, setOpen] = useState(false);
  const triage = caseFile.incident;

  const labels = [...triage.labels].sort((a, b) => b.probability - a.probability);
  const active = new Set<string>(triage.activeLabels);

  return (
    <div>
      <SectionTitle
        eyebrow="For developers"
        title="Why the model chose this"
        action={
          <button type="button" className="btn-outline !py-1.5" onClick={() => setOpen((v) => !v)}>
            {open ? 'Hide' : 'Open the panel'}
          </button>
        }
      />
      {open && (
        <div className="space-y-6">
          <p className="max-w-2xl text-[13.5px] leading-relaxed text-muted">
            The triage model's own reading of the description you gave - kept out of the main
            flow on purpose, because a person filing a report does not need token weights.
            Everything below is computed locally and comes from the case in this tab; nothing is
            fetched or stored. Reproduce the cross-validation table with{' '}
            <span className="font-mono text-[12.5px]">npm run eval</span>, or get the same object
            from <span className="font-mono text-[12.5px]">POST /api/triage</span>.
          </p>

          <div className="card overflow-hidden">
            <div className="border-b border-hair-8 px-5 py-3 text-[12px] font-bold uppercase tracking-[0.14em] text-muted-faint">
              Labels, strongest first
            </div>
            <div className="divide-y divide-hair-8">
              {labels.slice(0, 7).map((label) => (
                <div key={label.label} className="flex flex-wrap items-start gap-3 px-5 py-3">
                  <span className="min-w-[220px] font-mono text-[13px] font-semibold text-ink">
                    {label.label === triage.primaryLabel ? '★ ' : ''}
                    {describeLabel(label.label)}
                  </span>
                  {active.has(label.label) && <Tag tone="mint">in this case</Tag>}
                  {label.label === triage.primaryLabel && <Tag tone="coral">primary</Tag>}
                  <span className="font-mono text-[12px] text-muted">p={label.probability.toFixed(3)}</span>
                  <div className="flex max-w-[560px] flex-wrap gap-1.5">
                    {label.contributions.slice(0, 6).map((c, i) => (
                      <span key={`${c.token}-${i}`} className={chip}>
                        {c.token} <span className="text-coral-600">{signedWeight(c.weight)}</span>
                      </span>
                    ))}
                    {label.contributions.length > 6 && (
                      <span className="self-center text-[11px] text-muted-faint">
                        +{label.contributions.length - 6} more tokens
                      </span>
                    )}
                    {label.contributions.length === 0 && (
                      <span className="text-[11.5px] text-muted-faint">no stored weights</span>
                    )}
                  </div>
                </div>
              ))}
              {labels.length > 7 && (
                <div className="px-5 py-2.5 text-[12px] text-muted-faint">
                  + {labels.length - 7} further labels scored below these
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-faint">
              Entities the planner cares about
            </p>
            {triage.entities.length > 0 ? (
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {triage.entities.map((e, i) => (
                  <span key={`${e.type}-${i}`} className={chip}>
                    <span className="text-muted">{e.type}</span> {e.raw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-[13px] leading-relaxed text-muted">
                Nothing extracted - routing here works on labels alone.
              </p>
            )}
          </div>

          <div className="card p-5">
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-faint">
              What the model actually reads (sensitive values masked)
            </p>
            <pre className="scroll-thin mt-2.5 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-muted">
              {triage.redactedText || '(empty)'}
            </pre>
            {triage.redactions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {triage.redactions.map((r, i) => (
                  <span key={`${r.placeholder}-${i}`} className={chip}>
                    <span className="text-muted">{r.placeholder}</span> {r.preview}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
