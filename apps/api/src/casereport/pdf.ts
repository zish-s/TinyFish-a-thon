import PDFDocument from 'pdfkit';
import type { CaseFile, MonitorBinding, UploadedEvidence } from '@reclaim/core';
import { caseReference, complaintTypes, filingRows, formatCaseDate, labelName, statementText } from '@reclaim/core';
import { getFile } from './uploads.js';

/**
 * The case file a bank, a cyber cell, a police station or a lawyer will
 * actually accept: a printable record of who is complaining, what happened,
 * when and where it happened, who was responsible, what evidence exists, and
 * where the complaint has already been filed.
 *
 * It is deliberately plain. It reads like an official document, it fits on
 * paper, and the machine's own reading of the story sits in an annexure at
 * the back rather than in the body of the record.
 */

const INK = '#111827';
const MUTED = '#6b7280';
const ACCENT = '#0b3d91';
const LINE = '#d1d5db';
const SOFT = '#f3f4f6';

const MARGIN = 46;

function ascii(input: string): string {
  return input
    .replace(/₹/g, 'INR ')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[^\x00-\x7F]/g, '.')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function fmtDate(value?: string): string {
  if (!value) return '';
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDateTime(value?: string): string {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return `${d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} ${d.toLocaleTimeString(
    'en-GB',
    { hour: '2-digit', minute: '2-digit' },
  )}`;
}

function fileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} bytes`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function renderCaseFile(caseFile: CaseFile, monitors: MonitorBinding[] = []): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: MARGIN,
      // Every page stays in memory until the end, so the footer can be
      // written on all of them once the page count is known.
      bufferPages: true,
      info: {
        Title: `Complaint case file ${caseReference(caseFile)}`,
        Subject: 'Complaint record for official submission',
        Author: 'ReclaimYourNet',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const width = () => doc.page.width - MARGIN * 2;
    const details = caseFile.details ?? {};
    const profile = caseFile.profile ?? {};
    const suspect = details.suspect ?? {};
    const ref = caseReference(caseFile);
    const uploads = (caseFile.uploads ?? []).filter((u) => !u.withdrawn);

    /* ------------------------------------------------------------- banner */
    doc.rect(0, 0, doc.page.width, 62).fill(ACCENT);
    doc.fillColor('#ffffff').fontSize(16).font('Helvetica-Bold').text('COMPLAINT CASE FILE', MARGIN, 20, {
      width: width(),
    });
    doc
      .fillColor('#dbeafe')
      .fontSize(8.5)
      .font('Helvetica')
      .text(
        `File reference ${ref}   |   Printed ${fmtDateTime(new Date().toISOString())}   |   Prepared with ReclaimYourNet`,
        MARGIN,
        40,
        { width: width() },
      );
    doc.y = 80;

    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This is a factual record prepared from the complainant\'s own account. It is meant to be printed and handed over to a police station, a cyber cell, a bank, a platform or a lawyer, alongside the original evidence.',
        MARGIN,
        doc.y,
        { width: width() },
      );
    doc.moveDown(0.8);

    /* -------------------------------------------------- A. complainant */
    part(doc, 'PART A', 'PARTICULARS OF THE COMPLAINANT');
    kv(doc, 'Name', profile.name, 'Mobile number', profile.phone);
    kv(doc, 'Email', profile.email, 'City', profile.city);
    kv(doc, 'Address', profile.address, 'State', profile.state);
    kv(doc, 'Identification', [profile.idType, profile.idNumber].filter(Boolean).join(' - '), 'Country', caseFile.country);
    doc.moveDown(0.4);

    /* --------------------------------------------------- B. particulars */
    part(doc, 'PART B', 'PARTICULARS OF THE INCIDENT');
    const types = complaintTypes(caseFile);
    const typeText =
      types.length > 4 ? `${types.slice(0, 4).join(', ')} and other related offences` : types.join(', ');
    kv(doc, 'Date of the incident', details.date ? formatCaseDate(details.date) : '', 'Time of the incident', details.time);
    kv(doc, 'Place where it happened', details.place, 'Manner', modeText(details.mode));
    kv(doc, 'Amount involved', details.amount, 'Still continuing', details.ongoing ? 'Yes' : 'No');
    kv(doc, 'How often', details.frequency, 'Complaint type', typeText);
    if (details.additional) {
      doc.moveDown(0.2);
      labelled(doc, 'Any other information furnished by the complainant', details.additional);
    }
    doc.moveDown(0.4);

    /* ------------------------------------------------ C. statement */
    part(doc, 'PART C', 'STATEMENT OF THE COMPLAINANT');
    paragraph(doc, statementText(caseFile));
    doc.moveDown(0.4);

    /* ------------------------------------------------- D. the account */
    part(doc, 'PART D', 'PARTICULARS OF THE PERSON / ACCOUNT RESPONSIBLE');
    const handleText = (suspect.handles ?? []).map((h) => `@${h}`).join(', ');
    kv(doc, 'Account / username', handleText || (suspect.handles ?? []).join(', '), 'Platform', suspect.platform);
    if (suspect.urls?.length) {
      doc.moveDown(0.2);
      labelled(doc, 'Profile / post link', suspect.urls.join('\n'));
    }
    if (suspect.identifiers) {
      doc.moveDown(0.2);
      labelled(doc, 'Other identifiers (phone, email, UPI, account number)', suspect.identifiers);
    }
    if (suspect.description) {
      doc.moveDown(0.2);
      labelled(doc, 'Description of the person', suspect.description);
    }
    if (!handleText && !suspect.platform && !suspect.urls?.length && !suspect.identifiers && !suspect.description) {
      doc
        .fillColor(MUTED)
        .fontSize(8.5)
        .font('Helvetica-Oblique')
        .text('Not known / not disclosed by the complainant at the time of printing.', MARGIN, doc.y, { width: width() });
      doc.moveDown(0.3);
    }
    doc.moveDown(0.4);

    /* ------------------------------------------------ E. the evidence */
    part(doc, 'PART E', 'EVIDENCE FURNISHED WITH THIS CASE FILE');
    if (!uploads.length) {
      doc
        .fillColor(MUTED)
        .fontSize(8.5)
        .font('Helvetica')
        .text(
          'No document is annexed with this case file. The complainant states that the original device and the original files are available for examination.',
          MARGIN,
          doc.y,
          { width: width() },
        );
      doc.moveDown(0.4);
    } else {
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(
          'Each item below is attached as an annexure to this case file. The SHA-256 value is the fingerprint of the file as it was given, so a forensic examiner can confirm that the file produced is the same file. Images are reproduced in this document; other files are attached electronically, with the same hash, and the originals are with the complainant.',
          MARGIN,
          doc.y,
          { width: width() },
        );
      doc.moveDown(0.5);

      const cols = [
        { title: 'Annexure', width: 58 },
        { title: 'What it shows', width: 168 },
        { title: 'File', width: 128 },
        { title: 'Captured', width: 78 },
      ];
      table(doc, cols, uploads.map((u, i) => [
        `A${i + 1}`,
        u.description || 'Not described',
        `${u.name}\n${u.type || 'file'} - ${fileSize(u.size)}${
          u.declaredType ? `\n(declared as ${u.declaredType})` : ''
        }`,
        u.capturedAt ? formatCaseDate(u.capturedAt) : 'Not stated',
      ]));
      doc.moveDown(0.4);
      for (const u of uploads) {
        doc
          .fillColor(MUTED)
          .fontSize(7)
          .font('Courier')
          .text(`sha256 ${u.hash}`, MARGIN, doc.y, { width: width() });
        doc.moveDown(0.15);
      }
      doc.moveDown(0.3);
    }

    const withdrawn = (caseFile.uploads ?? []).filter((u) => u.withdrawn);
    if (withdrawn.length) {
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Withdrawn by the complainant and therefore not annexed: ${withdrawn
            .map((u) => `${u.name} (sha256 ${u.hash.slice(0, 16)}...)`)
            .join('; ')}. The record of them is kept in Part G.`,
          MARGIN,
          doc.y,
          { width: width() },
        );
      doc.moveDown(0.3);
    }

    /* ---------------------------------------------- F. where it was filed */
    part(doc, 'PART F', 'DETAILS OF THE COMPLAINTS FILED');
    const rows = filingRows(caseFile);
    const filed = rows.filter((r) => r.status === 'submitted');
    const pending = rows.filter((r) => r.status !== 'submitted');
    if (filed.length) {
      doc
        .fillColor(INK)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Already filed - acknowledgement details', MARGIN, doc.y, { width: width() });
      doc.moveDown(0.3);
      table(
        doc,
        [
          { title: '#', width: 22 },
          { title: 'Complaint filed at', width: 148 },
          { title: 'Date filed', width: 74 },
          { title: 'Reference / acknowledgement no.', width: 138 },
          { title: 'Status', width: 50 },
        ],
        filed.map((r, i) => [
          String(i + 1),
          r.name,
          r.filedAt ? formatCaseDate(r.filedAt) : 'Not recorded',
          r.reference || 'Awaited',
          'FILED',
        ]),
      );
      doc.moveDown(0.5);
    }
    if (pending.length) {
      doc
        .fillColor(INK)
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('Identified but not yet filed / to be filed by the complainant', MARGIN, doc.y, { width: width() });
      doc.moveDown(0.3);
      table(
        doc,
        [
          { title: '#', width: 22 },
          { title: 'Where it has to be filed', width: 148 },
          { title: 'Status', width: 74 },
          { title: 'Reason it applies', width: 188 },
        ],
        pending.map((r, i) => [
          String(filed.length + i + 1),
          r.name,
          statusText(r.status),
          r.why || '',
        ]),
      );
      doc.moveDown(0.4);
    }
    if (!rows.length) {
      doc.fillColor(MUTED).fontSize(8.5).font('Helvetica').text('No filing has been attempted yet.', MARGIN, doc.y, {
        width: width(),
      });
      doc.moveDown(0.4);
    }

    /* ------------------------------------------- G. evidence collected */
    part(doc, 'PART G', 'RECORD OF WHAT WAS COLLECTED DURING FILING');
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'Every page read and every reference number obtained while the complaint was being filed is recorded below, each entry carrying the fingerprint of the one before it.',
        MARGIN,
        doc.y,
        { width: width() },
      );
    doc.moveDown(0.5);
    if (!caseFile.evidence.length) {
      doc.fillColor(MUTED).fontSize(8.5).font('Helvetica').text('Nothing collected yet.', MARGIN, doc.y, { width: width() });
      doc.moveDown(0.3);
    } else {
      table(
        doc,
        [
          { title: '#', width: 22 },
          { title: 'Artefact', width: 186 },
          { title: 'Type', width: 62 },
          { title: 'Captured at', width: 78 },
          { title: 'SHA-256', width: 84 },
        ],
        caseFile.evidence.map((item, i) => [
          String(i + 1),
          item.label,
          item.kind.replace(/_/g, ' '),
          fmtDateTime(item.capturedAt),
          `${item.hash.slice(0, 16)}\n${item.hash.slice(16)}`,
        ]),
        { fontSize: 7 },
      );
      doc.moveDown(0.4);
    }

    /* ---------------------------------------------- H. follow-up watches */
    if (monitors.length) {
      part(doc, 'PART H', 'FOLLOW-UP CHECKS ON THE REPORTED PAGES');
      for (const m of monitors) {
        doc
          .fillColor(INK)
          .fontSize(8.5)
          .font('Helvetica-Bold')
          .text(`${m.channelName} - ${m.type} check on ${m.target}`, MARGIN, doc.y, { width: width() });
        doc.moveDown(0.15);
        doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(m.purpose, MARGIN, doc.y, { width: width() });
        doc.moveDown(0.35);
      }
      doc.moveDown(0.2);
    }

    /* ----------------------------------------------- I. the declaration */
    part(doc, 'PART I', 'DECLARATION BY THE COMPLAINANT');
    paragraph(
      doc,
      'I declare that the particulars given in Parts A to H of this case file are true to the best of my knowledge and belief, and that the documents annexed under Part E are true copies of the material in my possession. I understand that this document has been prepared with the help of an automated assistant (ReclaimYourNet), which read the official complaint forms and recorded the acknowledgements it received; the substance of this complaint is my own. I am available to appear before any authority, to give a statement, and to produce the original device and the original files on demand.',
    );
    doc.moveDown(0.6);

    const sigY = doc.y;
    const half = (width() - 24) / 2;
    signatureBlock(doc, MARGIN, sigY, half, 'Signature of the complainant');
    signatureBlock(doc, MARGIN + half + 24, sigY, half, 'Witness / parent / guardian (if applicable)');
    doc.y = sigY + 54;
    const lineY = doc.y;
    doc
      .fillColor(INK)
      .fontSize(8.5)
      .font('Helvetica')
      .text(`Place: ______________________________`, MARGIN, lineY, { width: half });
    doc
      .fillColor(INK)
      .fontSize(8.5)
      .font('Helvetica')
      .text(`Date: ______________________________`, MARGIN + half + 24, lineY, { width: half });
    doc.y = lineY + 16;
    doc.moveDown(0.8);

    doc
      .fillColor(MUTED)
      .fontSize(7.5)
      .font('Helvetica')
      .text(
        'Produced by ReclaimYourNet. The filing details in Part F were collected live from the official portals and submitted by an automated web agent; the complainant reviewed every field before submission. This document is a factual record and not legal advice. The hash chain in Part G is verifiable: each entry hashes the entry before it, so any alteration invalidates every entry that follows it.',
        MARGIN,
        doc.y,
        { width: width() },
      );

    /* -------------------------------------------- the annexure images */
    const printable = uploads.filter((u) => {
      const file = getFile(u.hash);
      return Boolean(file && file.type.startsWith('image/'));
    });
    if (printable.length) {
      doc.addPage();
      part(doc, 'ANNEXURE I', 'PHOTOCOPIES OF THE EVIDENCE FURNISHED');
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(
          'The pages that follow are reproductions of the files listed under Part E. The originals are with the complainant.',
          MARGIN,
          doc.y,
          { width: width() },
        );
      doc.moveDown(0.4);
      embedUploads(doc, printable);
    }

    /* ------------------------------------- the machine's own reading */
    doc.addPage();
    part(doc, 'ANNEXURE II', 'AUTOMATED CLASSIFICATION (FOR INTERNAL REFERENCE)');
    doc
      .fillColor(MUTED)
      .fontSize(8)
      .font('Helvetica')
      .text(
        'This annexure is not part of the complaint. It records how the software read the description, so that the assistance given can be reviewed. The complaint stands on Parts A to I.',
        MARGIN,
        doc.y,
        { width: width() },
      );
    doc.moveDown(0.6);
    for (const l of caseFile.incident.labels.slice(0, 5)) {
      const y = doc.y;
      const filled = Math.round(l.probability * 100);
      doc.fillColor(INK).fontSize(9).font('Helvetica-Bold').text(labelName(l.label), MARGIN, y, { width: 200 });
      doc.rect(MARGIN + 200, y + 1, 150, 8).fill(SOFT);
      doc.rect(MARGIN + 200, y + 1, Math.max(2, 150 * l.probability), 8).fill(l.probability >= 0.5 ? ACCENT : '#cbd5e1');
      doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`${filled}%`, MARGIN + 356, y, { width: 50 });
      const tokens = l.contributions
        .filter((c) => c.weight > 0)
        .slice(0, 4)
        .map((c) => c.token)
        .join(', ');
      doc.fillColor(MUTED).fontSize(7.5).font('Helvetica').text(tokens ? `evidence: ${tokens}` : '', MARGIN + 410, y, {
        width: width() - 410,
      });
      doc.moveDown(0.5);
    }
    doc.moveDown(0.3);
    doc
      .fillColor(INK)
      .fontSize(9)
      .font('Helvetica')
      .text(`Urgency assessed: ${caseFile.incident.urgency.toUpperCase()}`, MARGIN, doc.y);
    for (const reason of caseFile.incident.urgencyReasons) {
      doc.fillColor(MUTED).fontSize(8.5).font('Helvetica').text(`- ${ascii(reason)}`, MARGIN + 10, doc.y, {
        width: width() - 10,
      });
      doc.moveDown(0.2);
    }
    if (caseFile.incident.redactions.length) {
      doc
        .fillColor(MUTED)
        .fontSize(8)
        .font('Helvetica')
        .text(
          `Sensitive values masked in the automated summary: ${caseFile.incident.redactions.map((r) => r.placeholder).join(', ')}`,
          MARGIN,
          doc.y + 4,
          { width: width() },
        );
      doc.moveDown(0.6);
    }

    /* ------------------------------------------------------- page footers */
    addFooters(doc, ref);

    doc.end();
  });
}

