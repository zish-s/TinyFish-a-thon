import { useEffect, useRef, useState } from 'react';
import { Tag } from './ui';

/**
 * A slot for the image or video the person has to upload to someone else's
 * site (StopNCII, Take It Down, Takedown, RemoveHer).
 *
 * We cannot upload their file to a third party for them - and we should not.
 * So this does two things instead:
 *   1. accepts a paste, a drag-and-drop, or a file pick, and shows it to them
 *      so they know they have the right one;
 *   2. puts the file on the clipboard, so on the next site they can just
 *      press Ctrl+V into the upload box.
 */
export function FileSlot({
  label,
  fileName,
  onFileName,
}: {
  label: string;
  fileName?: string;
  onFileName: (name: string) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const accept = (next: File | undefined | null) => {
    if (!next) return;
    setFile(next);
    if (next.type.startsWith('image/')) setPreview(URL.createObjectURL(next));
    onFileName(next.name);
  };

  const copyToClipboard = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.write([new ClipboardItem({ [file.type]: file })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div>
      <span className="mb-1 block text-[12.5px] font-medium text-muted">{label}</span>

      <div
        onPaste={(e) => {
          const items = Array.from(e.clipboardData?.items ?? []);
          const hit = items.find((i) => i.type.startsWith('image/') || i.type.startsWith('video/'));
          const pasted = hit?.getAsFile();
          if (pasted) {
            e.preventDefault();
            accept(pasted);
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          accept(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-2xl border-2 border-dashed p-4 transition ${
          dragOver ? 'border-coral-300 bg-coral-50' : 'border-hair-12 bg-white'
        }`}
      >
        <div className="flex flex-wrap items-center gap-3">
          {preview ? (
            <img src={preview} alt="" className="h-16 w-16 rounded-xl object-cover" />
          ) : (
            <span className="flex h-16 w-16 items-center justify-center rounded-xl bg-canvas text-2xl">🖼️</span>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-medium text-ink">
              {file ? file.name : fileName || 'No file chosen yet'}
            </p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              Paste an image or video here, drag it in, or pick a file. Then copy it to your clipboard and paste it
              straight into the upload box on the site.
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn-outline !py-1.5 !text-[12.5px]" onClick={() => inputRef.current?.click()}>
            Choose a file
          </button>
          <button
            type="button"
            className="btn-outline !py-1.5 !text-[12.5px]"
            onClick={copyToClipboard}
            disabled={!file}
          >
            {copied ? 'Copied to clipboard' : 'Copy the file'}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => accept(e.target.files?.[0])}
          />
        </div>

        {file && (
          <p className="mt-2.5 text-[12px] text-muted">
            Ready. Open the site below, press <span className="font-semibold text-ink">Ctrl+V</span> in its upload box,
            and it will paste straight in.
          </p>
        )}
      </div>
    </div>
  );
}
