# dev.to post (draft)

> Title options:
> - "I built an agent that files your abuse reports for you - while you watch"
> - "ReclaimYourNet: one description of online harm, every report you need to file"
> - "Your bank has 24 hours to freeze your money. Your platform has no idea what to do. Both were links in a list I had to find."
>
> Tags: `webdev`, `ai`, `machinelearning`, `tutorial`, `showdev`
> Canonical: the GitHub repo URL.

---

## The 24 hours you did not know you had

When someone scams you in India, the money is only recoverable if you complain
**within 24 hours**. The cyber-fraud helpline (1930), the bank's fraud cell, the
National Cyber Crime Reporting Portal and the police FIR are four different
routes, and the order in which you take them decides whether you get your money
back.

Nobody tells you that. What you get instead is a search engine, a pile of
half-forty government pages, and the knowledge that you should probably post
screenshots somewhere. Then you give up, because it is 11pm and you have a
different form per platform.

So I built **ReclaimYourNet**.

> **One description of what happened. Every report you need to file, on the right
> portal, with the right evidence, and with proof that you filed it.**

## What it does

You type one sentence - or dictate it:

> *"Someone made a fake Instagram account using my photo and my college ID and is
> asking my friends to send me 500 rupees as a gift. They also posted my phone
> number on the page."*

ReclaimYourNet:

1. **Triages it** with a small, local, explainable model. Not a black box: it
   tells you that "money" contributed +2.1 to *financial fraud* and "photo"
   +1.4 to *image misuse*, and it masks your phone number in every shared
   summary.
2. **Plans the routes** - platform, cybercrime portal, bank fraud cell, police
   FIR, Google URL removal, pre-emptive takedown services - each with the reason
   it applies and its deadline, and it tells you what you are *missing*.
3. **Finds the live portals** with a [TinyFish](https://docs.tinyfish.ai/) web
   agent. Not a hard-coded list of URLs: at the moment you file, the agent
   searches the live web for the current official reporting page, per country,
   and scores the results for officialness.
4. **Reads the real form.** The agent opens the actual page and returns the
   fields it has *today* - labels, required flags, dropdown options, what
   evidence it wants - through a JSON schema.
5. **Shows you every value** it is about to type, with anything sensitive
   masked, and waits for you.
6. **Files it**, stops before Submit, and asks again. You get the reference
   number.
7. **Proves it** - every page read, every reference and every submission goes
   into a SHA-256 hash chain you can export as a PDF case file.
8. **Follows up** - a monitor re-checks the reported URL every six hours and
   tells you whether the content actually came down.

## The part I am actually proud of

**Nothing about the world is hard-coded.**

The obvious implementation is a JSON file of "Instagram reports go here,
cybercrime.gov.in is here, here is the form schema". It is also wrong within a
month, because portals move, forms change, and the details differ per country.

So the channel catalogue in the code is only a *fallback*. The real work is done
by a web agent that goes and looks:

```ts
// apps/api/src/pipeline/orchestrator.ts
const goal = [
  'You are helping a victim file a report. Read a real reporting form exactly.',
  `Start page: ${targetUrl}`,
  '1. Open the page. Follow any link to the reporting / complaint / abuse form.',
  '2. If you hit a login wall, do NOT log in. Set has_form to false.',
  '3. For EVERY field record: label, name, required, kind, and for a dropdown',
  '   the visible option values.',
  '4. Record the report categories and any evidence the form asks for.',
  '5. Do NOT type into the form. Do NOT submit anything.',
].join('\n');

const spec = await runAgent(onEvent, {
  url: targetUrl,
  goal,
  outputSchema: ARCHAEOLOGY_SCHEMA,   // TinyFish validates the schema first
});
```

And when you approve, the *same* agent types the values and submits:

```ts
const submitGoal = [
  'The form is now filled. Click the final Submit button exactly once.',
  `Current page: ${targetUrl}`,
  'Read the confirmation text and capture any reference number or case id.',
].join('\n');
```

The best part for the demo is that TinyFish hands back a **live stream of the
agent's own browser**. I embed that `streaming_url` in the app, so you literally
watch the agent open the portal, find the right form, and type into it. It is
the difference between "an AI did something" and "I can see exactly what it did".

## The part I am not proud of (yet)

The first version of the classifier was a Naive Bayes model, and it was
**fundamentally wrong for multi-label problems**. A generative model has to
treat every token as evidence against every class it does not own, so
"a fake account using my photo asking for money" produced:

```
financial_fraud  p=0.024   <- technically the top label
```

The fix was to move to a discriminative model - one-vs-rest logistic
regression - and to stop pretending that a 250-example hand-labelled corpus can
be pushed much further. The honest numbers, from a reproducible 5-fold
cross-validation (`npm run eval`):

| Metric | Value |
| --- | --- |
| Macro F1 | 0.62 |
| Macro precision | 0.50 |
| Macro recall | 0.83 |
| Top-1 label correct | 89.7% |

I tuned it to over-predict, on purpose. In this domain a **missed label means a
missed reporting route**, and an extra channel costs a victim 20 seconds while a
missing one can cost them their money.

## Things I learned building it

- **A missing reporting route is worse than a useless one.** The single most
  valuable screen in ReclaimYourNet is not the list of things to do, it is the list of
  things you have *not* covered.
- **"Pre-emptive" beats "reactive".** Take It Down, StopNCII, Takedown,
  RemoveHer and C2PA let you register a photo *before* it is misused and
  have it pulled down later - including AI-morphed copies. Almost nobody knows
  these exist. ReclaimYourNet surfaces them at the moment they are useful.
- **Jurisdiction is not a detail.** A FIR can only be registered by the police
  station with jurisdiction over where you live. If you type "Gurugram", the
  agent finds `gurgaon.haryanapolice.gov.in/cyber-crime` - the district's own
  page - instead of a generic national portal. A hard-coded list can never do
  that, and it is the difference between a useful pointer and a dead end.
- **Split "fill" from "submit".** Two approvals instead of one, and the agent
  never gets to decide on its own what gets sent in a victim's name.
- **Make the model say no.** The agent is instructed to leave a required field
  empty and report it rather than guess. ReclaimYourNet shows that gap to the user
  instead of hiding it. The blank field in the UI is a feature.
- **Measure the credits.** TinyFish Search and Fetch are free within the daily
  allowance; the Agent is $0.016/step; a Monitor is $0.005/run. A full report
  costs about $0.30-0.60 (Rs 25-50), which is what makes a Rs 499/month Pro
  tier work.

## Try it

The demo portals are clones of the real forms, so the agent can be driven
end-to-end without touching a live platform:

```bash
npm install
cp .env.example .env      # add TINYFISH_API_KEY
npx cloudflared tunnel --url http://localhost:4000   # so the cloud browser can reach you
npm run dev
```

The repo has the architecture, the evaluation script and the pitch deck.

## What I would build next

Authenticated filing (a TinyFish browser profile + vault so the agent files on
logged-in platforms as *you*), and a public channel graph so every case makes
the next one's routing better.

---

*Built for CriticalHacks 2026 (AssetMerkle x IGDTUW, with TinyFish).*
*If you have ever given up half-way through a report form, I would genuinely
love to hear what blocked you - that is the roadmap.*
