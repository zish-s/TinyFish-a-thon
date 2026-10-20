# Redress - KriticalHacks 2026 pitch deck (AI/ML track)

> Submission: PPT + demo video + GitHub URL (optional).
> Every slide below maps to one of the eight sections the Unstop submission form
> asks for. Slide 3 of the appendix lists the mapping explicitly.

**One line:** *You describe the harm once. Redress finds every place it has to be
reported, reads the real form on each of those places, pre-fills it, files it with
your approval, and then watches to see whether it actually came down.*

---

## Slide 1 - Title

**Redress**
*Report once. File everywhere. Prove it happened.*

- Track: AI/ML (open innovation)
- Built with TinyFish: Search + Fetch + Web Agent + Monitor
- Team: <name> - <handle> - <college>

Speaker note: "Every one of us has, at some point, wanted to report online abuse
and given up half-way through because it meant four different forms on four
different websites, each asking for slightly different things, with no idea which
one actually mattered. Redress is the layer that removes that job."

---

## Slide 2 - Problem statement

**Reporting online harm is a bureaucratic job, and victims are the worst equipped
to do it.**

The hard part is never filling in a form. It is:

1. **Knowing where to file.** The right authority depends on the type of harm, the
   jurisdiction, and the money involved. A bank dispute, a cybercrime portal
   complaint, a police FIR and a platform report are four different routes to four
   different outcomes - and skipping the wrong one costs you the outcome.
2. **Knowing what each form needs.** Every portal asks for a different subset of
   facts, and the required evidence differs.
3. **Keeping up with the fact that things change.** Portals move, forms change,
   helplines change. Any list built into an app goes stale silently.
4. **Proving you reported it.** Banks and police ask for reference numbers. Most
   victims never get them, or never keep them.

**And the part nobody does: the harm is not over when you hit send.** Content
reappears. It is morphed with AI. It is re-uploaded to a different site. It is
indexed by a search engine so that strangers can find it in seconds.

Concretely, in one investigation, an impersonation account using a student's photo
turned out to have: a platform report, a cybercrime portal complaint, a bank
dispute (money had moved), a police FIR, a Google URL removal, and a pre-emptive
hash registration with a NCII takedown service - seven actions, five different
organisations, no single place that would have told the victim to do all seven.

---

## Slide 3 - Proposed solution

**Redress turns one description into a filed, evidenced, monitored case.**

| Stage | What happens | Who does it |
| --- | --- | --- |
| 1. Describe | One free-text or spoken description of the incident | Victim |
| 2. Triage | A local, explainable model labels the incident type, extracts entities (platform, amount, date, handles) and masks sensitive values | Redress (offline ML) |
| 3. Plan | A channel planner turns the labels into a prioritised set of routes: platform / authority / financial / pre-emptive protection / de-indexing, each with a reason and a deadline | Redress (rules + ML) |
| 4. Discover | A **TinyFish web agent** searches the live web for the *current* official portal, helpline and reporting page for each route | TinyFish Search |
| 5. Read | The same agent opens the real page and **reads the form it actually has today** - fields, labels, required flags, evidence requested | TinyFish Web Agent |
| 6. Review | The victim sees every value that will be typed, with sensitive fields masked, and approves or edits | Victim |
| 7. File | The agent types the approved values into the live form, stops before Submit, and submits only on a second explicit approval | TinyFish Web Agent |
| 8. Prove | Every page read, every reference number and every submission is written into a SHA-256 hash chain and exported as a court/bank-ready case file | Redress |
| 9. Follow up | TinyFish Monitors re-check the reported URL on a schedule and tell the victim whether the content actually came down - and escalate if it did not | TinyFish Monitor |

**The design principle: nothing about the world is hard-coded.** The channel
catalogue in the code is only a *fallback*. The real channel graph - which portal,
which URL, which fields, which evidence - is resolved live, per case, by a web
agent, at the moment of the report.

---

## Slide 4 - Target users and use cases

**Primary user: a victim of online harm, on a phone, in the first hour.**
They are not a compliance professional. They are stressed, they are on a deadline
(a bank freeze window, a takedown window), and the forms are hostile.

Concrete use cases we support today:

| Use case | What Redress does |
| --- | --- |
| Impersonation + money | Platform report, cybercrime fraud complaint, bank dispute, police FIR, clone-watch monitor |
| Morphed / AI-generated intimate image | Takedown request, pre-emptive hash registration (Take It Down, StopNCII, Takedown, RemoveHer, Redo), on-device blur before upload, de-indexing |
| Doxxing | Data-broker opt-out, Google/Bing URL removal, police cyber cell, helpline call reminder |
| Harassment / stalking of a woman | Women helpline, police cyber cell, NCW complaint, platform reports, protection services |
| Child safety | Mandatory child-safety reporting, platform reports, police |

