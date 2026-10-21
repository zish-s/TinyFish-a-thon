# ReclaimYourNet - KriticalHacks 2026 pitch deck (AI/ML track)

> **Live:** https://reclaim-your-net.vercel.app
> **Repo:** the GitHub link in the submission form
> **Demo video:** linked in the submission form
>
> Every slide below maps to one of the eight sections the Unstop submission form
> asks for. Appendix B lists the mapping explicitly.
>
> Speaker notes are in `docs/DEMO.md` (a timed 2m30s run) and at the bottom of
> each slide in the .pptx.

**One line:** *You describe the harm once. ReclaimYourNet finds every place it has to be
reported, reads the real form on each of those places, pre-fills it, files it with
your approval, and then watches to see whether it actually came down.*

---

## Slide 1 - Title

**ReclaimYourNet**
*Report once. File everywhere. Prove it happened.*

- Track: AI/ML (open innovation)
- Built with TinyFish: Search + Fetch + Web Agent + Monitor
- Team: <name> - <handle> - <college>

Speaker note: "Every one of us has, at some point, wanted to report online abuse
and given up half-way through because it meant four different forms on four
different websites, each asking for slightly different things, with no idea which
one actually mattered. ReclaimYourNet is the layer that removes that job."

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

**ReclaimYourNet turns one description into a filed, evidenced, monitored case.**

| Stage | What happens | Who does it |
| --- | --- | --- |
| 1. Describe | One free-text or spoken description of the incident | Victim |
| 2. Triage | A local, explainable model labels the incident type, extracts entities (platform, amount, date, handles) and masks sensitive values | ReclaimYourNet (offline ML) |
| 3. Plan | A channel planner turns the labels into a prioritised set of routes: platform / authority / financial / pre-emptive protection / de-indexing, each with a reason and a deadline. If we know your city it also finds **your** police station and **your** State Commission - a FIR can only be registered locally | ReclaimYourNet (rules + ML) |
| 4. Discover | A **TinyFish web agent** searches the live web for the *current* official portal, helpline and reporting page for each route | TinyFish Search |
| 5. Read | The same agent opens the real page and **reads the form it actually has today** - fields, labels, required flags, evidence requested | TinyFish Web Agent |
| 6. Review | The victim sees every value that will be typed, with sensitive fields masked, and approves or edits | Victim |
| 7. File | The agent types the approved values into the live form, stops before Submit, and submits only on a second explicit approval | TinyFish Web Agent |
| 8. Prove | Every page read, every reference number and every submission is written into a SHA-256 hash chain and exported as a printable complaint record - complainant's particulars, when and where it happened, the account responsible, the reporter's own annexures, every filing with its acknowledgement number, and a declaration to sign | ReclaimYourNet |
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

| Use case | What ReclaimYourNet does |
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
| **Search API** | `apps/api/src/pipeline/orchestrator.ts` -> `discoverChannels()` | A hard-coded list of portal URLs that goes stale. At report time the agent asks the live web where the current official reporting page is, per country, and scores the results for officialness (`.gov`, `.nic.in`, known platform domains). If the complainant gives a city, the query becomes city-specific - type *Gurugram* and the agent finds `gurgaon.haryanapolice.gov.in/cyber-crime`, the district's own cyber crime page, instead of a generic national portal. |
| **Web Agent (SSE)** | `orchestrator.ts` -> `analyseChannel()` and `fileChannel()` | A hard-coded form schema. The agent opens the real page and returns the *actual* fields, labels, required flags and evidence requests via `output_schema`; then, after approval, types the approved values and submits. The `PROGRESS` and `STREAMING_URL` SSE events are streamed straight into the user's browser as a live view of the agent working. |
| **Fetch API** | evidence capture | Downloading a page to attach to the case file. Also the substrate of the Page Monitor. |
| **Monitor API** | `orchestrator.ts` -> `armMonitors()` | "We filed it and hoped." A Page Monitor re-checks the reported URL every 6 hours and reports a change; a Topic Monitor watches for a *clone* of the impersonation account appearing somewhere new. |

**Where the agent is deliberately not used:** the triage decision and the
redaction of personal data. Those stay local, deterministic and auditable.

