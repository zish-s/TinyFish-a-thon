import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import multipart from '@fastify/multipart';
import { registerRoutes } from './routes.js';

const here = path.dirname(fileURLToPath(import.meta.url));

/**
 * Builds the Fastify application.
 *
 * The same app is used by the standalone server (`npm run dev`) and by the
 * Vercel serverless function in `api/`, so there is exactly one definition of
 * the routes and one definition of the behaviour.
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: 2 * 1024 * 1024,
    // Vercel functions must not keep the process alive.
    forceCloseConnections: true,
  });

  await app.register(cors, { origin: true, credentials: true });
  await app.register(multipart, { limits: { fileSize: 25 * 1024 * 1024 } });

  // Be forgiving about request bodies: a POST with no body, or a body sent
  // without a content-type, must not fail the request.
  app.addContentTypeParser('*', { parseAs: 'string' }, (_request, body, done) => {
    const raw = typeof body === 'string' ? body.trim() : '';
    if (!raw) return done(null, {});
    try {
      done(null, JSON.parse(raw));
    } catch {
      done(null, {});
    }
  });

  // Serve the built client when it is on disk (local `npm start`). On Vercel
  // the client is served as static assets by the platform itself.
  const webDist = path.resolve(here, '..', '..', '..', 'apps', 'web', 'dist');
  if (existsSync(webDist)) {
    await app.register(fastifyStatic, {
      root: webDist,
      prefix: '/',
      decorateReply: false,
      wildcard: false,
    });
  }

  await registerRoutes(app);

  app.setErrorHandler((error, request, reply) => {
    request.log.error({ err: error }, 'request failed');
    const err = error as { statusCode?: number; message?: string; stack?: string };
    const status = err.statusCode && err.statusCode >= 400 && err.statusCode < 600 ? err.statusCode : 500;
    reply.code(status);
    return {
      error: err.message ?? 'internal error',
      ...(process.env.NODE_ENV === 'production' ? {} : { stack: err.stack }),
    };
  });

  return app;
}
