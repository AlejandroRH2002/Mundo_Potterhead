import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../server/security/password.ts';
import { createDatabaseAuth } from '../server/repositories/auth.ts';

const minute = 60_000;
async function fixture() {
  let clock = 1_000_000;
  let row;
  let writes = 0;
  const password = 'session-test-only-password';
  const user = { id: 'test', name: 'Test', email: 'test@example.invalid', role: 'CUSTOMER', isActive: true, password: await hashPassword(password) };
  const db = {
    user: { findUnique: async () => user },
    session: {
      upsert: async ({ create, update }) => { row = { ...(row ? { ...row, ...update } : create), user }; },
      findUnique: async ({ where }) => row?.tokenHash === where.tokenHash ? { ...row } : null,
      updateMany: async ({ where, data }) => {
        if (!row || row.tokenHash !== where.tokenHash || +row.expiresAt !== +where.expiresAt || +row.createdAt !== +where.createdAt) return { count: 0 };
        row = { ...row, ...data }; writes++; return { count: 1 };
      },
      deleteMany: async ({ where }) => { if (row?.tokenHash === where.tokenHash) row = undefined; },
    },
  };
  db.$transaction = async operation => operation(db);
  db.$queryRaw = async () => [];
  const auth = await createDatabaseAuth(db, 'test-secret', 30 * minute, () => clock);
  const login = () => auth.authenticate(user.email, password);
  return { auth, db, login, advance: ms => { clock += ms; }, row: () => row, writes: () => writes };
}
test('database session renews at most once a minute across concurrent replicas', async () => {
  const f = await fixture(); const { token } = await f.login();
  const original = +f.row().expiresAt;
  f.advance(59_999); assert.ok(await f.auth.session(token)); assert.equal(f.writes(), 0);
  f.advance(1); await Promise.all(Array.from({ length: 12 }, () => f.auth.session(token)));
  assert.equal(f.writes(), 1); assert.equal(+f.row().expiresAt, original + minute);
  f.advance(29 * minute); assert.ok(await f.auth.session(token));
  f.advance(30 * minute); assert.equal(await f.auth.session(token), null);
});
test('active database sessions stop at eight hours and login resets the absolute bound', async () => {
  const f = await fixture(); const first = await f.login();
  for (let i = 1; i < 480; i++) { f.advance(minute); assert.ok(await f.auth.session(first.token)); }
  const writes = f.writes(); f.advance(minute); assert.equal(await f.auth.session(first.token), null);
  assert.equal(f.writes(), writes);
  const next = await f.login(); assert.ok(await f.auth.session(next.token)); assert.equal(await f.auth.session(first.token), null);
});
test('renewal never resurrects revocation, including a revoke racing the update', async () => {
  const f = await fixture(); const { token } = await f.login(); f.advance(minute);
  const update = f.db.session.updateMany;
  f.db.session.updateMany = async args => { await f.auth.revoke(token); return update(args); };
  assert.equal(await f.auth.session(token), null); assert.equal(f.row(), undefined);
});
