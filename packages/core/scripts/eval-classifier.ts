/**
 * Offline evaluation for the triage classifier.
 *
 *   npm run eval
 *
 * Runs stratified 5-fold cross-validation over the committed corpus and
 * prints per-label precision / recall / F1, macro F1, exact label-set
 * accuracy and a sample of the misses. The numbers quoted in the pitch deck
 * come from this script - they are reproducible, not hand-waved.
 */
import { IncidentClassifier } from '../src/ml/classifier.js';
import { TRAINING_DATA } from '../src/ml/dataset.js';
import { semanticText } from '../src/ml/entities.js';
import { INCIDENT_TYPES } from '../src/taxonomy.js';
import type { IncidentLabel, TrainingExample } from '../src/index.js';

const FOLDS = 5;
const SEED = 20261020;

function mulberry32(a: number) {
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function stratifiedFolds(examples: TrainingExample[], folds: number): TrainingExample[][] {
  const byLabel = new Map<string, TrainingExample[]>();
  for (const ex of examples) {
    const key = [...ex.labels].sort().join('+');
    byLabel.set(key, [...(byLabel.get(key) ?? []), ex]);
  }
  const rand = mulberry32(SEED);
  const buckets: TrainingExample[][] = Array.from({ length: folds }, () => []);
  for (const group of byLabel.values()) {
    const shuffled = [...group].sort(() => rand() - 0.5);
    shuffled.forEach((ex, i) => buckets[i % folds].push(ex));
  }
  return buckets;
}

const labels: IncidentLabel[] = INCIDENT_TYPES.map((t) => t.id);
const tp = new Map<IncidentLabel, number>();
const fp = new Map<IncidentLabel, number>();
const fn = new Map<IncidentLabel, number>();
let exact = 0;
let primaryCorrect = 0;
let evaluated = 0;
const failures: Array<{ text: string; expected: string[]; got: string[] }> = [];

const buckets = stratifiedFolds(TRAINING_DATA, FOLDS);

buckets.forEach((testSet, fold) => {
  const testIds = new Set(testSet.map((e) => e.text));
  const train = TRAINING_DATA.filter((e) => !testIds.has(e.text));
  const model = new IncidentClassifier(train);

  for (const ex of testSet) {
    const prediction = model.predict(semanticText(ex.text) || ex.text);
    const predicted = prediction.selected.length ? prediction.selected : [prediction.primaryLabel];
    evaluated += 1;

    for (const label of labels) {
      const inExpected = ex.labels.includes(label);
      const inPredicted = predicted.includes(label);
      if (inExpected && inPredicted) tp.set(label, (tp.get(label) ?? 0) + 1);
      else if (!inExpected && inPredicted) fp.set(label, (fp.get(label) ?? 0) + 1);
      else if (inExpected && !inPredicted) fn.set(label, (fn.get(label) ?? 0) + 1);
    }

    const sameSet = predicted.length === ex.labels.length && ex.labels.every((l) => predicted.includes(l));
    if (sameSet) exact += 1;
    if (predicted.includes(ex.labels[0])) primaryCorrect += 1;
    else failures.push({ text: ex.text, expected: ex.labels, got: predicted });  }
});

const rows = labels
  .map((label) => {
    const t = tp.get(label) ?? 0;
    const p = fp.get(label) ?? 0;
    const n = fn.get(label) ?? 0;
    const precision = t + p === 0 ? 0 : t / (t + p);
    const recall = t + n === 0 ? 0 : t / (t + n);
    const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
    return { label, precision, recall, f1, support: t + n };
  })
  .filter((r) => r.support > 0)
  .sort((a, b) => b.support - a.support);

console.log('\nRedress triage classifier - stratified 5-fold cross-validation');
console.log('='.repeat(74));
console.log(
  `corpus: ${TRAINING_DATA.length} labelled examples | ${FOLDS} folds | ${evaluated} predictions | seed ${SEED}`,
);
console.log('');
console.log('label'.padEnd(22), 'P'.padStart(7), 'R'.padStart(7), 'F1'.padStart(7), 'n'.padStart(5));
console.log('-'.repeat(74));
for (const r of rows) {
  console.log(
    r.label.padEnd(22),
    r.precision.toFixed(2).padStart(7),
    r.recall.toFixed(2).padStart(7),
    r.f1.toFixed(2).padStart(7),
    String(r.support).padStart(5),
  );
}
const macroF1 = rows.reduce((a, r) => a + r.f1, 0) / rows.length;
const macroP = rows.reduce((a, r) => a + r.precision, 0) / rows.length;
const macroR = rows.reduce((a, r) => a + r.recall, 0) / rows.length;
console.log('-'.repeat(74));
console.log('macro precision'.padEnd(22), macroP.toFixed(3).padStart(7));
console.log('macro recall'.padEnd(22), macroR.toFixed(3).padStart(7));
console.log('macro F1'.padEnd(22), macroF1.toFixed(3).padStart(7));
console.log('exact label-set match'.padEnd(22), `${((exact / evaluated) * 100).toFixed(1)}%`);
console.log('primary label correct'.padEnd(22), `${((primaryCorrect / evaluated) * 100).toFixed(1)}%`);

if (failures.length) {
  console.log(`\n${failures.length} primary-label miss(es) across all folds:`);
  for (const f of failures.slice(0, 12)) {
    console.log(`  - "${f.text.slice(0, 76)}"`);
    console.log(`      expected: ${f.expected.join(', ')} | got: ${f.got.join(', ') || '(none)'}`);
  }
}

// Explainability demo - the evidence the UI shows for a recommendation.
const full = new IncidentClassifier(TRAINING_DATA);
const demo = 'someone made a fake instagram account using my photo and asked my friends for money';
const p = full.predict(semanticText(demo));
console.log('\nexplainability demo (model trained on the full corpus)');
console.log('-'.repeat(74));
console.log(`input: "${demo}"`);
console.log(`selected labels: ${p.selected.join(', ')}`);
for (const l of p.labels.filter((x) => p.selected.includes(x.label)).slice(0, 5)) {
  const top = l.contributions
    .filter((c) => c.weight > 0)
    .slice(0, 4)
    .map((c) => `${c.token}(${c.weight.toFixed(2)})`)
    .join(' ');
  console.log(`  ${l.label.padEnd(20)} p=${l.probability.toFixed(3)}  evidence: ${top}`);
}
console.log('');
