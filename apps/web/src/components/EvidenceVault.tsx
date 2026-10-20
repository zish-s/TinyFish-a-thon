import type { EvidenceItem, MonitorBinding } from '@redress/core';
import { Panel, Pill, Empty } from './ui';

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
    <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <Panel
        title="Evidence chain"
        action={
          <a
            href={`/api/cases/${caseId}/casefile.pdf`}
            className="btn-ghost text-xs"
            target="_blank"
            rel="noreferrer"
          >
            Download case file (PDF)
          </a>
        }
      >
        {evidence.length === 0 ? (
          <Empty>
            No evidence captured yet. Every form the agent reads and every reference number it gets back is added here
            with a SHA-256 hash chained to the previous record.
          </Empty>
        ) : (
          <div className="space-y-3">
            {evidence.map((item) => (
              <div key={item.id} className="panel-inset p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-200">{item.label}</span>
                  <Pill tone="neutral">{item.kind.replace('_', ' ')}</Pill>
                </div>
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-0.5 block truncate font-mono text-[11px] text-slate-500 hover:text-brand-300"
                  >
                    {item.url}
                  </a>
                )}
                {item.content && (
                  <pre className="scroll-thin mt-2 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-ink-950/70 p-2.5 font-mono text-[11px] leading-relaxed text-slate-400">
                    {item.content.slice(0, 1200)}
                  </pre>
                )}
                <div className="mt-2 space-y-0.5 font-mono text-[10.5px] text-slate-600">
                  <div>sha256 {item.hash}</div>
                  <div>prev {item.prevHash}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Follow-up monitoring"
        action={
          <button type="button" className="btn-primary text-xs" onClick={onArm} disabled={armed}>
            {armed ? 'Monitors armed' : 'Arm follow-up'}
          </button>
        }
      >
        {monitors.length === 0 ? (
          <Empty>
            Nothing is being watched yet. Arming a monitor makes TinyFish re-check the reported URL on a schedule and
            tell you when the content actually comes down - or when it does not.
          </Empty>
        ) : (
          <div className="space-y-2.5">
            {monitors.map((m) => (
              <div key={m.id} className="panel-inset p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13px] font-medium text-slate-200">{m.channelName}</span>
                  <Pill tone={m.status === 'active' ? 'brand' : 'neutral'}>{m.status}</Pill>
                </div>
                <p className="mt-1 font-mono text-[11px] text-slate-500">{m.target}</p>
                <p className="mt-1 text-[12px] text-slate-400">{m.purpose}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
