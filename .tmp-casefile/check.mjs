/**
 * End-to-end check of the case file: create a report, fill in the
 * particulars, attach a screenshot, download the PDF.
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const BASE = process.env.BASE ?? 'http://localhost:4123';
const OUT = path.join(process.cwd(), '.tmp-casefile');
fs.mkdirSync(OUT, { recursive: true });

/** A real PNG, so the annexure has real bytes to embed. */
function makePng(width, height) {
  const crcTable = [];
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[n] = c >>> 0;
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (const byte of buf) c = crcTable[(c ^ byte) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const rowStart = y * (width * 3 + 1);
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const p = rowStart + 1 + x * 3;
      raw[p] = (x * 255) / width;
      raw[p + 1] = (y * 255) / height;
      raw[p + 2] = 160;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

async function main() {
  const created = await fetch(`${BASE}/api/cases`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text:
        'Someone made a fake Instagram account at https://instagram.com/rahul.finance.2024 using my photo and my college ID, and is asking my friends to send me 500 rupees as a gift. They also posted my phone number on the page.',
      profile: {
        name: 'Ishita Sharma',
        email: 'ishita@example.com',
        phone: '+91 98765 43210',
        address: 'Flat 402, Nehru Nagar, New Delhi 110033',
        city: 'New Delhi',
        state: 'Delhi',
        idType: 'Aadhaar',
        idNumber: 'XXXX XXXX 9012',
      },
      country: 'IN',
      details: {
        date: '2026-10-18',
        time: '21:40',
        place: 'Flat 402, Nehru Nagar, New Delhi (the messages came on my phone)',
        mode: 'online',
        amount: '500',
        frequency: '4 times since 15 October',
        ongoing: true,
        additional: 'I have the bank statement showing the payments my friends made.',
        suspect: {
          handles: ['rahul.finance.2024'],
          platform: 'Instagram',
          urls: ['https://instagram.com/rahul.finance.2024'],
          identifiers: '+91 90000 11111, rahul.finance@ybl',
          description: 'A man in his twenties. The profile claims to be a financial advisor.',
        },
      },
    }),
  });
  if (!created.ok) throw new Error(`create failed: ${created.status} ${await created.text()}`);
  let caseFile = await created.json();
  console.log('case', caseFile.id, '| channels:', caseFile.plan.channels.length);
  console.log('derived details:', JSON.stringify(caseFile.details));

  const form = new FormData();
  form.append('file', new Blob([makePng(320, 200)], { type: 'image/png' }), 'screenshot-of-profile.png');
  form.append('description', 'The fake profile asking my friends for money, with the timestamp');
  form.append('capturedAt', '2026-10-18');
  form.append('case', JSON.stringify(caseFile));
  const uploaded = await fetch(`${BASE}/api/cases/${caseFile.id}/evidence`, { method: 'POST', body: form });
  if (!uploaded.ok) throw new Error(`upload failed: ${uploaded.status} ${await uploaded.text()}`);
  const uploadBody = await uploaded.json();
  caseFile = uploadBody.caseFile;
  console.log('uploaded:', JSON.stringify(uploadBody.upload));

  const channel = caseFile.plan.channels[0];
  channel.status = 'submitted';
  channel.reference = 'NCR-2026-004321';
  channel.filedAt = new Date().toISOString();
  caseFile.evidence.push({
    id: 'e1',
    label: `${channel.name} - submission confirmation`,
    kind: 'reference',
    url: channel.url,
    content: 'Complaint registered. Reference: NCR-2026-004321',
    capturedAt: new Date().toISOString(),
    hash: 'a'.repeat(64),
    prevHash: 'GENESIS',
  });

  const pdf = await fetch(`${BASE}/api/casefile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: caseFile.id, case: caseFile }),
  });
  if (!pdf.ok) throw new Error(`pdf failed: ${pdf.status} ${await pdf.text()}`);
  const bytes = Buffer.from(await pdf.arrayBuffer());
  const file = path.join(OUT, 'casefile.pdf');
  fs.writeFileSync(file, bytes);
  console.log('pdf bytes:', bytes.length, '->', file);

  const fetched = await fetch(`${BASE}${uploadBody.upload.url}`);
  console.log('evidence file fetch:', fetched.status, fetched.headers.get('content-type'));
}

main().catch((err) => {
  console.error('FAILED', err);
  process.exit(1);
});
