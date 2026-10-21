import path from 'node:path';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(here, '..', '..', '..');

function loadEnvFile() {
  const candidates = [
    path.join(ROOT, '.env'),
    path.join(ROOT, 'apps', 'api', '.env'),
    path.join(process.cwd(), '.env'),
  ];
  for (const file of candidates) {
    try {
      // A UTF-8 BOM on the first line would hide the first key, and the API
      // would quietly start without the TinyFish key. Strip it.
      const raw = readFileSync(file, 'utf8').replace(/^\uFEFF/, '');
      const parsed = parseEnv(raw);
      for (const [k, v] of Object.entries(parsed)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }
      return file;
    } catch {
      /* try next */
    }
  }
  return null;
}

/** The dotenv format: KEY=value, `#` comments, optional quotes. */
function parseEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export const ENV_FILE = loadEnvFile();

export const config = {
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:5173',
  tinyfishKey: process.env.TINYFISH_API_KEY ?? '',
  /** Public base URL of THIS server, as seen by the TinyFish remote browser. */
  publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? 'http://localhost:4000').replace(/\/$/, ''),
  dataDir: path.isAbsolute(process.env.DATA_DIR ?? '')
    ? (process.env.DATA_DIR as string)
    : path.join(ROOT, process.env.DATA_DIR ?? '.data'),
  country: (process.env.DEFAULT_COUNTRY ?? 'IN').toUpperCase(),
  lang: process.env.DEFAULT_LANG ?? 'en',
  llm: {
    key: process.env.LLM_API_KEY ?? '',
    baseUrl: process.env.LLM_BASE_URL ?? 'https://openrouter.ai/api/v1',
    model: process.env.LLM_MODEL ?? 'meta-llama/llama-3.3-70b-instruct',
  },
};

export const hasTinyFish = Boolean(config.tinyfishKey);
export const hasPublicTunnel = !/^https?:\/\/(localhost|127\.0\.0\.1)/.test(config.publicBaseUrl);