**Secondary users (the ones who pay):** victim-support organisations, campus
safety teams, community organisations that handle dozens of reports a week and
need a consistent, evidenced process.

---

## Slide 5 - Role of machine learning / AI

Two very different jobs, deliberately split.

### 5a. Classical ML, on device, explainable - `packages/core`

**Model:** one-vs-rest L2-regularised **logistic regression** over a TF-IDF
vector of unigrams + bigrams, drawn from a synonym-folded, stemmed token stream
(14 incident types, 223 hand-labelled multi-label examples). Trained with
full-batch gradient descent + momentum.

*Why not an LLM for triage?* Triage must be reproducible, offline, free, and
able to justify itself. A victim is being asked to trust a recommendation that
tells them to report their case to a government portal - "because the word
*scammer* contributed +2.1 to fraud" is a sentence a human can check.

**Evaluation** (stratified 5-fold cross-validation, `npm run eval`):

| Metric | Value |
| --- | --- |
| Macro F1 | 0.62 |
| Macro precision | 0.50 |
| Macro recall | 0.83 |
| Top-1 label correct | 89.7% |
| Exact label-set match | 14.8% |

The numbers are honest and reproducible from the committed corpus. We over-predict
labels on purpose: in this domain a missed label means a **missed reporting
route**, and an extra channel is cheap while a missing one is not.

**Explainability is a feature, not a slogan.** The model stores a weight per
token, so the UI shows the exact words that drove each label
(`money +2.1`, `scam +1.8`, `photo +1.4`). The same weights are what a victim
or a support worker sees in the app.

**Hard-signal rules layer on top.** Urgency, escalation signals and the
de-risking of sensitive data are rule-based and auditable: money lost, threat,
minor involved, intimate content, identity exposed, account takeover.

### 5b. Agentic AI on the live web - TinyFish

The judgement-heavy half of the problem - *which* portal, *which* form, *what*
evidence, *is it still true right now* - is delegated to a web agent, because
that is exactly the part an LLM cannot do and a hard-coded list does badly.

---

## Slide 6 - Proposed TinyFish integration (the mandatory slide)

**We use four TinyFish surfaces, each for a job a static implementation cannot do.**

| TinyFish surface | Where it is used | What it replaces |
| --- | --- | --- |
| **Search API** | `apps/api/src/pipeline/orchestrator.ts` -> `discoverChannels()` | A hard-coded list of portal URLs that goes stale. At report time the agent asks the live web where the current official reporting page is, per country, and scores the results for officialness (`.gov`, `.nic.in`, known platform domains). |
| **Web Agent (SSE)** | `orchestrator.ts` -> `analyseChannel()` and `fileChannel()` | A hard-coded form schema. The agent opens the real page and returns the *actual* fields, labels, required flags and evidence requests via `output_schema`; then, after approval, types the approved values and submits. The `PROGRESS` and `STREAMING_URL` SSE events are streamed straight into the user's browser as a live view of the agent working. |
| **Fetch API** | evidence capture | Downloading a page to attach to the case file. Also the substrate of the Page Monitor. |
| **Monitor API** | `orchestrator.ts` -> `armMonitors()` | "We filed it and hoped." A Page Monitor re-checks the reported URL every 6 hours and reports a change; a Topic Monitor watches for a *clone* of the impersonation account appearing somewhere new. |

**Where the agent is deliberately not used:** the triage decision and the
redaction of personal data. Those stay local, deterministic and auditable.

**Cost discipline.** Search and Fetch are free within TinyFish's daily
allowance; the Agent is metered per step ($0.016). Redress therefore:
runs archaeology once per channel and caches the field spec, splits filing into
"fill" and "submit" so a human approval sits between them, and never runs an
agent the user has not asked for.

**How a judge can verify this in 30 seconds:** the app has a "sandbox" toggle.
With it on, the agent drives the bundled clone of a real form instead of the real
site - same agent, same goal, same structured output, same live preview. The
agent really runs; only the target changes.

---

## Slide 7 - Architecture

```
 browser (React + Vite + Tailwind)
   |  POST /api/cases            -> explainable triage (local ML, in API)
   |  GET  /api/cases/:id/stream -> SSE: steps, live browser URL, logs, evidence
   |  POST /api/cases/:id/channels/:id/file  -> agent fills / submits
   v
 API (Fastify, Node 20+, TypeScript)
   |- @redress/core      classifier, taxonomy, planner, redaction   (no network)
   |- pipeline           discover -> analyse -> review -> file -> monitor
   |- evidence           SHA-256 hash chain + PDFKit case file
   |- store              node:sqlite (cases, evidence, monitors)
   v
 TinyFish
   |- Search   live portal + helpline discovery
   |- Agent    read the live form, fill it, submit it  (SSE + output_schema)
   |- Fetch    evidence snapshots
   |- Monitor  follow-up checks on the reported URL
```

