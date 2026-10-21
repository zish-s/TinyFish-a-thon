/**
 * Captures the README screenshots from the live app.
 *
 *   node scripts/capture.mjs
 *
 * Drives the deployed app with a real browser, walks the flow, and saves one
 * small JPEG per step into docs/. Run it again whenever the UI changes.
 *
 * The browser renders the full desktop layout but at a reduced device scale,
 * so every screenshot comes out around 780px wide and under 30 KB - small
 * enough for the README to carry the whole flow.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'docs');
const URL = process.env.APP_URL ?? 'https://reclaim-your-net.vercel.app';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
/** The layout width the app is rendered at. */
const LAYOUT = 1280;
/** The scale the screenshot is taken at - 1280 * 0.61 = 781px wide. */
const SCALE = 0.61;
/** The JPEG quality. */
const QUALITY = 55;

fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: LAYOUT, height: 860, deviceScaleFactor: SCALE },
  protocolTimeout: 60000,
});

const page = await browser.newPage();

/** Saves the screen as a small JPEG. */
const save = async (name) => {
  const shot = await page.screenshot({
    type: 'jpeg',
    quality: QUALITY,
    animations: 'disabled',
    caret: 'hide',
  });
  const file = path.join(OUT, name);
  fs.writeFileSync(file, Buffer.from(shot));
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`  ${name}  ${kb} KB`);
};

/**
 * Clicks a button by its text.
 *
 * The click is dispatched in the page rather than through the mouse: the app
 * animates and re-renders, and puppeteer's "wait until the element stops
 * moving" check never settles on a live screen.
 */
const clickText = async (text, exact = true) => {
  const clicked = await page.evaluate(
    (t, ex) => {
      // The app scrolls smoothly, and an animation still running when the
      // next scroll starts would override it. Turn it off and click in place.
      document.documentElement.style.scrollBehavior = 'auto';
      const btns = Array.from(document.querySelectorAll('button'));
      const b = btns.find((x) => (ex ? x.textContent.trim() === t : x.textContent.includes(t)));
      if (!b) return false;
      b.click();
      return true;
    },
    text,
    exact,
  );
  if (!clicked) console.log(`  !! button not found: ${text}`);
  return clicked;
};

/**
 * Scrolls the heading into view.
 *
 * `offset` is where the heading should end up in the viewport: a positive
 * number puts it that many pixels below the top, clear of the sticky header.
 */
const scrollTo = async (pattern, offset = 60) => {
  await page.evaluate(
    (p, off) => {
      // The app scrolls smoothly, and Chrome will not commit a frame while a
      // scroll is still running. Scroll instantly instead.
      document.documentElement.style.scrollBehavior = 'auto';
      // The sticky header reserves scroll padding, which would push every
      // shot down by the height of the header.
      document.documentElement.style.scrollPaddingTop = '0px';
      const all = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
      const h = all.find((x) => new RegExp(p, 'i').test(x.textContent));
      if (h) {
        const top = h.getBoundingClientRect().top + window.scrollY - off;
        window.scrollTo({ top, behavior: 'instant' });
      }
    },
    pattern,
    offset,
  );
  await sleep(900);
};

/**
 * Scrolls the whole card into view, rather than just its heading, so the
 * screenshot shows the card and not a slice of it.
 *
 * The card is found by walking up from the heading to the first ancestor
 * that is actually big enough to be a card.
 */
const scrollCardTo = async (pattern, top = 16) => {
  await page.evaluate(
    (p, t) => {
      document.documentElement.style.scrollBehavior = 'auto';
      // The sticky header reserves scroll padding, which would push every
      // shot down by the height of the header.
      document.documentElement.style.scrollPaddingTop = '0px';
      const all = Array.from(document.querySelectorAll('h1, h2, h3, h4'));
      const h = all.find((x) => new RegExp(p, 'i').test(x.textContent));
      if (!h) return;
      let card = h;
      for (let el = h.parentElement; el && el !== document.body; el = el.parentElement) {
        if (el.getBoundingClientRect().height > 350) {
          card = el;
          break;
        }
      }
      const y = card.getBoundingClientRect().top + window.scrollY - t;
      window.scrollTo({ top: y, behavior: 'instant' });
    },
    pattern,
    top,
  );
  await sleep(900);
};

console.log('opening', URL);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1500);

// 1 - the question box, with the example filled in
await clickText('Impersonation + fraud');
await sleep(500);
await save('step-1-question-box.jpg');

// 2 - the particulars for the official record, on the same screen
await clickText('Fill in', true);
await sleep(600);
await scrollCardTo('Details for the official record', 12);
await save('step-1b-official-record.jpg');

// 3 - the app's own four-step guide, further down the first screen
await scrollCardTo('How this works', 12);
await save('step-1c-how-it-works.jpg');

// 4 - start the report
await page.evaluate(() => window.scrollTo(0, 0));
await sleep(300);
await clickText('Find where to report this', false);
console.log('  running discovery...');
await sleep(16000);

// 5 - the top of the results: urgency, practice mode, your details
await save('step-2-results-and-details.jpg');

// 6 - the complainant's own details
await scrollTo('Your details', 60);
await save('step-2b-your-details.jpg');

// 7 - the panel that only asks for what the form requires
await scrollTo('the form needs from you|Only the fields');
await save('step-3-required-fields.jpg');

// 8 - the coverage map
await scrollTo('Remove it from the platform');
await save('step-4-coverage-map.jpg');

// 9 - an expanded channel, showing the values the agent will type
await clickText('Details', false);
await sleep(800);
await page.evaluate(() => {
  const c = document.querySelector('a[href*="demo-portals/cybercrime"], a[href*="cybercrime.gov.in"]');
  if (c) c.scrollIntoView({ block: 'center' });
});
await sleep(500);
await save('step-5-channel-values.jpg');

// 10 - the agent working, with the live browser
if (process.env.SKIP_AGENT === '1') {
  console.log('  SKIP_AGENT=1 - stopping before the agent run');
} else {
  console.log('  running the agent (this takes a minute)...');
  await clickText('Read the form', true);
  await sleep(75000);
  await scrollTo('What the agent did');
  await save('step-5-agent-working.jpg');

  console.log('  filing...');
  const filed = await clickText('Fill & submit', true);
  if (filed) {
    await sleep(100000);

    // the "filled 3 of 3" badge, on the expanded channel
    await clickText('Details', true);
    await sleep(900);
    await page.evaluate(() => {
      const badge = Array.from(document.querySelectorAll('div')).find((x) => /Filled \d+ of \d+/.test(x.textContent));
      if (badge) badge.scrollIntoView({ block: 'center' });
    });
    await sleep(700);
    await save('step-6-filled-badge.jpg');

    // the case file, and the evidence the reporter attaches
    await scrollTo('Your proof', 60);
    await save('step-7-evidence.jpg');
  }
}

await browser.close();
console.log('done ->', OUT);
