import { config, ENV_FILE, hasPublicTunnel, hasTinyFish } from './env.js';
import { buildApp } from './app.js';

const app = await buildApp();

await app.listen({ port: config.port, host: '0.0.0.0' });

if (process.env.PRINT_ROUTES === '1') app.printRoutes();

app.log.info(
  {
    envFile: ENV_FILE,
    tinyfish: hasTinyFish ? 'configured' : 'MISSING - set TINYFISH_API_KEY in .env',
    tunnel: hasPublicTunnel ? config.publicBaseUrl : 'local only - the remote agent cannot reach the demo portals',
    publicBaseUrl: config.publicBaseUrl,
  },
  'ReclaimYourNet API ready',
);
