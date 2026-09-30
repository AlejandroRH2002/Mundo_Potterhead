import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { UserRole, UserSession } from '../../src/types/auth.ts';

const deriveKey = promisify(scrypt);
export interface AccountInput { id: string; name: string; email: string; password: string; role: UserRole }
interface Account { user: UserSession; salt: Buffer; hash: Buffer }
interface Session { accountId: string; expiresAt: number }
export async function createAuth(accounts: AccountInput[], options: { ttlMs?: number; now?: () => number } = {}) {
  const ttlMs = options.ttlMs ?? 30 * 60 * 1000;
  const now = options.now ?? Date.now;
  const records = await Promise.all(accounts.map(async account => {
    const salt = randomBytes(16);
    const hash = await deriveKey(account.password, salt, 64) as Buffer;
    return { user: { id: account.id, name: account.name, email: account.email.trim().toLowerCase(), role: account.role }, salt, hash } satisfies Account;
  }));
  const dummySalt = randomBytes(16);
  const dummyHash = await deriveKey(randomBytes(32).toString('hex'), dummySalt, 64) as Buffer;
  const sessions = new Map<string, Session>();
  const digest = (token: string) => createHash('sha256').update(token).digest('hex');
  const clean = () => { for (const [key, session] of sessions) if (session.expiresAt <= now()) sessions.delete(key); };
  return {
    ttlMs,
    authenticate: async (email: string, password: string) => {
      const account = records.find(record => record.user.email === email.trim().toLowerCase());
      // Unknown accounts also run scrypt and timingSafeEqual.
      const actual = await deriveKey(password, account?.salt ?? dummySalt, 64) as Buffer;
      if (!timingSafeEqual(actual, account?.hash ?? dummyHash) || !account) return null;
      clean();
      // One session per account; each successful login invalidates the previous token.
      for (const [key, session] of sessions) if (session.accountId === account.user.id) sessions.delete(key);
      const token = randomBytes(32).toString('base64url');
      sessions.set(digest(token), { accountId: account.user.id, expiresAt: now() + ttlMs });
      return { token, user: { ...account.user } };
    },
    session: (token: string | undefined): UserSession | null => {
      clean();
      if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
      const session = sessions.get(digest(token));
      const account = session && records.find(record => record.user.id === session.accountId);
      return account ? { ...account.user } : null;
    },
    revoke: (token: string | undefined) => { if (token) sessions.delete(digest(token)); },
    updateName: (id: string, name: string) => {
      const account = records.find(record => record.user.id === id);
      if (!account) throw new Error('Cuenta no encontrada.');
      account.user = { ...account.user, name };
      return { ...account.user };
    },
  };
}
export type Auth = Awaited<ReturnType<typeof createAuth>>;
