import type { IncidentLabel, LabelScore, TokenContribution } from '../types.js';
import { INCIDENT_TYPES } from '../taxonomy.js';
import { TRAINING_DATA, type TrainingExample } from './dataset.js';
import { bigrams, tokenize } from './tokenize.js';

/**
 * Multi-label incident triage model.
 *
 * Method: one-vs-rest L2-regularised logistic regression over a TF-IDF
 * vector of unigrams + bigrams drawn from a synonym-folded, stemmed token
 * stream. Trained with full-batch gradient descent and momentum.
 *
 * Why discriminative and not Naive Bayes: an incident is usually several
 * things at once ("a fake account using my photo asking for money" is
 * impersonation AND image misuse AND fraud). A generative model has to treat
 * every token as evidence against every class it does not own, which makes
 * multi-label almost impossible. A discriminative model learns "photo pushes
 * image_misuse up, impersonation up, fraud down" directly from the corpus.
 *
 *   p(L | x) = sigmoid( w_L . tfidf(x) + b_L )
 *
 * The per-token weights ARE the explanation: the UI shows the tokens with the
 * largest positive weight for the recommended label, which is exactly the
 * evidence a victim needs to trust the recommendation.
 *
 * Why this and not an LLM: triage must be reproducible, offline, explainable
 * and free. The judgement-heavy part of the product (which portal, which
 * form, what evidence, is it still live) is delegated to the TinyFish web
 * agent at request time, so nothing is baked in and nothing goes stale.
 */

const knob = (key: string, fallback: number) => {
  const raw = typeof process !== 'undefined' ? process.env?.[key] : undefined;
  const value = raw === undefined ? NaN : Number(raw);
  return Number.isFinite(value) ? value : fallback;
};

export interface LabelModel {
  label: IncidentLabel;
  /** Learned weight per vocabulary feature. */
  weights: Float64Array;
  bias: number;
  support: number;
}

export interface Prediction {
  labels: LabelScore[];
  /** Labels the model considers active for this incident. */
  selected: IncidentLabel[];
  primaryLabel: IncidentLabel;
  needsReview: boolean;
  tokens: string[];
}

function sigmoid(x: number): number {
  if (x >= 0) return 1 / (1 + Math.exp(-x));
  const e = Math.exp(x);
  return e / (1 + e);
}

function featureCounts(text: string): Map<string, number> {
  const toks = tokenize(text).map((t) => t.token);
  const feats = [...toks, ...bigrams(toks.map((token) => ({ token, surface: token, index: 0 })))];
  const counts = new Map<string, number>();
  for (const f of feats) counts.set(f, (counts.get(f) ?? 0) + 1);
  return counts;
}

interface SparseDoc {
  idx: Int32Array;
  val: Float64Array;
  labels: Set<IncidentLabel>;
}

export class IncidentClassifier {
  private readonly labels: IncidentLabel[];
  private readonly vocab: Map<string, number>;
  private readonly idf: Map<string, number>;
  private readonly models = new Map<IncidentLabel, LabelModel>();
  private readonly featureNames: string[];

  // Hyper-parameters (overridable through the environment for tuning runs).
  private readonly epochs = knob('REDRESS_EPOCHS', 300);
  private readonly learningRate = knob('REDRESS_LR', 0.6);
  private readonly momentum = knob('REDRESS_MOMENTUM', 0.9);
  private readonly l2 = knob('REDRESS_L2', 2e-3);
  private readonly maxPosWeight = knob('REDRESS_MAX_POS_WEIGHT', 6);
  private readonly temperature = knob('REDRESS_TEMPERATURE', 2.0);
  private readonly secondaryThreshold = knob('REDRESS_SECONDARY_THRESHOLD', 0.45);
  private readonly secondaryRatio = knob('REDRESS_SECONDARY_RATIO', 0.45);

