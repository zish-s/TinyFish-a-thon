import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { config } from './env.js';
import type { CaseFile, EvidenceItem, MonitorBinding } from '@reclaim/core';

/**
 * Storage.
 *
 * SQLite is used when it is available and writable (local development, a VPS,
 * a container). On serverless platforms the filesystem is read-only outside
 * /tmp and `node:sqlite` may not exist, so the store falls back to an
 * in-memory mirror. Cases are short-lived by nature - a case lives for days,
 * not years - so the fallback costs the product nothing.
 */

const require_ = createRequire(import.meta.url);
type DatabaseSync = {
  exec: (sql: string) => void;
  prepare: (sql: string) => {
    run: (...args: unknown[]) => unknown;
    get: (...args: unknown[]) => unknown;
    all: (...args: unknown[]) => unknown[];
  };
  close: () => void;
};

let db: DatabaseSync | null = null;
export let storageMode: 'sqlite' | 'memory' = 'memory';

/**
 * A report is never written to a server-side store. The SQLite file is a
 * developer-only convenience for local experiments and is off unless
 * RECLAIM_PERSIST=1 is set - it is never set on a deployment.
 */
const persist = process.env.RECLAIM_PERSIST === '1';

if (persist) {
  try {
    fs.mkdirSync(config.dataDir, { recursive: true });
    const { DatabaseSync: Sqlite } = require_('node:sqlite') as { DatabaseSync: new (file: string) => DatabaseSync };
    db = new Sqlite(path.join(config.dataDir, 'ReclaimYourNet.db'));
    db.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS cases (
      id          TEXT PRIMARY KEY,
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL,
      country     TEXT NOT NULL,
      status      TEXT NOT NULL,
      title       TEXT NOT NULL,
      data        TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS evidence (
      id          TEXT PRIMARY KEY,
      case_id     TEXT NOT NULL,
      label       TEXT NOT NULL,
      kind        TEXT NOT NULL,
      url         TEXT,
      content     TEXT,
      captured_at TEXT NOT NULL,
      hash        TEXT NOT NULL,
      prev_hash   TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS monitors (
      id          TEXT PRIMARY KEY,
      case_id     TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      channel_name TEXT NOT NULL,
      type        TEXT NOT NULL,
      target      TEXT NOT NULL,
      purpose     TEXT NOT NULL,
      status      TEXT NOT NULL,
      last_outcome TEXT,
      created_at  TEXT NOT NULL
    );
  `);
    storageMode = 'sqlite';
  } catch {
    db = null;
    storageMode = 'memory';
  }
}

/**
 * Cases are held in memory and mirrored to SQLite. The in-memory object is
 * the single source of truth while a case is being worked on, so an agent run
 * can mutate a channel and have the change persist and be broadcast.
 */
const cache = new Map<string, CaseFile>();
const monitorCache = new Map<string, MonitorBinding[]>();
/** Cases the person asked us never to keep. They live in memory only. */
const ephemeral = new Set<string>();

export function insertCase(caseFile: CaseFile, keep: boolean) {
  const now = new Date().toISOString();
  if (!keep) ephemeral.add(caseFile.id);
  else
    db?.prepare(
      `INSERT INTO cases (id, created_at, updated_at, country, status, title, data)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      caseFile.id,
      caseFile.createdAt,
      now,
      caseFile.country,
      caseFile.status,
      caseFile.title,
      JSON.stringify(caseFile),
    );
  cache.set(caseFile.id, caseFile);
}

export function deleteCase(id: string) {
  ephemeral.delete(id);
  cache.delete(id);
  monitorCache.delete(id);
  db?.prepare(`DELETE FROM cases WHERE id = ?`).run(id);
  db?.prepare(`DELETE FROM evidence WHERE case_id = ?`).run(id);
  db?.prepare(`DELETE FROM monitors WHERE case_id = ?`).run(id);
  return { deleted: true };
}

export function isEphemeral(id: string): boolean {
  return ephemeral.has(id);
}

export function updateCase(caseFile: CaseFile) {
  const now = new Date().toISOString();
  caseFile.updatedAt = now;
  if (!ephemeral.has(caseFile.id)) {
    db?.prepare(`UPDATE cases SET updated_at = ?, status = ?, title = ?, data = ? WHERE id = ?`).run(
      now,
      caseFile.status,
      caseFile.title,
      JSON.stringify(caseFile),
      caseFile.id,
    );
  }
  cache.set(caseFile.id, caseFile);
}

export function getCase(id: string): CaseFile | null {
  const cached = cache.get(id);
  if (cached) return cached;
  if (!db) return null;
  const row = db.prepare(`SELECT data FROM cases WHERE id = ?`).get(id) as { data: string } | undefined;
  if (!row) return null;
  const parsed = JSON.parse(row.data) as CaseFile;
  cache.set(id, parsed);
  return parsed;
}

export function listCases(limit = 50): Array<{ id: string; title: string; status: string; createdAt: string; country: string }> {
  if (!db) {
    return [...cache.values()]
      .filter((c) => !ephemeral.has(c.id))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit)
      .map((c) => ({ id: c.id, title: c.title, status: c.status, createdAt: c.createdAt, country: c.country }));
  }
  const rows = db
    .prepare(`SELECT id, title, status, created_at, country FROM cases ORDER BY created_at DESC LIMIT ?`)
    .all(limit) as Array<{ id: string; title: string; status: string; created_at: string; country: string }>;
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    status: r.status,
    createdAt: r.created_at,
    country: r.country,
  }));
}

export function insertEvidence(caseId: string, item: EvidenceItem) {
  if (ephemeral.has(caseId)) return;
  db?.prepare(
    `INSERT INTO evidence (id, case_id, label, kind, url, content, captured_at, hash, prev_hash)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    item.id,
    caseId,
    item.label,
    item.kind,
    item.url ?? null,
    item.content ?? null,
    item.capturedAt,
    item.hash,
    item.prevHash,
  );
}

export function insertMonitor(caseId: string, m: MonitorBinding) {
  const list = monitorCache.get(caseId) ?? [];
  monitorCache.set(caseId, [...list.filter((x) => x.id !== m.id), m]);
  if (ephemeral.has(caseId)) return;
  db?.prepare(
    `INSERT OR REPLACE INTO monitors (id, case_id, channel_id, channel_name, type, target, purpose, status, last_outcome, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    m.id,
    caseId,
    m.channelId,
    m.channelName,
    m.type,
    m.target,
    m.purpose,
    m.status,
    m.lastOutcome ?? null,
    m.createdAt,
  );
}

export function listMonitors(caseId: string): MonitorBinding[] {
  if (!db) return monitorCache.get(caseId) ?? [];
  const rows = db.prepare(`SELECT * FROM monitors WHERE case_id = ? ORDER BY created_at ASC`).all(caseId) as Array<
    Record<string, string | null>
  >;
  return rows.map((r) => ({
    id: r.id as string,
    channelId: r.channel_id as string,
    channelName: r.channel_name as string,
    type: r.type as 'page' | 'topic',
    target: r.target as string,
    purpose: r.purpose as string,
    status: r.status as string,
    lastOutcome: (r.last_outcome as string) ?? undefined,
    createdAt: r.created_at as string,
  }));
}