**The key architectural choice:** the model decides *what kind of problem this
is*; the agent decides *what to do about it on the actual web*; the human
decides *what actually gets submitted*. No layer can silently submit anything.

---

## Slide 8 - Demo (3 minutes)

1. **00:00 - Describe.** Type (or dictate) one sentence about a fake account
   using your photo and asking your friends for money. Pick "imagine" examples
   from the home screen.
2. **00:20 - Triage.** The model labels it (image misuse, impersonation, doxxing,
   financial fraud), shows the tokens that drove each label, flags "money lost"
   as a 24-hour clock, and masks the phone number in the summary.
3. **00:45 - Coverage map.** 8 routes ranked "do now" vs "also consider", each
   with the reason it applies and its deadline. The gap panel says what you
   *have not* covered: "no police FIR - a cybercrime complaint is not enough, only
   an FIR starts the clock on a refund claim."
4. **01:15 - Watch it work.** Press "Read the live form" on Instagram. The
   TinyFish agent opens the page in a remote browser; the browser appears
   live in the app, and the timeline shows what it is doing. It comes back with
   the *actual* fields the page has today.
5. **01:45 - Review and file.** Every value the agent will type is shown, with
   the blank ones highlighted ("needs your input"). Approve, then "Fill &
   submit". The agent types, stops, submits, and returns the reference number
   - which lands in the evidence vault with a hash.
6. **02:15 - Proof and follow-up.** Download the case file PDF (incident
   narrative, triage with reasons, every channel and its reference number, the
   hash chain). Arm follow-up: a monitor now watches the reported URL.

---

## Slide 9 - Expected impact

- **Time-to-report drops from hours to minutes.** The 7-route impersonation
  scenario above is one description and one review.
- **Coverage gaps stop being invisible.** The gap panel is the part we think
  matters most: most victims do not know that a platform report is not a legal
  record, or that a bank dispute has a 24-hour freeze window, or that an FIR is
  required for a refund claim.
- **Pre-emptive protection is mainstreamed.** Take It Down, StopNCII, Takedown,
  RemoveHer, Redo, C2PA and on-device blurring are near-unknown to the public.
  We surface them *at the moment they are useful* - and we say so in the product,
  because most people do not know these exist.
- **Proof becomes a by-product.** A tamper-evident evidence chain and a printable
  case file make a report usable with a bank, a police station or a lawyer.
- **A measurable metric:** of the gaps we detect, what share did the user close?
  That is the number that would show the product working.

---

## Slide 10 - Revenue model

**Free consumer product, paid API for the organisations that receive the
reports.**

| Plan | Price | Who | What they get |
| --- | --- | --- | --- |
| Free | $0 | Anyone reporting one incident | Full triage, live portal discovery, file on 2 channels, case file PDF |
| Pro | $4.99 / month | Someone handling a case on their own | Unlimited channels, agent files every form, evidence vault, follow-up monitors, pre-emptive protection arming |
| Team | $49 / seat / month | NGOs, victim-support orgs, campus safety | Multi-case workspace, shared evidence vault, SLA tracking, escalation templates |
| **Redress API** | **$499 / month + usage** | **Trust & Safety, fraud and compliance teams at banks and platforms** | **Incident in, regulator-ready case file out. Live channel graph per jurisdiction, SLA clocks and breach alerts, audit-grade evidence chain, webhooks for case and monitor events** |

**Unit economics (measured, not guessed):**

| Line | Cost |
| --- | --- |
| TinyFish Search | $0 - free within the daily allowance (12,000/day) |
| TinyFish Fetch | $0 per URL - free within the daily allowance |
| TinyFish Agent | $0.016 per step |
| TinyFish Monitor | $0.005 per run (~$0.15/month for a daily check) |
| **A full case (2 platform + 2 authority channels, read + fill + submit)** | **~$0.30 - $0.60 in agent credits** |

So a Pro subscription at $4.99 carries a ~90% gross margin, and the API tier at
$499 plus usage is priced with the same cost structure plus the compliance value
of a regulator-ready audit trail.

**Why someone pays for the API, not just the app:** a bank's fraud desk is
measured on complaint-handling SLA and on losses recovered, and a platform's
trust & safety team is measured on response time and on evidence when a
regulator asks. Redress gives both an auditable, automated, jurisdiction-aware
routing layer and the proof that it ran.

