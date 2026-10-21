import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AgentStep, CaseFile, IncidentDetails } from '@reclaim/core';
import { api, type CaseEvent, type LogLine, type Profile } from './lib/api';
import { Intake } from './components/Intake';
import { CoverageMap } from './components/CoverageMap';
import { AgentTheatre } from './components/AgentTheatre';
import { EvidenceVault } from './components/EvidenceVault';
import { Pricing } from './components/Pricing';
import { YourDetails } from './components/YourDetails';
import { CaseDetails } from './components/CaseDetails';
import { MissingFields } from './components/MissingFields';
import { Dot, SectionTitle, Tag } from './components/ui';import { Net } from './components/Doodles';

export default function App() {
  const [caseFile, setCaseFile] = useState<CaseFile | null>(null);
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [monitors, setMonitors] = useState<any[]>([]);
  const [monitorsArmed, setMonitorsArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [busyChannel, setBusyChannel] = useState<string | null>(null);
  const [sandbox, setSandbox] = useState(true);
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

  const startCase = async (
    text: string,
    profile: Profile,
    country: string,
    details?: IncidentDetails,
  ) => {
    setBusy(true);
    setSubmitError(null);
    setLogs([]);
    setSteps([]);
    setMonitors([]);
    setMonitorsArmed(false);
    try {
      const created = await api.createCase(text, profile, country, details);
      setCaseFile(created);
      await runAction((c) => api.discover(created.id, sandbox, c, handleEvent), created);
    } catch (err) {
      const message = (err as Error).message || 'Something went wrong.';
      setSubmitError(
        message.includes('valid')
          ? 'Please describe what happened in a little more detail.'
          : `We could not start the report: ${message}`,
      );
      setLogs([
        {
          type: 'log',
          level: 'error',
          message: `Could not start the case: ${message}`,
          ts: new Date().toISOString(),
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  /** Runs one agent action as a single streamed request. */
  const runAction = async (
    call: (current: CaseFile) => Promise<void>,
    current: CaseFile,
  ) => {
    await call(current);
  };

  const streamingUrl = useMemo(() => {
    const running = steps.filter((s) => s.status === 'running');
    return running.find((s) => s.streamingUrl)?.streamingUrl ?? steps.find((s) => s.streamingUrl)?.streamingUrl;
  }, [steps]);

  const runChannel = async (channelId: string, action: 'analyse' | 'fill' | 'submit') => {
    if (!caseFile) return;
    setBusyChannel(channelId);
    try {
      if (action === 'analyse') await api.analyse(caseFile.id, channelId, caseFile, handleEvent);
      else await api.file(caseFile.id, channelId, action === 'submit', caseFile, handleEvent);
    } catch (err) {
      setLogs((prev) => [
        ...prev,
        { type: 'log' as const, level: 'error' as const, message: (err as Error).message, ts: new Date().toISOString() },
      ]);
    } finally {
      setBusyChannel(null);
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
      {health && !health.tinyfish?.configured && (
        <div className="border-b border-rose-300/70 bg-rose-50 px-5 py-3 text-center text-[13px] font-medium text-[#A63A56]">
          TinyFish is not configured on this deployment. Add{' '}
          <span className="font-mono">TINYFISH_API_KEY</span> as an environment variable and redeploy - the agent
          cannot run without it.
        </div>
      )}
      <header className="sticky top-0 z-20 border-b border-hair-8 bg-canvas/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-5 py-3.5">
          <a href="#" onClick={reset} className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-coral-500 text-white">
              <Net className="h-4.5 w-4.5" />
            </span>
            <span className="text-[15px] font-extrabold tracking-tight text-ink">ReclaimYourNet</span>
          </a>

          {caseFile && (
            <nav className="hidden items-center gap-5 text-[13.5px] text-muted sm:flex">
              <a href="#report" className="hover:text-ink">
                Where to report
              </a>
              <a href="#agent" className="hover:text-ink">
                The agent
              </a>
              <a href="#evidence" className="hover:text-ink">
                Evidence
              </a>
              <a href="#plans" className="hover:text-ink">
                Plans
              </a>
            </nav>
          )}

          <div className="ml-auto flex items-center gap-3">
            {health && (
              <span className="hidden items-center gap-1.5 text-[11.5px] text-muted-faint md:flex">
                <Dot tone={health.tinyfish?.configured ? 'ok' : 'error'} />
                TinyFish
                {health.tinyfish?.wallet ? ` $${health.tinyfish.wallet.balance}` : ''}
              </span>
            )}
            {caseFile && (
              <label
                className="flex cursor-pointer items-center gap-2 text-[12px] text-muted"
                title="The real report forms on Instagram, X and the banks all need a login, so the agent cannot fill them. In practice mode it fills a copy of each form instead, so you can see the whole flow."
              >
                <input
                  type="checkbox"
                  checked={sandbox}
                  onChange={(e) => setSandbox(e.target.checked)}
                  className="h-3.5 w-3.5 accent-coral-500"
                />
                Practice mode
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
          <Intake onSubmit={startCase} busy={busy} error={submitError} />
        ) : (
          <div className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
            <div className="mb-10">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
                Here is where this needs to be reported.
              </h1>
              <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-muted">
                {nowCount} place{nowCount === 1 ? '' : 's'} to start with
                {laterCount > 0 && `, and ${laterCount} more you can arm afterwards`}. Open one, let the agent read the
                real form, check what it will type, and then approve it.
              </p>
              {sandbox && (
                <p className="mt-3 inline-flex items-start gap-2 rounded-2xl border border-lilac-300/70 bg-lilac-50/70 px-4 py-2.5 text-[13px] leading-relaxed text-ink-soft">
                  <span className="font-semibold text-ink">Practice mode is on.</span> The real report forms on Instagram,
                  X and the banks all ask you to log in, so the agent cannot fill them. Here it fills a copy of each
                  form instead - same fields, same flow, nothing sent anywhere. Turn it off to see the real portals
                  being found and open them yourself.
                </p>
              )}
              {caseFile.incident.urgency !== 'normal' && (
                <div
                  className={`mt-5 rounded-3xl border p-5 ${
                    caseFile.incident.urgency === 'critical'
                      ? 'border-rose-300/70 bg-rose-50/80'
                      : 'border-butter-300/70 bg-butter-50/80'
                  }`}
                >
                  <p
                    className={`text-sm font-bold ${
                      caseFile.incident.urgency === 'critical' ? 'text-[#A63A56]' : 'text-[#7A5C0B]'
                    }`}
                  >
                    {caseFile.incident.urgency === 'critical'
                      ? 'This one is time-critical.'
                      : 'This one is time-sensitive.'}
                  </p>
                  <ul className="mt-1.5 space-y-1">
                    {caseFile.incident.urgencyReasons.map((reason) => (
                      <li
                        key={reason}
                        className={`text-[13.5px] leading-relaxed ${
                          caseFile.incident.urgency === 'critical' ? 'text-[#A63A56]' : 'text-[#8A6A12]'
                        }`}
                      >
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <YourDetails
                profile={caseFile.profile ?? {}}
                onSave={async (profile) => {
                  const updated = await api.updateDetails(caseFile.id, profile, caseFile);
                  setCaseFile(updated);
                }}
              />

              <CaseDetails
                details={caseFile.details}
                profile={caseFile.profile ?? {}}
                onSave={async (details) => {
                  const updated = await api.updateIncidentDetails(caseFile.id, details, caseFile);
                  setCaseFile(updated);
                }}
              />

              <MissingFields
                channels={caseFile.plan.channels}
                profileFilled={Boolean(caseFile.profile?.name && caseFile.profile?.phone)}
                onSave={async (channelId, fieldName, value) => {
                  const updated = await api.updateFields(caseFile.id, channelId, { [fieldName]: value }, caseFile);
                  setCaseFile(updated);
                }}
              />
            </div>

            <section id="report" className="mt-12 scroll-mt-24">
              <SectionTitle
                eyebrow="Step 2"
                title="Every place this has to be reported"
                action={
                  <span className="text-[13px] text-muted">
                    Open one, read the form, approve, and we file it.
                  </span>
                }
              />
              <CoverageMap
                channels={caseFile.plan.channels}
                gaps={caseFile.plan.gaps}
                busyChannel={busyChannel}
                onAnalyse={(id) => runChannel(id, 'analyse')}
                onFile={(id, submit) => runChannel(id, submit ? 'submit' : 'fill')}
                onSkip={async (id) => {
                  const updated = await api.skip(caseFile.id, id, caseFile);
                  setCaseFile(updated);
                }}              />
            </section>

            <section id="agent" className="mt-16 scroll-mt-24 border-t border-hair-8 pt-12">
              <SectionTitle
                eyebrow="Step 3"
                title="What the agent did"
                action={
                  <span className="text-[13px] text-muted">
                    You watch the agent work in its own browser, then it stops and asks.
                  </span>
                }
              />
              <AgentTheatre steps={steps} logs={logs} streamingUrl={streamingUrl} />
            </section>

            <section id="evidence" className="mt-16 scroll-mt-24 border-t border-hair-8 pt-12">
              <SectionTitle
                eyebrow="Step 4"
                title="Your proof, and what we keep watching"
                action={
                  <span className="text-[13px] text-muted">
                    A signed record of what was filed, and a check that it stays gone.
                  </span>
                }
              />
              <EvidenceVault
                evidence={caseFile.evidence}
                uploads={caseFile.uploads}
                monitors={monitors}
                caseId={caseFile.id}
                currentCase={caseFile}
                onUpload={async (file, description, capturedAt) => {
                  const updated = await api.uploadEvidence(
                    caseFile.id,
                    file,
                    description,
                    capturedAt,
                    caseFile,
                  );
                  setCaseFile(updated);
                }}
                onWithdraw={async (uploadId) => {
                  const updated = await api.withdrawEvidence(caseFile.id, uploadId, caseFile);
                  setCaseFile(updated);
                }}
                onArm={async () => {
                  await api.armMonitors(caseFile.id, caseFile, handleEvent);
                  setMonitorsArmed(true);
                }}
                armed={monitorsArmed}
              />
            </section>

            <section id="plans" className="mt-16 scroll-mt-24 border-t border-hair-8 pt-12">
              <SectionTitle
                eyebrow="For reference"
                title="What it costs"
                action={<span className="text-[13px] text-muted">Free for you. The money comes from the organisations.</span>}
              />
              <Pricing />
            </section>
          </div>
        )}
      </main>

      <footer className="border-t border-hair-8 bg-white/60">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[12.5px] text-muted-faint">
          <span>ReclaimYourNet - report once, file everywhere, prove it.</span>
          <span className="flex items-center gap-2">
            {caseFile && <Tag tone="neutral">case {caseFile.id.slice(0, 8)}</Tag>}
            <span>Every lookup, form read and follow-up check is done live by a TinyFish web agent.</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
