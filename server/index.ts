import { PrismaClient } from '@prisma/client';
import { readConfig } from './config.ts';
import { createDatabaseAuth, databaseLoginLimiter } from './repositories/auth.ts';
import { createDatabaseProducts } from './repositories/products.ts';
import { createApi } from './http/app.ts';
import { createReadiness } from './health.ts';
import { createMediaStorage } from './media.ts';
import { audit } from './logger.ts';
import { createCleanup, cleanExpiredRecords } from './cleanup.ts';

async function start() {
  const config = readConfig(process.env);
  const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
  await db.$connect();
  const auth = await createDatabaseAuth(db, config.sessionSecret);
  const health = createReadiness(async () => { await db.$queryRaw`SELECT 1`; });
  const media = createMediaStorage(process.env);
  const server = createApi({ auth, products: createDatabaseProducts(db), ...config,
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
      void maintenanceStopped.then(() => db.$disconnect()).then(() => {
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
void start().catch(() => { audit({ event: 'failure', code: 'STARTUP_FAILED_CHECK_ENV_AND_DATABASE' }); process.exit(1); });