**Market:** cyber-fraud and identity fraud are among the fastest-growing cost
lines for banks; content moderation and NCII takedown are a permanent
regulatory obligation for every platform. Both are budgeted, recurring,
compliance-driven spend - not a discretionary "nice to have" tool.

---

## Slide 11 - Feasibility

- **The hard part is already built and runs.** Search, Agent (SSE +
  `output_schema`), Fetch and Monitor are all integrated and verified against
  the live API during the build; the agent has read real forms and returned
  structured field lists.
- **Zero-dependency core.** The classifier, taxonomy, planner and redaction are
  pure TypeScript with no runtime dependencies, 11 passing unit tests and a
  reproducible 5-fold evaluation script. It runs in the browser, in the API and
  in CI.
- **Cost per user is bounded and tiny** (table above). The expensive part of the
  product is the one-time form read per channel, and it is cached.
- **Degradation is designed in.** If a portal blocks the agent, the channel is
  marked "manual" and the case continues. If the wallet runs low, search and
  fetch still work. If the network is down, triage still works.
- **Legal and ethical posture.** The agent never invents a value, never submits
  without a second explicit human approval, never guesses a required field, and
  masks personal data by default. A tamper-evident log of exactly what was
  filed, where, when and with which reference number is a feature for the
  victim and for the platform.

---

## Slide 12 - Future scope

1. **Voice-first intake** with the Web Speech API (already wired in the UI) and
   regional-language input.
2. **Authenticated filing.** A Browser Context Profile plus TinyFish Vault so
   the agent can file on logged-in platforms (Instagram, X, WhatsApp) as you,
   with your session, without you retyping anything.
3. **Outcome tracking as a product.** The Monitor graph becomes a dashboard:
   "of the 312 reports filed in July, 61% of content was removed within 7 days,
   median 41 hours" - the evidence problem solved is also a market-size
   problem.
4. **The Redress API in production**: webhooks, SLA breach alerts, regulator
   export formats (India's cybercrime portal, RBI ombudsman, FTC, IC3).
5. **Community and NGO workspaces** with trained case workers.
6. **Pre-emptive arming as a first-class action**: upload your photo *once* to
   the protection services before anything happens - the cheapest possible
   defence against AI-morphed content.
7. **Multilingual narratives** - a complaint written in Hindi or Tamil is
   routinely ignored; a translated, jurisdiction-appropriate narrative is not.
8. **A public channel graph.** Every Redress user benefits from every other
   user's live discovery, so the resolution of "where do I report this" gets
   better with every case.

---

## Slide 13 - What we would do with the prize

- Ship the mobile-first consumer app with authenticated filing (Browser Context
  Profiles + Vault) - the highest-impact missing piece.
- Open-source the channel graph and the evaluation harness so other
  victim-support organisations can run it in their own jurisdiction.
- Work with two NGOs on a real, measured pilot: time-to-report, coverage
  completeness, and takedown outcomes.

---

## Appendix A - Repository map

```
packages/core/           triage engine: classifier, taxonomy, planner, redaction
  src/ml/classifier.ts   one-vs-rest logistic regression (the ML)
  src/ml/dataset.ts      223 hand-labelled multi-label examples
  src/ml/redact.ts       privacy-by-default PII masking
  src/planner.ts         labels -> prioritised channels, deadlines, gaps
  scripts/eval-classifier.ts   reproducible 5-fold evaluation
apps/api/                Fastify API
  src/tinyfish/client.ts Search / Fetch / Agent(SSE) / Monitor / Wallet
  src/pipeline/orchestrator.ts discover -> analyse -> file -> monitor
  src/casereport/pdf.ts  the case file PDF
  demo-portals/          sandbox clones of real forms
apps/web/                React + Vite + Tailwind client
docs/                    this deck, the plan, the dev.to post
```

## Appendix B - Submission checklist (Unstop form)

| Required section | Slides |
| --- | --- |
| Problem statement | 2 |
| Proposed solution | 3, 7 |
| Target users or use case | 4 |
| Role of Machine Learning or AI | 5 |
| Proposed TinyFish integration | 6 (appendix in the repo README) |
| Expected impact | 9 |
| Feasibility | 11 |
| Future scope | 12 |
| Revenue model | 10 |

## Appendix C - Ethics and safety commitments

- **Human in the loop, twice.** Approval before the agent types, and a separate
  approval before it submits.
- **No invention.** The agent is instructed to leave a field empty and report it
  rather than guess. Redress surfaces those gaps to the user.
- **Privacy by default.** Addresses, ID numbers, card and bank details are
  masked in every shared artifact and only revealed on request.
- **Legal repair, not censorship.** Redress routes to the body with the legal
  authority to act. It does not decide what is true.
- **No dark patterns, no data resale.** Evidence is a private artefact by
  default; sharing is an explicit action.
