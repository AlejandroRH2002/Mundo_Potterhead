import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { databaseUrl } from '../server/database.ts';
import { createReadiness } from '../server/health.ts';
import { createMediaStorage } from '../server/media.ts';
import { createApi } from '../server/http/app.ts';
import { createAuth } from './fixtures/memoryAuth.ts';
import { createProductRepository } from './fixtures/memoryProducts.ts';

test('Prisma URLs bound pool/timeouts, enforce default production TLS and separate migrations', () => {
  const env = { NODE_ENV: 'production', DATABASE_URL: 'postgresql://db.invalid/shop?pgbouncer=true', DIRECT_DATABASE_URL: 'postgresql://direct.invalid/shop' };
  const runtime = new URL(databaseUrl(env));
  assert.equal(runtime.searchParams.get('connection_limit'), '5');
  assert.equal(runtime.searchParams.get('sslmode'), 'require');
  assert.equal(runtime.searchParams.get('sslaccept'), 'strict');
  assert.equal(runtime.searchParams.get('socket_timeout'), '10');
  const direct = new URL(databaseUrl(env, true));
  assert.equal(direct.hostname, 'direct.invalid'); assert.equal(direct.searchParams.get('connection_limit'), '1');
  assert.equal(direct.searchParams.has('pgbouncer'), false); assert.equal(direct.searchParams.has('socket_timeout'), false);
  assert.throws(() => databaseUrl({ ...env, DIRECT_DATABASE_URL: undefined }, true), /DIRECT_DATABASE_URL/);
  assert.throws(() => databaseUrl({ ...env, DB_POOL_SIZE: '0' }), /connection_limit/);
  assert.throws(() => databaseUrl({ ...env, DATABASE_URL: env.DATABASE_URL + '&sslaccept=accept_invalid_certs' }), /TLS/);
  assert.throws(() => databaseUrl({ ...env, DATABASE_URL: env.DATABASE_URL + '&sslmode=disable' }), /TLS/);
  const local = new URL(databaseUrl({ DATABASE_URL: 'postgresql://localhost/dev' }));
  assert.equal(local.searchParams.get('sslmode'), 'disable');
});

test('readiness deadlines coalesce concurrent probes, recover and fail while draining', async () => {
  let complete;
  let count = 0;
  const query = new Promise(resolve => { complete = resolve; });
  const health = createReadiness(() => { count++; return query; }, { timeoutMs: 5, cacheMs: 1000 });
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => health.ready()));
  assert.equal(results.every(result => result.status === 'rejected'), true);
  assert.equal(count, 1);
  complete();
  await health.ready(); assert.equal(count, 1);
  health.drain(); await assert.rejects(health.ready(), /DRAINING/);
});

test('S3 policies constrain MIME, exact size, unique key and expiry without exposing secret key', async () => {
  const secret = randomBytes(32).toString('hex');
  const previous = { AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN: process.env.AWS_SESSION_TOKEN };
  process.env.AWS_ACCESS_KEY_ID = 'TEST' + randomBytes(8).toString('hex');
  process.env.AWS_SECRET_ACCESS_KEY = secret; delete process.env.AWS_SESSION_TOKEN;
  const storage = createMediaStorage({ MEDIA_STORAGE: 's3', S3_BUCKET: 'test-bucket', S3_REGION: 'us-east-1', S3_PUBLIC_BASE_URL: 'https://images.test.invalid' });
  try {
    const first = await storage.sign({ contentType: 'image/png', size: 4096 });
    const second = await storage.sign({ contentType: 'image/png', size: 4096 });
    assert.notEqual(first.publicUrl, second.publicUrl);
    const policy = JSON.parse(Buffer.from(first.fields.Policy, 'base64').toString());
    assert.ok(policy.conditions.some(condition => JSON.stringify(condition) === JSON.stringify(['content-length-range', 4096, 4096])));
    assert.ok(policy.conditions.some(condition => JSON.stringify(condition) === JSON.stringify(['eq', '$Content-Type', 'image/png'])));
    assert.ok(new Date(policy.expiration).getTime() <= Date.now() + 61_000);
    assert.equal(JSON.stringify(first).includes(secret), false);
    assert.match(first.fields.key, /^products\/[a-f0-9-]+\.png$/);
    await assert.rejects(storage.sign({ contentType: 'image/svg+xml', size: 1 }));
    await assert.rejects(storage.sign({ contentType: 'image/png', size: 11 * 1024 * 1024 }));
  } finally {
    storage.close();
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
  }
});

test('image signing requires administrator and CSRF checks; health HEAD avoids auth', async () => {
  const password = randomBytes(32).toString('hex');
  const auth = await createAuth([{ id: 'admin', name: 'Admin', email: 'admin@test.invalid', password, role: 'admin' }, { id: 'user', name: 'User', email: 'user@test.invalid', password, role: 'user' }]);
  const admin = await auth.authenticate('admin@test.invalid', password);
  const user = await auth.authenticate('user@test.invalid', password);
  let signed = 0;
  const media = { maxBytes: 10 * 1024 * 1024, close() {}, async sign() { signed++; return { url: 'https://bucket.test.invalid', publicUrl: 'https://cdn.test.invalid/products/test.png', fields: {} }; } };
  const origin = 'http://localhost:5173';
  const server = createApi({ auth, origin, products: createProductRepository([]), media, logger: () => {} });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  const send = (token, from = origin, contentType = 'image/png') => fetch(base + '/api/media/upload', {
    method: 'POST', headers: { Origin: from, 'X-Requested-With': 'MundoPotterhead', 'Content-Type': 'application/json', Cookie: 'mp_session=' + (token ?? '') },
    body: JSON.stringify({ contentType, size: 4096 }),
  });
  try {
    assert.equal((await send()).status, 401); assert.equal((await send(user.token)).status, 403);
    assert.equal((await send(admin.token, 'https://evil.invalid')).status, 403);
    assert.equal((await send(admin.token, origin, 'image/svg+xml')).status, 400);
    assert.equal(signed, 0); assert.equal((await send(admin.token)).status, 200); assert.equal(signed, 1);
    for (const path of ['/health/live', '/health/ready']) {
      const response = await fetch(base + path, { method: 'HEAD' });
      assert.equal(response.status, 200); assert.equal(await response.text(), '');
      assert.equal(response.headers.get('cache-control'), 'no-store');
    }
  } finally { await new Promise(resolve => server.close(resolve)); }
});