  constructor(examples: TrainingExample[] = TRAINING_DATA) {
    this.labels = INCIDENT_TYPES.map((t) => t.id);

    const rawCounts = examples.map((ex) => featureCounts(ex.text));

    // --- vocabulary + document frequency ---------------------------------
    const df = new Map<string, number>();
    for (const counts of rawCounts) for (const f of counts.keys()) df.set(f, (df.get(f) ?? 0) + 1);

    this.vocab = new Map();
    this.idf = new Map();
    this.featureNames = [];
    let i = 0;
    for (const [f, d] of df) {
      this.vocab.set(f, i);
      this.idf.set(f, Math.log((1 + examples.length) / (1 + d)) + 1);
      this.featureNames.push(f);
      i += 1;
    }

    // --- tf-idf vectors (L2 normalised, sparse) --------------------------
    const docs: SparseDoc[] = rawCounts.map((counts, idx) => {
      const entries = [...counts.entries()].filter(([f]) => this.vocab.has(f));
      const vals = entries.map(([f, c]) => {
        const tf = 1 + Math.log(c);
        return tf * (this.idf.get(f) ?? 1);
      });
      let norm = 0;
      for (const v of vals) norm += v * v;
      norm = Math.sqrt(norm) || 1;
      return {
        idx: Int32Array.from(entries.map(([f]) => this.vocab.get(f)!)),
        val: Float64Array.from(vals.map((v) => v / norm)),
        labels: new Set(examples[idx].labels),
      };
    });

    // --- one-vs-rest logistic regression ---------------------------------
    for (const label of this.labels) {
      const posCount = docs.filter((d) => d.labels.has(label)).length;
      const negCount = docs.length - posCount;
      const posWeight = Math.min(this.maxPosWeight, Math.max(1, negCount / Math.max(1, posCount)));

      const w = new Float64Array(this.vocab.size);
      const v = new Float64Array(this.vocab.size);
      let b = 0;
      let vb = 0;

      const grad = new Float64Array(this.vocab.size);
      for (let epoch = 0; epoch < this.epochs; epoch += 1) {
        grad.fill(0);
        let gb = 0;

        for (const doc of docs) {
          let z = b;
          for (let k = 0; k < doc.idx.length; k += 1) z += w[doc.idx[k]] * doc.val[k];
          const p = sigmoid(z);
          const isPos = doc.labels.has(label);
          const sw = isPos ? posWeight : 1;
          const err = (p - (isPos ? 1 : 0)) * sw;
          gb += err;
          for (let k = 0; k < doc.idx.length; k += 1) grad[doc.idx[k]] += err * doc.val[k];
        }

        const scale = 1 / docs.length;
        gb *= scale;
        for (let k = 0; k < grad.length; k += 1) grad[k] = grad[k] * scale + this.l2 * w[k];

        vb = this.momentum * vb + this.learningRate * gb;
        b -= vb;
        for (let k = 0; k < grad.length; k += 1) {
          v[k] = this.momentum * v[k] + this.learningRate * grad[k];
          w[k] -= v[k];
        }
      }

      this.models.set(label, { label, weights: w, bias: b, support: posCount });
    }
  }

  /** The strongest tokens for a label, in either direction. */
  private featureWeights(model: LabelModel, feature: string): number | null {
    const v = this.vocab.get(feature);
    if (v === undefined) return null;
    return model.weights[v];
  }

  predict(text: string): Prediction {
    const counts = featureCounts(text);
    const scores: LabelScore[] = [];

    for (const label of this.labels) {
      const model = this.models.get(label)!;
      let z = model.bias;
      const contributions: TokenContribution[] = [];

      for (const feature of counts.keys()) {
        const w = this.featureWeights(model, feature);
        if (w === null) continue;
        z += w;
        contributions.push({ token: feature, weight: w });
      }

      contributions.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

      scores.push({
        label,
        score: z,
        probability: sigmoid(z / this.temperature),
        contributions: contributions.slice(0, 6),
      });
    }

    scores.sort((a, b) => b.probability - a.probability);

    const maxProb = scores.length ? scores[0].probability : 0;

    // Multi-label selection: the primary label always survives; a secondary
    // label has to be confident in absolute terms AND credible relative to
    // the primary, so co-signalling does not turn into guessing.
    const selected: LabelScore[] = [];
    if (scores.length) selected.push(scores[0]);
    const topProb = scores.length ? scores[0].probability : 0;
    for (const s of scores.slice(1)) {
      if (s.probability >= this.secondaryThreshold && s.probability >= topProb * this.secondaryRatio) {
        selected.push(s);
      }
    }

    return {
      labels: scores,
      selected: selected.map((s) => s.label),
      primaryLabel: selected[0]?.label ?? 'harassment',
      needsReview: maxProb < 0.55,
      tokens: [...counts.keys()],
    };
  }

  /** The learned weight of a token for a label - used by the explainability panel. */
  weightFor(label: IncidentLabel, token: string): number {
    const model = this.models.get(label);
    if (!model) return 0;
    const v = this.vocab.get(token);
    return v === undefined ? 0 : model.weights[v];
  }
}

export const LABEL_THRESHOLD = 0.5;

export const classifier = new IncidentClassifier();
