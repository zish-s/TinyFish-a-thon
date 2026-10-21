/**
 * Lays the generated PDF out as text, page by page, so the print layout can
 * be checked without a PDF reader: every text run is reported with its
 * position, and anything that runs off the page or overlaps is flagged.
 */
import fs from 'node:fs';
import zlib from 'node:zlib';

const file = process.argv[2] ?? '.tmp-casefile/casefile.pdf';
const buf = fs.readFileSync(file);
const PAGE_H = 841.89;
const PAGE_W = 595.28;

const streams = [];
let idx = 0;
while (true) {
  const s = buf.indexOf('stream', idx);
  if (s === -1) break;
  let p = s + 6;
  if (buf[p] === 0x0d) p += 1;
  if (buf[p] === 0x0a) p += 1;
  const e = buf.indexOf('endstream', p);
  if (e === -1) break;
  try {
    streams.push(zlib.inflateSync(buf.subarray(p, e)).toString('latin1'));
  } catch {
    /* not a flate stream */
  }
  idx = e + 9;
}

function decodeHex(h) {
  let out = '';
  for (let i = 0; i + 1 < h.length; i += 2) out += String.fromCharCode(parseInt(h.substr(i, 2), 16));
  return out;
}

const pages = [];
for (const s of streams) {
  if (!s.includes('BT')) continue;
  const runs = [];
  for (const b of s.split('BT').slice(1)) {
    const body = b.split('ET')[0];
    const tm = /1 0 0 1 ([-\d.]+) ([-\d.]+) Tm/.exec(body);
    const tf = /\/([A-Za-z0-9]+) ([\d.]+) Tf/.exec(body);
    const parts = [...body.matchAll(/<([0-9a-fA-F]+)>/g)].map((m) => decodeHex(m[1]));
    if (!parts.length || !tm) continue;
    runs.push({
      x: parseFloat(tm[1]),
      top: PAGE_H - parseFloat(tm[2]),
      size: tf ? parseFloat(tf[2]) : 9,
      font: tf ? tf[1] : '',
      text: parts.join(''),
    });
  }
  if (runs.length) pages.push(runs);
}

let problems = 0;
pages.forEach((page, i) => {
  console.log(`\n=========== PAGE ${i + 1} - ${page.length} runs ===========`);
  for (const r of page) {
    let flag = '';
    if (r.x < 0 || r.x > PAGE_W || r.top < 0 || r.top > PAGE_H) {
      flag = '  <<< OFF PAGE';
      problems += 1;
    }
    console.log(
      `x${r.x.toFixed(0).padStart(4)} y${r.top.toFixed(0).padStart(4)} ${String(r.size).padStart(4)}pt  ${r.text.replace(/\s+/g, ' ').slice(0, 105)}${flag}`,
    );
  }
});

// Overlap check: two runs on the same page whose bands intersect.
const overlaps = [];
pages.forEach((page, i) => {
  for (let a = 0; a < page.length; a += 1) {
    for (let b = a + 1; b < page.length; b += 1) {
      const r1 = page[a];
      const r2 = page[b];
      const h1 = r1.size * 1.35;
      const h2 = r2.size * 1.35;
      const vOverlap = r1.top < r2.top + h2 && r2.top < r1.top + h1;
      const w1 = r1.text.length * r1.size * 0.5;
      const w2 = r2.text.length * r2.size * 0.5;
      const hOverlap = r1.x < r2.x + w2 && r2.x < r1.x + w1;
      if (vOverlap && hOverlap) {
        overlaps.push(`p${i + 1}: "${r1.text.slice(0, 40)}" x "${r2.text.slice(0, 40)}"`);
      }
    }
  }
});

console.log(`\n--- ${pages.length} pages, ${problems} off-page runs, ${overlaps.length} possible overlaps`);
overlaps.slice(0, 25).forEach((o) => console.log('   ' + o));
