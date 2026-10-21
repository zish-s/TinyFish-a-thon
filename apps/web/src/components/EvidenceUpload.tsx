import { useRef, useState } from 'react';
import type { UploadedEvidence } from '@reclaim/core';
import { Tag } from './ui';

function size(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The reporter's own evidence.
 *
 * Everything the agent collects is a record of what was filed. This is the
 * other half: the screenshots, the videos and the receipts that the person
 * holds. They are hashed, they become annexures of the case file, and the
 * case file prints them so the file handed to a police station is the file
 * that was given here.
 */
export function EvidenceUpload({
  uploads,
  busy,
  onUpload,
  onWithdraw,
}: {
  uploads: UploadedEvidence[];
  busy: boolean;
  onUpload: (file: File, description: string, capturedAt: string) => void;
  onWithdraw: (uploadId: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [capturedAt, setCapturedAt] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const live = uploads.filter((u) => !u.withdrawn);
  const withdrawn = uploads.filter((u) => u.withdrawn);

  const submit = () => {
    if (!file) {
      setError('Choose a file first.');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setError('That file is over 25 MB. Attach a shorter version, or put it on a drive and add the link instead.');
      return;
    }
    setError(null);
    onUpload(file, description.trim(), capturedAt);
    setFile(null);
    setDescription('');
    setCapturedAt('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mt-4 rounded-2xl border border-ink/10 bg-canvas/60 p-4">
      <p className="text-[13px] font-bold text-ink">Attach your own evidence</p>
      <p className="mt-1 text-[12.5px] leading-relaxed text-muted">
        Screenshots, screen recordings, videos, payment receipts, exported chats. Each file is fingerprinted with a
        SHA-256 hash, printed in the case file as an annexure, and the images are reproduced in the PDF itself. Anything
        the agent could not collect, you can add here.
      </p>

      <div className="mt-3.5 space-y-2.5">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">File</span>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*,.pdf,.txt,.csv,.doc,.docx"
            className="block w-full text-[12.5px] text-muted file:mr-3 file:rounded-full file:border-0 file:bg-white file:px-3.5 file:py-1.5 file:text-[12.5px] file:font-semibold file:text-ink"
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">What does this show?</span>
          <input
            className="input !py-2.5 !text-sm"
            placeholder="e.g. the message asking my friends for money, with the timestamp"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-muted">When was it captured (if you know)</span>
          <input
            type="date"
            className="input !py-2.5 !text-sm"
            value={capturedAt}
            onChange={(e) => setCapturedAt(e.target.value)}
          />
        </label>

        {error && <p className="text-[12.5px] font-medium text-[#A63A56]">{error}</p>}

        <button type="button" className="btn-primary !py-2" disabled={busy || !file} onClick={submit}>
          {busy ? 'Attaching...' : 'Attach to the case file'}
        </button>
      </div>

      {live.length > 0 && (
        <div className="mt-4 space-y-2">
          {live.map((u) => (
            <div key={u.id} className="rounded-xl border border-ink/10 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{u.name}</span>
                <Tag tone="mint">Annexure</Tag>
              </div>
              {u.description && <p className="mt-1 text-[12.5px] text-muted">{u.description}</p>}
              <p className="mt-1 text-[11.5px] text-muted-faint">
                {u.type || 'file'} - {size(u.size)}
                {u.capturedAt ? ` - captured ${u.capturedAt}` : ''}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {u.url && (
                  <a href={u.url} target="_blank" rel="noreferrer" className="link text-[12px]">
                    Open the file
                  </a>
                )}
                <button
                  type="button"
                  className="btn-quiet !px-2 !py-0.5 !text-[11.5px]"
                  onClick={() => onWithdraw(u.id)}
                >
                  Withdraw
                </button>
                <span className="font-mono text-[10px] text-muted-faint">sha256 {u.hash.slice(0, 24)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {withdrawn.length > 0 && (
        <p className="mt-3 text-[12px] text-muted-faint">
          {withdrawn.length} file{withdrawn.length === 1 ? '' : 's'} withdrawn by you. The record of them stays in the
          hash chain; they are no longer printed as annexures.
        </p>
      )}
    </div>
  );
}
