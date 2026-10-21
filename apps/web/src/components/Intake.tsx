import { useEffect, useRef, useState } from 'react';
import type { IncidentDetails } from '@reclaim/core';
import type { Profile } from '../lib/api';
import { ArrowCurve, Sparkles, Squiggle, Star, Underline } from './Doodles';
import { HowItWorks } from './HowItWorks';
import { Privacy } from './Privacy';

const EXAMPLES = [
  {
    tag: 'Impersonation + fraud',
    text: 'Someone made a fake Instagram account at https://instagram.com/rahul.finance.2024 using my photo and my college ID, and is asking my friends to send me 500 rupees as a gift. They also posted my phone number on the page.',
    profile: { name: 'Ishita Sharma', email: 'ishita@example.com', phone: '+91 98765 43210', city: 'Gurugram' },
  },
  {
    tag: 'Morphed intimate image',
    text: 'A stranger on Instagram sent me my own photo edited into a sexual video and is now threatening to post it to my family unless I pay him 20000 rupees. He is a man in his twenties.',
    profile: { name: 'Aarohi', email: 'aarohi@example.com', phone: '+91 90000 11111', city: 'Mumbai' },
  },
  {
    tag: 'Doxxing + stalking',
    text: 'A man posted my home address and my family details on a public Facebook group, and he keeps waiting outside my apartment at night. I am scared to go to college.',
    profile: { name: 'Ravi K', email: 'ravi@example.com', phone: '+91 88888 22222', city: 'Bengaluru' },
  },
];

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

const EMPTY_DETAILS: IncidentDetails = {
  date: '',
  time: '',
  place: '',
  mode: 'online',
  amount: '',
  frequency: '',
  description: '',
  additional: '',
  suspect: { handles: [], platform: '', urls: [], identifiers: '', description: '' },
};

/** A fresh copy, so the form never edits the template in place. */
function blankDetails(): IncidentDetails {
  return {
    ...EMPTY_DETAILS,
    suspect: { ...EMPTY_DETAILS.suspect, handles: [], urls: [] },
  };
}

