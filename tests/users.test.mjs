import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createDatabaseUsers, validateUserChange } from '../server/repositories/users.ts';
import { createDatabaseAuth } from '../server/repositories/auth.ts';
import { hashPassword, verifyPassword } from '../server/security/password.ts';
import { createApi } from '../server/http/app.ts';
import { createProductRepository } from './fixtures/memoryProducts.ts';

const password = 'test-only-password-at-least-20';
const origin = 'https://shop.test.invalid';
// Transactional test double, not a PostgreSQL integration test.
async function fixture(t) {
  const hashed = await hashPassword(password);
  let rows = new Map(['a', 'b', 'c'].map(id => [id, { id, name: id, email: id + '@test.invalid', role: id === 'c' ? 'CUSTOMER' : 'ADMIN', isActive: true, password: hashed }]));
  let sessions = new Map();
  const project = (row, select) => row ? select ? Object.fromEntries(Object.keys(select).map(key => [key, row[key]])) : { ...row } : null;
  const matches = (row, where = {}) => Object.entries(where).every(([key, value]) => row[key] === value);
  const db = {
    user: {
      findUnique: async ({ where, select }) => project([...rows.values()].find(row => matches(row, where)), select),
      findMany: async ({ select, skip, take }) => [...rows.values()].sort((a,b) => a.id.localeCompare(b.id)).slice(skip, skip + take).map(row => project(row, select)),
      count: async ({ where } = {}) => [...rows.values()].filter(row => matches(row, where)).length,
      create: async ({ data, select }) => { const row = { id: randomUUID(), isActive: true, ...data }; rows.set(row.id, row); return project(row, select); },
      update: async ({ where, data, select }) => { const row = { ...rows.get(where.id), ...Object.fromEntries(Object.entries(data).filter(([,value]) => value !== undefined)) }; rows.set(where.id, row); return project(row, select); },
    },
    session: {
      upsert: async ({ where, create, update }) => { const old = [...sessions.values()].find(row => row.userId === where.userId); if (old) sessions.delete(old.tokenHash); const row = old ? { ...old, ...update } : create; sessions.set(row.tokenHash, row); },
      findUnique: async ({ where }) => { const row = sessions.get(where.tokenHash); return row ? { ...row, user: { ...rows.get(row.userId) } } : null; },
      deleteMany: async ({ where }) => { for (const [key, row] of sessions) if (matches(row, where)) sessions.delete(key); },
      updateMany: async () => ({ count: 0 }),
    },
    $queryRaw: async () => [{ locked: 1 }],
  };
  let queue = Promise.resolve();
  db.$transaction = operation => {
    const next = queue.then(async () => {
      const oldRows = new Map(rows), oldSessions = new Map(sessions);
      try { return await operation(db); } catch (error) { rows = oldRows; sessions = oldSessions; throw error; }
    });
    queue = next.catch(() => {}); return next;
  };
  const auth = await createDatabaseAuth(db, 'test-session-secret');
  const users = createDatabaseUsers(db);
  const logs = [];
  const api = createApi({ auth, users, products: createProductRepository([]), origin, logger: entry => logs.push(entry) });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => api.close(resolve)));
  const login = async id => 'mp_session=' + (await auth.authenticate(id + '@test.invalid', password)).token;
  const send = (path = '', { cookie, method = 'GET', body, from = origin, marker = true } = {}) => fetch('http://127.0.0.1:' + api.address().port + '/api' + (path.startsWith('/auth') ? path : '/admin/users' + path), {
    method, headers: { ...(cookie ? { Cookie: cookie } : {}), Origin: from, 'Content-Type': 'application/json', ...(marker ? { 'X-Requested-With': 'MundoPotterhead' } : {}) }, body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { db, auth, users, login, send, rows: () => rows, sessions: () => sessions, logs };
}
test('admin endpoints require session and role; list is paginated without hashes', async t => {
  const f = await fixture(t);
  for (const [cookie, status] of [[undefined, 401], [await f.login('c'), 403]]) {
    for (const [path, method, body] of [['','GET'], ['', 'POST', {}], ['/a','PATCH', { role: 'user' }]]) assert.equal((await f.send(path, { cookie, method, body })).status, status);
  }
  const cookie = await f.login('a');
  const response = await f.send('?page=2&pageSize=1', { cookie });
  const data = await response.json(); assert.equal(data.total, 3); assert.equal(data.users.length, 1); assert.equal(data.users[0].id, 'b');
  assert.deepEqual(Object.keys(data.users[0]).sort(), ['email','id','isActive','name','role']);
  for (const query of ['?page=0','?pageSize=51','?extra=1','?page=1&page=2']) assert.equal((await f.send(query, { cookie })).status, 400);
});
test('creation uses scrypt, accepts both roles, rejects short passwords and extra fields; CSRF is enforced', async t => {
  const f = await fixture(t), cookie = await f.login('a');
  const input = { name: 'New', email: 'new@test.invalid', password, role: 'user' };
  for (const body of [{ ...input, password: 'short' }, { ...input, isActive: true }, { ...input, role: 'owner' }]) assert.equal((await f.send('', { cookie, method: 'POST', body })).status, 400);
  assert.equal((await f.send('', { cookie, method: 'POST', body: input, from: 'https://evil.invalid' })).status, 403);
  assert.equal((await f.send('', { cookie, method: 'POST', body: input, marker: false })).status, 403);
  for (const role of ['user','admin']) {
    const response = await f.send('', { cookie, method: 'POST', body: { ...input, role, email: role + '@test.invalid' } });
    assert.equal(response.status, 201); const created = await response.json(); assert.equal(created.role, role); assert.equal('password' in created, false);
    assert.match(f.rows().get(created.id).password, /^scrypt\$/); assert.ok(await verifyPassword(password, f.rows().get(created.id).password));
  }
  assert.equal((await f.send('/b', { cookie, method: 'PATCH', body: { isActive: false, password } })).status, 400);
  const log = JSON.stringify(f.logs); assert.equal(log.includes('@test.invalid'), false); assert.equal(log.includes(password), false);
});
test('self-demotion/deactivation and deletion are refused; last active admin invariant is checked', async t => {
  const f = await fixture(t), cookie = await f.login('a');
  for (const body of [{ role: 'user' }, { isActive: false }]) assert.equal((await f.send('/a', { cookie, method: 'PATCH', body })).status, 409);
  assert.equal((await f.send('/a', { cookie, method: 'DELETE' })).status, 405);
  for (const patch of [{ role: 'user' }, { isActive: false }]) assert.throws(() => validateUserChange('other', { id: 'last', role: 'admin', isActive: true }, patch, 1), /al menos un administrador/);
  const results = await Promise.allSettled([f.users.change('a','b',{ role: 'user' }), f.users.change('b','a',{ role: 'user' })]);
  assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
  assert.equal([...f.rows().values()].filter(row => row.role === 'ADMIN' && row.isActive).length, 1);
});
test('disabled users lose sessions and cannot log in; reactivation does not restore old tokens', async t => {
  const f = await fixture(t), cookie = await f.login('a'), client = await f.login('c');
  const token = client.split('=')[1];
  assert.equal((await f.send('/c', { cookie, method: 'PATCH', body: { isActive: false } })).status, 200);
  assert.equal(await f.auth.session(token), null); assert.equal(f.sessions().size, 1);
  assert.equal((await f.send('/auth/login', { method: 'POST', body: { email: 'c@test.invalid', password } })).status, 401);
  assert.equal((await f.send('/c', { cookie, method: 'PATCH', body: { isActive: true } })).status, 200);
  assert.equal(await f.auth.session(token), null); assert.ok(await f.auth.authenticate('c@test.invalid', password));
  const active = await f.auth.authenticate('c@test.invalid', password);
  await f.db.user.update({ where: { id: 'c' }, data: { isActive: false } });
  assert.equal(await f.auth.session(active.token), null);
});
