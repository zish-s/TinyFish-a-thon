/**
 * End-to-end check against a running server (deployed or local).
 *
 *   node scripts/e2e.mjs
 *   APP_URL=http://localhost:4000 node scripts/e2e.mjs
 *
 * Creates a case, discovers the channels, asks the agent to read the form,
 * files it, and prints what came back. This is the script the demo is judged
 * on, so it doubles as the smoke test.
 */
const APP = process.env.APP_URL ?? 'https://reclaim-your-net.vercel.app';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const t0 = Date.now();
const stamp = () => `${String((Date.now() - t0) / 1000).padStart(6)}s`;

async function post(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${url}\n${text.slice(0, 400)}`);
  return text;
}

/** POST /api/action and pull the final case out of the event stream. */
async function action(payload) {
  const raw = await post(`${APP}/api/action`, payload);
  let latest = null;
  const monitors = [];
  for (const line of raw.split('\n')) {
    const s = line.startsWith('data: ') ? line.slice(6) : line.trim();
    if (!s.startsWith('{')) continue;
    try {
      const evt = JSON.parse(s);
      if (evt.type === 'case') latest = evt.caseFile ?? evt.case ?? evt;
      if (evt.type === 'monitor') monitors.push(evt.monitor);
    } catch {
      /* a partial SSE line - ignore */
    }
  }
  if (!latest) throw new Error(`no case event in the stream:\n${raw.slice(0, 600)}`);
  latest.__monitors = monitors;
  return latest;
}

const health = await (await fetch(`${APP}/api/health`)).json();
console.log(`health ok=${health.ok} tinyfish=${health.tinyfish?.configured} wallet=$${health.tinyfish?.wallet?.balance}`);

const created = await post(`${APP}/api/cases`, {
  text: 'Someone made a fake Instagram account at https://instagram.com/rahul.finance.2024 using my photo and asking my friends for money.',
  profile: { name: 'Ishita Sharma', email: 'ishita@example.com', phone: '+91 98765 43210', city: 'Gurugram' },
  country: 'IN',
});
let c = JSON.parse(created);
console.log(`${stamp()} case   ${c.id}  channels=${c.plan.channels.length}`);

c = await action({ action: 'discover', id: c.id, sandbox: true, case: c });
console.log(`${stamp()} discover  channels=${c.plan.channels.length}`);

const ig = c.plan.channels.find((x) => x.id === 'instagram');
if (!ig) throw new Error('no instagram channel discovered');
console.log(`            ${ig.name} -> ${ig.url}`);

c = await action({ action: 'analyse', id: c.id, channelId: 'instagram', case: c });
const ig2 = c.plan.channels.find((x) => x.id === 'instagram');
console.log(`${stamp()} analyse   status=${ig2.status} fields=${ig2.requiredFields.length} onTheLiveForm`);

c = await action({ action: 'file', id: c.id, channelId: 'instagram', submit: true, case: c });
const ig3 = c.plan.channels.find((x) => x.id === 'instagram');
console.log(
  `${stamp()} file      status=${ig3.status} ref=${ig3.reference} filled=${ig3.fillResult?.filled}/${ig3.fillResult?.total} evidence=${c.evidence.length}`,
);

c = await action({ action: 'monitors', id: c.id, case: c });
console.log(
  `${stamp()} monitors  armed=${c.__monitors.length} onTheCase=${c.monitors?.length ?? 0}` +
    (c.__monitors.length ? ` -> ${c.__monitors.map((m) => `${m.channelName}:${m.type}`).join(', ')}` : ''),
);

const pdf = await fetch(`${APP}/api/casefile`, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ id: c.id, case: c }),
});
const bytes = Buffer.from(await pdf.arrayBuffer());
console.log(`${stamp()} casefile ${pdf.status} ${(bytes.length / 1024).toFixed(1)} KB ${bytes.subarray(0, 5).toString()}`);
console.log('OK');
