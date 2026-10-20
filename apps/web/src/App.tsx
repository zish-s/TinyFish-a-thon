import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentStep, CaseFile } from '@redress/core';
import { api, subscribeToCase, type CaseEvent, type LogLine, type Profile } from './lib/api';
import { Intake } from './components/Intake';
import { TriagePanel } from './components/TriagePanel';
import { CoverageMap } from './components/CoverageMap';
import { AgentTheatre } from './components/AgentTheatre';
import { EvidenceVault } from './components/EvidenceVault';
import { Pricing } from './components/Pricing';
import { Pill, StatusDot } from './components/ui';

type Tab = 'plan' | 'agent' | 'evidence' | 'pricing';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'plan', label: 'Coverage map' },
  { id: 'agent', label: 'Agent theatre' },
  { id: 'evidence', label: 'Evidence & follow-up' },
  { id: 'pricing', label: 'Business model' },
];

export default function App() {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [tab, setTab] = useState<Tab>('plan');
  const [busy, setBusy] = useState(false);
  const [busyChannel, setBusyChannel] = useState<string | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [monitorsArmed, setMonitorsArmed] = useState(false);
  const [sandbox, setSandbox] = useState(false);

  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined);
  }, []);

  const handleEvent = useCallback((event: CaseEvent) => {
    if (event.type === 'case') {
      setCaseFile(event.caseFile);
    } else if (event.type === 'log') {
      setLogs((prev) => [...prev.slice(-200), event]);
    } else if (event.type === 'step') {
      setSteps((prev: any[]) => {
        const index = prev.findIndex((s) => s.id === event.step.id);
        if (index === -1) return [...prev, event.step];
        const next = [...prev];
        next[index] = event.step;
        return next;
      });
    } else if (event.type === 'monitor') {
      setMonitors((prev) => [...prev.filter((m) => m.id !== event.monitor.id), event.monitor]);
    } else if (event.type === 'channel') {
      setCaseFile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          plan: {
            ...prev.plan,
            channels: prev.plan.channels.map((c) => (c.id === event.channel.id ? event.channel : c)),
          },
        };
      });
    }
  }, []);

  const startCase = async (text: string, profile: Profile, country: string) => {
    setBusy(true);
    setLogs([]);
    setSteps([]);
    setMonitors([]);
    setMonitorsArmed(false);
    try {
      const created = await api.createCase(text, profile, country);
      setCaseFile(created);
      setTab('plan');
      subscribeToCase(created.id, handleEvent);
      // Kick off the live portal discovery immediately.
      await api.discover(created.id, sandbox);
    } catch (err) {
      setLogs([
        {
          type: 'log',
          level: 'error',
          message: `Could not start the case: ${(err as Error).message}`,
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const streamingUrl = useMemo(() => {
    const running = (steps as any[]).filter((s) => s.status === 'running');
    const withStream = running.find((s) => s.streamingUrl);
    return withStream?.streamingUrl ?? (steps as any[]).find((s) => s.streamingUrl)?.streamingUrl;
  }, [steps]);

  const runChannel = async (channelId: string, action: 'analyse' | 'fill' | 'submit') => {
    if (!caseFile) return;
    setBusyChannel(channelId);
    try {
      if (action === 'analyse') await api.analyse(caseFile.id, channelId);
      else await api.file(caseFile.id, channelId, action === 'submit');
      setTab('agent');
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        {
          type: 'log' as const,
          level: 'error' as const,
          message: (err as Error).message,
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setTimeout(() => setBusyChannel(null), 1500);
    }
  };

  return (
    <div className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-ink-800/80 bg-ink-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 text-ink-950">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
                <path d="M12 3v18M3 12h18" />
                <circle cx="12" cy="12" r="9" />
              </svg>
            </span>
            <div>
              <div className="text-sm font-bold tracking-tight text-white">Redress</div>
              <div className="text-[10.5px] text-slate-500">report once · file everywhere · prove it</div>
            </div>
          </div>

          {caseFile && (
            <nav className="flex flex-wrap items-center gap-1">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition ${
                    tab === t.id ? 'bg-ink-800 text-brand-300' : 'text-slate-400 hover:bg-ink-900 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            {health && (
              <div className="hidden items-center gap-2 text-[11px] text-slate-500 md:flex">
                <StatusDot tone={health.tinyfish?.configured ? 'ok' : 'error'} />
                TinyFish
                {health.tinyfish?.wallet ? ` · $${health.tinyfish.wallet.balance}` : ''}
                {health.tunnel && !health.tunnel.public ? ' · local only' : ' · tunnel on'}
              </div>
            )}
            {caseFile ? (
              <div className="flex items-center gap-2">
                <Pill tone={sandbox ? 'violet' : 'brand'}>{sandbox ? 'sandbox' : 'live'}</Pill>
                <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-500">
                  <input
                    type="checkbox"
                    checked={sandbox}
                    onChange={(e) => setSandbox(e.target.checked)}
                    className="h-3.5 w-3.5 accent-brand-500"
                  />
                  demo portals
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-7">
        {!caseFile ? (
          <Intake onSubmit={startCase} busy={busy} />
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-lg font-bold tracking-tight text-white">{caseFile.title}</h1>
                <p className="mt-0.5 text-[12.5px] text-slate-500">
                  Case {caseFile.id.slice(0, 8)} · {caseFile.plan.channels.length} channels ·{' '}
                  {caseFile.plan.estimatedMinutes} min of handling · {caseFile.country}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Pill tone="brand">status: {caseFile.status}</Pill>
                <button
                  type="button"
                  className="btn-ghost text-xs"
                  onClick={() => {
                    setCaseFile(null);
                    setSteps([]);
                    setLogs([]);
                  }}
                >
                  New report
                </button>
              </div>
            </div>

            <TriagePanel triage={caseFile.incident} />

            {tab === 'plan' && (
              <CoverageMap
                channels={caseFile.plan.channels}
                gaps={caseFile.plan.gaps}
                busyChannel={busyChannel}
                onAnalyse={(id) => runChannel(id, 'analyse')}
                onFile={(id, submit) => runChannel(id, submit ? 'submit' : 'fill')}
                onSkip={async (id) => {
                  await api.skip(caseFile.id, id);
                }}
              />
            )}

            {tab === 'agent' && <AgentTheatre steps={steps} logs={logs} streamingUrl={streamingUrl} />}

            {tab === 'evidence' && (
              <EvidenceVault
                evidence={caseFile.evidence}
                monitors={monitors}
                caseId={caseFile.id}
                armed={monitorsArmed}
                onArm={async () => {
                  await api.armMonitors(caseFile.id);
                  setMonitorsArmed(true);
                }}
              />
            )}

            {tab === 'pricing' && <Pricing />}
          </div>
        )}
      </main>

      <footer className="mx-auto max-w-[1400px] px-5 pb-8 pt-2 text-[11px] text-slate-600">
        Redress &middot; built for KriticalHacks 2026 (AssetMerkle x IGDTUW, with TinyFish) &middot; every portal lookup,
        form read and follow-up check is performed live by a TinyFish web agent.
      </footer>
    </div>
  );
}
