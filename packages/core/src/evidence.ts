/**
 * Inspecting a file the reporter handed us.
 *
 * An upload arrives with a name and a Content-Type chosen by whoever sent
 * it, and both are claims rather than facts. These two helpers look at the
 * bytes themselves, so a file that says it is a screenshot and is not one
 * cannot end up being treated as a screenshot in the case file.
 */

/** The type the bytes actually are, decided from their magic number. */
export function sniffType(data: Buffer): string {
  const head = data.subarray(0, 32);
  const ascii = head.toString('latin1');
  if (head.length >= 8 && head.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png';
  }
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (ascii.startsWith('GIF87a') || ascii.startsWith('GIF89a')) return 'image/gif';
  if (head.length >= 12 && ascii.startsWith('RIFF') && head.subarray(8, 12).toString('latin1') === 'WEBP') {
    return 'image/webp';
  }
  if (ascii.startsWith('%PDF')) return 'application/pdf';
  if (head.length >= 12 && head.subarray(4, 8).toString('latin1') === 'ftyp') return 'video/mp4';
  if (head.length >= 4 && head[0] === 0x1a && head[1] === 0x45 && head[2] === 0xdf && head[3] === 0xa3) {
    return 'video/webm';
  }
  if (ascii.startsWith('OggS')) return 'audio/ogg';
  if (ascii.startsWith('PK')) return 'application/zip';
  if (head.length >= 12 && head.subarray(4, 8).toString('latin1') === 'moov') return 'video/quicktime';
  // Plain text: no null bytes, no control characters.
  const sample = data.subarray(0, 512);
  for (const byte of sample) {
    if (byte === 0) return 'application/octet-stream';
    if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) return 'application/octet-stream';
  }
  return 'text/plain';
}

/**
 * A file name that is safe to put in a header and safe to show.
 * The name came from the reporter's device, so it is treated as input.
 */
export function safeFileName(name: string): string {
  const cleaned = (name || 'evidence')
    .replace(/[\r\n"']/g, '')
    .replace(/[/\\]/g, '_')
    .replace(/[^\w.\- ]+/g, '_')
    .trim()
    .slice(0, 120);
  return cleaned || 'evidence';
}
