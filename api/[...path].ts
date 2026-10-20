import type { IncomingMessage, ServerResponse } from 'node:http';
// The compiled output, not the TypeScript source: Vercel bundles the function
// and needs a real .js module to resolve.
import { buildApp } from '../apps/api/dist/app.js';

/**
 * Vercel serverless entry point.
 *
 * One catch-all function serves the whole `/api` surface. The Fastify app is
 * built once per warm instance and reused, which is what makes the SSE
 * stream (the live agent view) and the in-memory case cache work in a
 * serverless environment.
 */
type App = Awaited<ReturnType<typeof buildApp>>;

let appPromise: Promise<App> | null = null;

function getApp(): Promise<App> {
  if (!appPromise) {
    appPromise = buildApp().then(async (app) => {
      await app.ready();
      return app;
    });
  }
  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await getApp();
  // Fastify owns the Node http server; handing the raw request to it keeps
  // streaming responses (SSE) intact.
  app.server.emit('request', req, res);
}