**Cost discipline.** Search and Fetch are free within TinyFish's daily
allowance; the Agent is metered per step ($0.016). ReclaimYourNet therefore:
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
 browser (React 19 + Vite + Tailwind)
   |  POST /api/cases        -> explainable triage (local ML, in the API)
   |  POST /api/action       -> ONE request per agent run, streamed back:
   |     { action, case }      the case travels with the request, and the run's
   |                           events + result come back on one connection
   v
 API (Fastify 5, Node 20+, TypeScript)
   |- @reclaim/core      classifier, taxonomy, planner, redaction  (no network)
   |- pipeline           discover -> analyse -> review -> file -> monitor
   |- evidence           SHA-256 hash chain + the printable case file (PDFKit)
   |- store              in-memory only. A report is never written to disk.
   v
 TinyFish
   |- Search   live portal + helpline discovery
   |- Agent    read the live form, fill it, submit it  (SSE + output_schema)
   |- Fetch    evidence snapshots
   |- Monitor  follow-up checks on the reported URL
```

**Three decisions that matter:**

1. **The model decides *what* this is; the agent decides *what to do* on the
   actual web; the human decides *what gets submitted*.** No layer can submit
   anything on its own.
2. **One request per agent run, streamed back.** A serverless platform gives
   every request a fresh instance with no memory of the last one - so the case
   travels with the request, and the run, the live browser preview and the
   result all travel on one connection.
3. **Nothing is persisted.** No account, no user database, no analytics, no
   tracking. A report lives in the memory of the app and dies with the tab.
   The only copy that outlives the session is the PDF the user downloads.

---

## Slide 8 - Demo (3 minutes)

1. **00:00 - Describe.** Type (or dictate) one sentence about a fake account
   using your photo and asking your friends for money. Pick one of the example
   chips on the home screen.
2. **00:20 - Triage.** The model labels it (image misuse, impersonation, doxxing,
   financial fraud), the urgency banner explains *why* it is time-sensitive, and
   your phone number is masked in every summary.
3. **00:40 - Your details.** The box at the top is editable at any point. Add a
   name, email, mobile and city once, and every form below fills itself.
4. **00:55 - Coverage map.** 8 routes ranked "do now" vs "also consider", each
   with the reason it applies and its deadline. The gap panel says what you
   *have not* covered: "no police FIR - a cybercrime complaint is not enough, only
   an FIR starts the clock on a refund claim." With a city, the local station is
   the one it finds (`gurgaon.haryanapolice.gov.in/cyber-crime`).
5. **01:20 - Watch it work.** Press "Read the form" on Instagram. The TinyFish
   agent opens the page in a remote browser; the browser appears live in the
   app, and the timeline shows what it is doing. It comes back with the *actual*
   fields the page has today, dropdown options included.
6. **01:50 - Review and file.** Every value the agent will type is shown, with
   the blank ones highlighted in yellow and fillable right there. Approve, then
   "Fill & submit". The agent types, stops, submits, and returns the reference
   number - which lands in the evidence vault with a hash.
7. **02:20 - Proof and follow-up.** Download the case file (a printable
   complaint record: the complainant's particulars, when and where it happened,
   the account responsible, the screenshots attached as annexures, every channel
   and its reference number, the hash chain, and a declaration to sign). Arm
   follow-up: a monitor now watches the reported URL.

---

## Slide 9 - Expected impact

- **Time-to-report drops from hours to minutes.** The 7-route impersonation
  scenario above is one description and one review.
- **Coverage gaps stop being invisible.** The gap panel is the part we think
  matters most: most victims do not know that a platform report is not a legal
  record, or that a bank dispute has a 24-hour freeze window, or that an FIR is
  required for a refund claim. That gap analysis is the product.
- **Jurisdiction stops being generic.** "Report it to the police" is useless
  advice. The agent resolves *whose* police - for Gurugram it found
  `gurgaon.haryanapolice.gov.in/cyber-crime` live, because a FIR can only be
  registered by the station with jurisdiction over where you live.
- **Pre-emptive protection is mainstreamed.** Take It Down, StopNCII, Takedown
  and RemoveHer are near-unknown to the public and are the cheapest defence
  against morphed and AI-generated content. We surface them *at the moment they
  are useful* - and we say so in the product, because most people do not know
  they exist.
- **Proof becomes a by-product.** A tamper-evident evidence chain and a
  printable case file make a report usable with a bank, a police station or a
  lawyer - and a regulator.
- **A measurable metric:** of the gaps we detect, what share did the user
  close? That is the number that would show the product working.

---

## Slide 10 - Revenue model

**Free consumer product, paid API for the organisations that receive the
reports.**

| Plan | Price | Who | What they get |
| --- | --- | --- | --- |
| Free | Rs 0 | Anyone reporting one incident | Full triage, live portal discovery, file on 2 channels, case file PDF |
| Pro | Rs 499 / month | Someone handling a case on their own | Unlimited channels, agent files every form, evidence vault, follow-up monitors, pre-emptive protection arming |
| For organisations | Rs 4,999 / person / month | NGOs, victim-support orgs, campus safety | Multi-case workspace and assignment, shared evidence vault, SLA tracking, escalation templates |
| **ReclaimYourNet API** | **Rs 49,999 / month + usage** | **Trust & Safety, fraud and compliance teams at banks and platforms** | **Incident in, regulator-ready case file out. Live channel graph per jurisdiction, SLA clocks and breach alerts, audit-grade evidence chain, webhooks for case and monitor events** |

**Unit economics (measured, not guessed):**

| Line | Cost |
| --- | --- |
| TinyFish Search | Rs 0 - free within the daily allowance (12,000/day) |
| TinyFish Fetch | Rs 0 per URL - free within the daily allowance |
| TinyFish Agent | Rs 1.35 per step |
| TinyFish Monitor | Rs 0.42 per run (~Rs 12 a month for a daily check) |
| **A full case (2 platform + 2 authority channels, read + fill + submit)** | **Rs 25-50 in agent credits** |

So a Pro subscription at Rs 499 carries a ~90% gross margin, and the API tier at
Rs 49,999 plus usage is priced with the same cost structure plus the compliance
value of a regulator-ready audit trail.

**Why someone pays for the API, not just the app:** a bank's fraud desk is
measured on complaint-handling SLA and on losses recovered, and a platform's
trust & safety team is measured on response time and on evidence when a
regulator asks. ReclaimYourNet gives both an auditable, automated, jurisdiction-aware
routing layer and the proof that it ran.

**Market:** cyber-fraud and identity fraud are among the fastest-growing cost
lines for banks; content moderation and NCII takedown are a permanent
regulatory obligation for every platform. Both are budgeted, recurring,
compliance-driven spend - not a discretionary "nice to have" tool.

---

## Slide 11 - Feasibility

- **It is already running.** https://reclaim-your-net.vercel.app - a full case,
  from one sentence to a reference number, in under four minutes.
- **The hard part is built and verified against the live API:** Search resolves
  the real portals (`i4c.mha.gov.in/ncrp.aspx`, `rbi.org.in/Scripts/Complaints.aspx`,
  `cert-in.org.in/SecurityIncident.jsp`, and `gurgaon.haryanapolice.gov.in/cyber-crime`
  for Gurugram); the Agent read a live form and returned its real fields and
  dropdown options; the Agent typed, submitted and returned a reference number.
- **Zero-dependency core.** The classifier, taxonomy, planner and redaction are
  pure TypeScript with no runtime dependencies, 11 passing unit tests and a
  reproducible 5-fold evaluation script. It runs in the browser, in the API and
  in CI.
- **Cost per user is bounded and tiny** (see slide 10). The expensive part is
  the one-time form read per channel, and it is cached.
- **Degradation is designed in.** If a portal blocks the agent, the channel is
  marked "manual" and the case continues. If the wallet runs low, search and
  fetch still work. If the network is down, triage still works.
- **Nothing to scale.** The app is stateless: the case lives in the browser,
  so the API is a pure function of the request.
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
4. **The ReclaimYourNet API in production**: webhooks, SLA breach alerts, regulator
   export formats (India's cybercrime portal, RBI ombudsman, FTC, IC3).
5. **Community and NGO workspaces** with trained case workers.
6. **Pre-emptive arming as a first-class action**: upload your photo *once* to
   the protection services before anything happens - the cheapest possible
   defence against AI-morphed content.
7. **Multilingual narratives** - a complaint written in Hindi or Tamil is
   routinely ignored; a translated, jurisdiction-appropriate narrative is not.
8. **A public channel graph.** Every ReclaimYourNet user benefits from every other
   user's live discovery, so the resolution of "where do I report this" gets
   better with every case.
9. **A wider city map.** Right now we know ~120 Indian cities and districts. The
   same mechanism extends to every state cyber cell, every district police
   website and every State Commission - and to other countries, where the
   equivalent body has a different name and a different form.

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
  src/casefile.ts        the case file: particulars, statement, filing rows
  scripts/eval-classifier.ts   reproducible 5-fold evaluation
apps/api/                Fastify API
  src/tinyfish/client.ts Search / Fetch / Agent(SSE) / Monitor / Wallet
  src/pipeline/orchestrator.ts discover -> analyse -> file -> monitor
  src/casereport/pdf.ts  the printable case file (PDFKit)
  src/casereport/uploads.ts  the reporter's own files, hashed
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
  rather than guess. ReclaimYourNet surfaces those gaps to the user.
- **Privacy by default.** Addresses, ID numbers, card and bank details are
  masked in every shared artifact and only revealed on request.
- **Legal repair, not censorship.** ReclaimYourNet routes to the body with the legal
  authority to act. It does not decide what is true.
- **No dark patterns, no data resale.** Evidence is a private artefact by
  default; sharing is an explicit action.

---

## Appendix D - The workflow, step by step

**For the person using it (they should never be confused):**

| # | What they see | What they do | What is happening underneath |
| --- | --- | --- | --- |
| 1 | **"What happened?"** - one box, a Dictate button, an "Add my details" link, three example chips | Type or dictate one sentence | The text is read by a local model. It labels the incident type, extracts the platform, amount, dates, links and phone numbers, and masks anything personal. Nothing is sent to any platform yet. |
| 2 | **"Here is where this needs to be reported."** + a yellow or red urgency banner | Read it | The urgency banner is not a score - it is a sentence: *"Money was moved. A freeze is only realistically possible if reported within 24 hours."* |
| 3 | **"How this works"** (collapsed, one click) | Optionally open it | Four plain-English steps, so a first-time visitor always knows where they are. |
| 4 | **"Your details"** | Press Edit, add name / email / mobile / city, press Save | Every form below is rebuilt with the new values, and anything typed by hand is kept. This is also what turns a city into the right local police station and State Commission. |
| 5 | **"N things we still need from you"** | Type into the yellow boxes | The agent will not guess a required field on a bank or a government form. Most of these disappear the moment step 4 is filled, because they are just your own details. |
| 6 | **The coverage map**, grouped and numbered: 01 remove it from the platform, 02 create a legal record, 03 stop the money, 04 take it down before it spreads, 05 shrink the blast radius | Open one, press "Read the form" | A TinyFish agent opens the real page, finds the actual form, and returns the fields it has *today* - labels, required flags, dropdown options, what evidence it wants. |
| 7 | The same card, expanded: your details, what they will ask for, the timing, and the buttons | Check the values, press "Fill & submit" | The agent types the approved values, stops before Submit, and submits only on that explicit second approval. You get a reference number back. |
| 8 | **"What the agent did"** - the live browser, the timeline, the log | Watch | The agent's own browser is embedded, streamed live over SSE. |
| 9 | **"Your proof, and what we keep watching"** | Download the case file, press "Start watching" | A SHA-256 chain over every page read and every reference number, exported as a PDF a bank or a police station will accept. Then a TinyFish Monitor re-checks the reported page every six hours. |
| 10 | **"What it costs"** | Read | Free for the person. The money comes from the banks and platforms that receive the reports. |

**For the judge (what is actually being demonstrated):**

- The triage is a real model with a published 5-fold cross-validation.
- Every URL in the coverage map was found live, in that run, by the TinyFish
  Search API - and the city-specific ones could not have been hard-coded.
- The form fields, including the dropdown options, were read live by the
  TinyFish Web Agent off the real page.
- The reference number in the evidence vault came from an actual submission.
- The monitor in the follow-up panel is a real TinyFish Monitor, running.

**Nothing in the product submits anything a human has not approved.**
