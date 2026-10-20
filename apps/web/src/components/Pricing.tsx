import { useEffect, useState } from 'react';
import { SectionTitle, Tag } from './ui';
import { Squiggle, Star } from './Doodles';

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
  const [data, setData] = useState<{
    plans: Plan[];
    unitEconomics: Record<string, string>;
    note?: string;
  } | null>(null);

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
      {data.note && (
        <p className="-mt-1 mb-5 max-w-2xl text-[14.5px] leading-relaxed text-muted">{data.note}</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.plans.map((plan) => (
          <div
            key={plan.id}
            className={`card flex flex-col p-5 ${plan.id === 'api' ? 'border-coral-300/70 ring-1 ring-coral-100' : ''}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-[15px] font-bold text-ink">{plan.name}</h4>
              {plan.id === 'api' && <Tag tone="coral">where the money is</Tag>}
            </div>
            <div className="mt-2 text-3xl font-extrabold tracking-tight text-ink">
              {plan.price === 0 ? 'Free' : `₹${plan.price.toLocaleString('en-IN')}`}
              <span className="ml-1.5 text-xs font-medium text-muted-faint">{plan.unit}</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">{plan.for}</p>
            <ul className="mt-4 flex-1 space-y-2">
              {plan.includes.map((inc) => (
                <li key={inc} className="flex gap-2 text-[13px] leading-relaxed text-muted">
                  <span className="text-mint-500">✓</span>
                  {inc}
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-hair-8 pt-3 text-[11.5px] text-muted-faint">{plan.limit}</div>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-ink">What it costs us to run this</h3>
          <div className="h-2.5 w-24 text-coral-300">
            <Squiggle />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.entries(data.unitEconomics).map(([k, v]) => (
            <div key={k} className="card p-4">
              <div className="flex items-center gap-1.5 text-[12px] font-semibold text-muted">
                <Star className="h-3.5 w-3.5 text-butter-300" />
                {k}
              </div>
              <div className="mt-1.5 text-[13.5px] leading-relaxed text-ink">{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
