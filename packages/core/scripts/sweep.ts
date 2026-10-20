/**
 * Hyper-parameter sweep for the triage classifier.
 *   npx tsx scripts/sweep.ts
 * Prints macro F1 / precision / recall / top-1 for a grid of settings.
 */
import { IncidentClassifier } from '../src/ml/classifier.js';
import { TRAINING_DATA } from '../src/ml/dataset.js';
import { INCIDENT_TYPES } from '../src/taxonomy.js';
import type { IncidentLabel } from '../src/types.js';

const labels: IncidentLabel[] = INCIDENT_TYPES.map((t) => t.id);

function mulberry32(a: number) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(20261020);
const shuffled = [...TRAINING_DATA].sort(() => rand() - 0.5);
const folds = 5;
const buckets: typeof TRAINING_DATA[] = Array.from({ length: folds }, () => []);
shuffled.forEach((ex, i) => buckets[i % folds].push(ex));

function evaluate() {
  const tp = new Map<IncidentLabel, number>();
  const fp = new Map<IncidentLabel, number>();
  const fn = new Map<IncidentLabel, number>();
  let exact = 0;
  let top1 = 0;
  let n = 0;

  buckets.forEach((testSet) => {
    const ids = new Set(testSet.map((e) => e.text));
    const model = new IncidentClassifier(TRAINING_DATA.filter((e) => !ids.has(e.text)));
    for (const ex of testSet) {
      const p = model.predict(ex.text);
      const predicted = p.selected.length ? p.selected : [p.primaryLabel];
      n += 1;
      for (const label of labels) {
        const e = ex.labels.includes(label);
        const q = predicted.includes(label);
        if (e && q) tp.set(label, (tp.get(label) ?? 0) + 1);
        else if (!e && q) fp.set(label, (fp.get(label) ?? 0) + 1);
        else if (e && !q) fn.set(label, (fn.get(label) ?? 0) + 1);
      }
      if (predicted.length === ex.labels.length && ex.labels.every((l) => predicted.includes(l))) exact += 1;
      if (predicted.includes(ex.labels[0])) top1 += 1;
    }
  });

  const rows = labels
    .map((label) => {
      const t = tp.get(label) ?? 0;
      const p = fp.get(label) ?? 0;
      const f = fn.get(label) ?? 0;
      const precision = t + p === 0 ? 0 : t / (t + p);
      const recall = t + f === 0 ? 0 : t / (t + f);
      const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
      return { precision, recall, f1 };
    })
    .filter((r) => r.f1 > 0 || r.recall > 0);

  const macroF1 = rows.reduce((a, r) => a + r.f1, 0) / rows.length;
  const macroP = rows.reduce((a, r) => a + r.precision, 0) / rows.length;
  const macroR = rows.reduce((a, r) => a + r.recall, 0) / rows.length;
  return { macroF1, macroP, macroR, exact: exact / n, top1: top1 / n };
}

const grid: Array<Record<string, number>> = [];
for (const epochs of [250, 500, 900]) {
  for (const l2 of [1e-4, 5e-4, 2e-3]) {
    grid.push({ ReclaimYourNet_EPOCHS: epochs, ReclaimYourNet_L2: l2, ReclaimYourNet_TEMPERATURE: 2.0 });
  }
}
for (const temp of [1.2, 1.6, 3.0]) {
  grid.push({ ReclaimYourNet_EPOCHS: 500, ReclaimYourNet_L2: 5e-4, ReclaimYourNet_TEMPERATURE: temp });
}
for (const margin of [2.0, 6.0, 10.0]) {
  grid.push({ ReclaimYourNet_EPOCHS: 500, ReclaimYourNet_L2: 5e-4, ReclaimYourNet_TEMPERATURE: 2.0, ReclaimYourNet_SECONDARY_MARGIN: margin });
}

const results: Array<{ cfg: Record<string, number>; m: ReturnType<typeof evaluate> }> = [];
for (const cfg of grid) {
  for (const [k, v] of Object.entries(cfg)) process.env[k] = String(v);
  results.push({ cfg, m: evaluate() });
  console.log(
    `epochs=${cfg.ReclaimYourNet_EPOCHS} l2=${cfg.ReclaimYourNet_L2} temp=${cfg.ReclaimYourNet_TEMPERATURE} -> F1 ${results.at(-1)!.m.macroF1.toFixed(3)} P ${results.at(-1)!.m.macroP.toFixed(3)} R ${results.at(-1)!.m.macroR.toFixed(3)} top1 ${(results.at(-1)!.m.top1 * 100).toFixed(1)}%`,
  );
}

results.sort((a, b) => b.m.macroF1 - a.m.macroF1);
console.log('\nbest:');
for (const r of results.slice(0, 5)) {
  console.log(JSON.stringify(r.cfg), 'F1', r.m.macroF1.toFixed(3), 'top1', (r.m.top1 * 100).toFixed(1) + '%');
}
