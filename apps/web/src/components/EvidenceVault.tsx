import type { EvidenceItem, MonitorBinding } from '@redress/core';
import { SectionTitle, Tag } from './ui';

export function EvidenceVault({
  evidence,
  monitors,
  caseId,
  onArm,
  armed,
}: {
  evidence: EvidenceItem[];
  monitors: MonitorBinding[];
  caseId: string;
  onArm: () => void;
  armed: boolean;
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <SectionTitle
          eyebrow="Proof"
          title="Your evidence"
          action={
            <a href={`/api/cases/${caseId}/casefile.pdf`} className="btn-outline" target="_blank" rel="noreferrer">
              Download case file
            </a>
          }
        />
        {evidence.length === 0 ? (
          <p className="text-[13.5px] leading-relaxed text-slate-500">
            Every form the agent reads and every reference number it gets back is recorded here, hashed and chained, so
            you can prove what was filed and when.
          </p>
        ) : (
          <div className="space-y-2.5">
            {evidence.map((item) => (
              <div key={item.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-slate-800">{item.label}</span>
                  <Tag tone="slate">{item.kind.replace('_', ' ')}</Tag>
                </div>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer" className="link mt-1 block truncate">
                    {item.url}
                  </a>
                )}
                {item.content && (
                  <pre className="scroll-thin mt-2.5 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-[11.5px] leading-relaxed text-slate-600">
                    {item.content.slice(0, 1000)}
                  </pre>
                )}
                <div className="mt-2.5 space-y-0.5 font-mono text-[10.5px] text-slate-400">
                  <div>sha256 {item.hash}</div>
                  <div>prev {item.prevHash}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionTitle
          eyebrow="Follow-up"
          title="Watching for takedowns"
          action={
            <button type="button" className="btn-outline" onClick={onArm} disabled={armed}>
              {armed ? 'Armed' : 'Start watching'}
            </button>
          }
        />
        {monitors.length === 0 ? (
          <p className="text-[13.5px] leading-relaxed text-slate-500">
            Once something is filed, we can keep checking the page every few hours and tell you whether the content
            actually came down - or quietly came back.
          </p>
        ) : (
          <div className="space-y-2.5">
            {monitors.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-slate-800">{m.channelName}</span>
                  <Tag tone={m.status === 'active' ? 'brand' : 'slate'}>{m.status}</Tag>
                </div>
                <p className="mt-1 font-mono text-[11.5px] text-slate-400">{m.target}</p>
                <p className="mt-1.5 text-[13px] text-slate-600">{m.purpose}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
