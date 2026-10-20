import PDFDocument from 'pdfkit';
import type { CaseFile, MonitorBinding } from '@reclaim/core';
import { labelName } from '@reclaim/core';

function ascii(input: string): string {
  return input
    .replace(/₹/g, 'INR ')
    .replace(/[^\x00-\x7F]/g, (c) => (c === '\n' ? ' ' : '.'))
    .replace(/\s+/g, ' ')
    .trim();
}

const INK = '#0f172a';
const MUTED = '#64748b';
const ACCENT = '#0d9488';
const LINE = '#e2e8f0';

/**
 * The "case file" a bank, a cyber cell or a lawyer will actually accept:
 * what happened, when, which channels were used, what references came back,
 * and a tamper-evident hash chain over every piece of evidence.
 */
export function renderCaseFile(caseFile: CaseFile, monitors: MonitorBinding[] = []): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 48, info: { Title: `ReclaimYourNet case file ${caseFile.id}` } });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = doc.page.width - 96;
    const incident = caseFile.incident;

    // ---------------------------------------------------------------- header
    doc.rect(0, 0, doc.page.width, 8).fill(ACCENT);
    doc.fillColor(INK).fontSize(10).font('Helvetica-Bold').text('ReclaimYourNet  /  CASE FILE', 48, 48, { characterSpacing: 1.2 });
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica')
      .text(`Generated ${new Date().toISOString()}  |  Case ${caseFile.id}`, 48, 64);
    doc.moveDown(1.4);

    doc.fillColor(INK).fontSize(19).font('Helvetica-Bold').text(ascii(caseFile.title), 48, doc.y, { width: pageWidth });
    doc.moveDown(0.4);
    doc
      .fillColor(MUTED)
      .fontSize(9)
      .font('Helvetica')
      .text(
        `Jurisdiction: ${caseFile.country}   |   Status: ${caseFile.status}   |   Channels: ${caseFile.plan.channels.length}   |   Estimated handling time: ${caseFile.plan.estimatedMinutes} min`,
        48,
        doc.y,
        { width: pageWidth },
      );
    doc.moveDown(1.2);

    // ------------------------------------------------------------- incident
    section(doc, '1. Incident narrative');
    doc.fillColor(INK).fontSize(9.5).font('Helvetica').text(ascii(incident.raw), 48, doc.y, { width: pageWidth, align: 'left' });
    doc.moveDown(1);

    section(doc, '2. Machine triage (explainable)');
    for (const l of incident.labels.slice(0, 5)) {
      const y = doc.y;
      const filled = Math.round(l.probability * 100);
      doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(labelName(l.label), 48, y, { width: 200 });
      doc.rect(250, y + 1, 160, 8).fill('#f1f5f9');
      doc.rect(250, y + 1, Math.max(2, (160 * l.probability)), 8).fill(l.probability >= 0.5 ? ACCENT : '#cbd5e1');
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`${filled}%`, 416, y, { width: 50 });
      const tokens = l.contributions
        .filter((c) => c.weight > 0)
        .slice(0, 4)
        .map((c) => c.token)
        .join(', ');
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(tokens ? `evidence: ${tokens}` : '', 470, y, { width: pageWidth - 422 });
      doc.moveDown(0.55);
    }
    doc.moveDown(0.4);
    doc
      .fillColor(INK)
      .fontSize(9)
      .font('Helvetica')
      .text(`Urgency: ${incident.urgency.toUpperCase()}`, 48, doc.y);
    for (const reason of incident.urgencyReasons) {
      doc.fillColor(MUTED).fontSize(8.5).font('Helvetica').text(`- ${ascii(reason)}`, 58, doc.y, { width: pageWidth - 10 });
      doc.moveDown(0.2);
    }
    if (incident.redactions.length) {
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Sensitive values masked in this summary: ${incident.redactions.map((r) => r.placeholder).join(', ')}`,
          48,
          doc.y + 4,
          { width: pageWidth },
        );
      doc.moveDown(0.6);
    }

    // ------------------------------------------------------------- channels
    doc.addPage();
    section(doc, '3. Where this was reported');
    doc.moveDown(0.4);
    for (const channel of caseFile.plan.channels) {
      const y = doc.y;
      doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(channel.name, 48, y, { width: 250 });
      doc
        .fillColor(statusColour(channel.status))
        .fontSize(8)
        .font('Helvetica-Bold')
        .text(channel.status.toUpperCase(), 300, y, { width: 90 });
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(ascii(channel.url).slice(0, 90), 390, y, { width: pageWidth - 342 });
      doc.moveDown(0.25);
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(ascii(channel.why), 58, doc.y, { width: pageWidth - 10 });
      if (channel.reference) {
        doc.moveDown(0.15);
        doc
          .fillColor(INK)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`Reference: ${ascii(channel.reference)}`, 58, doc.y);
      }
      if (channel.error) {
        doc.moveDown(0.15);
        doc.fillColor('#b91c1c').fontSize(8).font('Helvetica').text(`Outstanding: ${ascii(channel.error)}`, 58, doc.y);
      }
      doc.moveDown(0.55);
      doc.moveTo(48, doc.y).lineTo(48 + pageWidth, doc.y).strokeColor(LINE).lineWidth(0.5).stroke();
      doc.moveDown(0.5);
    }

    // -------------------------------------------------------------- evidence
    doc.moveDown(0.5);
    section(doc, '4. Evidence chain (SHA-256, tamper-evident)');
    doc.moveDown(0.3);
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(
      'Each record hashes the previous record\'s hash, so removing or editing a single artefact invalidates every hash that follows it.',
      48,
      doc.y,
      { width: pageWidth },
    );
    doc.moveDown(0.6);
    for (const item of caseFile.evidence) {
      const y = doc.y;
      doc.fillColor(INK).fontSize(8.5).font('Helvetica-Bold').text(ascii(item.label), 48, y, { width: pageWidth });
      doc.moveDown(0.15);
      doc
        .fillColor(MUTED)
        .fontSize(7.5)
        .font('Courier')
        .text(`sha256 ${item.hash}`, 58, doc.y, { width: pageWidth - 10 });
      doc.moveDown(0.1);
      doc.fillColor(MUTED).fontSize(7.5).font('Courier').text(`prev   ${item.prevHash}`, 58, doc.y, { width: pageWidth - 10 });
      doc.moveDown(0.15);
      doc
        .fillColor(MUTED)
        .fontSize(7.5)
        .font('Helvetica')
        .text(`${item.kind} - captured ${item.capturedAt}${item.url ? ` - ${ascii(item.url).slice(0, 70)}` : ''}`, 58, doc.y, {
          width: pageWidth - 10,
        });
      doc.moveDown(0.5);
    }

    // ------------------------------------------------------------- monitors
    if (monitors.length) {
      doc.moveDown(0.4);
      section(doc, '5. Follow-up monitoring');
      doc.moveDown(0.3);
      for (const m of monitors) {
        doc
          .fillColor(INK)
          .fontSize(8.5)
          .font('Helvetica')
          .text(
            `${m.channelName} - ${m.type} monitor on ${ascii(m.target).slice(0, 60)} (${m.status})`,
            48,
            doc.y,
            { width: pageWidth },
          );
        doc.moveDown(0.15);
        doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(ascii(m.purpose), 58, doc.y, { width: pageWidth - 10 });
        doc.moveDown(0.4);
      }
    }

    doc.moveDown(1);
    doc
      .fillColor(MUTED)
      .fontSize(7.5)
      .font('Helvetica')
      .text(
        'Produced by ReclaimYourNet. Filing details were collected live from official portals and submitted by an automated web agent; the complainant reviewed every field before submission. This document is a factual record, not legal advice.',
        48,
        doc.y,
        { width: pageWidth },
      );

    doc.end();
  });
}

function section(doc: PDFKit.PDFDocument, title: string) {
  doc.fillColor(ACCENT).fontSize(11).font('Helvetica-Bold').text(title, 48, doc.y);
  doc.moveDown(0.3);
  doc.moveTo(48, doc.y).lineTo(48 + (doc.page.width - 96), doc.y).strokeColor(LINE).lineWidth(1).stroke();
  doc.moveDown(0.4);
}

function statusColour(status: string): string {
  switch (status) {
    case 'submitted':
      return '#15803d';
    case 'ready':
    case 'analysed':
      return '#0369a1';
    case 'failed':
      return '#b91c1c';
    case 'skipped':
      return '#64748b';
    default:
      return '#475569';
  }
}
