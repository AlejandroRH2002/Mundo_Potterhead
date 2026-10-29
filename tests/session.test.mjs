import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword } from '../server/security/password.ts';
import { createDatabaseAuth } from '../server/repositories/auth.ts';

const minute = 60_000;
async function fixture(role='CUSTOMER') {
  let clock = 1_000_000;
  let row;
  let writes = 0;
  const password = 'session-test-only-password';
  const user = { id: 'test', name: 'Test', email: 'test@example.invalid', role, isActive: true, password: await hashPassword(password) };
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

test('administrator remains valid after 30 minutes and three idle hours, expires at four without polling renewal',async()=>{
 const f=await fixture('ADMIN'),{token}=await f.login(),expires=+f.row().expiresAt;
 f.advance(31*minute);assert.ok(await f.auth.session(token,false));f.advance(149*minute);assert.ok(await f.auth.session(token,false));assert.equal(+f.row().expiresAt,expires);assert.equal(f.writes(),0);
 f.advance(60*minute);assert.equal(await f.auth.session(token,false),null);assert.equal(await f.auth.remainingMs(token),0);
});
test('administrator activity renews once a minute, respects eight-hour cap and revocation',async()=>{
 const f=await fixture('ADMIN'),first=await f.login();f.advance(180*minute);await Promise.all(Array.from({length:12},()=>f.auth.session(first.token,true)));assert.equal(f.writes(),1);assert.equal(await f.auth.remainingMs(first.token),240*minute);
 f.advance(180*minute);assert.ok(await f.auth.session(first.token,true));assert.equal(await f.auth.remainingMs(first.token),120*minute);f.advance(120*minute);assert.equal(await f.auth.session(first.token,true),null);
 const next=await f.login();assert.equal(await f.auth.session(first.token),null);await f.auth.revoke(next.token);assert.equal(await f.auth.session(next.token),null);
});
test('customer idle limit stays thirty minutes',async()=>{const f=await fixture(),{token}=await f.login();f.advance(30*minute);assert.equal(await f.auth.session(token,false),null);});
test('HTTP activity is authenticated and CSRF protected; automatic GET never touches admin expiry or cookies',async()=>{
 const {createApi}=await import('../server/http/app.ts');const f=await fixture('ADMIN');const origin='https://shop.test.invalid';const api=createApi({auth:f.auth,products:{list:()=>[],get:()=>null},origin,secureCookies:true,logger:()=>{}});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
 try{const base='http://127.0.0.1:'+api.address().port;const login=await fetch(base+'/api/auth/login',{method:'POST',headers:{Origin:origin,'X-Requested-With':'MundoPotterhead','Content-Type':'application/json'},body:JSON.stringify({email:'test@example.invalid',password:'session-test-only-password'})});const cookie=login.headers.get('set-cookie');assert.match(cookie,/Max-Age=14400/);assert.match(cookie,/HttpOnly/);assert.match(cookie,/Secure/);assert.match(cookie,/__Host-/);const header=cookie.split(';')[0];
 const request=(path,method='GET',from=origin,marker=true,payload={})=>fetch(base+path,{method,headers:{Cookie:header,Origin:from,...(marker?{'X-Requested-With':'MundoPotterhead'}:{}),'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(payload)});
 const initial=+f.row().expiresAt;f.advance(180*minute);const poll=await request('/api/auth/session');assert.ok((await poll.json()).user);assert.equal(poll.headers.get('set-cookie'),null);assert.equal(+f.row().expiresAt,initial);
 assert.equal((await request('/api/auth/activity','POST','https://outside.test.invalid')).status,403);assert.equal((await request('/api/auth/activity','POST',origin,false)).status,403);assert.equal((await request('/api/auth/activity','POST',origin,true,{unexpected:true})).status,400);assert.equal(+f.row().expiresAt,initial);
 const activity=await request('/api/auth/activity','POST');assert.equal(activity.status,200);assert.match(activity.headers.get('set-cookie'),/Max-Age=14400/);assert.equal(f.writes(),1);
 f.advance(240*minute);assert.equal((await request('/api/auth/activity','POST')).status,401);
 }finally{await new Promise(resolve=>api.close(resolve));}
});
