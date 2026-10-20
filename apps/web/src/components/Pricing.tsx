import { useEffect, useState } from 'react';
import { SectionTitle, Tag } from './ui';

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
    <div>
      <SectionTitle eyebrow="Plans" title="What it costs" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col p-5 ${plan.id === 'api' ? 'border-brand-300 ring-1 ring-brand-200' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[15px] font-bold text-slate-900">{plan.name}</h4>
              {plan.id === 'api' && <Tag tone="brand">the business one</Tag>}
            </div>
            <div className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
              {plan.price === 0 ? 'Free' : `$${plan.price}`}
              <span className="ml-1 text-xs font-normal text-slate-400">{plan.unit}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{plan.for}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {plan.includes.map((inc) => (
                <li key={inc} className="flex gap-2 text-[13px] leading-relaxed text-slate-600">
                  <span className="text-brand-600">✓</span>
                  {inc}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-slate-200 pt-3 text-[11.5px] text-slate-400">{plan.limit}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {Object.entries(data.unitEconomics).map(([k, v]) => (
          <div key={k} className="card p-4">
            <div className="eyebrow">{k.replace(/([A-Z])/g, ' $1')}</div>
            <div className="mt-1 font-mono text-[13px] text-slate-700">{v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
