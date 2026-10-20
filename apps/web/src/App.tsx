import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentStep, CaseFile } from '@redress/core';
import { api, subscribeToCase, type CaseEvent, type LogLine, type Profile } from './lib/api';
import { Intake } from './components/Intake';
import { CoverageMap } from './components/CoverageMap';
import { AgentTheatre } from './components/AgentTheatre';
import { EvidenceVault } from './components/EvidenceVault';
import { Pricing } from './components/Pricing';
import { Dot, Tag } from './components/ui';

export default function App() {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [monitorsArmed, setMonitorsArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [busyChannel, setBusyChannel] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(false);
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => undefined);
  }, []);

  const handleEvent = useCallback((event: CaseEvent) => {
    if (event.type === 'case') {
      setCaseFile(event.caseFile);
    } else if (event.type === 'log') {
      setLogs((prev) => [...prev.slice(-200), event]);
    } else if (event.type === 'step') {
      setSteps((prev) => {
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
      subscribeToCase(created.id, handleEvent);
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
    const running = steps.filter((s) => s.status === 'running');
    return running.find((s) => s.streamingUrl)?.streamingUrl ?? steps.find((s) => s.streamingUrl)?.streamingUrl;
  }, [steps]);

  const runChannel = async (channelId: string, action: 'analyse' | 'fill' | 'submit') => {
    if (!caseFile) return;
    setBusyChannel(channelId);
    try {
      if (action === 'analyse') await api.analyse(caseFile.id, channelId);
      else await api.file(caseFile.id, channelId, action === 'submit');
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'log' as const, level: 'error' as const, message: (err as Error).message, ts: new Date().toISOString() },
      ]);
    } finally {
      setTimeout(() => setBusyChannel(null), 1500);
    }
  };

  const reset = () => {
    setCaseFile(null);
    setSteps([]);
    setLogs([]);
    setMonitors([]);
  };

  const nowCount = caseFile?.plan.channels.filter((c) => c.priority !== 'later').length ?? 0;
  const laterCount = caseFile?.plan.channels.filter((c) => c.priority === 'later').length ?? 0;

  return (
    <div className="flex min-h-full flex-col">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5">
          <a href="#" onClick={reset} className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6">
                <path d="M12 4v16M4 12h16" />
              </svg>
            </span>
            <span className="text-[15px] font-bold tracking-tight text-slate-900">Redress</span>
          </a>

          {caseFile && (
            <nav className="hidden items-center gap-5 text-[13.5px] text-slate-500 sm:flex">
              <a href="#report" className="hover:text-slate-900">
                Where to report
              </a>
              <a href="#agent" className="hover:text-slate-900">
                The agent
              </a>
              <a href="#evidence" className="hover:text-slate-900">
                Evidence
              </a>
              <a href="#plans" className="hover:text-slate-900">
                Plans
              </a>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            {health && (
              <span className="hidden items-center gap-1.5 text-[11.5px] text-slate-400 md:flex">
                <Dot tone={health.tinyfish?.configured ? 'ok' : 'error'} />
                TinyFish
                {health.tinyfish?.wallet ? ` $${health.tinyfish.wallet.balance}` : ''}
              </span>
            )}
            {caseFile && (
              <label className="flex cursor-pointer items-center gap-2 text-[12px] text-slate-500">
                <input
                  type="checkbox"
                  checked={sandbox}
                  onChange={(e) => setSandbox(e.target.checked)}
                  className="h-3.5 w-3.5 accent-brand-600"
                />
                demo forms
              </label>
            )}
            {caseFile ? (
              <button type="button" className="btn-outline !py-1.5" onClick={reset}>
                New report
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {!caseFile ? (
          <Intake onSubmit={startCase} busy={busy} />
        ) : (
          <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
            <div className="mb-10">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Here is where this needs to be reported.
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-slate-500">
                {nowCount} place{nowCount === 1 ? '' : 's'} to start with
                {laterCount > 0 && `, and ${laterCount} more you can arm afterwards`}. Open one, let the agent read the
                real form, check what it will type, and then approve it.
              </p>
              {caseFile.incident.urgency !== 'normal' && (
                <div
                  className={`mt-5 rounded-2xl border p-4 ${
                    caseFile.incident.urgency === 'critical'
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-amber-200 bg-amber-50'
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      caseFile.incident.urgency === 'critical' ? 'text-rose-900' : 'text-amber-900'
                    }`}
                  >
                    {caseFile.incident.urgency === 'critical' ? 'This one is time-critical.' : 'This one is time-sensitive.'}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {caseFile.incident.urgencyReasons.map((reason) => (
                      <li
                        key={reason}
                        className={`text-[13.5px] leading-relaxed ${
                          caseFile.incident.urgency === 'critical' ? 'text-rose-800' : 'text-amber-800'
                        }`}
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <section id="report" className="scroll-mt-24">
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
            </section>

            <section id="agent" className="mt-16 scroll-mt-24 border-t border-slate-200 pt-12">
              <AgentTheatre steps={steps} logs={logs} streamingUrl={streamingUrl} />
            </section>

            <section id="evidence" className="mt-16 scroll-mt-24 border-t border-slate-200 pt-12">
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
            </section>

            <section id="plans" className="mt-16 scroll-mt-24 border-t border-slate-200 pt-12">
              <Pricing />
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[12.5px] text-slate-400">
          <span>Redress - report once, file everywhere, prove it.</span>
          <span className="flex items-center gap-2">
            {caseFile && <Tag tone="slate">case {caseFile.id.slice(0, 8)}</Tag>}
            <span>Every lookup, form read and follow-up check is done live by a TinyFish web agent.</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