/* ------------------------------------------------------------------ pieces */

function modeText(mode?: string): string {
  if (mode === 'online') return 'Committed online';
  if (mode === 'offline') return 'Committed in person';
  if (mode === 'both') return 'Committed online and in person';
  return '';
}

function statusText(status: string): string {
  switch (status) {
    case 'ready':
      return 'Ready to file';
    case 'analysed':
      return 'Form read';
    case 'planned':
      return 'Not started';
    case 'manual':
      return 'To be filed by complainant';
    case 'failed':
      return 'Attempt failed';
    case 'skipped':
      return 'Declined';
    default:
      return status;
  }
}

/** A part heading: "PART A - PARTICULARS OF THE COMPLAINANT". */
function part(doc: PDFKit.PDFDocument, code: string, title: string) {
  const w = doc.page.width - MARGIN * 2;
  ensure(doc, 44);
  const y = doc.y;
  doc.rect(MARGIN, y, w, 20).fill(SOFT);
  doc.fillColor(ACCENT).fontSize(9).font('Helvetica-Bold').text(code, MARGIN + 6, y + 6, { width: 90 });
  doc.fillColor(INK).fontSize(9.5).font('Helvetica-Bold').text(ascii(title), MARGIN + 96, y + 5.5, { width: w - 102 });
  doc.y = y + 26;
}

