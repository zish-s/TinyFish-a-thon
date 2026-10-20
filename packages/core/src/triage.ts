import type { IncidentLabel, LabelScore, ReporterProfile, TriageResult, Urgency } from './types.js';
import { classifier } from './ml/classifier.js';
import { detectAmountLost, extractEntities, semanticText } from './ml/entities.js';
import { redact } from './ml/redact.js';
import { getIncidentType } from './taxonomy.js';

export type { ReporterProfile };

const THREAT_WORDS = /\b(threat|threaten\w*|kill|gun|hurt|harm|die|dead|attacked|attack|following me|unsafe|scared|afraid|danger)\b/i;
const ONGOING_WORDS = /\b(keeps?|continues?|still|every day|daily|again|ongoing|repeatedly|constantly|since \w+ \w+)\b/i;

/** Signals that force extra channels and change how urgently we act. */
export function detectHardSignals(
  text: string,
  labels: IncidentLabel[],
  amount: number | null,
  scores: LabelScore[] = [],
): string[] {
  const signals: string[] = [];
  const has = (l: IncidentLabel) => labels.includes(l);
  const conf = (l: IncidentLabel) => scores.find((s) => s.label === l)?.probability ?? 0;
  // Severe signals need real confidence, otherwise a weak co-label turns a
  // normal report into a "call the police now" banner.
  const strong = (l: IncidentLabel, min = 0.6) => has(l) && conf(l) >= min;

  if (strong('financial_fraud', 0.5) && amount !== null) signals.push('money_lost');
  if (strong('account_takeover', 0.55)) signals.push('account_takeover');
  if (strong('child_safety', 0.55)) signals.push('minor_involved');
  if (strong('sextortion', 0.6)) signals.push('intimate_content');
  if (strong('doxxing', 0.55)) signals.push('address_exposed');
  if (THREAT_WORDS.test(text)) signals.push('threat_to_safety');
  if (/\b(aadhaar|pan card|passport|bank account|card number|account number)\b/i.test(text)) signals.push('identity_exposed');
  if (has('financial_fraud') || has('romance_scam') || has('counterfeit')) signals.push('possible_criminal_fraud');
  return signals;
}

export function decideUrgency(signals: string[]): { urgency: Urgency; reasons: string[] } {
  const reasons: string[] = [];
  let urgency: Urgency = 'normal';

  const escalate = (level: Urgency, reason: string) => {
    if (level === 'critical') urgency = 'critical';
    else if (level === 'high' && urgency !== 'critical') urgency = 'high';
    reasons.push(reason);
  };

  if (signals.includes('threat_to_safety')) escalate('critical', 'The description contains a threat or a safety risk - contact emergency services now.');
  if (signals.includes('minor_involved')) escalate('critical', 'A minor is involved - platform and law-enforcement channels have a 24 hour duty of care.');
  if (signals.includes('intimate_content')) escalate('critical', 'Intimate content is being used to coerce you - takedown and legal support are time critical.');
  if (signals.includes('money_lost')) escalate('high', 'Money was moved. A freeze is only realistically possible if reported within 24 hours.');
  if (signals.includes('account_takeover')) escalate('high', 'Your account is under someone else\'s control - lock it before anything else.');
  if (signals.includes('address_exposed')) escalate('high', 'Your address is public - physical safety and relocation risk.');
  if (urgency === 'normal') reasons.push('No immediate risk to money, safety or identity was detected in the description.');

  return { urgency, reasons };
}

export function triage(text: string): TriageResult {
  // The model reads the semantics only; URLs, handles and numbers are pulled
  // out separately so they cannot change the labels.
  const prediction = classifier.predict(semanticText(text) || text);
  const entities = extractEntities(text);
  const { text: redactedText, redactions } = redact(text);

  const activeLabels = prediction.selected.length ? prediction.selected : [prediction.primaryLabel];

  const amount = detectAmountLost(text);
  const signals = detectHardSignals(text, activeLabels, amount, prediction.labels);
  const { urgency, reasons } = decideUrgency(signals);

  return {
    raw: text,
    redactedText,
    redactions,
    labels: prediction.labels,
    activeLabels,
    primaryLabel: prediction.primaryLabel,
    entities,
    urgency,
    urgencyReasons: reasons,
    needsReview: prediction.needsReview,
    hardSignals: signals,
  };
}

/** Human-readable one-liner for an incident type. */
export function describeLabel(label: IncidentLabel): string {
  return getIncidentType(label)?.blurb ?? '';
}
