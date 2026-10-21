import { describe, expect, it } from 'vitest';
import { IncidentClassifier } from '../src/ml/classifier.js';
import { TRAINING_DATA } from '../src/ml/dataset.js';
import { redact } from '../src/ml/redact.js';
import { extractEntities } from '../src/ml/entities.js';
import { buildPlan, buildNarrative } from '../src/planner.js';
import { triage } from '../src/triage.js';
import {
  caseReference,
  deriveDetails,
  filingRows,
  missingParticulars,
  statementText,
} from '../src/casefile.js';
import { safeFileName, sniffType } from '../src/evidence.js';
import type { CaseFile } from '../src/types.js';

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

describe('the printable case file', () => {
  const incident = triage(
    'A fake Instagram account at https://instagram.com/rahul.finance.2024 is asking my friends to send me 500 rupees. It happened on 12/10/2026 at my flat in Pune.',
  );

  function aCase(overrides: Partial<CaseFile> = {}): CaseFile {
    const plan = buildPlan(incident, { name: 'Ishita Sharma', phone: '+91 98765 43210', city: 'Pune' }, 'IN');
    return {
      id: '11111111-2222-3333-4444-555555555555',
      createdAt: '2026-10-21T10:00:00.000Z',
      updatedAt: '2026-10-21T10:00:00.000Z',
      title: 'impersonation - instagram',
      incident,
      plan,
      evidence: [],
      status: 'triaged',
      country: 'IN',
      profile: { name: 'Ishita Sharma', phone: '+91 98765 43210', city: 'Pune' },
      ...overrides,
    };
  }

  it('pulls the handle, the platform and the amount out of the story', () => {
    const details = deriveDetails(incident, {});
    expect(details.suspect?.handles).toContain('rahul.finance.2024');
    expect(details.suspect?.platform).toBe('Instagram');
    expect(details.suspect?.urls?.[0]).toContain('instagram.com');
    expect(details.amount).toBe('500');
  });

  it('numbers the file the way an office would', () => {
    expect(caseReference(aCase())).toBe('RYN-2026-11111111');
  });

  it('writes a statement with the date, the place, the account and the amount', () => {
    const caseFile = aCase({
      details: {
        date: '2026-10-12',
        time: '21:40',
        place: 'Flat 402, Pune',
        mode: 'online',
        amount: '500',
        description: 'A fake account asked my friends for money.',
        suspect: { handles: ['rahul.finance.2024'], platform: 'Instagram' },
      },
    });
    const statement = statementText(caseFile);
    expect(statement).toContain('Ishita Sharma');
    expect(statement).toContain('12 October 2026');
    expect(statement).toContain('Flat 402, Pune');
    expect(statement).toContain('rahul.finance.2024');
    expect(statement).toContain('500');
  });

  it('lists every place the complaint has to be filed', () => {
    const caseFile = aCase();
    const rows = filingRows(caseFile);
    expect(rows.length).toBe(caseFile.plan.channels.length);
    expect(rows.every((r) => Boolean(r.name))).toBe(true);
  });

  it('says which particulars are still missing', () => {
    const missing = missingParticulars({}, { name: 'Ishita Sharma' });
    expect(missing).toContain('the date of the incident');
    expect(missing).toContain('the place where it happened');
    expect(missing).toContain('the account or handle used');
  });
});

describe('an uploaded file', () => {
  it('is identified by its bytes, not by what the sender claims', () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
    expect(sniffType(png)).toBe('image/png');
    expect(sniffType(Buffer.from('%PDF-1.7\n'))).toBe('application/pdf');
    expect(sniffType(Buffer.from('a plain note about the case'))).toBe('text/plain');
    // A file that says it is a PNG in its name, but is not one.
    expect(sniffType(Buffer.from('<html><script>alert(1)</script></html>'))).toBe('text/plain');
  });

  it('gets a file name that is safe to put in a header', () => {
    expect(safeFileName('my "shot".png')).toBe('my shot.png');
    expect(safeFileName('../../etc/passwd')).toBe('.._.._etc_passwd');
    expect(safeFileName('a\r\nX-Injected: 1')).toBe('aX-Injected_ 1');
    expect(safeFileName('')).toBe('evidence');
  });
});
