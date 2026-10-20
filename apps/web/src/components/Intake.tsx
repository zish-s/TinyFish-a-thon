import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../lib/api';

const EXAMPLES = [
  {
    tag: 'Impersonation + fraud',
    text: 'Someone made a fake Instagram account at https://instagram.com/rahul.finance.2024 using my photo and my college ID, and is asking my friends to send me 500 rupees as a gift. They also posted my phone number on the page.',
  },
  {
    tag: 'Morphed intimate image',
    text: 'A stranger on Instagram sent me my own photo edited into a sexual video and is now threatening to post it to my family unless I pay him 20000 rupees. He is a man in his twenties.',
  },
  {
    tag: 'Doxxing + stalking',
    text: 'A man posted my home address and my family details on a public Facebook group, and he keeps waiting outside my apartment at night. I am scared to go to college.',
  },
];

export function Intake({
  onSubmit,
  busy,
}: {
  onSubmit: (text: string, profile: Profile, country: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState('');
  const [profile, setProfile] = useState<Profile>({});
  const [country, setCountry] = useState('IN');
  const [listening, setListening] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const w = window as any;
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return;
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-IN';
    recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) transcript += event.results[i][0].transcript;
      setText((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
    };
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
  }, []);

  const micSupported =
    typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const submit = () => {
    if (text.trim().length < 8) return;
    onSubmit(text.trim(), profile, country);
  };

  return (
    <div className="mx-auto max-w-2xl py-10 sm:py-20">
      <div className="animate-fade-up">
        <h1 className="h2 text-center">What happened?</h1>
        <p className="mx-auto mt-3 max-w-lg text-center text-[15px] leading-relaxed text-slate-500">
          Tell it in your own words. We will work out where it has to be reported and file it for you.
        </p>

        <div className="card card-pad mt-8">
          <textarea
            className="input min-h-[150px] resize-y"
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
                  if (!r) return;
                  if (listening) {
                    r.stop();
                    setListening(false);
                  } else {
                    r.start();
                    setListening(true);
                  }
                }}
                className="btn-outline"
              >
                {listening ? 'Stop dictation' : 'Dictate'}
              </button>
            )}

            <button type="button" className="btn-quiet ml-auto" onClick={() => setShowDetails((v) => !v)}>
              {showDetails ? 'Hide my details' : 'Add my details'}
            </button>
          </div>

          {showDetails && (
            <div className="mt-5 grid gap-3 border-t border-slate-200 pt-5 sm:grid-cols-2">
              {(
                [
                  ['name', 'Name'],
                  ['email', 'Email'],
                  ['phone', 'Mobile'],
                  ['city', 'City'],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block">
                  <span className="mb-1 block text-xs font-semibold text-slate-500">{label}</span>
                  <input
                    className="input !py-2 !text-sm"
                    value={profile[key] ?? ''}
                    onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">Country</span>
                <select className="input !py-2 !text-sm" value={country} onChange={(e) => setCountry(e.target.value)}>
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

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
          <span className="text-slate-400">Try:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.tag}
              type="button"
              onClick={() => setText(ex.text)}
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-brand-300 hover:text-brand-700"
            >
              {ex.tag}
            </button>
          ))}
        </div>

        <p className="mx-auto mt-10 max-w-md text-center text-xs leading-relaxed text-slate-400">
          Nothing is submitted without your approval. Personal details stay masked until you reveal them.
        </p>
      </div>
    </div>
  );
}
