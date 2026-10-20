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
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export type Tone = 'slate' | 'brand' | 'amber' | 'rose' | 'sky';

export function Tag({ children, tone = 'slate' }: { children: ReactNode; tone?: Tone }) {
  const tones: Record<Tone, string> = {
    slate: 'border-slate-200 bg-slate-50 text-slate-600',
    brand: 'border-brand-200 bg-brand-50 text-brand-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    rose: 'border-rose-200 bg-rose-50 text-rose-700',
    sky: 'border-sky-200 bg-sky-50 text-sky-700',
  };
  return <span className={`tag ${tones[tone]}`}>{children}</span>;
}

export function Dot({ tone }: { tone: 'idle' | 'busy' | 'ok' | 'warn' | 'error' }) {
  const map = {
    idle: 'bg-slate-300',
    busy: 'bg-brand-500 animate-pulse-dot',
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    error: 'bg-rose-500',
  };
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${map[tone]}`} />;
}
