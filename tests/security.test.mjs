import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createAuth } from './fixtures/memoryAuth.ts';
import { createApi } from '../server/http/app.ts';
import { createProductRepository } from './fixtures/memoryProducts.ts';
import { readConfig } from '../server/config.ts';

const password = randomBytes(32).toString('base64url');
const origin = 'http://localhost:5173';
const auth = await createAuth([
  { id: 'a', name: 'Admin', email: 'admin@test.invalid', password, role: 'admin' },
  { id: 'c', name: 'Cliente', email: 'client@test.invalid', password, role: 'user' },
]);
const products = createProductRepository([]);
const api = createApi({ auth, products, origin, logger: () => {} });
await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
after(() => new Promise(resolve => api.close(resolve)));
const base = 'http://127.0.0.1:' + api.address().port;
const send = (path, { method = 'GET', cookie, payload, from = origin, marker = true } = {}) => fetch(base + '/api' + path, {
  method,
  headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: from, ...(marker ? { 'X-Requested-With': 'MundoPotterhead' } : {}), 'Content-Type': 'application/json' },
  body: payload === undefined ? undefined : JSON.stringify(payload),
});
async function login(email = 'admin@test.invalid') {
  const response = await send('/auth/login', { method: 'POST', payload: { email, password } });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('set-cookie');
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Strict/);
  assert.match(cookie, /Max-Age=1800/);
  const body = await response.json();
  assert.equal('password' in body.user, false);
  assert.equal('token' in body, false);
  return cookie.split(';')[0];
}
const draft = { name: 'Varita', description: 'Descripción', price: 100, image: '/images/product-placeholder.svg', category: 'accessories', universe: 'harry-potter' };

test('unauthenticated requests and forged cookies cannot write products', async () => {
  assert.equal((await send('/products', { method: 'POST', payload: draft })).status, 401);
  assert.equal((await send('/products', { method: 'POST', payload: draft, cookie: 'mp_session=admin' })).status, 401);
  assert.equal((await send('/auth/session')).status, 200);
  assert.equal((await (await send('/auth/session')).json()).user, null);
  assert.equal(products.list().length, 0);
});
test('generic login failure; role fields in a request never grant admin', async () => {
  const bad = await send('/auth/login', { method: 'POST', payload: { email: 'missing@test.invalid', password: 'invalid' } });
  assert.equal(bad.status, 401);
  const cookie = await login('client@test.invalid');
  assert.equal((await send('/products', { method: 'POST', cookie, payload: { ...draft, role: 'admin' } })).status, 403);
  assert.equal((await send('/users/me', { method: 'PATCH', cookie, payload: { name: 'Cliente', email: 'client@test.invalid', role: 'admin' } })).status, 400);
  assert.equal((await (await send('/auth/session', { cookie })).json()).user.role, 'user');
});
test('origin and custom-header checks reject CSRF, including login CSRF', async () => {
  const cookie = await login();
  assert.equal((await send('/products', { method: 'POST', cookie, payload: draft, from: 'https://evil.invalid' })).status, 403);
  assert.equal((await send('/products', { method: 'POST', cookie, payload: draft, marker: false })).status, 403);
  assert.equal((await send('/auth/login', { method: 'POST', payload: { email: 'admin@test.invalid', password }, from: 'https://evil.invalid' })).status, 403);
  assert.equal(products.list().length, 0);
});
test('admin CRUD validates on the server and logout immediately revokes access', async () => {
  const cookie = await login();
  assert.equal((await send('/products', { method: 'POST', cookie, payload: { ...draft, price: -1 } })).status, 400);
  const response = await send('/products', { method: 'POST', cookie, payload: { ...draft, id: 'injected-id' } });
  assert.equal(response.status, 201);
  const product = await response.json();
  assert.notEqual(product.id, 'injected-id');
  assert.equal((await send('/products/' + product.id, { method: 'PUT', cookie, payload: { ...draft, price: 150 } })).status, 200);
  assert.equal((await (await send('/products/' + product.id)).json()).price, 150);
  assert.equal((await send('/products/' + product.id, { method: 'DELETE', cookie })).status, 204);
  const logout = await send('/auth/logout', { method: 'POST', cookie });
  assert.equal(logout.status, 204);
  assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal((await send('/products', { method: 'POST', cookie, payload: draft })).status, 401);
});
test('session rotation, expiration and mutation of returned role cannot grant permissions', async () => {
  let now = 100;
  const service = await createAuth([{ id: 'one', name: 'Cliente', email: 'user@test.invalid', password, role: 'user' }], { ttlMs: 10, now: () => now });
  const first = await service.authenticate('user@test.invalid', password);
  first.user.role = 'admin';
  assert.equal(service.session(first.token).role, 'user');
  const second = await service.authenticate('user@test.invalid', password);
  assert.equal(service.session(first.token), null);
  assert.equal(service.session(second.token).role, 'user');
  now = 111;
  assert.equal(service.session(second.token), null);
});
test('production config requires secrets and HTTPS; secure cookies use Host prefix', async () => {
  assert.throws(() => readConfig({}));
  const config = { DATABASE_URL: 'postgresql://localhost/test', SESSION_SECRET: password, NODE_ENV: 'production', APP_ORIGIN: origin };
  assert.throws(() => readConfig(config), /HTTPS/);
  assert.throws(() => readConfig({ ...config, APP_ORIGIN: 'https://shop.test.invalid', SESSION_SECRET: 'short' }), /SESSION_SECRET/);
  assert.equal(readConfig({ ...config, APP_ORIGIN: 'https://shop.test.invalid' }).secureCookies, true);
  const secure = createApi({ auth, products, origin, secureCookies: true, logger: () => {} });
  await new Promise(resolve => secure.listen(0, '127.0.0.1', resolve));
  try {
    const response = await fetch('http://127.0.0.1:' + secure.address().port + '/api/auth/login', {
      method: 'POST', headers: { Origin: origin, 'X-Requested-With': 'MundoPotterhead', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@test.invalid', password }),
    });
    assert.match(response.headers.get('set-cookie'), /^__Host-mp_session=/);
    assert.match(response.headers.get('set-cookie'), /; Secure/);
  } finally { await new Promise(resolve => secure.close(resolve)); }
});
test('repeated login attempts are throttled without disclosing account existence', async () => {
  let response;
  for (let i = 0; i < 11; i++) response = await send('/auth/login', { method: 'POST', payload: { email: 'nobody@test.invalid', password: 'bad' } });
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('retry-after'), '900');
});
test('internal failures and readiness failures expose no private details', async () => {
  const events = [];
  const privateDetail = 'private-database-diagnostic';
  const failure = () => { throw new Error(privateDetail); };
  const server = createApi({ auth, products: { ...products, list: failure }, origin, logger: event => events.push(event), ready: failure });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const root = 'http://127.0.0.1:' + server.address().port;
    const response = await fetch(root + '/api/products');
    assert.equal(response.status, 500);
    assert.equal((await response.text()).includes(privateDetail), false);
    assert.equal((await fetch(root + '/health/ready')).status, 503);
    assert.equal((await fetch(root + '/health/live')).status, 200);
    assert.ok(events.some(event => event.event === 'failure'));
    assert.equal(JSON.stringify(events).includes(privateDetail), false);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
