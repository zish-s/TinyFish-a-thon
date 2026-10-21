import { useState } from 'react';
import type { CaseFile, EvidenceItem, MonitorBinding } from '@reclaim/core';
import { SectionTitle, Tag } from './ui';
import { EvidenceUpload } from './EvidenceUpload';
import { api } from '../lib/api';

export function EvidenceVault({
  evidence,
  uploads,
  monitors,
  caseId,
  currentCase,
  onUpload,
  onWithdraw,
  onArm,
  armed,
}: {
  evidence: EvidenceItem[];
  uploads: CaseFile['uploads'];
  monitors: MonitorBinding[];
  caseId: string;
  currentCase: CaseFile;
  onUpload: (file: File, description: string, capturedAt: string) => void;
  onWithdraw: (uploadId: string) => void;
  onArm: () => void;
  armed: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const download = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadCaseFile(caseId, currentCase);
    } catch (err) {
      setError((err as Error).message || 'Could not build the case file.');
    } finally {
      setDownloading(false);
    }
  };

  const upload = async (file: File, description: string, capturedAt: string) => {
    setBusy(true);
    setError(null);
    try {
      await onUpload(file, description, capturedAt);
    } catch (err) {
      setError((err as Error).message || 'Could not attach the file.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <SectionTitle
          eyebrow="Your case file"
          title="The record you hand over"
          action={
            <button type="button" className="btn-outline" onClick={download} disabled={downloading}>
              {downloading ? 'Building...' : 'Download case file (PDF)'}
            </button>
          }
        />
        <p className="text-[13.5px] leading-relaxed text-muted">
          A printable record with your details, when and where it happened, the account responsible, every file you attach
          as an annexure, and every place the complaint has been filed with its reference number. Print it, sign it, and
          hand it to a police station, a bank or a court.
        </p>

        <EvidenceUpload
          uploads={uploads ?? []}
          busy={busy}
          onUpload={upload}
          onWithdraw={onWithdraw}
        />

        {error && (
          <p className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-[#A63A56]">
            {error}
          </p>
        )}

        <div className="mt-6">
          <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-muted-faint">
            What the agent collected
          </p>
          {evidence.length === 0 ? (
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
              Every form the agent reads and every reference number it gets back is recorded here, hashed and chained, so
              you can prove what was filed and when.
            </p>
          ) : (
            <div className="mt-2.5 space-y-2.5">
              {evidence.map((item) => (
                <div key={item.id} className="card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[14px] font-semibold text-ink">{item.label}</span>
                    <Tag tone="neutral">{item.kind.replace('_', ' ')}</Tag>
                  </div>
                  {item.url && (
                    <a href={item.url} target="_blank" rel="noreferrer" className="link mt-1 block truncate">
                      {item.url}
                    </a>
                  )}
                  {item.content && (
                    <pre className="scroll-thin mt-2.5 max-h-28 overflow-auto whitespace-pre-wrap rounded-lg bg-canvas p-3 font-mono text-[11.5px] leading-relaxed text-muted">
                      {item.content.slice(0, 1000)}
                    </pre>
                  )}
                  <div className="mt-2.5 space-y-0.5 font-mono text-[10.5px] text-muted-faint">
                    <div>sha256 {item.hash}</div>
                    <div>prev {item.prevHash}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
          <p className="text-[13.5px] leading-relaxed text-muted">
            Once something is filed, we can keep checking the page every few hours and tell you whether the content
            actually came down - or quietly came back.
          </p>
        ) : (
          <div className="space-y-2.5">
            {monitors.map((m) => (
              <div key={m.id} className="card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[14px] font-semibold text-ink">{m.channelName}</span>
                  <Tag tone={m.status === 'active' ? 'mint' : 'neutral'}>{m.status}</Tag>
                </div>
                <p className="mt-1 font-mono text-[11.5px] text-muted-faint">{m.target}</p>
                <p className="mt-1.5 text-[13px] text-muted">{m.purpose}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
