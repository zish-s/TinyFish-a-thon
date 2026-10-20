import { useState } from 'react';
import { ArrowCurve, Star } from './Doodles';

const STEPS = [
  {
    n: '01',
    title: 'You told us what happened',
    body: 'One sentence is enough. We read it on this device, work out what kind of harm it is, and never send your personal details anywhere until you approve it.',
  },
  {
    n: '02',
    title: 'We found every place it has to be reported',
    body: 'A live web agent searched for the current official portal - the police station with jurisdiction over your city, the cybercrime portal, the bank, the platform, the takedown services. Not a list we wrote down last year.',
  },
  {
    n: '03',
    title: 'You check what will be written',
    body: 'Everything the agent will type is shown to you first, with the blanks highlighted. The agent will not guess a required field on a bank form - that is what the yellow boxes are for.',
  },
  {
    n: '04',
    title: 'We file it, and we keep watching',
    body: 'You approve, the agent types and submits, and you get a reference number. Then we keep checking the page, because a report is not the same as a takedown.',
  },
];

/** A short guide so a first-time visitor always knows where they are. */
export function HowItWorks({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-3xl border border-lilac-300/70 bg-lilac-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Star className="h-4 w-4 text-lilac-500" />
          <h3 className="text-sm font-bold text-ink">How this works</h3>
        </div>
        <button type="button" className="btn-outline !py-1.5" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show me'}
        </button>
      </div>

      {open && (
        <>
          <ol className="mt-5 grid gap-5 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3">
                <span className="mt-0.5 font-mono text-xs font-bold text-lilac-500">{step.n}</span>
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{step.title}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 flex items-center gap-2 text-[12.5px] text-muted">
            <ArrowCurve className="h-5 w-8 shrink-0 text-coral-300" />
            Nothing is submitted without your approval. Not once, not anywhere.
          </p>
        </>
      )}
    </div>
  );
}
