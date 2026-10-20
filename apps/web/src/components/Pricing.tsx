import { useEffect, useState } from 'react';
import { Panel, Pill } from './ui';

interface Plan {
  id: string;
  name: string;
  price: number;
  unit: string;
  for: string;
  includes: string[];
  limit: string;
}

export function Pricing() {
  const [data, setData] = useState<{ plans: Plan[]; unitEconomics: Record<string, string> } | null>(null);

  useEffect(() => {
    fetch('/api/pricing')
      .then((r) => r.json())
      .then(setData)
      .catch(() => undefined);
  }, []);

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Panel title="How Redress pays for itself" action={<Pill tone="brand">freemium consumer + B2B API</Pill>}>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {data.plans.map((plan) => (
            <div
              key={plan.id}
              className={`panel-inset flex flex-col p-4 ${
                plan.id === 'api' ? 'border-brand-500/40 bg-brand-500/[0.06]' : ''
              }`}
            >
              <div className="flex items-baseline justify-between">
                <h4 className="text-sm font-semibold text-slate-100">{plan.name}</h4>
                {plan.id === 'api' && <Pill tone="brand">the money</Pill>}
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-white">
                {plan.price === 0 ? 'Free' : `$${plan.price}`}
                <span className="ml-1 text-xs font-normal text-slate-500">{plan.unit}</span>
              </div>
              <p className="mt-1 text-[12px] text-slate-400">{plan.for}</p>
              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.includes.map((inc) => (
                  <li key={inc} className="flex gap-2 text-[12px] leading-relaxed text-slate-400">
                    <span className="text-brand-500">▸</span>
                    {inc}
                  </li>
                ))}
              </ul>
              <div className="mt-3 border-t border-ink-700 pt-2 text-[11px] text-slate-500">{plan.limit}</div>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {Object.entries(data.unitEconomics).map(([k, v]) => (
            <div key={k} className="panel-inset px-3.5 py-3">
              <div className="label">{k.replace(/([A-Z])/g, ' $1')}</div>
              <div className="mt-1 font-mono text-sm text-slate-200">{v}</div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
