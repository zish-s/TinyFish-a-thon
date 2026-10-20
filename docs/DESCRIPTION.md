# ReclaimYourNet - the description

Three lengths. Use whichever fits.

---

## 1. One line (banner, bio, LinkedIn headline)

> **ReclaimYourNet** turns one description of online harm into every report you
> need to file - a live web agent finds the right portals, reads the real forms,
> fills them in, and proves what was filed.

---

## 2. The submission-form description

**ReclaimYourNet - report once, file everywhere, prove it happened.**

If someone impersonates you, morphs your photos, or doxxes your address, one
complaint is not enough. It has to be reported in several places at once: the
platform, the cybercrime portal, the bank, the police, the search engine, and
often a takedown service. Each asks for different facts, on different
deadlines, and most people never find out which ones they missed - including
the bank that would have frozen the money if it had been told within 24 hours.

ReclaimYourNet takes **one sentence** about what happened and does the rest.

**How it works**

1. **You describe it.** One sentence, typed or dictated, in your own words. A
   small local model reads it, works out what kind of harm it is, how urgent it
   is, and what is still missing - and it never sends your words to a cloud AI.
2. **A web agent finds the places.** It searches the live web for the *current*
   official portal for every route - the platform, the cybercrime portal, the
   bank, CERT-In, and the police station with jurisdiction over **your** city.
   Type "Gurugram" and it finds `gurgaon.haryanapolice.gov.in/cyber-crime`, not
   a generic national portal.
3. **It reads the real form and fills it in.** The agent opens the actual page
   and returns the fields it has *today* - labels, required flags, dropdown
   options, what evidence it wants. It fills in everything it can, and stops
   only for the fields a form genuinely marks as required.
4. **You approve, it files, then it watches.** Two separate approvals - it
   never submits in your name on its own. You get a reference number. Every
   page read and every submission goes into a tamper-evident evidence chain you
   can export as a case file, and a monitor keeps checking whether the content
   actually came down.

**What makes it different from a list of links**

- **Nothing is hard-coded.** The channel catalogue in the code is only a
  fallback. The real routing - which portal, which URL, which fields - is
  resolved live, per case, at the moment you report.
- **It tells you what you have *not* covered.** The most useful screen is not
  the list of things to do, it is the list of things you are still missing.
- **It knows whose jurisdiction.** A FIR can only be registered by the local
  station, and a State Commission is a different body from the national one.
- **It does not stop at filing.** A report is not a takedown, so the page keeps
  being checked.
- **It never stores your report.** No account, no database, no analytics. It
  lives in the tab and dies with it; the only copy that outlives the session is
  the PDF you download.

Live: **https://reclaim-your-net.vercel.app**
Built with [TinyFish](https://docs.tinyfish.ai/) - Search, Web Agent, Fetch and
Monitor.

---

## 3. A paragraph (for the PPT title slide or a short bio)

> ReclaimYourNet turns one description of online harm into every report you
> need to file. A small local model works out what kind of harm it is and how
> urgent it is; a TinyFish web agent then goes to the live web, finds the
> official portal for every route - including the police station with
> jurisdiction over your own city - reads the real form as it exists today, and
> fills it in. You review every value and approve it, the agent submits and
> returns a reference number, and a monitor keeps checking whether the content
> actually came down. Nothing about the world is hard-coded, and your report is
> never written to a database.

---

## Talking points for the pitch

| Line | Why it lands |
| --- | --- |
| "A bank will only freeze your money if you complain within 24 hours, and nobody tells you that." | Concrete, urgent, true. Hooks the room. |
| "A FIR can only be registered by the police station with jurisdiction over where you live." | Shows the problem is not "where do I report" but "whose police". |
| "Our agent found our district's own cyber crime page, live, in that run." | Proves nothing is hard-coded. |
| "It tells you what you have not covered." | The screen nobody else has. |
| "A report is not a takedown, so we keep checking the page." | The part everyone stops at. |
| "Your report is never written to a database." | Proves the privacy claim is engineering, not marketing. |
