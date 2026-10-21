import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox'],
  defaultViewport: { width: 1280, height: 860 },
});
const page = await browser.newPage();
await page.goto(process.env.APP_URL ?? 'https://reclaim-your-net.vercel.app', { waitUntil: 'networkidle2' });
await new Promise((r) => setTimeout(r, 1500));

const before = await page.evaluate(() => ({
  checkboxes: Array.from(document.querySelectorAll('input[type=checkbox]')).map((c) => c.checked),
  hasPractice: document.body.innerText.includes('Practice mode'),
  hasHowItWorks: document.body.innerText.includes('How this works'),
}));

// click the example and see whether the details fill themselves
await page.evaluate(() => {
  const b = Array.from(document.querySelectorAll('button')).find((x) => x.textContent.trim() === 'Impersonation + fraud');
  if (b) b.click();
});
await new Promise((r) => setTimeout(r, 600));
const after = await page.evaluate(() => ({
  city: Array.from(document.querySelectorAll('input')).map((i) => i.value).filter(Boolean),
  detailsOpen: !!Array.from(document.querySelectorAll('label')).find((l) => /City/.test(l.textContent)),
}));

console.log(JSON.stringify({ before, after }, null, 2));
await browser.close();