export function Intake({
  onSubmit,
  busy,
  error,
}: {
  onSubmit: (text: string, profile: Profile, country: string, details: IncidentDetails) => void;
  busy: boolean;
  error: string | null;
}) {
  const [text, setText] = useState('');
  const [profile, setProfile] = useState<Profile>({});
  const [country, setCountry] = useState('IN');
  const [details, setDetails] = useState<IncidentDetails>(blankDetails);
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showRecord, setShowRecord] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    let recognition: any;
    try {
      recognition = new SR();
    } catch {
      return;
    }
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        transcript += event.results[i][0].transcript;
      }
      setText((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
      setVoiceError(null);
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      const code = event?.error;
      if (code === 'not-allowed' || code === 'service-not-satisfied') {
        setVoiceError('Your browser blocked the microphone. Allow it in the address bar, or just type instead.');
      } else if (code === 'no-speech') {
        setVoiceError('We did not catch anything. Try again, or just type it.');
      } else if (code === 'network') {
        setVoiceError('Dictation needs a network connection. Typing works offline.');
      } else {
        setVoiceError('Dictation did not start. Typing works just as well.');
      }
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const micSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const submit = () => {
    if (text.trim().length < 8) return;
    onSubmit(text.trim(), profile, country, details);
  };

  const setSuspect = (patch: Partial<NonNullable<IncidentDetails['suspect']>>) =>
    setDetails((d) => ({ ...d, suspect: { ...(d.suspect ?? {}), ...patch } }));

  const handleText = (value: string) => setSuspect({ handles: value ? [value.replace(/^@/, '')] : [] });

  const missing = [
    !details.date ? 'the date' : null,
    !details.place ? 'the place' : null,
    !details.suspect?.handles?.length && !details.suspect?.urls?.length ? 'the account used' : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-4xl px-5 py-10 sm:py-14">
      <div className="animate-fade-up relative overflow-hidden rounded-[2.25rem] border border-white/60 shadow-lift">
        <img
          src="/hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-lilac-100/90 via-canvas/75 to-peach-100/90" />
        <img
          src="/backdrop.svg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />

        <div className="relative px-6 py-14 sm:px-14 sm:py-20">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
              <Star className="h-3.5 w-3.5 text-coral-500" />
              ReclaimYourNet
            </span>

            <h1 className="mt-5 text-4xl font-extrabold leading-[1.05] tracking-tight text-ink sm:text-5xl">
              What happened?
            </h1>
            <div className="mt-2 w-40 text-coral-500">
              <Underline />
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">
              Tell it in your own words. We will work out every place it has to be reported, open the real form on each one,
              and file it for you.
            </p>
          </div>

          <div className="mt-9 rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lift sm:max-w-3xl sm:p-6">
            <textarea
              className="input !border-ink/10 min-h-[140px] resize-y"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g. A fake account is using my photos and asking my friends for money..."
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') submit();
              }}
            />

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" className="btn-primary" disabled={busy || text.trim().length < 8} onClick={submit}>
                {busy ? 'Working...' : 'Find where to report this'}
              </button>

              {micSupported && (
                <button
                  type="button"
                  onClick={() => {
                    const r = recognitionRef.current;
                    if (!r) {
                      setVoiceError('Dictation is not available in this browser. Typing works just as well.');
                      return;
                    }
                    setVoiceError(null);
                    if (listening) {
                      r.stop();
                      setListening(false);
                    } else {
                      try {
                        r.start();
                        setListening(true);
                      } catch {
                        setListening(false);
                        setVoiceError('Dictation did not start. Typing works just as well.');
                      }
                    }
                  }}
                  className={listening ? 'btn-primary' : 'btn-outline'}
                >
                  {listening ? 'Listening... stop' : 'Dictate'}
                </button>
              )}

              <button type="button" className="btn-quiet ml-auto" onClick={() => setShowDetails((v) => !v)}>
                {showDetails ? 'Hide my details' : 'Add my details'}
              </button>
            </div>

            {voiceError && (
              <p className="mt-3 rounded-2xl border border-butter-300 bg-butter-50 px-4 py-2.5 text-[13px] text-[#7A5C0B]">
                {voiceError}
              </p>
            )}

            {error && (
              <p className="mt-3 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-2.5 text-[13px] font-medium text-[#A63A56]">
                {error}
              </p>
            )}

            {showDetails && (
              <div className="mt-5 grid gap-3 border-t border-ink/10 pt-5 sm:grid-cols-2">
                {(
                  [
                    ['name', 'Name'],
                    ['email', 'Email'],
                    ['phone', 'Mobile'],
                    ['city', 'City'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted">{label}</span>
                    <input
                      className="input !py-2.5 !text-sm"
                      value={profile[key] ?? ''}
                      onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                    />
                  </label>
                ))}
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted">Country</span>
                  <select className="input !py-2.5 !text-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
                    <option value="IN">India</option>
                    <option value="US">United States</option>
                    <option value="GB">United Kingdom</option>
                    <option value="AU">Australia</option>
                    <option value="CA">Canada</option>
                  </select>
                </label>
              </div>
            )}
          </div>

          {/* ------------------------------------------- the official record */}
          <div className="mt-6 rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lift sm:max-w-3xl sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-[15px] font-extrabold tracking-tight text-ink">
                  Details for the official record
                </h2>
                <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-muted">
                  These are the particulars a police station or a bank asks for first. We print them into the case file you
                  hand over. Fill in what you know - anything left blank is printed as &ldquo;not stated&rdquo;, and you can
                  add it later.
                </p>
              </div>
              <button type="button" className="btn-quiet" onClick={() => setShowRecord((v) => !v)}>
                {showRecord ? 'Hide' : 'Fill in'}
              </button>
            </div>

            {showRecord && (
              <div className="mt-5 space-y-5 border-t border-ink/10 pt-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted">Date of the incident</span>
                    <input
                      type="date"
                      className="input !py-2.5 !text-sm"
                      value={details.date ?? ''}
                      onChange={(e) => setDetails((d) => ({ ...d, date: e.target.value }))}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted">Time of the incident</span>
                    <input
                      type="time"
                      className="input !py-2.5 !text-sm"
                      value={details.time ?? ''}
                      onChange={(e) => setDetails((d) => ({ ...d, time: e.target.value }))}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted">
                    Where did it happen
                  </span>
                  <input
                    className="input !py-2.5 !text-sm"
                    placeholder="e.g. Flat 402, Nehru Nagar, New Delhi - or 'online, on Instagram'"
                    value={details.place ?? ''}
                    onChange={(e) => setDetails((d) => ({ ...d, place: e.target.value }))}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted">How did it happen</span>
                    <select
                      className="input !py-2.5 !text-sm"
                      value={details.mode ?? 'online'}
                      onChange={(e) => setDetails((d) => ({ ...d, mode: e.target.value as IncidentDetails['mode'] }))}
                    >
                      <option value="online">Online</option>
                      <option value="offline">In person</option>
                      <option value="both">Both</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted">
                      Amount involved (if any)
                    </span>
                    <input
                      className="input !py-2.5 !text-sm"
                      placeholder="e.g. 20000"
                      value={details.amount ?? ''}
                      onChange={(e) => setDetails((d) => ({ ...d, amount: e.target.value }))}
                    />
                  </label>
                </div>

                <div className="rounded-2xl border border-ink/10 bg-canvas/70 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                    The account that did it
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-muted">
                        Username / handle
                      </span>
                      <input
                        className="input !py-2.5 !text-sm"
                        placeholder="e.g. rahul.finance.2024"
                        value={details.suspect?.handles?.[0] ?? ''}
                        onChange={(e) => handleText(e.target.value)}
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block text-xs font-semibold text-muted">Platform</span>
                      <select
                        className="input !py-2.5 !text-sm"
                        value={details.suspect?.platform ?? ''}
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
                        value={details.suspect?.urls?.[0] ?? ''}
                        onChange={(e) => setSuspect({ urls: e.target.value ? [e.target.value] : [] })}
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-muted">
                        Any other identifier (phone, email, UPI, account number)
                      </span>
                      <input
                        className="input !py-2.5 !text-sm"
                        value={details.suspect?.identifiers ?? ''}
                        onChange={(e) => setSuspect({ identifiers: e.target.value })}
                      />
                    </label>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold text-muted">How often has it happened</span>
                    <input
                      className="input !py-2.5 !text-sm"
                      placeholder="e.g. daily, since March, 3 times so far"
                      value={details.frequency ?? ''}
                      onChange={(e) => setDetails((d) => ({ ...d, frequency: e.target.value }))}
                    />
                  </label>
                  <label className="flex items-end gap-2 pb-1">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-coral-500"
                      checked={Boolean(details.ongoing)}
                      onChange={(e) => setDetails((d) => ({ ...d, ongoing: e.target.checked }))}
                    />
                    <span className="text-[13px] text-ink">It is still going on</span>
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-muted">
                    Anything else we should put on record
                  </span>
                  <textarea
                    className="input min-h-[90px] resize-y !text-sm"
                    placeholder="Anything a police station would ask you that is not above."
                    value={details.additional ?? ''}
                    onChange={(e) => setDetails((d) => ({ ...d, additional: e.target.value }))}
                  />
                </label>

                {missing.length > 0 && (
                  <p className="rounded-2xl border border-butter-300 bg-butter-50 px-4 py-2.5 text-[12.5px] text-[#7A5C0B]">
                    Still to fill in: {missing.join(', ')}. A police station will ask for these.
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-2.5 text-sm">
            <span className="text-muted-faint">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.tag}
                type="button"
                onClick={() => {
                  setText(ex.text);
                  // Fill the details too, so the city-aware routing is visible
                  // straight away. Never overwrite what the person typed.
                  setProfile((p) => ({ ...ex.profile, ...p }));
                  setShowDetails(true);
                }}
                className="rounded-full border border-white/80 bg-white/70 px-3.5 py-1.5 text-xs font-medium text-muted transition hover:border-coral-300 hover:bg-white hover:text-coral-700"
              >
                {ex.tag}
              </button>
            ))}
          </div>

          <p className="mt-8 flex max-w-md items-center gap-2 text-xs leading-relaxed text-muted">
            <Sparkles className="h-4 w-4 shrink-0 text-mint-500" />
            Nothing is submitted without your approval, and your personal details stay masked until you reveal them.
          </p>
        </div>

        <ArrowCurve className="pointer-events-none absolute right-10 top-16 hidden h-9 w-20 animate-drift text-lilac-300 md:block" />
        <Squiggle className="pointer-events-none absolute bottom-16 left-8 hidden h-3.5 w-28 text-mint-300 lg:block" />
      </div>

      <div className="mt-6">
        <HowItWorks defaultOpen />
      </div>

      <div className="mt-4">
        <Privacy />
      </div>
    </div>
  );
}
