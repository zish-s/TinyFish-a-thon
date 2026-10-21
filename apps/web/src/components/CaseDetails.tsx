import { useState } from 'react';
import type { IncidentDetails, ReporterProfile } from '@reclaim/core';
import { missingParticulars } from '@reclaim/core';
import { Tag } from './ui';

const PLATFORMS = [
  'Instagram',
  'Facebook',
  'X (Twitter)',
  'WhatsApp',
  'Telegram',
  'YouTube',
  'LinkedIn',
  'TikTok',
  'Reddit',
  'Other / not sure',
];

/**
 * The particulars of the incident, the way a police file records them.
 *
 * These are the fields an officer asks for before anything else: when it
 * happened, where, which account, how much money, and whether it is still
 * going on. They go into the downloadable case file, and the forms the agent
 * fills in are rebuilt from them.
 */
export function CaseDetails({
  details,
  profile,
  onSave,
}: {
  details?: IncidentDetails;
  profile: ReporterProfile;
  onSave: (details: IncidentDetails) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<IncidentDetails>(details ?? {});

  const missing = missingParticulars(details, profile);
  const suspect = details?.suspect ?? {};

  const start = () => {
    setDraft({
      ...(details ?? {}),
      suspect: { ...(details?.suspect ?? {}) },
    });
    setEditing(true);
  };

  const save = () => {
    onSave({
      ...draft,
      suspect: {
        ...draft.suspect,
        handles: draft.suspect?.handles?.length ? draft.suspect.handles : [],
        urls: draft.suspect?.urls?.length ? draft.suspect.urls : [],
      },
    });
    setEditing(false);
  };

  const setSuspect = (patch: Partial<NonNullable<IncidentDetails['suspect']>>) =>
    setDraft((d) => ({ ...d, suspect: { ...(d.suspect ?? {}), ...patch } }));

  const filled: Array<[string, string]> = [];
  if (details?.date) filled.push(['When', details.time ? `${details.date}, ${details.time}` : details.date]);
  if (details?.place) filled.push(['Where', details.place]);
  if (details?.amount) filled.push(['Amount', details.amount]);
  if (details?.mode) {
    filled.push([
      'How',
      details.mode === 'online' ? 'Committed online' : details.mode === 'offline' ? 'Committed in person' : 'Both',
    ]);
  }
  if (details?.ongoing) filled.push(['Status', 'Still going on']);
  if (details?.frequency) filled.push(['How often', details.frequency]);
  if (suspect.handles?.length) filled.push(['Account', suspect.handles.map((h) => `@${h}`).join(', ')]);
  if (suspect.platform) filled.push(['Platform', suspect.platform]);
  if (suspect.urls?.length) filled.push(['Link', suspect.urls[0]]);
  if (suspect.identifiers) filled.push(['Identifiers', suspect.identifiers]);
  if (details?.additional) filled.push(['Also', details.additional]);

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Details for the official record</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            What a police station, a bank or a court asks for first. It goes into the case file you download, and the forms
            are filled from it.
          </p>
        </div>
        <button type="button" className="btn-outline !py-1.5" onClick={editing ? save : start}>
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="mt-4 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Date of the incident</span>
              <input
                type="date"
                className="input !py-2.5 !text-sm"
                value={draft.date ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Time of the incident</span>
              <input
                type="time"
                className="input !py-2.5 !text-sm"
                value={draft.time ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, time: e.target.value }))}
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Where did it happen</span>
              <input
                className="input !py-2.5 !text-sm"
                placeholder="Address, area, or 'online, on Instagram'"
                value={draft.place ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, place: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">How did it happen</span>
              <select
                className="input !py-2.5 !text-sm"
                value={draft.mode ?? 'online'}
                onChange={(e) => setDraft((d) => ({ ...d, mode: e.target.value as IncidentDetails['mode'] }))}
              >
                <option value="online">Online</option>
                <option value="offline">In person</option>
                <option value="both">Both</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">Amount involved</span>
              <input
                className="input !py-2.5 !text-sm"
                placeholder="e.g. 20000"
                value={draft.amount ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, amount: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-muted">How often has it happened</span>
              <input
                className="input !py-2.5 !text-sm"
                placeholder="e.g. daily, since March"
                value={draft.frequency ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, frequency: e.target.value }))}
              />
            </label>
            <label className="flex items-end gap-2 pb-1">
              <input
                type="checkbox"
                className="h-4 w-4 accent-coral-500"
                checked={Boolean(draft.ongoing)}
                onChange={(e) => setDraft((d) => ({ ...d, ongoing: e.target.checked }))}
              />
              <span className="text-[13px] text-ink">It is still going on</span>
            </label>
          </div>

          <div className="rounded-2xl border border-ink/10 bg-canvas/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">The account responsible</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">Username / handle</span>
                <input
                  className="input !py-2.5 !text-sm"
                  placeholder="e.g. rahul.finance.2024"
                  value={draft.suspect?.handles?.[0] ?? ''}
                  onChange={(e) => setSuspect({ handles: e.target.value ? [e.target.value.replace(/^@/, '')] : [] })}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-muted">Platform</span>
                <select
                  className="input !py-2.5 !text-sm"
                  value={draft.suspect?.platform ?? ''}
                  onChange={(e) => setSuspect({ platform: e.target.value })}
                >
                  <option value="">Not sure / not stated</option>
                  {PLATFORMS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-muted">Link to the profile or post</span>
                <input
                  className="input !py-2.5 !text-sm"
                  placeholder="https://instagram.com/..."
                  value={draft.suspect?.urls?.[0] ?? ''}
                  onChange={(e) => setSuspect({ urls: e.target.value ? [e.target.value] : [] })}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-muted">
                  Other identifier (phone, email, UPI, account number)
                </span>
                <input
                  className="input !py-2.5 !text-sm"
                  value={draft.suspect?.identifiers ?? ''}
                  onChange={(e) => setSuspect({ identifiers: e.target.value })}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1.5 block text-xs font-semibold text-muted">Description of the person</span>
                <input
                  className="input !py-2.5 !text-sm"
                  placeholder="e.g. a man in his twenties, spoke with a particular accent"
                  value={draft.suspect?.description ?? ''}
                  onChange={(e) => setSuspect({ description: e.target.value })}
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">Anything else we should put on record</span>
            <textarea
              className="input min-h-[90px] resize-y !text-sm"
              value={draft.additional ?? ''}
              onChange={(e) => setDraft((d) => ({ ...d, additional: e.target.value }))}
            />
          </label>

          <div className="flex items-center gap-2">
            <button type="button" className="btn-primary !py-2" onClick={save}>
              Save
            </button>
            <button
              type="button"
              className="btn-quiet"
              onClick={() => {
                setEditing(false);
                setDraft(details ?? {});
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : filled.length ? (
        <>
          <div className="mt-4 flex flex-wrap gap-2">
            {filled.map(([label, value]) => (
              <Tag key={label} tone="neutral">
                <span className="font-semibold">{label}:</span> {value}
              </Tag>
            ))}
          </div>
          {missing.length > 0 && (
            <p className="mt-3 rounded-2xl border border-butter-300 bg-butter-50 px-4 py-2.5 text-[12.5px] text-[#7A5C0B]">
              A police station will ask for {missing.join(', ')}. Press Edit to add it - it goes straight into the case
              file.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          Nothing filled in yet. Press <span className="font-semibold text-ink">Edit</span> and tell us when it happened,
          where, and which account did it - that is what the case file and the police forms need.
        </p>
      )}
    </div>
  );
}
