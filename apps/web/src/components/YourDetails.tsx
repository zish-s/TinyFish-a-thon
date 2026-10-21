import { useState } from 'react';
import type { ReporterProfile } from '@reclaim/core';
import { Tag } from './ui';

/**
 * The details the person gave on the first screen. They can change them
 * later, and every form below is rebuilt with the new values.
 */
export function YourDetails({
  profile,
  onSave,
}: {
  profile: ReporterProfile;
  onSave: (profile: ReporterProfile) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ReporterProfile>(profile);

  const filled = Object.entries(profile).filter(([, v]) => Boolean(v));

  return (
    <div className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-ink">Your details</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            These go on the forms, so the police or the bank can reach you. Edit them any time.
          </p>
        </div>
        <button
          type="button"
          className="btn-outline !py-1.5"
          onClick={() => {
            if (editing) {
              onSave(draft);
              setEditing(false);
            } else {
              setDraft(profile);
              setEditing(true);
            }
          }}
        >
          {editing ? 'Save' : 'Edit'}
        </button>
      </div>

      {editing ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['name', 'Name', 'Needs to match your ID'],
              ['email', 'Email', 'Either this or your mobile - one is enough'],
              ['phone', 'Mobile', 'Either this or your email - one is enough'],
              ['city', 'City', 'Picks your police station'],
              ['state', 'State', 'Which state the police station is in'],
              ['address', 'Address', 'Only if a form asks for it'],
              ['idType', 'ID type', 'e.g. Aadhaar, PAN, driving licence'],
              ['idNumber', 'ID number', 'Only if a form asks for it'],
            ] as const
          ).map(([key, label, hint]) => (
            <label
              key={key}
              className={`block ${key === 'address' ? 'sm:col-span-2' : ''}`}
            >
              <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
              <input
                className="input !py-2.5 !text-sm"
                placeholder={hint}
                value={draft[key] ?? ''}
                onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              />
              <span className="mt-1 block text-[11.5px] text-muted-faint">{hint}</span>
            </label>
          ))}
        </div>
      ) : filled.length ? (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {filled.map(([key, value]) => (
            <Tag key={key} tone="neutral">
              {value}
            </Tag>
          ))}
          <button type="button" className="btn-quiet !px-2 !py-0.5 !text-[12px]" onClick={() => setEditing(true)}>
            Edit
          </button>
        </div>
      ) : (
        <p className="mt-4 text-[13.5px] leading-relaxed text-muted">
          You have not added any yet. Most forms need at least a name, and <span className="font-semibold text-ink">
            a mobile number or an email - one of the two is enough
          </span>
          . Press <span className="font-semibold text-ink">Edit</span> to add them.
        </p>
      )}
    </div>
  );
}
