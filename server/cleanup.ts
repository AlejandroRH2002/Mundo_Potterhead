import type { PrismaClient } from '@prisma/client';
import { audit, type AuditEntry } from './logger.ts';

export async function cleanExpiredRecords(db: PrismaClient): Promise<'completed' | 'busy'> {
  return db.$transaction(async tx => {
    // Transaction-scoped, non-blocking lock shared by all application replicas.
    const [lock] = await tx.$queryRaw<{ acquired: boolean }[]>`SELECT pg_try_advisory_xact_lock(70421, 1) AS acquired`;
    if (!lock.acquired) return 'busy';
    await tx.$executeRaw`SET LOCAL lock_timeout = '500ms'`;
    await tx.$executeRaw`SET LOCAL statement_timeout = '5s'`;
    // Bounded batches; rows being updated by login/rotation are left for a later cycle.
    await tx.$executeRaw`
      WITH expired AS (
        SELECT "tokenHash" FROM "Session" WHERE "expiresAt" < NOW()
        ORDER BY "expiresAt" LIMIT 500 FOR UPDATE SKIP LOCKED
      ) DELETE FROM "Session" USING expired WHERE "Session"."tokenHash" = expired."tokenHash"`;
    await tx.$executeRaw`
      WITH expired AS (
        SELECT "key" FROM "LoginAttempt" WHERE "expiresAt" < NOW()
        ORDER BY "expiresAt" LIMIT 500 FOR UPDATE SKIP LOCKED
      ) DELETE FROM "LoginAttempt" USING expired WHERE "LoginAttempt"."key" = expired."key"`;
    return 'completed';
  }, { maxWait: 2000, timeout: 12_000 });
}

function reason(error: unknown): string {
  if (!error || typeof error !== 'object') return 'UNKNOWN';
  const code = 'code' in error ? error.code : undefined;
  const allowed = ['P1000', 'P1001', 'P1002', 'P1010', 'P2021', 'P2024', 'P2028', 'P2034', 'EACCES', 'EPERM', 'EBUSY', 'EIO'];
  if (typeof code === 'string' && allowed.includes(code)) return code;
  if (code === 'P2010' && 'meta' in error && error.meta && typeof error.meta === 'object' && 'code' in error.meta) {
    const sqlCode = error.meta.code;
    if (typeof sqlCode === 'string' && ['42P01', '42501', '55P03', '57014', '40P01', '40001'].includes(sqlCode)) return sqlCode;
  }
  return 'UNKNOWN';
}

export function createCleanup({ run, logger = audit, now = Date.now,
  intervalMs = 60_000, maxDelayMs = 15 * 60_000, warningIntervalMs = 15 * 60_000,
}: {
  run: () => Promise<'completed' | 'busy'>;
  logger?: (entry: AuditEntry) => void;
  now?: () => number;
  intervalMs?: number;
  maxDelayMs?: number;
  warningIntervalMs?: number;
}) {
  let stopped = false;
  let active: Promise<void> | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let failures = 0;
  let lastWarning = -Infinity;
  let delay = intervalMs;
  const log = (entry: AuditEntry) => { try { logger(entry); } catch { /* Maintenance must survive a failed log sink. */ } };
  function cycle(): Promise<void> {
    if (stopped) return Promise.resolve();
    if (active) return active;
    // Defer invocation until active is assigned, including synchronously throwing tasks.
    active = Promise.resolve().then(async () => {
      try {
        const result = await run();
        if (result === 'busy') return;
        if (failures) log({ event: 'maintenance', code: 'CLEANUP_RECOVERED', attempts: failures });
        failures = 0; delay = intervalMs; lastWarning = -Infinity;
      } catch (error: unknown) {
        failures++;
        delay = Math.min(maxDelayMs, intervalMs * 2 ** Math.min(failures - 1, 10));
        if (now() - lastWarning >= warningIntervalMs) {
          lastWarning = now();
          log({ event: 'warning', code: 'CLEANUP_DEFERRED', reason: reason(error), attempts: failures, retryMs: delay });
        }
      }
    }).finally(() => { active = undefined; });
    return active;
  }
  function schedule() {
    if (stopped) return;
    timer = setTimeout(() => { timer = undefined; void cycle().then(schedule); }, delay);
    timer.unref();
  }
  schedule();
  return {
    runNow: cycle,
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await active;
    },
  };
}
