import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { safeFileName, sniffType } from '@reclaim/core';
import { config } from '../env.js';

/**
 * Storage for the files the reporter attaches to the case.
 *
 * The bytes never go into the case itself - the case travels with every
 * request, and a 4 MB screenshot in every request would be a problem. The
 * case only carries the file's SHA-256, and the bytes sit here, keyed by
 * that hash. The case file PDF then embeds whatever it can still find.
 *
 * In memory by default (the same rule the rest of the app follows: a report
 * is not written to a server-side store), with an optional disk copy when
 * RECLAIM_PERSIST=1 is set for local experiments.
 */

export interface StoredFile {
  hash: string;
  name: string;
  /** The type the bytes actually are. */
  type: string;
  /** The type the sender claimed, when it did not match. */
  declaredType?: string;
  size: number;
  data: Buffer;
}

const files = new Map<string, StoredFile>();
const persist = process.env.RECLAIM_PERSIST === '1';

function diskPath(hash: string): string {
  return path.join(config.dataDir, 'evidence', hash);
}

export function sha256(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

/**
 * What the bytes actually are.
 *
 * The Content-Type on an upload is a claim by whoever sent it, and any
 * client can claim anything. The file is identified from its own magic
 * bytes instead, so a file that says it is a PNG and is not one cannot
 * masquerade as an image in the case file or in the browser.
 */
export { safeFileName, sniffType };

/** Stores the bytes and returns the record of the file. */
export function putFile(name: string, type: string, data: Buffer): StoredFile {
  const hash = sha256(data);
  // The type is decided by the bytes, not by the sender's claim.
  const sniffed = sniffType(data);
  const file: StoredFile = {
    hash,
    name: safeFileName(name),
    type: sniffed,
    size: data.length,
    data,
  };
  files.set(hash, file);
  if (persist) {
    try {
      fs.mkdirSync(path.dirname(diskPath(hash)), { recursive: true });
      fs.writeFileSync(diskPath(hash), data);
    } catch {
      /* the memory copy is the one that matters */
    }
  }
  // The claim is kept beside the truth: a file that says it is a PNG and is
  // not one is worth writing down.
  if (type && type !== sniffed) file.declaredType = type;
  return file;
}

/** The bytes of a file, if this session still has them. */
export function getFile(hash: string): StoredFile | undefined {
  const hit = files.get(hash);
  if (hit) return hit;
  if (persist) {
    try {
      const data = fs.readFileSync(diskPath(hash));
      const file: StoredFile = { hash, name: hash, type: 'application/octet-stream', size: data.length, data };
      files.set(hash, file);
      return file;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

/** Forgets a file's bytes. The hash stays in the case, on purpose. */
export function dropFile(hash: string) {
  files.delete(hash);
  if (persist) {
    try {
      fs.rmSync(diskPath(hash), { force: true });
    } catch {
      /* nothing to clean up */
    }
  }
}
