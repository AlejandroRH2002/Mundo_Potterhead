import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout } from 'node:timers/promises';
import { PrismaClient } from '@prisma/client';
import { createDatabaseAuth, bootstrapAdmin, databaseLoginLimiter } from '../server/repositories/auth.ts';
import { createDatabaseProducts } from '../server/repositories/products.ts';
import { createApi } from '../server/http/app.ts';
import { cleanExpiredRecords } from '../server/cleanup.ts';

if (process.env.MP_ISOLATED_TEST_DB !== 'true') throw new Error('Use pnpm test:integration to create an isolated database.');
const db = new PrismaClient();
const secret = process.env.SESSION_SECRET;
const password = randomBytes(32).toString('base64url');
const email = 'owner@test.invalid';
const origin = 'https://shop.test.invalid';
await bootstrapAdmin(db, email, password);
const auth = await createDatabaseAuth(db, secret);
const products = createDatabaseProducts(db);
const entries = [];
const api = createApi({ auth, products, origin, secureCookies: true, sameSite: 'None', registrationEnabled: true,
  limiter: databaseLoginLimiter(db, secret), logger: entry => entries.push(entry), ready: async () => { await db.$queryRaw`SELECT 1`; } });
await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
after(async () => { await new Promise(resolve => api.close(resolve)); await db.$disconnect(); });
const base = 'http://127.0.0.1:' + api.address().port;
const send = (path, { method = 'GET', payload, cookie, from = origin, headers = {} } = {}) => fetch(base + path, {
  method, headers: { Origin: from, 'Content-Type': 'application/json', 'X-Requested-With': 'MundoPotterhead', ...(cookie ? { Cookie: cookie } : {}), ...headers },
  body: payload === undefined ? undefined : JSON.stringify(payload),
});
const draft = { name: 'Persistent product', description: 'Integration fixture', price: 12.35, image: '/images/product-placeholder.svg', category: 'accessories', universe: 'harry-potter' };
let adminCookie;
test('database stores scrypt hash; login issues secure host-only cookie and enforces roles', async () => {
  const row = await db.user.findUnique({ where: { email } });
  assert.match(row.password, /^scrypt\$/); assert.notEqual(row.password, password);
  assert.equal((await send('/api/products', { method: 'POST', payload: draft })).status, 401);
  const response = await send('/api/auth/login', { method: 'POST', payload: { email, password } });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /^__Host-mp_session=/); assert.match(cookie, /HttpOnly/); assert.match(cookie, /Secure/); assert.match(cookie, /SameSite=None/); assert.doesNotMatch(cookie, /Domain=/);
  adminCookie = cookie.split(';')[0];
  const session = await db.session.findFirst(); assert.notEqual(session.tokenHash, adminCookie.split('=')[1]);
  await bootstrapAdmin(db, email, randomBytes(32).toString('hex'));
  assert.equal((await db.user.findUnique({ where: { email } })).password, row.password);
});
test('products and sessions survive disconnect/reconnect and work in another replica', async () => {
  assert.equal((await send('/api/products', { method: 'POST', cookie: adminCookie, payload: { ...draft, price: -1 } })).status, 400);
  const created = await send('/api/products', { method: 'POST', cookie: adminCookie, payload: draft });
  assert.equal(created.status, 201); const product = await created.json();
  await db.$disconnect(); await db.$connect();
  const second = new PrismaClient();
  try {
    const replica = await createDatabaseAuth(second, secret);
    assert.equal((await replica.session(adminCookie.split('=')[1])).role, 'admin');
    const repository = createDatabaseProducts(second);
    assert.equal((await repository.get(product.id)).price, 12.35);
    assert.equal((await send('/api/products/' + product.id, { method: 'PUT', cookie: adminCookie, payload: { ...draft, price: 15.5 } })).status, 200);
    assert.equal((await repository.get(product.id)).price, 15.5);
    assert.equal((await send('/api/products/' + product.id, { method: 'DELETE', cookie: adminCookie })).status, 204);
    assert.equal(await repository.get(product.id), null);
    await replica.revoke(adminCookie.split('=')[1]);
    assert.equal((await send('/api/products', { method: 'POST', cookie: adminCookie, payload: draft })).status, 401);
  } finally { await second.$disconnect(); }
});
test('registration schemas reject role escalation and create only customers', async () => {
  const input = { email: 'customer@test.invalid', name: 'Customer', password };
  assert.equal((await send('/api/auth/register', { method: 'POST', payload: { ...input, role: 'ADMIN' } })).status, 400);
  assert.equal((await send('/api/auth/register', { method: 'POST', payload: { ...input, password: 'short' } })).status, 400);
  assert.equal((await send('/api/auth/register', { method: 'POST', payload: input })).status, 202);
  assert.equal((await send('/api/auth/register', { method: 'POST', payload: input })).status, 202);
  const customer = await auth.authenticate(input.email, password);
  assert.equal(customer.user.role, 'user');
  assert.equal((await send('/api/products', { method: 'POST', cookie: '__Host-mp_session=' + customer.token, payload: draft })).status, 403);
  await assert.rejects(bootstrapAdmin(db, input.email, password), /BOOTSTRAP_ACCOUNT_CONFLICT/);
});
test('CORS preflight, health and audit logs do not disclose credentials', async () => {
  const response = await send('/api/auth/login', { method: 'OPTIONS', headers: { 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-requested-with' } });
  assert.equal(response.status, 204); assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  assert.equal((await send('/api/auth/login', { method: 'OPTIONS', from: 'https://evil.invalid' })).status, 403);
  assert.equal((await send('/health/live')).status, 200); assert.equal((await send('/health/ready')).status, 200);
  assert.ok(entries.length > 0);
  const log = JSON.stringify(entries);
  for (const value of [password, secret, email, adminCookie]) assert.equal(log.includes(value), false);
});
test('shared limiter is atomic across replicas; expiry and rotation persist', async () => {
  const first = databaseLoginLimiter(db, secret); const second = databaseLoginLimiter(db, secret);
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) => (index % 2 ? first : second)('rate-limit-fixture')));
  assert.equal(results.filter(Boolean).length, 10);
  const session = await auth.authenticate(email, password);
  const next = await auth.authenticate(email, password);
  assert.equal(await auth.session(session.token), null);
  assert.equal((await auth.session(next.token)).role, 'admin');
  await db.session.updateMany({ data: { expiresAt: new Date(0) } });
  assert.equal(await auth.session(next.token), null);
});
test('compiled backend starts independently and reads production environment', async () => {
  const probe = createServer();
  await new Promise(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['dist-server/index.js'], {
    env: { ...process.env, NODE_ENV: 'production', APP_ORIGIN: origin, API_HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', chunk => { output += chunk; });
  child.stderr.on('data', chunk => { output += chunk; });
  const ended = new Promise(resolve => child.once('exit', resolve));
  try {
    let ready = false;
    for (let i = 0; i < 50; i++) {
      try { ready = (await fetch(`http://127.0.0.1:${port}/health/ready`, { signal: AbortSignal.timeout(500) })).ok; } catch { /* process is starting */ }
      if (ready || child.exitCode !== null) break;
      await setTimeout(100);
    }
    assert.equal(ready, true, 'Compiled API must connect to PostgreSQL without Vite or .env loading.');
    for (const value of [secret, password, process.env.DATABASE_URL]) assert.equal(output.includes(value), false);
  } finally { child.kill('SIGTERM'); await ended; }
});

test('cleanup skips other replicas and locked rows, preserves active sessions and bounds batches', async () => {
  const active = await auth.authenticate(email, password);
  await db.loginAttempt.createMany({ data: [
    { key: 'cleanup-locked', count: 1, expiresAt: new Date(0) },
    { key: 'cleanup-expired', count: 1, expiresAt: new Date(0) },
    { key: 'cleanup-active', count: 1, expiresAt: new Date(Date.now() + 60_000) },
  ] });
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(70421, 1)`;
    assert.equal(await cleanExpiredRecords(db), 'busy');
    assert.ok(await db.loginAttempt.findUnique({ where: { key: 'cleanup-expired' } }));
  });
  await db.$transaction(async tx => {
    await tx.$queryRaw`SELECT "key" FROM "LoginAttempt" WHERE "key" = 'cleanup-locked' FOR UPDATE`;
    assert.equal(await cleanExpiredRecords(db), 'completed');
    assert.ok(await db.loginAttempt.findUnique({ where: { key: 'cleanup-locked' } }));
    assert.equal(await db.loginAttempt.findUnique({ where: { key: 'cleanup-expired' } }), null);
  });
  await cleanExpiredRecords(db);
  assert.equal(await db.loginAttempt.findUnique({ where: { key: 'cleanup-locked' } }), null);
  assert.ok(await db.loginAttempt.findUnique({ where: { key: 'cleanup-active' } }));
  assert.equal((await auth.session(active.token)).role, 'admin');
  await db.loginAttempt.createMany({ data: Array.from({ length: 501 }, (_, i) => ({ key: 'cleanup-batch-' + i, count: 1, expiresAt: new Date(0) })) });
  await cleanExpiredRecords(db);
  assert.equal(await db.loginAttempt.count({ where: { key: { startsWith: 'cleanup-batch-' } } }), 1);
  await cleanExpiredRecords(db);
  assert.equal(await db.loginAttempt.count({ where: { key: { startsWith: 'cleanup-batch-' } } }), 0);
});
