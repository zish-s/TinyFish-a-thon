<div align="center">

# Redress

**Report once. File everywhere. Prove it happened.**

*A TinyFish web agent that turns one description of online harm into every report
you need to file - on the right portals, with the right evidence, and with proof
that you actually filed them.*

[![KriticalHacks 2026](https://img.shields.io/badge/KriticalHacks_2026-AI%2FML%20track-14b8a6)](https://kritical-hacks.vercel.app/)
[![TinyFish](https://img.shields.io/badge/built%20with-TinyFish-2dd4bf)](https://docs.tinyfish.ai/)
[![License: MIT](https://img.shields.io/badge/license-MIT-14b8a6)](LICENSE)

</div>

---

## The problem

Reporting online harm is a **bureaucratic job**, and victims are the worst
equipped people in the world to do it.

The hard part was never filling in a form. It is:

1. **Knowing where to file.** A platform report, a cybercrime portal complaint, a
   bank dispute and a police FIR are four different routes to four different
   outcomes. Skip the wrong one and you lose the outcome you needed.
2. **Knowing what each form wants.** Every portal asks for a different subset of
   facts and a different set of evidence.
3. **Keeping up with the fact that things move.** Portals change, forms change,
   helplines change. Any list hard-coded into an app goes stale - silently.
4. **Proving you reported it.** Banks and police ask for reference numbers.
   Most victims never get them, or never keep them.
5. **The part everyone skips: the harm is not over when you hit send.** Content
   reappears, gets morphed with AI, gets re-uploaded to a different site, and
   gets indexed by a search engine so strangers can find it in seconds.

> One impersonation account using a student's photo turned out to need **seven
> actions across five organisations**: a platform report, a cybercrime portal
> complaint, a bank dispute, a police FIR, a Google URL removal, and a
> pre-emptive hash registration with a takedown service. No single place would
> have told the victim to do all seven.

## The solution

**Redress turns one description into a filed, evidenced, monitored case.**

| # | Stage | Who does it |
| --- | --- | --- |
| 1 | **Describe** - one free-text or spoken description | Victim |
| 2 | **Triage** - a local, explainable model labels the harm, extracts entities and masks sensitive values | Redress (offline ML) |
| 3 | **Plan** - labels become a prioritised set of routes, each with a reason and a deadline | Redress (rules + ML) |
| 4 | **Discover** - a web agent searches the live web for the *current* official portal for each route | **TinyFish Search** |
| 5 | **Read** - the agent opens the real page and reads the form it actually has today | **TinyFish Web Agent** |
| 6 | **Review** - the victim sees every value that will be typed, with sensitive fields masked | Victim |
| 7 | **File** - the agent types the approved values, stops, and submits only on a second explicit approval | **TinyFish Web Agent** |
| 8 | **Prove** - every page read, reference number and submission goes into a SHA-256 hash chain, exportable as a case-file PDF | Redress |
| 9 | **Follow up** - monitors re-check the reported URL and tell you whether the content actually came down | **TinyFish Monitor** |

**The design principle: nothing about the world is hard-coded.** The channel
catalogue in the code is only a *fallback*. The real channel graph - which
portal, which URL, which fields, which evidence - is resolved **live, per case,
at the moment of the report**.

---

## TinyFish integration (the mandatory part)

We use four TinyFish surfaces, each for a job a static implementation cannot do.

| Surface | Where | What it replaces |
| --- | --- | --- |
| **Search API** | `apps/api/src/pipeline/orchestrator.ts` &rarr; `discoverChannels()` | A hard-coded list of portal URLs that goes stale. At report time the agent asks the live web where the current official reporting page is, per country, and scores results for officialness (`.gov`, `.nic.in`, known platform domains). |
| **Web Agent (SSE)** | `orchestrator.ts` &rarr; `analyseChannel()` / `fileChannel()` | A hard-coded form schema. The agent opens the real page and returns the **actual** fields, labels, required flags, dropdown options and evidence requests through `output_schema`; then types the approved values and submits. The `PROGRESS` and `STREAMING_URL` SSE events are streamed straight into the user's browser as a **live view of the agent working**. |
| **Fetch API** | evidence capture | Downloading a page to attach to the case file. Also the substrate of the Page Monitor. |
| **Monitor API** | `orchestrator.ts` &rarr; `armMonitors()` | "We filed it and hoped." A Page Monitor re-checks the reported URL every 6 hours; a Topic Monitor watches for a **clone** of the impersonation account appearing somewhere new. |

**Where the agent is deliberately _not_ used:** triage and redaction of personal
data. Those stay local, deterministic and auditable.

**Cost discipline.** Search and Fetch are free within TinyFish's daily
allowance; the Agent is metered per step ($0.016). Redress therefore reads each
form once and caches the field spec, splits filing into "fill" and "submit" so
a human approval sits between them, and never runs an agent the user did not
ask for.

**How a judge can verify this in 30 seconds:** the app has a **sandbox** toggle.
With it on, the agent drives a bundled clone of a real form instead of the real
site - same agent, same goal, same structured output, same live preview. The
agent really runs; only the target changes.

---

## The machine learning

Two very different jobs, deliberately split.

### Triage (local, explainable, offline) - `packages/core`

* **Model:** one-vs-rest L2-regularised **logistic regression** over a TF-IDF
  vector of unigrams + bigrams, from a synonym-folded, stemmed token stream.
  14 incident types, 250 hand-labelled multi-label examples, trained with
  full-batch gradient descent + momentum.
* **Why not an LLM?** Triage must be reproducible, offline, free and able to
  justify itself. A victim is being asked to trust a recommendation that tells
  them to report to a government portal - "because the word *scammer*
  contributed +2.1 to fraud" is a sentence a human can check.
* **Evaluation** (stratified 5-fold CV, `npm run eval`):

  | Metric | Value |
  | --- | --- |
  | Macro F1 | 0.62 |
  | Macro precision | 0.50 |
  | Macro recall | 0.83 |
  | Top-1 label correct | 89.7% |

  The numbers are honest and reproducible from the committed corpus. We
  over-predict labels on purpose: in this domain a **missed label means a missed
  reporting route**, and an extra channel is cheap while a missing one is not.

* **Explainability is a feature.** The model stores a weight per token, so the
  UI shows the exact words that drove each label (`money +2.1`, `scam +1.8`,
  `photo +1.4`).
* **Hard-signal rules layer on top** - money lost, threat, minor involved,
  intimate content, identity exposed, account takeover - each with its own
  confidence floor, so a weak co-label never triggers a "call the police now"
  banner.

### The agentic half (live web) - TinyFish

Which portal, which form, what evidence, and *is it still true right now* - the
parts an LLM cannot do and a hard-coded list does badly.

---

## Architecture

```
 browser (React 19 + Vite + Tailwind)
   |  POST /api/cases                  -> explainable triage (local ML, in the API)
   |  GET  /api/cases/:id/stream       -> SSE: steps, live browser URL, logs, evidence
   |  POST /api/cases/:id/channels/:id/file -> the agent fills / submits
   v
 API (Fastify 5, Node 20+, TypeScript)
   |- @redress/core   classifier, taxonomy, planner, redaction   (no network)
   |- pipeline        discover -> analyse -> review -> file -> monitor
   |- evidence        SHA-256 hash chain + PDFKit case file
   |- store           SQLite when writable, in-memory otherwise (serverless safe)
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

## Quick start

```bash
git clone <your-fork> redress && cd redress
npm install
cp .env.example .env      # add your TINYFISH_API_KEY
npm run dev               # API on :4000, web on :5173
```

Open <http://localhost:5173>.

### The sandbox toggle (recommended for the demo)

The TinyFish browser runs in the cloud, so it cannot reach `localhost`. Start a
public tunnel and put the URL in `.env`:

```bash
npx cloudflared tunnel --url http://localhost:4000
# -> copy the https://xxx.trycloudflare.com URL into PUBLIC_BASE_URL in .env
npm run dev
```

Flip the **demo portals** toggle in the app header and the agent will drive the
bundled clone of each form instead of the real site. Deterministic, fast, and
impossible to break on a flaky venue wifi.

### Deploy to Vercel

The repo is Vercel-ready as-is (`vercel.json`, `api/[...path].ts`):

```bash
npx vercel --prod
vercel env add TINYFISH_API_KEY production
```

The deployment URL is detected automatically from the request, so the deployed
app can drive its own demo portals and the agent can reach them.

### Other commands

```bash
npm test        # 11 unit tests for the triage engine
npm run eval    # reproducible 5-fold cross-validation of the classifier
npm run build   # core -> api -> web
npm start       # serve the built app from the API
```

---

## Repository map

```
packages/core/                the triage engine (no network, no dependencies)
  src/ml/classifier.ts        one-vs-rest logistic regression
  src/ml/dataset.ts           250 hand-labelled multi-label examples
  src/ml/tokenize.ts          synonym folding + stemming
  src/ml/redact.ts            privacy-by-default PII masking
  src/ml/entities.ts          amount / platform / URL / phone / date extraction
  src/triage.ts               triage + urgency + hard-signal rules
  src/planner.ts              labels -> prioritised channels, deadlines, gaps
  src/taxonomy.ts             incident types, platforms, authorities, protections
  scripts/eval-classifier.ts  the evaluation table in this README
apps/api/                     Fastify API
  src/tinyfish/client.ts      Search / Fetch / Agent(SSE) / Monitor / Wallet
  src/pipeline/orchestrator.ts  discover -> analyse -> file -> monitor
  src/casereport/pdf.ts       the case-file PDF
  demo-portals/               sandbox clones of the real forms
apps/web/                     React + Vite + Tailwind client
api/[...path].ts              Vercel serverless entry
docs/PPT.md                   the judge-facing pitch deck
docs/PLAN.md                  what was built, and why
```

---

## Safety and ethics

- **Human in the loop, twice.** Approval before the agent types, and a separate
  approval before it submits.
- **No invention.** The agent is instructed to leave a field empty and report
  it rather than guess. Redress surfaces those gaps to the user instead of
  hiding them.
- **Privacy by default.** Addresses, ID numbers, card and bank details are
  masked in every shared artefact and only revealed on request.
- **Legal repair, not censorship.** Redress routes to the body with the legal
  authority to act. It does not decide what is true.
- **No dark patterns, no data resale.** Evidence is private by default;
  sharing is an explicit action.

---

## Business model

Free for victims, paid for the organisations that receive the reports.

| Plan | Price | Who |
| --- | --- | --- |
| Free | $0 | Anyone reporting one incident |
| Pro | $4.99 / month | Someone handling a case alone |
| Team | $49 / seat / month | NGOs, victim-support orgs, campus safety |
| **Redress API** | **$499 / month + usage** | **Trust & Safety, fraud and compliance teams** |

**Unit economics (measured against the live API, not guessed):**

| Line | Cost |
| --- | --- |
| TinyFish Search | $0 - free within the daily allowance (12,000/day) |
| TinyFish Fetch | $0 per URL - free within the daily allowance |
| TinyFish Agent | $0.016 per step |
| TinyFish Monitor | $0.005 per run (~$0.15/month for a daily check) |
| **A full case** (2 platform + 2 authority channels, read + fill + submit) | **~$0.30 - $0.60** |

**Why the API tier has a buyer:** a bank's fraud desk is measured on
complaint-handling SLA and on losses recovered; a platform's trust & safety
team is measured on response time and on evidence when a regulator asks.
Redress gives both an auditable, jurisdiction-aware routing layer and the proof
that it ran.

**Market context (via TinyFish Search, Aug 2026):** Indian banking fraud losses
reached ~INR 48,021 crore in FY 2025-26, up ~46% year on year, with 122 large
cases alone worth INR 18,336 crore (RBI). The global content-moderation market
is ~USD 11.6B in 2025 growing to ~13.3B in 2026, with automated moderation
growing at ~20% CAGR. StopNCII reports a >90% removal rate across 300,000+
NCII. Both are budgeted, recurring, compliance-driven spend.

---

## Licence

MIT - see [LICENSE](LICENSE).
