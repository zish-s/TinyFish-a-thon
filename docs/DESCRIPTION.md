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

1. **You describe it once.** Typed or dictated from the mic, in your own
   words. A small local model works out what kind of harm it is and how urgent
   it is - "This one is time-critical", and why - and it never sends your words
   to a cloud AI. Your personal details stay masked until you reveal them.
2. **It asks for the facts once, not six times.** Your particulars, the date,
   the place, the account used: collected at intake, shown back in one
   editable place, and reused for every form it files.
3. **It plans the routes.** The case page opens with "Here is where this needs
   to be reported", under "Every place this has to be reported": the places to
   start with now, plus more you can arm afterwards, grouped into *remove it
   from the platform, create a legal record, stop the money, take it down
   before it spreads, shrink the blast radius*. Each route carries the reason
   it applies and its clock - "Money can usually only be frozen if reported
   within 24 hours of the transaction" - and a "Still missing" panel names
   every gap with one action to close it.
4. **It finds the live portals.** A TinyFish Search run, per country, at the
   moment you file. Not a hard-coded list: results are scored for
   officialness, runner-up pages show as "Also found live", and if nothing
   trustworthy turns up the route honestly says "no page found - Look again"
   rather than guessing. Type "Gurugram" and it finds
   `gurgaon.haryanapolice.gov.in/cyber-crime`, not a generic national portal.
5. **It reads the real form.** Press "Read the form" and a TinyFish web agent
   opens the actual page and returns the fields it has *today* - labels,
   required flags, dropdown options, the evidence it wants - through a
   validated JSON schema. Forms change; the agent follows them.
6. **It pre-fills and tells you exactly what it did.** A banner on the route
   says "Filled 2 of 3 - 1 still needs you", with the missing field named.
   Anything genuinely yours sits there as "needs your input" until you supply
   it.
7. **You watch, you approve, it files.** Step 3 on the page is "What the agent
   did": the agent's live browser feed and a plain-language log. "Fill it"
   always stops before Submit; "Fill & submit" is a separate, deliberate
   press. Once filed, the route flips to filed and the reference number
   becomes a chip you can copy.
8. **It proves it.** Step 4, "Your proof, and what we keep watching": every
   page read, every reference and every filed value goes into a SHA-256 hash
   chain - each item printing its own hash and the previous one - and
   attachments become annexures you can withdraw. "Download case file (PDF)"
   builds a printable record in the shape an office accepts: your particulars,
   when and where it happened, the account responsible, every annexure, every
   filing with its reference number, and a declaration with a signature block.
   Print it, sign it, hand it over.
9. **It follows up.** Press "Start watching" and a TinyFish Monitor re-checks
   the reported URL on a schedule and tells you whether the content actually
   came down - or quietly came back.

The details that round it out: real platforms (Instagram, X, the banks) ask
for a login, so practice mode fills a faithful copy of each form - same
fields, same flow, nothing sent anywhere - and you switch it off to watch
live discovery. The two external services (pre-emptive takedown,
de-indexing) are one-click: ReclaimYourNet copies your details to the
clipboard and hands you the official link with the fields they want. And the
pricing panel is one line: free for you - the money comes from the
organisations.

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
- **The output is a document, not a dashboard.** The case file is a record, not
  a screenshot of a product: the complainant's own particulars, the evidence,
  the acknowledgements, and a declaration to sign.
- **It never stores your report.** No account, no database, no analytics. It
  lives in the tab and dies with it - the page tells the API to forget its
  copy the moment you leave, and anything the signal misses expires from
  memory within half an hour. The only copy that outlives the session is the
  PDF you download.

Live: **https://reclaim-your-net.vercel.app**
Built with [TinyFish](https://docs.tinyfish.ai/) - Search, Web Agent and
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