/** A label and its value, one per line, with a value that may be empty. */
function labelled(doc: PDFKit.PDFDocument, label: string, value?: string) {
  const w = doc.page.width - MARGIN * 2;
  ensure(doc, 26);
  doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`${label}:`, MARGIN, doc.y, { width: w });
  doc.moveDown(0.1);
  doc.fillColor(INK).fontSize(9).font('Helvetica').text(ascii(value || 'Not stated'), MARGIN + 10, doc.y, { width: w - 10 });
  doc.moveDown(0.25);
}

/** Two label/value pairs on one line. */
function kv(
  doc: PDFKit.PDFDocument,
  labelA: string,
  valueA?: string,
  labelB?: string,
  valueB?: string,
) {
  const w = doc.page.width - MARGIN * 2;
  const half = w / 2;
  const textA = ascii(valueA || 'Not stated');
  const textB = ascii(valueB || 'Not stated');
  const valueHeight = Math.max(
    doc.font('Helvetica').fontSize(9).heightOfString(textA, { width: half - 12 }),
    doc.font('Helvetica').fontSize(9).heightOfString(textB, { width: half - 12 }),
  );
  ensure(doc, 16 + valueHeight + 8);
  const y = doc.y;
  const col = (label: string, value: string, x: number) => {
    doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(`${label}:`, x, y, { width: half - 12 });
    doc.fillColor(INK).fontSize(9).font('Helvetica').text(value, x, y + 11, { width: half - 12 });
  };
  col(labelA, textA, MARGIN);
  if (labelB) col(labelB, textB, MARGIN + half);
  doc.y = y + 11 + valueHeight + 5;
}

