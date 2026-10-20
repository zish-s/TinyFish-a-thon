import { useEffect, useRef, useState } from 'react';
import type { Profile } from '../lib/api';
import { ArrowCurve, Sparkles, Squiggle, Star, Underline } from './Doodles';

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
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);
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
      if (code === 'not-allowed' || code === 'service-not-allowed') {
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
    onSubmit(text.trim(), profile, country);
  };

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

          <div className="mt-7 flex flex-wrap items-center gap-2.5 text-sm">
            <span className="text-muted-faint">Try:</span>
            {EXAMPLES.map((ex) => (
              <button
                key={ex.tag}
                type="button"
                onClick={() => setText(ex.text)}
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
    </div>
  );
}
