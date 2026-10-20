import { useEffect, useMemo, useState } from 'react';
import type { Channel } from '@reclaim/core';
import { Tag } from './ui';
import { Sparkles } from './Doodles';

/**
 * Fields where only one of the group is actually needed. Most portals ask for
 * both an email and a mobile number, but they only need a way to reach you -
 * so we ask for one and use it wherever it fits.
 */
const ALTERNATIVES: Array<{ ids: string[]; title: string; note: string }> = [
  {
    ids: ['email', 'mobile', 'phone', 'callback', 'contact'],
    title: 'Email or mobile',
    note: 'Either one is enough. They only need a way to reach you.',
  },
];

function groupFor(name: string) {
  const n = name.toLowerCase();
  return ALTERNATIVES.find((g) => g.ids.some((id) => n.includes(id)));
}

/**
 * The agent fills in everything it can and only stops for fields the form
 * marks as required. This panel is the hand-off point for those, and it
 * collapses so it never blocks the flow.
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
  const [open, setOpen] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    setValues({});
  }, [channels.map((c) => c.id + Object.keys(c.draft).length).join('|')]);

  const rows = useMemo(
    () =>
      channels
        .map((channel) => ({
          channel,
          fields: channel.requiredFields.filter((f) => f.required && !channel.draft[f.name]),
        }))
        .filter((row) => row.fields.length > 0),
    [channels],
  );

  const essentialCount = rows.reduce(
    (n, row) => n + row.fields.filter((f) => !groupFor(f.name)).length,
    0,
  );
  const altCount = rows.reduce(
    (n, row) => n + row.fields.filter((f) => groupFor(f.name)).length,
    0,
  );

  if (!rows.length) {
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

  const input = (
    channelId: string,
    fieldName: string,
    label: string,
    kind: string,
    options?: string[],
  ) => {
    const key = `${channelId}::${fieldName}`;
    const current = values[key] ?? '';
    const set = (v: string) => {
      setValues((prev) => ({ ...prev, [key]: v }));
      onSave(channelId, fieldName, v);
    };
    if (kind === 'select' && options?.length) {
      return (
        <select className="input !py-2.5 !text-sm" value={current} onChange={(e) => set(e.target.value)}>
          <option value="">Choose one</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      );
    }
    if (kind === 'textarea') {
      return (
        <textarea
          className="input min-h-[70px] !py-2.5 !text-sm"
          placeholder="Type it here"
          value={current}
          onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
          onBlur={(e) => onSave(channelId, fieldName, e.target.value)}
        />
      );
    }
    return (
      <input
        className="input !py-2.5 !text-sm"
        placeholder="Type it here"
        value={current}
        onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
        onBlur={(e) => onSave(channelId, fieldName, e.target.value)}
      />
    );
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-butter-300/70 bg-butter-50/70">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-butter-50/60 sm:px-6"
      >
        <Sparkles className="h-4 w-4 shrink-0 text-[#8A6A12]" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-[#7A5C0B]">
            {essentialCount > 0
              ? `${essentialCount} field${essentialCount === 1 ? '' : 's'} the form needs from you`
              : 'One thing to fill in, and it is optional'}
          </h3>
          <p className="mt-0.5 text-[13px] leading-relaxed text-[#8A6A12]">
            The agent fills in everything else on its own. Only the fields a form marks as{' '}
            <span className="font-semibold">required</span> need you.
          </p>
        </div>
        <span className="shrink-0 text-sm text-[#8A6A12]">{open ? '▾' : '▸'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-butter-300/60 px-5 py-5 sm:px-6">
          {profileFilled && (
            <p className="rounded-2xl border border-sky-300/70 bg-sky-50/80 px-4 py-3 text-[13px] leading-relaxed text-[#2C5C93]">
              Most of these are just your own details, and you have already given us some. Fill in what is missing below
              and every form updates itself.
            </p>
          )}
          {altCount > 0 && (
            <p className="rounded-2xl border border-mint-300/70 bg-mint-50/80 px-4 py-3 text-[13px] leading-relaxed text-[#1F7A5C]">
              <span className="font-semibold">Do not fill everything.</span> Where a form wants both an email and
              a mobile number, one is enough - we will use whichever you give for the field that suits it, and leave
              the other blank. Optional fields can be skipped entirely.
            </p>
          )}

          {rows.map(({ channel, fields }) => {
            const essential = fields.filter((f) => !groupFor(f.name));
            const alternatives = fields.filter((f) => groupFor(f.name));
            return (
              <div key={channel.id} className="rounded-2xl border border-butter-300/60 bg-white/80 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="text-[13.5px] font-bold text-ink">{channel.name}</span>
                  {channel.url && (
                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[12px] font-semibold text-coral-600 underline underline-offset-2 hover:text-coral-700"
                    >
                      {hostOf(channel.url)} ↗
                    </a>
                  )}
                </div>

                {essential.length > 0 && (
                  <>
                    <p className="eyebrow mb-2">Required by the form</p>
                    <div className="space-y-2.5">
                      {essential.map((f) => (
                        <label key={f.name} className="block">
                          <span className="mb-1 block text-[12.5px] font-medium text-muted">{f.label}</span>
                          {input(channel.id, f.name, f.label, f.kind, f.options)}
                        </label>
                      ))}
                    </div>
                  </>
                )}

                {alternatives.length > 0 && (
                  <>
                    <p className="eyebrow mb-2 mt-4">Any one of these is enough</p>
                    {ALTERNATIVES.filter((g) => alternatives.some((f) => groupFor(f.name) === g)).map((group) => (
                      <div key={group.title} className="mb-3">
                        <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[12.5px] font-semibold text-ink">
                          {group.title}
                          <Tag tone="mint">either one is enough</Tag>
                        </p>
                        <p className="mb-2 text-[12px] leading-relaxed text-muted">{group.note}</p>
                        <div className="space-y-2.5">
                          {alternatives
                            .filter((f) => groupFor(f.name) === group)
                            .map((f) => (
                              <label key={f.name} className="block">
                                <span className="mb-1 block text-[12.5px] font-medium text-muted">{f.label}</span>
                                {input(channel.id, f.name, f.label, f.kind, f.options)}
                              </label>
                            ))}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}