/** A paragraph of body text. */
function paragraph(doc: PDFKit.PDFDocument, text: string) {
  const w = doc.page.width - MARGIN * 2;
  const clean = ascii(text);
  ensure(doc, 40);
  doc.fillColor(INK).fontSize(9.5).font('Helvetica').text(clean, MARGIN, doc.y, { width: w, align: 'left' });
  doc.moveDown(0.5);
}

function signatureBlock(doc: PDFKit.PDFDocument, x: number, y: number, w: number, caption: string) {
  const keep = doc.y;
  doc.moveTo(x, y + 34).lineTo(x + w, y + 34).strokeColor(INK).lineWidth(0.7).stroke();
  doc.fillColor(MUTED).fontSize(8).font('Helvetica').text(caption, x, y + 38, { width: w });
  doc.y = keep;
}

interface Column {
  title: string;
  width: number;
}

/** A simple ruled table. Cell text wraps; row heights follow the tallest cell. */
function table(doc: PDFKit.PDFDocument, columns: Column[], rows: string[][], opts: { fontSize?: number } = {}) {
  const fontSize = opts.fontSize ?? 7.5;
  const pad = 4;
  const total = columns.reduce((sum, c) => sum + c.width, 0);

  // header
  ensure(doc, 22);
  const hy = doc.y;
  doc.rect(MARGIN, hy, total, 16).fill(SOFT);
  let hx = MARGIN;
  for (const c of columns) {
    doc.fillColor(INK).fontSize(7.5).font('Helvetica-Bold').text(c.title, hx + pad, hy + 5, {
      width: c.width - pad * 2,
    });
    hx += c.width;
  }
  doc.y = hy + 16;

  for (const row of rows) {
    const heights = columns.map((c, i) =>
      doc
        .font('Helvetica')
        .fontSize(fontSize)
        .heightOfString(row[i] ?? '', { width: c.width - pad * 2 }),
    );
    const rowHeight = Math.max(14, Math.max(...heights) + pad * 2);
    ensure(doc, rowHeight + 4);
    const y = doc.y;
    let x = MARGIN;
    columns.forEach((c, i) => {
      doc
        .fillColor(INK)
        .font('Helvetica')
        .fontSize(fontSize)
        .text(row[i] ?? '', x + pad, y + pad, { width: c.width - pad * 2 });
      x += c.width;
      if (i < columns.length - 1) {
        doc.moveTo(x, y).lineTo(x, y + rowHeight).strokeColor(LINE).lineWidth(0.4).stroke();
      }
    });
    doc.y = y + rowHeight;
    doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + total, doc.y).strokeColor(LINE).lineWidth(0.4).stroke();
  }
}

