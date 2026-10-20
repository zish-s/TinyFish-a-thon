import type { ReactNode } from 'react';

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionTitle({
  eyebrow,
  title,
  action,
}: {
  eyebrow?: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
        <h2 className="text-xl font-bold tracking-tight text-ink">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export type Tone = 'neutral' | 'coral' | 'butter' | 'rose' | 'sky' | 'lilac' | 'mint';

export function Tag({ children, tone = 'neutral' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    neutral: 'border-ink/10 bg-canvas text-muted',
    coral: 'border-coral-100 bg-coral-50 text-coral-700',
    butter: 'border-butter-300/70 bg-butter-50 text-[#8A6A12]',
    rose: 'border-rose-300/70 bg-rose-50 text-[#A63A56]',
    sky: 'border-sky-300/70 bg-sky-50 text-[#2C5C93]',
    lilac: 'border-lilac-300/70 bg-lilac-50 text-lilac-500',
    mint: 'border-mint-300/70 bg-mint-50 text-[#1F7A5C]',
  };
  return <span className={`tag ${tones[tone]}`}>{children}</span>;
}

export function Dot({ tone }: { tone: 'idle' | 'busy' | 'ok' | 'warn' | 'error' }) {
  const map = {
    idle: 'bg-hair-25',
    busy: 'bg-coral-500 animate-pulse-dot',
    ok: 'bg-mint-500',
    warn: 'bg-butter-300',
    error: 'bg-rose-300',
  };
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${map[tone]}`} />;
}

/** A friendly domain label, e.g. "stopncii.org" from a full URL. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
