/** A case with nothing filled in: the case file must still make sense. */
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE ?? 'http://localhost:4000';
const OUT = path.join(process.cwd(), '.tmp-casefile');

const created = await fetch(`${BASE}/api/cases`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Someone keeps messaging me and insulting me on WhatsApp.', profile: {}, country: 'IN' }),
});
const caseFile = await created.json();
const pdf = await fetch(`${BASE}/api/casefile`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ id: caseFile.id, case: caseFile }),
});
const bytes = Buffer.from(await pdf.arrayBuffer());
fs.writeFileSync(path.join(OUT, 'bare.pdf'), bytes);
console.log('bare case pdf bytes:', bytes.length);
