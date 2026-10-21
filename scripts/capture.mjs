/**
 * Captures the README screenshots from the live app.
 *
 *   node scripts/capture.mjs
 *
 * Drives the deployed app with a real browser, walks the flow, and saves one
 * small JPEG per step into docs/. Run it again whenever the UI changes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '..', 'docs');
const URL = process.env.APP_URL ?? 'https://reclaim-your-net.vercel.app';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars'],
  defaultViewport: { width: 1280, height: 860, deviceScaleFactor: 1 },
});

const page = await browser.newPage();
const shot = async (name) => {
  const file = path.join(OUT, name);
  await page.screenshot({ path: file, type: 'jpeg', quality: 80 });
  const kb = Math.round(fs.statSync(file).size / 1024);
  console.log(`  ${name}  ${kb} KB`);
};

const clickText = async (text, exact = true) => {
  const handle = await page.evaluateHandle(
    (t, ex) => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find((b) => (ex ? b.textContent.trim() === t : b.textContent.includes(t))) ?? null;
    },
    text,
    exact,
  );
  const el = handle.asElement();
  if (!el) {
    console.log(`  !! button not found: ${text}`);
    return false;
  }
  await el.click();
  return true;
};

console.log('opening', URL);
await page.goto(URL, { waitUntil: 'networkidle2', timeout: 60000 });
await sleep(1200);

// 1 - the question box, with the example filled in
await clickText('Impersonation + fraud');
await sleep(400);
await shot('step-1-question-box.jpg');

// 2 - start the report
await clickText('Find where to report this', false);
console.log('  running discovery...');
await sleep(14000);

// 3 - the top of the results: urgency, practice mode, your details
await shot('step-2-results-and-details.jpg');

// 3b - the panel that only asks for what the form requires
await page.evaluate(() => {
  const h = Array.from(document.querySelectorAll('h3')).find((x) => /the form needs from you|Only the fields/i.test(x.textContent));
  if (h) h.scrollIntoView({ block: 'center' });
});
await sleep(700);
await shot('step-3-required-fields.jpg');

// 4 - the coverage map
const mapShot = async () => {
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('h2')).find((x) => /Remove it from the platform/.test(x.textContent));
    if (h) h.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -90);
  });
  await sleep(700);
};
await mapShot();
await shot('step-4-coverage-map.jpg');

// 5 - an expanded channel, showing the values the agent will type
await clickText('Details', false);
await sleep(700);
await page.evaluate(() => {
  const c = document.querySelector('a[href*="demo-portals/cybercrime"], a[href*="cybercrime.gov.in"]');
  if (c) c.scrollIntoView({ block: 'center' });
});
await sleep(500);
await shot('step-5-channel-values.jpg');

// 6 - the agent working, with the live browser
console.log('  running the agent (this takes a minute)...');
const readBtn = await page.evaluateHandle(() => {
  const rows = Array.from(document.querySelectorAll('button'));
  return rows.find((b) => b.textContent.trim() === 'Read the form') ?? null;
});
if (readBtn.asElement()) {
  await readBtn.asElement().click();
  await sleep(70000);
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('h2')).find((x) => /What the agent did/.test(x.textContent));
    if (h) h.scrollIntoView({ block: 'start' });
    window.scrollBy(0, -90);
  });
  await sleep(800);
  await shot('step-5-agent-working.jpg');

  // 7 - the evidence vault
  console.log('  filing...');
  const fillBtn = await page.evaluateHandle(() => {
    const rows = Array.from(document.querySelectorAll('button'));
    return rows.find((b) => b.textContent.trim() === 'Fill & submit') ?? null;
  });
  if (fillBtn.asElement()) {
    await fillBtn.asElement().click();
    await sleep(95000);

    // the "filled 3 of 3" badge, on the expanded channel
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === 'Details');
      if (b) b.click();
    });
    await sleep(800);
    await page.evaluate(() => {
      const badge = Array.from(document.querySelectorAll('div')).find((x) => /Filled \d+ of \d+/.test(x.textContent));
      if (badge) badge.scrollIntoView({ block: 'center' });
    });
    await sleep(600);
    await shot('step-6-filled-badge.jpg');

    // 7 - the evidence vault
    await page.evaluate(() => {
      const h = Array.from(document.querySelectorAll('h2')).find((x) => /Your proof/.test(x.textContent));
      if (h) h.scrollIntoView({ block: 'start' });
      window.scrollBy(0, -90);
    });
    await sleep(800);
    await shot('step-7-evidence.jpg');
  }
}

await browser.close();
console.log('done ->', OUT);
