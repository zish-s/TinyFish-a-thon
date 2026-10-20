import { describe, expect, it } from 'vitest';
import { IncidentClassifier } from '../src/ml/classifier.js';
import { TRAINING_DATA } from '../src/ml/dataset.js';
import { redact } from '../src/ml/redact.js';
import { extractEntities } from '../src/ml/entities.js';
import { buildPlan, buildNarrative } from '../src/planner.js';
import { triage } from '../src/triage.js';

const model = new IncidentClassifier(TRAINING_DATA);

describe('triage classifier', () => {
  it('detects impersonation combined with fraud', () => {
    const p = model.predict('Someone made a fake Instagram account with my photo and is asking my friends for money');
    expect(p.selected).toContain('impersonation');
    expect(p.selected).toContain('financial_fraud');
  });

  it('detects doxxing', () => {
    const p = model.predict('A website published my home address and phone number');
    expect(p.selected).toContain('doxxing');
  });

  it('always returns an explanation for the top label', () => {
    const p = model.predict('he keeps abusing me and threatening me on whatsapp');
    expect(p.labels[0].contributions.length).toBeGreaterThan(0);
  });

  it('trains on more than a hundred labelled examples', () => {
    expect(TRAINING_DATA.length).toBeGreaterThan(100);
  });
});

describe('entity extraction', () => {
  it('finds money, platform and url', () => {
    const e = extractEntities('A fake instagram account at https://instagram.com/fake took ₹5,000 from me');
    expect(e.find((x) => x.type === 'amount')?.value).toBe('5000');
    expect(e.find((x) => x.type === 'platform')?.value).toBe('Instagram');
    expect(e.find((x) => x.type === 'url')?.value).toContain('instagram.com');
  });
});

describe('redaction', () => {
  it('masks the phone number and keeps the story', () => {
    const { text, redactions } = redact('Call me on +91 98765 43210 about the fake account');
    expect(text).not.toContain('98765 43210');
    expect(text).toContain('[PHONE_1]');
    expect(redactions.length).toBeGreaterThan(0);
  });

  it('masks an aadhaar number', () => {
    const { text } = redact('my aadhaar 1234 5678 9012 is public');
    expect(text).not.toContain('1234 5678 9012');
  });
});

describe('triage + plan', () => {
  it('marks money loss as high urgency and plans the bank + fraud channels', () => {
    const t = triage('I sent 20000 rupees to a scammer UPI id and lost the money');
    expect(t.urgency).toBe('high');
    expect(t.hardSignals).toContain('money_lost');
    const plan = buildPlan(t, { name: 'Asha', email: 'a@b.com', phone: '+91 9000000000' }, 'IN');
    const ids = plan.channels.map((c) => c.id);
    expect(ids).toContain('bank_fraud');
    expect(ids).toContain('cybercrime_fraud');
  });

  it('flags a missing FIR as a blocking gap when money was lost', () => {
    const t = triage('I lost 5000 rupees to a payment scam');
    const plan = buildPlan(t, {}, 'IN');
    const gap = plan.gaps.find((g) => g.id === 'no_fir');
    expect(gap?.severity).toBe('blocker');
  });

  it('surfaces the emergency call when a threat is mentioned', () => {
    const t = triage('he is threatening to hurt me and follows me home');
    expect(t.urgency).toBe('critical');
    expect(t.hardSignals).toContain('threat_to_safety');
  });

  it('writes a narrative that includes the loss amount', () => {
    const t = triage('I lost 5000 rupees to a fake investment scheme');
    const n = buildNarrative(t, { name: 'Ravi' });
    expect(n).toContain('5000');
  });
});
