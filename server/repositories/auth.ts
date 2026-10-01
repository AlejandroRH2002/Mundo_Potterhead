import { createHmac, randomBytes } from 'node:crypto';
import { Prisma, type PrismaClient, type User } from '@prisma/client';
import type { UserSession } from '../../src/types/auth.ts';
import type { Auth } from '../security/auth.ts';
import { hashPassword, verifyPassword } from '../security/password.ts';

const profile = (user: User): UserSession => ({ id: user.id, name: user.name ?? '', email: user.email, role: user.role === 'ADMIN' ? 'admin' : 'user' });
export async function createDatabaseAuth(db: PrismaClient, secret: string, ttlMs = 30 * 60 * 1000, now: () => number = Date.now): Promise<Auth> {
  const dummy = await hashPassword(randomBytes(32).toString('hex'));
  const digest = (token: string) => createHmac('sha256', secret).update(token).digest('hex');
  return {
    ttlMs,
    async authenticate(email, password) {
      const user = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (!await verifyPassword(password, user?.password ?? dummy) || !user) return null;
      const token = randomBytes(32).toString('base64url');
      const createdAt = new Date(now());
      const expiresAt = new Date(createdAt.getTime() + Math.min(ttlMs, 8 * 60 * 60 * 1000));
      // Unique userId makes rotation atomic across replicas; last login wins.
      await db.session.upsert({ where: { userId: user.id },
        create: { userId: user.id, tokenHash: digest(token), createdAt, expiresAt },
        update: { tokenHash: digest(token), createdAt, expiresAt },
      });
      return { token, user: profile(user) };
    },
    async session(token) {
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const tokenHash = digest(token);
      let session = await db.session.findUnique({ where: { tokenHash }, include: { user: true } });
      const current = now();
      const absoluteLimit = (session?.createdAt.getTime() ?? 0) + 8 * 60 * 60 * 1000;
      if (!session || session.expiresAt.getTime() <= current || absoluteLimit <= current) return null;
      // expiresAt encodes the last persisted activity. CAS prevents competing replicas
      // from renewing more than once/minute; an update never recreates a revoked token.
      if (session.expiresAt.getTime() < absoluteLimit && session.expiresAt.getTime() <= current + ttlMs - 60_000) {
        await db.session.updateMany({
          where: { tokenHash, expiresAt: session.expiresAt, createdAt: session.createdAt },
          data: { expiresAt: new Date(Math.min(current + ttlMs, absoluteLimit)) },
        });
        session = await db.session.findUnique({ where: { tokenHash }, include: { user: true } });
      }
      return session && session.expiresAt.getTime() > now() && session.createdAt.getTime() + 8 * 60 * 60 * 1000 > now() ? profile(session.user) : null;
    },
    async revoke(token) { if (token) await db.session.deleteMany({ where: { tokenHash: digest(token) } }); },
    async updateName(id, name) { return profile(await db.user.update({ where: { id }, data: { name } })); },
    async register(input) {
      const password = await hashPassword(input.password);
      try { await db.user.create({ data: { email: input.email, name: input.name, password, role: 'CUSTOMER' } }); }
      catch (error: unknown) {
        // Identical result for existing email to limit account enumeration.
        if (!(error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')) throw error;
      }
    },
  };
}

export async function bootstrapAdmin(db: PrismaClient, email: string, password: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) {
    if (existing.role !== 'ADMIN') throw new Error('BOOTSTRAP_ACCOUNT_CONFLICT');
    return; // Never overwrite credentials or elevate an existing customer.
  }
  await db.user.create({ data: { email: normalized, password: await hashPassword(password), name: 'Administrador', role: 'ADMIN' } });
}

export function databaseLoginLimiter(db: PrismaClient, secret: string) {
  return async (address: string): Promise<boolean> => {
    const key = createHmac('sha256', secret).update(address).digest('hex');
    // Single SQL statement: shared fixed window, safe under concurrent replicas.
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "LoginAttempt" ("key", "count", "expiresAt")
      VALUES (${key}, 1, NOW() + INTERVAL '15 minutes')
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "LoginAttempt"."expiresAt" <= NOW() THEN 1 ELSE LEAST("LoginAttempt"."count" + 1, 1000000) END,
        "expiresAt" = CASE WHEN "LoginAttempt"."expiresAt" <= NOW() THEN NOW() + INTERVAL '15 minutes' ELSE "LoginAttempt"."expiresAt" END
      RETURNING "count"`;
    return rows[0].count <= 10;
  };
}
