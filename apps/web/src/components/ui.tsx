import type { ReactNode } from 'react';

export function Panel({
  children,
  className = '',
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel animate-fade-up ${className}`}>
      {(title || action) && (
        <header className="flex items-center justify-between border-b border-ink-700/60 px-5 py-3.5">
          <h2 className="text-sm font-semibold tracking-tight text-slate-200">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Bar({ value, tone = 'brand' }: { value: number; tone?: 'brand' | 'alert' | 'rose' | 'sky' }) {
  const pct = Math.max(0, Math.min(1, value));
  const colors: Record<string, string> = {
    brand: 'bg-brand-500',
    alert: 'bg-alert-500',
    rose: 'bg-rose-500',
    sky: 'bg-sky-500',
  };
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-700/70">
      <div className={`h-full rounded-full transition-all duration-500 ${colors[tone]}`} style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

export function Pill({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: 'neutral' | 'brand' | 'alert' | 'rose' | 'sky' | 'violet';
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: 'border-ink-600 bg-ink-800/70 text-slate-300',
    brand: 'border-brand-500/40 bg-brand-500/10 text-brand-300',
    alert: 'border-alert-500/40 bg-alert-500/10 text-alert-400',
    rose: 'border-rose-500/40 bg-rose-500/10 text-rose-300',
    sky: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
    violet: 'border-violet-500/40 bg-violet-500/10 text-violet-300',
  };
  return <span className={`chip ${tones[tone]} ${className}`}>{children}</span>;
}

export function StatusDot({ tone }: { tone: 'idle' | 'busy' | 'ok' | 'warn' | 'error' }) {
  const map = {
    idle: 'bg-slate-600',
    busy: 'bg-brand-400 animate-pulse-dot',
    ok: 'bg-emerald-400',
    warn: 'bg-alert-400',
    error: 'bg-rose-400',
  };
  return <span className={`inline-block h-2 w-2 rounded-full ${map[tone]}`} />;
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="panel-inset px-3.5 py-3">
      <div className="label">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold text-slate-100">{value}</div>
      {hint && <div className="mt-0.5 text-[11px] leading-snug text-slate-500">{hint}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-ink-600/70 px-4 py-8 text-center text-sm text-slate-500">
      {children}
    </div>
  );
}
