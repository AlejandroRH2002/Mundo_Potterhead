import { databaseDiagnostic } from './lib/databaseDiagnostic.ts';
import { PrismaClient } from '@prisma/client';
import { readConfig, ConfigurationError, configurationWarnings } from './config.ts';
import { createDatabaseAuth, databaseLoginLimiter } from './repositories/auth.ts';
import { createDatabaseUsers } from './repositories/users.ts';
import { createDatabaseProducts } from './repositories/products.ts';
import { createApi } from './http/app.ts';
import { createReadiness } from './health.ts';
import { createMediaStorage, MediaConfigError } from './media.ts';
import { audit } from './logger.ts';
import { createCleanup, cleanExpiredRecords } from './cleanup.ts';

async function start() {
  const config = readConfig(process.env);
  const media = createMediaStorage(process.env);
  for (const reason of configurationWarnings(config)) audit({ event: 'warning', code: 'STARTUP_CONFIGURATION_WARNING', reason });
  const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
  await db.$connect();
  const auth = await createDatabaseAuth(db, config.sessionSecret);
  // One additional connection per replica: probes cannot queue behind catalog traffic.
  const probeUrl=new URL(config.databaseUrl);probeUrl.searchParams.set('connection_limit','1');
  const probeDb=new PrismaClient({datasources:{db:{url:probeUrl.toString()}}});
  await probeDb.$connect();
  const health = createReadiness(async () => {try {await probeDb.$queryRaw`SELECT 1`;}catch(error:unknown){databaseDiagnostic(error,'readiness.query');throw error;} }, {timeoutMs:process.env.NODE_ENV==='production'?4500:1500});
  const server = createApi({ auth, users: createDatabaseUsers(db), products: createDatabaseProducts(db), ...config,
    limiter: databaseLoginLimiter(db, config.sessionSecret),
    ready: () => health.ready(), media,
  });
  server.requestTimeout = 15_000;
  server.headersTimeout = 10_000;
  server.keepAliveTimeout = 5_000;
  const cleanup = createCleanup({ run: () => cleanExpiredRecords(db) });
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true; health.drain();
    const maintenanceStopped = cleanup.stop();
    const deadline = setTimeout(() => process.exit(1), 15_000); deadline.unref();
    setTimeout(() => server.close(() => {
      media?.close();
      void maintenanceStopped.then(() => Promise.all([db.$disconnect(),probeDb.$disconnect()])).then(() => {
        clearTimeout(deadline); audit({ event: 'shutdown' });
      }).catch(() => {
        audit({ event: 'failure', code: 'SHUTDOWN_FAILED' }); process.exitCode = 1;
      });
    }), 5000);
  };
  process.once('SIGTERM', stop); process.once('SIGINT', stop);
  server.on('error', () => { audit({ event: 'failure', code: 'LISTEN_FAILED' }); process.exit(1); });
  server.listen(config.port, config.host, () => audit({ event: 'startup' }));
}
void start().catch((error: unknown) => { audit({ event: 'failure', code: error instanceof ConfigurationError ? 'SERVER_CONFIGURATION' : error instanceof MediaConfigError ? 'MEDIA_CONFIGURATION' : 'STARTUP_FAILED_CHECK_ENV_AND_DATABASE', ...(error instanceof MediaConfigError || error instanceof ConfigurationError ? { reason: error.message } : {}) }); process.exit(1); });
