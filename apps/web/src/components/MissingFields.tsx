import { useEffect, useState } from 'react';
import type { Channel } from '@reclaim/core';
import { SectionTitle, Tag } from './ui';
import { Squiggle, Sparkles } from './Doodles';

/** Fields that come from the person's own details rather than the incident. */
const PROFILE_FIELDS = ['name', 'email', 'mobile', 'phone', 'address', 'city', 'account_last4', 'transaction_id', 'beneficiary'];

function isProfileField(name: string): boolean {
  const n = name.toLowerCase();
  return PROFILE_FIELDS.some((p) => n === p || n.includes(p));
}

/**
 * Every blank the agent will not fill on its own, in one place, with a box to
 * type into. The agent refuses to guess a required field on a bank or a
 * government form, so this panel is the hand-off point.
 */
export function MissingFields({
  channels,
  onSave,
  profileFilled,
}: {
  channels: Channel[];
  onSave: (channelId: string, fieldName: string, value: string) => void;
  profileFilled: boolean;
}) {
  const missing = channels
    .map((channel) => ({
      channel,
      fields: channel.requiredFields.filter((f) => f.required && !channel.draft[f.name]),
    }))
    .filter((row) => row.fields.length > 0);

  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues({});
  }, [channels.map((c) => c.id + Object.keys(c.draft).length).join('|')]);

  if (!missing.length) {
    return (
      <div className="rounded-3xl border border-mint-300/70 bg-mint-50/70 p-5">
        <div className="flex items-center gap-2 text-sm font-bold text-[#1F7A5C]">
          <Sparkles className="h-4 w-4" />
          Nothing is missing. Every form has what it needs.
        </div>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#1F7A5C]/90">
          You can file on any of the places below right now.
        </p>
      </div>
    );
  }

  const allFields = missing.flatMap((row) => row.fields);
  const profileFields = allFields.filter((f) => isProfileField(f.name));
  const otherFields = allFields.filter((f) => !isProfileField(f.name));
  const total = allFields.length;

  return (
    <div className="rounded-3xl border border-butter-300/70 bg-butter-50/70 p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-[#7A5C0B]">
            <Sparkles className="h-4 w-4" />
            {total} thing{total === 1 ? '' : 's'} we still need from you
          </h3>
          <p className="mt-1 text-[13.5px] leading-relaxed text-[#8A6A12]">
            The agent will not invent a value on a bank or a government form. Type them in here and everything below
            becomes ready to file.
          </p>
        </div>
        <div className="h-3 w-24 text-coral-300">
          <Squiggle />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {profileFields.length > 0 && (
          <div className="rounded-2xl border border-sky-300/70 bg-sky-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13.5px] leading-relaxed text-[#2C5C93]">
                <span className="font-bold">{profileFields.length} of these are just your own details</span> - your
                name, email, mobile and address. Fill them in the box above and every form below fills itself.
              </p>
              {!profileFilled && <Tag tone="sky">add them above</Tag>}
            </div>
          </div>
        )}

        {missing.map(({ channel, fields }) => (
          <div key={channel.id} className="rounded-2xl border border-butter-300/60 bg-white/80 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[13.5px] font-bold text-ink">{channel.name}</span>
              <Tag tone="butter">{fields.length} to fill</Tag>
            </div>
            <div className="space-y-2.5">
              {fields
                .filter((f) => !isProfileField(f.name))
                .map((field) => {
                  const key = `${channel.id}::${field.name}`;
                  return (
                  <label key={key} className="block">
                    <span className="mb-1 block text-[12.5px] font-medium text-ink-soft">{field.label}</span>
                    {field.kind === 'select' && field.options?.length ? (
                      <select
                        className="input !py-2.5 !text-sm"
                        value={values[key] ?? ''}
                        onChange={(e) => {
                          setValues((v) => ({ ...v, [key]: e.target.value }));
                          onSave(channel.id, field.name, e.target.value);
                        }}
                      >
                        <option value="">Choose one</option>
                        {field.options.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : field.kind === 'textarea' ? (
                      <textarea
                        className="input min-h-[80px] !py-2.5 !text-sm"
                        placeholder="Type it here"
                        value={values[key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                        onBlur={(e) => onSave(channel.id, field.name, e.target.value)}
                      />
                    ) : (
                      <input
                        className="input !py-2.5 !text-sm"
                        placeholder="Type it here"
                        value={values[key] ?? ''}
                        onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                        onBlur={(e) => onSave(channel.id, field.name, e.target.value)}
                      />
                    )}
                  </label>
                  );
                })}
              {fields.filter((f) => !isProfileField(f.name)).length === 0 && (
                <p className="text-[12.5px] text-muted">
                  Nothing left to type here - it all comes from your details above.
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
