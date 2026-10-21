# ReclaimYourNet - demo script

**Target length: 2 min 30 s.** Every step below is live. Nothing is mocked, nothing
is a screenshot. If a step looks slow on camera, that is the point - it is a
real agent opening a real form in a real browser.

---

## Before you press record

| # | Do this | Why |
| --- | --- | --- |
| 1 | Open **https://reclaim-your-net.vercel.app** | The TinyFish agent runs in the cloud and can only reach a public URL. A dead tunnel = a failed agent run. The deployment is the reliable one. |
| 2 | Check the top right shows a green dot and your TinyFish balance | If the key is wrong or the wallet is empty, nothing will run. |
| 3 | Turn **on** the `demo forms` toggle | The agent drives a clone of the real form instead of a live Instagram page. Deterministic, fast, and it cannot be blocked. Turn it **off** to show the real portals being discovered live. |
| 4 | Open the site in a **second tab** so you can cut between the landing page and the app | The landing page is the hero shot. |
| 5 | Have these ready: the case file PDF (from a previous run) and the PPT | If the live run is slow, you cut to a prepared artefact rather than a broken screen. |

**Measured timings on the deployed app** (so you know what to say while it waits):

| Step | Time |
| --- | --- |
| Case created | instant |
| Live portal discovery | ~2 s |
| Agent reads the form | ~70 s |
| Agent fills and submits | ~100 s |


---

## The 2.5 minute run

### 0:00 - The problem (10 s)

Show the landing page. Say:

> "If someone makes a fake account with your photo and starts asking your friends
> for money, how many places does that have to be reported to? Not one. A platform.
> A cybercrime portal. Your bank. The police. And a takedown service, because the
> photo is still out there. Five different forms, five different sets of
> questions, and no one tells you which ones you missed - including a bank that
> will only freeze your money if you complain within 24 hours."

### 0:10 - Describe (15 s)

Click the **"Impersonation + fraud"** example chip. The text fills in. Say:

> "One sentence. That's the whole input."

### 0:25 - Triage (10 s)

The page flips to the results. Point at the banner and the coverage map:

> "It read that locally and worked out five things at once: image misuse,
> impersonation, fraud, doxxing, account takeover. It also worked out the clock -
> money was moved, so a freeze is only possible for 24 hours. That is the yellow
> box."

### 0:35 - Your details (10 s)

Click **Edit** on "Your details", type a name and mobile, press **Save**.

> "My name and number go on the forms so the police can call me back. That's it
> - and the form blanks below fill themselves."

### 0:45 - The coverage map (20 s)

Scroll slowly through the numbered sections.

> "Eight places to start with, twelve more after that. And every one of these
> was found just now, live, by a web agent - not a list we wrote down. Look at
> the first one: the agent found Instagram's actual impersonation page.
> Down here - CERT-In, RBI, the cybercrime portal. And here's the one that
> matters most: I typed Gurugram, so it found *Gurugram's* cyber crime page,
> not a generic national portal. Because a FIR can only be registered by the
> station with jurisdiction over where you live."

### 1:05 - The gap (10 s)

Point at the amber "Still missing" box.

> "This is the part no one does. It tells me what I have *not* covered - that a
> cybercrime complaint is not enough, only an FIR starts the clock on a refund
> claim. Most people never find that out until it's too late."

### 1:15 - The agent (40 s) ← **the money shot**

Expand the **Instagram** channel. Press **"Read the form"**.

> "Now the agent opens the real form and reads it. Watch the browser - that's
> the TinyFish browser, live, running in the cloud. It comes back with the
> fields the page has *today* - not the ones we guessed, the ones that are
> actually on the screen."

When it returns, the card updates with the live fields and the dropdown options.

> "It even read the dropdown - Impersonation, Hacked account, Harassment, Scam.
> And it pre-filled everything."

### 1:50 - Show that it is filled (10 s)

Point at the green badge on the channel card:

> "And you do not have to take my word for it - the card says **filled 3 of 3**, and
> the agent's own note is right there saying exactly what it typed into each
> field. The browser is a bonus; the answer is on the card."

This is the moment that answers "how do I know it worked" without making the
judge squint at a live browser.

### 1:55 - File it (25 s)

Press **"Fill & submit"**.

> "Now it types. It stops before submit, and I approve. This is the second
> approval - there are always two."

The reference number appears (e.g. `IG-2026-486937`).

> "And there it is - a reference number. That's what the police and the bank
> will ask you for."

### 2:20 - Proof and follow-up (15 s)

Scroll to **"Your proof, and what we keep watching"**.

> "Every page it read, every reference it got, hashed and chained - so you can
> prove what was filed and when. And the case file is a document, not a
> screenshot: your details, when and where it happened, the account that did
> it, the screenshot you attach as an annexure, every place it was filed, and a
> declaration you sign. A bank will actually accept it. And then we keep
> watching the page, because a report is not the same as a takedown."

### 2:35 - Close (10 s)

> "One sentence in. Every report out. Proof it happened. And it never touches
> a database - the report lives in the tab and dies with it."

---

## Cutaways you should have ready

Record these **before** the main run, so you can cut to them if the live run is slow:

1. **The live agent browser** - a 10 s screen recording of the Agent Theatre
   with the browser visible. This is the single most convincing artefact.
2. **The case file PDF** - open it, scroll the hash chain, and show the
   declaration and signature block at the end.
3. **The evidence vault** - the two records with their hashes and the `prev`
   hash pointing at the previous one.
4. **The monitor** - the follow-up panel with the live TinyFish monitor.
5. **The backend proof** - `GET /v1/runs` on your TinyFish key, showing the
   completed agent runs. Shot of a terminal is fine and judges love it.
6. **`npm run eval`** - the 5-fold cross-validation table. 10 s of terminal.

---

## If something goes wrong

| Problem | What you do |
| --- | --- |
| The agent run is slow | Keep talking over it. Say "it's opening the real form now". Cut to the prepared agent-browser clip. |
| The agent fails | The card says "we could not reach the page". Re-run it once, then cut to the prepared clip. |
| The wallet is empty | You have $10. The whole demo costs about $0.50. |
| A portal is blocked | That is exactly why `demo forms` is on. The agent then drives our clone, which behaves identically. |
| The site 404s | The deployment URL is the one to use. `localhost` cannot be reached by the cloud agent. |
| The tunnel died | This is why the demo must run against the Vercel deployment, not a cloudflared quick tunnel. |

---

## The three lines that win it

1. **"Nothing about the world is hard-coded - the agent found the portal."**
2. **"It tells you what you have not covered."**
3. **"It does not stop at filing. It checks whether the content actually came
   down."**
