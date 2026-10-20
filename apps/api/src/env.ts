import path from 'node:path';
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
      process.loadEnvFile(file);
      return file;
    } catch {
      /* try next */
    }
  }
  return null;
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