/** Adds a page when the remaining space is too small for what comes next. */
function ensure(doc: PDFKit.PDFDocument, needed: number) {
  if (doc.y + needed > doc.page.height - 56) doc.addPage();
}

/**
 * Puts the screenshots into the PDF as annexure pages, one per image.
 * Files this session no longer holds are left to the list in Part E, where
 * their hash is still on the record.
 */
function embedUploads(doc: PDFKit.PDFDocument, uploads: UploadedEvidence[]) {
  for (const upload of uploads) {
    const file = getFile(upload.hash);
    if (!file || !file.type.startsWith('image/')) continue;
    try {
      doc.addPage();
      const maxW = doc.page.width - MARGIN * 2;
      const maxH = doc.page.height - 120;
      const y = doc.y;
      doc
        .fillColor(INK)
        .fontSize(9)
        .font('Helvetica-Bold')
        .text(`${upload.name} - ${upload.description || 'evidence furnished by the complainant'}`, MARGIN, y, {
          width: maxW,
        });
      doc.moveDown(0.2);
      doc
        .fillColor(MUTED)
        .fontSize(7.5)
        .font('Courier')
        .text(`sha256 ${upload.hash}`, MARGIN, doc.y, { width: maxW });
      doc.moveDown(0.4);
      const imgY = doc.y;
      doc.image(file.data, MARGIN, imgY, { fit: [maxW, maxH], align: 'center', valign: 'center' });      doc.y = imgY + maxH;
    } catch {
      /* an unreadable image is skipped; its hash is still on the record */
    }
  }
}

/** Footer on every page: the reference and the page number. */
function addFooters(doc: PDFKit.PDFDocument, ref: string) {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    const w = doc.page.width - MARGIN * 2;
    doc
      .moveTo(MARGIN, doc.page.height - 46)
      .lineTo(MARGIN + w, doc.page.height - 46)
      .strokeColor(LINE)
      .lineWidth(0.5)
      .stroke();
    // The footer sits below the text area, so the bottom margin is lifted
    // for the moment it is written - otherwise PDFKit would break the page
    // and start a new one for the footer alone.
    const bottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc
      .fillColor(MUTED)
      .fontSize(7)
      .font('Helvetica')
      .text(
        `Case file ${ref}   |   Page ${i - range.start + 1} of ${range.count}   |   Prepared by ReclaimYourNet`,
        MARGIN,
        doc.page.height - 40,
        { width: w, align: 'center' },
      );
    doc.page.margins.bottom = bottom;
  }
  doc.switchToPage(range.start + range.count - 1);
}
