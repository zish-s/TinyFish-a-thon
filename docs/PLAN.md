# ReclaimYourNet - what was built, and why

**Track:** AI/ML (open innovation) - KriticalHacks 2026 (AssetMerkle x IGDTUW, with TinyFish)

## The one-sentence product

You describe the harm once; ReclaimYourNet finds every place it has to be reported, reads
the real form on each of those places, pre-fills it, files it with your approval,
and then watches to see whether it actually came down.

## The design decisions that matter

### 1. The channel graph is resolved live, not stored

The obvious implementation is a JSON file of "Instagram reports go here, the
cybercrime portal is here, here is the form schema". It is wrong within a month.

So the catalogue in `packages/core/src/taxonomy.ts` is only a **fallback**. The
real work is done by a TinyFish web agent that goes and looks:

- **Search** finds the current official reporting page for each route, per
  country, scored for officialness (`.gov`, `.nic.in`, known platform domains).
- **The Agent** opens that page and returns the fields it has *today* - visible
  label, html name, required flag, input kind and the dropdown options - via a
  validated `output_schema`. That is why the pre-fill is right even when a portal
  redesigns its form overnight.

### 2. The model decides, the agent acts, the human approves

Three separate responsibilities, deliberately not mixed:

| Layer | Job | Why here |
| --- | --- | --- |
| Local ML (`packages/core`) | What kind of harm is this, and what is urgent? | Must be reproducible, offline, free and explainable |
| TinyFish agent | What does the real web say and require? | Cannot be hard-coded; changes daily |
| Human | What actually gets submitted? | The law, and the trust, require it |

**Two approvals, not one.** The agent fills the form and stops. A second,
separate approval lets it submit. It is also instructed to leave a required
field empty and report it rather than guess - the blank field in the UI is a
feature, not a bug.

### 3. The triage model is discriminative, not generative

The first version was a Naive Bayes model. It was fundamentally wrong for
multi-label problems: a generative model has to treat every token as evidence
against every class it does not own, so
*"a fake account using my photo asking for money"* produced
`financial_fraud p=0.024` as its top label.

The fix was one-vs-rest **logistic regression** over TF-IDF unigrams + bigrams
(14 incident types, 223 hand-labelled multi-label examples, full-batch gradient
descent + momentum, L2 regularised).

Honest numbers from a reproducible stratified 5-fold cross-validation
(`npm run eval`):

| Metric | Value |
| --- | --- |
| Macro F1 | 0.62 |
| Macro precision | 0.50 |
| Macro recall | 0.83 |
| Top-1 label correct | 89.7% |
| Exact label-set match | 14.8% |

It is tuned to **over-predict** on purpose: a missed label means a missed
reporting route, and an extra channel costs a victim 20 seconds while a missing
one can cost them their money.

The per-token weights are also the explanation - the UI shows the exact words
that drove each label, because "money contributed +2.1 to fraud" is a sentence a
human can check.

### 4. Coverage gaps are the most valuable screen

The most useful thing ReclaimYourNet shows is not the list of things to do, it is the
list of things you have **not** covered:

> *"No police FIR in the plan - a cybercrime portal complaint is not enough:
> banks and courts want an FIR, and only an FIR starts the clock on a refund
> claim."*

Most victims do not know that a platform report is not a legal record, or that a
bank dispute has a 24-hour freeze window, or that an FIR is required for a
refund claim. That gap analysis is the product.

### 5. Pre-emptive protection is a first-class route

Take It Down, StopNCII, Takedown (CCRI), RemoveHer, Redo, C2PA Content
Credentials, Desexualise (on-device blur before upload) and Google/Bing URL
removal are near-unknown to the public, and they are the *cheapest* defence
against morphed and AI-generated content. ReclaimYourNet surfaces them at the moment
they are useful, and says what each one actually does.

### 6. Proof is a by-product

Every page read, every reference number and every submission goes into a
SHA-256 chain where each record hashes the previous record's hash. Removing or
editing one artefact invalidates everything after it. The export is a PDF case
file: incident narrative, triage with reasons, every channel and its reference
number, and the hash chain.

### 7. Follow-through

A Page Monitor re-checks the reported URL every six hours; a Topic Monitor
watches for a **clone** of the impersonation account appearing somewhere new.
"We filed it and hoped" is the part of the problem that nobody solves.

## Verification status

| Capability | Status |
| --- | --- |
| Explainable triage (local ML) | Working, 11/11 unit tests, 5-fold eval |
| Entity extraction (amount, platform, URL, phone, date) | Working |
| PII redaction (privacy by default) | Working |
| Channel planning, priority, SLA clocks, gap analysis | Working |
| Live portal discovery via TinyFish Search | Working, verified against the live API |
| Live form read via TinyFish Agent + `output_schema` | Working - returned the real fields and dropdown options of the target form |
| Agent form filling | Working - typed the approved values into the live form |
| Agent submission + reference capture | Working - returned `IG-2026-486937` from the target form |
| Evidence chain + PDF case file | Working - 8.7 KB PDF generated |
| Follow-up monitoring via TinyFish Monitor | Working - monitor created and active |
| Live agent browser preview in the UI | Working - `streaming_url` embedded via SSE |
| Vercel deployment | Configured (`vercel.json`, `api/[...path].ts`); storage degrades to in-memory on a read-only filesystem |

## Deliberate non-goals for this build

- **No LLM in the triage path.** A local model is cheaper, faster, reproducible
  and defensible. The LLM-shaped work (what does the real web need?) is what
  the agent is for.
- **No auto-submit.** Ever. The agent stops and asks.
- **No data resale and no dark patterns.** Evidence is private by default.

## Next

1. Authenticated filing on logged-in platforms (TinyFish Browser Context Profile
   + Vault).
2. Outcome analytics: "of the reports filed, 61% of content was removed within
   7 days, median 41 hours" - the evidence problem solved is also a market-size
   problem.
3. A public channel graph, so every case makes the next one's routing better.
4. Multilingual narratives - a complaint written in Hindi is routinely ignored.
