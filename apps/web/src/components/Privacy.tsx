import { useState } from 'react';
import { Shield, Sparkles, Star } from './Doodles';

const POINTS = [
  {
    title: 'Reading your report',
    body: 'The model that works out what kind of harm this is runs on the server this app is served from - a small classifier, not a cloud LLM. Your words are not sent to an AI chat service.',
  },
  {
    title: 'The agent working on your behalf',
    body: 'To open a government portal and type into it, the agent needs a real browser, and that browser runs on TinyFish. Only the fields that one specific form asks for are sent - only while that form is being filled. Nothing else about you is.',
  },
  {
    title: 'Finding the right portal',
    body: 'The search that finds your local police station sends the words "Gurugram police online FIR" - never your description, your name or your number.',
  },
  {
    title: 'Where your report is kept',
    body: 'Nowhere. Not in a database, not on a server, not in the cloud. It lives in the memory of the app while the tab is open and it is gone when you close it. The only copy that outlives the session is the case file PDF you download yourself.',
  },
  {
    title: 'What does leave the device',
    body: 'The details you approve, on the portal you approve. That is the whole point of the product, and it is why there is a review step and two separate approvals before anything is submitted.',
  },
];

/** An honest, itemised answer to "what happens to my report?" */
export function Privacy() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-3xl border border-mint-300/70 bg-mint-50/60 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
          <Shield className="h-5 w-5 text-mint-500" />
          <div>
            <h3 className="text-sm font-bold text-ink">Where your report actually goes</h3>
            <p className="mt-0.5 text-[13px] text-muted">
              No account. No database. No tracking. No analytics. Here is the whole list.
            </p>
          </div>
        </div>
        <button type="button" className="btn-outline !py-1.5" onClick={() => setOpen((v) => !v)}>
          {open ? 'Hide' : 'Show me'}
        </button>
      </div>

      {open && (
        <>
          <ol className="mt-5 space-y-4">
            {POINTS.map((point, i) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-0.5 font-mono text-xs font-bold text-mint-500">{String(i + 1).padStart(2, '0')}</span>
                <div>
                  <div className="text-[13.5px] font-bold text-ink">{point.title}</div>
                  <p className="mt-1 text-[13px] leading-relaxed text-muted">{point.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 flex items-center gap-2 text-[12.5px] text-muted">
            <Star className="h-4 w-4 shrink-0 text-butter-300" />
            And you can delete the whole thing at any time with one button.
          </p>
        </>
      )}
    </div>
  );
}
