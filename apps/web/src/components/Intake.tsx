import { useEffect, useRef, useState } from 'react';
import { Pill } from './ui';
import type { Profile } from '../lib/api';

const EXAMPLES = [
  {
    tag: 'Impersonation + fraud',
    text: "Someone made a fake Instagram account at https://instagram.com/rahul.finance.2024 using my photo and my college ID, and is asking my friends to send me 500 rupees as a 'gift'. They also posted my phone number on the page.",
    profile: { name: 'Ishita Sharma', email: 'ishita@example.com', phone: '+91 98765 43210', city: 'Delhi' },
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

export function Intake({
  onSubmit,
  busy,
}: {
  onSubmit: (text: string, profile: Profile, country: string) => void;
  busy: boolean;
}) {
  const [text, setText] = useState(EXAMPLES[0].text);
  const [profile, setProfile] = useState<Profile>(EXAMPLES[0].profile);
  const [country, setCountry] = useState('IN');
  const [listening, setListening] = useState(false);
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

  const toggleMic = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;
    if (listening) {
      recognition.stop();
      setListening(false);
    } else {
      recognition.start();
      setListening(true);
    }
  };

  const micSupported = typeof window !== 'undefined' && Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  return (
    <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
      <div className="panel animate-fade-up p-6">
        <div className="mb-1 flex items-center gap-2">
          <span className="chip border-brand-500/40 bg-brand-500/10 text-brand-300">Step 1</span>
          <h1 className="text-xl font-bold tracking-tight text-white">Tell us once</h1>
        </div>
        <p className="mb-5 text-sm text-slate-400">
          Describe what happened in your own words - in any language, with the details you remember. Redress works out
          the rest: what kind of harm this is, which official bodies can act on it, and what has to be filed where.
        </p>

        <div className="relative">
          <textarea
            className="input min-h-[190px] resize-y leading-relaxed"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. A fake account is using my photos and asking my friends for money..."
          />
          {micSupported && (
            <button
              type="button"
              onClick={toggleMic}
              title={listening ? 'Stop dictation' : 'Dictate instead of typing'}
              className={`absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-full border transition ${
                listening
                  ? 'animate-pulse-dot border-rose-400 bg-rose-500/20 text-rose-300'
                  : 'border-ink-600 bg-ink-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
              </svg>
            </button>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="label mr-1">Try an example</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex.tag}
              type="button"
              onClick={() => {
                setText(ex.text);
                setProfile(ex.profile);
              }}
              className="chip border-ink-600 bg-ink-800/60 text-slate-300 transition hover:border-brand-500/50 hover:text-brand-300"
            >
              {ex.tag}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {(
            [
              ['name', 'Your name', 'As on your ID'],
              ['email', 'Email', 'Where the reference number goes'],
              ['phone', 'Mobile', 'For the callback / OTP'],
              ['city', 'City', 'Used to pick the right police district'],
            ] as const
          ).map(([key, label, hint]) => (
            <label key={key} className="block">
              <span className="label">{label}</span>
              <input
                className="input mt-1"
                value={profile[key] ?? ''}
                onChange={(e) => setProfile((p) => ({ ...p, [key]: e.target.value }))}
                placeholder={hint}
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <label className="block">
            <span className="label">Jurisdiction</span>
            <select className="input mt-1 w-40" value={country} onChange={(e) => setCountry(e.target.value)}>
              <option value="IN">India</option>
              <option value="US">United States</option>
              <option value="GB">United Kingdom</option>
              <option value="AU">Australia</option>
              <option value="CA">Canada</option>
            </select>
          </label>
          <button
            type="button"
            disabled={busy || text.trim().length < 8}
            onClick={() => onSubmit(text.trim(), profile, country)}
            className="btn-primary px-6 py-2.5 text-[15px]"
          >
            {busy ? 'Triaging...' : 'Analyse my report'}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          Redress never submits anything without your explicit approval. Sensitive values (address, ID numbers, bank
          details) are masked in every summary and only unlocked by you.
        </p>
      </div>

      <aside className="space-y-4">
        <div className="panel animate-fade-up p-6">
          <h3 className="text-sm font-semibold text-slate-200">What happens next</h3>
          <ol className="mt-4 space-y-4">
            {[
              ['Explainable triage', 'A local model labels the incident and shows the exact words that drove the decision.'],
              ['Live channel discovery', 'A TinyFish web agent searches the live web for the current official portal and helpline - nothing is hard-coded.'],
              ['Form archaeology', 'The agent opens the real form and reads the fields it actually has today.'],
              ['You review, it files', 'You approve each field. The agent fills and submits, and we keep a tamper-evident evidence trail.'],
              ['Follow-up', 'TinyFish monitors keep checking whether the content actually came down.'],
            ].map(([title, body], i) => (
              <li key={title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-ink-600 bg-ink-800 font-mono text-[11px] text-brand-300">
                  {i + 1}
                </span>
                <div>
                  <div className="text-sm font-medium text-slate-200">{title}</div>
                  <div className="mt-0.5 text-[12.5px] leading-relaxed text-slate-500">{body}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="panel animate-fade-up p-6">
          <h3 className="text-sm font-semibold text-slate-200">Built for the harm that does not end when you hit send</h3>
          <div className="mt-3 space-y-2 text-[12.5px] leading-relaxed text-slate-400">
            <p>
              Most products stop at &ldquo;here is the link to report&rdquo;. Redress also handles the part everyone
              skips: the platforms you did not know existed, the pre-emptive services that pull your content back if it
              is uploaded later, and the proof that a case was actually made.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <Pill tone="violet">Take It Down</Pill>
              <Pill tone="violet">StopNCII</Pill>
              <Pill tone="violet">Takedown</Pill>
              <Pill tone="violet">RemoveHer</Pill>
              <Pill tone="violet">Redo</Pill>
              <Pill tone="violet">C2PA</Pill>
              <Pill tone="violet">Google removal</Pill>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
