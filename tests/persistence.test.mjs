import { createInventory, assertInventoryReady } from '../server/repositories/inventory.ts';
import { createCatalogManagement } from '../server/repositories/catalogManagement.ts';
import { templateRow } from '../shared/catalogFiles.ts';
import { randomUUID } from 'node:crypto';
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
const catalogManagement=createCatalogManagement(db,secret);
const entries = [];
const api = createApi({ auth, products, origin, secureCookies: true, sameSite: 'None', registrationEnabled: true,
  catalogManagement,limiter: databaseLoginLimiter(db, secret), logger: entry => entries.push(entry), ready: async () => { await db.$queryRaw`SELECT 1`; } });
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

// Runs only through the pre-existing MP_ISOLATED_TEST_DB gate above.
test('real PostgreSQL inventory: atomic ledger, last-unit concurrency, retry and rollback', async () => {
 const owner=await db.user.create({data:{email:randomUUID()+'@test.invalid',password:'unused-test-hash',role:'ADMIN'}});
 const captured=createDatabaseProducts(db,'capture');const enforced=createDatabaseProducts(db,'enforce');const administration=createDatabaseProducts(db,'enforce',true);
 const inventory=createInventory(db,captured,'capture');
 const product=await captured.create({...draft,name:'Inventory '+randomUUID()});const a=product.models[0];
 assert.equal(a.quantity,null);assert.ok(await captured.get(product.id));assert.equal(await enforced.get(product.id),null);
 await assert.rejects(()=>assertInventoryReady(db,'enforce'),/capturar/);
 const move=(id,type,quantity,extra={})=>inventory.move(owner.id,id,{key:randomUUID(),type,quantity,reason:'Isolated fixture',...extra});
 const opening=await move(a.id,'COUNT',3,{expectedVersion:0});assert.equal(opening.before,null);assert.equal(opening.after,3);
 await move(a.id,'RECEIPT',2);assert.equal((await move(a.id,'SALE',2)).after,3);
 const adjusted=await move(a.id,'ADJUSTMENT',1,{expectedVersion:3});assert.equal(adjusted.after,1);
 const last=await Promise.allSettled([move(a.id,'SALE',1),move(a.id,'SALE',1)]);assert.equal(last.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await db.productSku.findUnique({where:{id:a.id}})).quantity,0);
 assert.equal(await enforced.get(product.id),null);assert.ok(await administration.get(product.id));
 const b=await inventory.model(owner.id,product.id,{name:'Modelo B',active:true});await move(b.id,'COUNT',2,{expectedVersion:0});
 assert.equal((await enforced.get(product.id)).models.length,1);
 const q={page:1,pageSize:24,sort:'novedad',q:product.name};assert.equal((await enforced.search(q)).total,1);
 await move(b.id,'SALE',2);assert.equal((await enforced.search(q)).total,0);assert.ok(await captured.get(product.id));
 const retry={key:randomUUID(),type:'RECEIPT',quantity:3,reason:'Retry fixture'};
 const twice=await Promise.all([inventory.move(owner.id,a.id,retry),inventory.move(owner.id,a.id,retry)]);assert.equal(twice[0].id,twice[1].id);
 assert.equal((await db.productSku.findUnique({where:{id:a.id}})).quantity,3);
 await assert.rejects(()=>inventory.move(owner.id,a.id,{...retry,quantity:4}),/clave/);
 const before=await db.productSku.findUnique({where:{id:a.id}});
 await assert.rejects(()=>move(a.id,'ADJUSTMENT',0,{expectedVersion:0}),/cambió/);
 await assert.rejects(()=>db.productSku.update({where:{id:a.id},data:{quantity:-1}}));
 await db.$executeRaw`CREATE FUNCTION mp_inventory_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."reason"='rollback-fixture' THEN RAISE EXCEPTION 'fixture failure'; END IF; RETURN NEW; END; $$`;
 await db.$executeRaw`CREATE TRIGGER inventory_test_fail BEFORE INSERT ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION mp_inventory_test_fail()`;
 try {await assert.rejects(()=>inventory.move(owner.id,a.id,{key:randomUUID(),type:'SALE',quantity:1,reason:'rollback-fixture'}));}
 finally {await db.$executeRaw`DROP TRIGGER inventory_test_fail ON "InventoryMovement"`;await db.$executeRaw`DROP FUNCTION mp_inventory_test_fail()`;}
 assert.equal((await db.productSku.findUnique({where:{id:a.id}})).quantity,before.quantity);
 assert.equal(await db.inventoryMovement.count({where:{modelId:a.id,reason:'rollback-fixture'}}),0);
 const history=await inventory.history(a.id,{page:1,pageSize:100,q:'',status:'all'});assert.equal(history.total,6);
 assert.equal(history.items.reduce((total,item)=>total+item.delta,0),3);
 await assert.rejects(()=>db.inventoryMovement.delete({where:{id:opening.id}}));
 const quote=await createInventory(db,enforced,'enforce').quote({lines:[{productId:product.id,modelId:a.id,quantity:3}]});assert.equal(quote.lines.length,1);
 assert.equal((await db.productSku.findUnique({where:{id:a.id}})).quantity,3);
 await assert.rejects(()=>createInventory(db,enforced,'enforce').quote({lines:[{productId:product.id,modelId:a.id,quantity:4}]}),/supera/);
 await inventory.archive(owner.id,product.id,true);assert.equal(await enforced.get(product.id),null);assert.ok(await administration.get(product.id));await inventory.archive(owner.id,product.id,false);
 assert.ok(await enforced.get(product.id));
 await db.user.update({where:{id:owner.id},data:{isActive:false}});await assert.rejects(()=>move(a.id,'SALE',1),/administrador/);
});

test('real PostgreSQL sized SKU uniqueness, category constraint and lightweight model search (isolated DB only)',async()=>{
 const owner=await db.user.create({data:{email:randomUUID()+'@test.invalid',password:'unused-test-hash',role:'ADMIN'}});
 const repository=createDatabaseProducts(db,'capture');const inventory=createInventory(db,repository,'capture');
 const product=await repository.create({...draft,category:'clothing',name:'Sizing '+randomUUID()});const model=product.models[0];
 const xs=await inventory.addSku(owner.id,model.id,'xs');assert.equal(xs.quantity,null);
 await assert.rejects(()=>inventory.addSku(owner.id,model.id,'xs'));
 await assert.rejects(()=>inventory.addSku(owner.id,model.id,'22'),/talla/);
 await assert.rejects(()=>db.productSku.update({where:{id:xs.id},data:{size:'22'}}));
 await inventory.move(owner.id,xs.id,{key:randomUUID(),type:'COUNT',quantity:2,reason:'Real size count',expectedVersion:0});
 const name='Rojo '+randomUUID();await inventory.model(owner.id,product.id,{name,active:true},model.id);
 const result=await repository.search({page:1,pageSize:24,sort:'novedad',q:name,category:'clothing',size:'xs'});
 assert.equal(result.total,1);assert.equal(result.items[0].modelCount,1);assert.equal(result.items[0].available,true);
 for(const key of ['models','skus','images','imageThumbnails'])assert.equal(key in result.items[0],false);
 assert.ok((await repository.get(product.id)).models[0].skus.some(sku=>sku.size==='xs'&&sku.quantity===2));
});

test('catalog management: admin authorization, draft visibility, galleries, colors and legacy order references',async()=>{
 const rows=[{...templateRow,productCode:'TEST-'+randomUUID(),modelCode:'MODEL-'+randomUUID(),sku:'SKU-'+randomUUID(),images:'https://images.test.invalid/first.webp',status:'draft'}];
 const input={key:randomUUID(),rows,images:{}};
 const ownerSession=await auth.authenticate(email,password);const ownerCookie='__Host-mp_session='+ownerSession.token;
 assert.equal((await send('/api/admin/catalog/preview',{method:'POST',payload:input})).status,401);
 const customer=await db.user.create({data:{email:randomUUID()+'@test.invalid',password:'fixture',role:'CUSTOMER'}});
 const client=await createDatabaseAuth(db,secret);
 const customerHash=await import('../server/security/password.ts');await db.user.update({where:{id:customer.id},data:{password:await customerHash.hashPassword(password)}});
 const customerSession=await client.authenticate(customer.email,password);
 assert.equal((await send('/api/admin/catalog/preview',{method:'POST',payload:input,cookie:'__Host-mp_session='+customerSession.token})).status,403);
 const previewResponse=await send('/api/admin/catalog/preview',{method:'POST',payload:input,cookie:ownerCookie});assert.equal(previewResponse.status,200);const preview=await previewResponse.json();assert.equal(preview.report.valid,true);
 assert.equal((await send('/api/admin/catalog/preview',{method:'POST',payload:input,cookie:ownerCookie,from:'https://outside.test.invalid'})).status,403);
 assert.equal((await send('/api/admin/catalog/preview',{method:'POST',payload:input,cookie:ownerCookie,headers:{'X-Requested-With':''}})).status,403);
 assert.equal((await send('/api/admin/catalog/preview',{method:'POST',payload:{...input,extra:true},cookie:ownerCookie})).status,400);
 const applied=await send('/api/admin/catalog/import',{method:'POST',payload:{request:input,token:preview.token},cookie:ownerCookie});assert.equal(applied.status,200);
 const product=await db.product.findUniqueOrThrow({where:{code:rows[0].productCode}});assert.equal(product.archived,true);assert.equal(await products.get(product.id),null);
 let managed=await catalogManagement.get(product.id);const model=managed.models[0],first=model.variants[0];
 model.images=['https://images.test.invalid/first.webp','https://images.test.invalid/second.webp'];
 model.variants.push({code:'SKU-'+randomUUID(),size:first.size,color:'Rojo',images:['https://images.test.invalid/second.webp'],active:true});managed.status='active';
 managed=await catalogManagement.save(customerSession.user.id,managed).then(()=>{throw Error('Customer write allowed');},error=>{assert.equal(error.status,403);return managed;});
 const owner=await db.user.findUniqueOrThrow({where:{email}});managed=await catalogManagement.save(owner.id,managed);assert.ok(await products.get(product.id));
 const details=await products.get(product.id);assert.equal(details.models[0].skus.length,2);assert.equal(details.models[0].images.length,2);
 await assert.rejects(()=>db.productSku.create({data:{modelId:model.id,code:'OTHER-'+randomUUID(),size:first.size,color:' rojo '}}));
 const order=await db.order.create({data:{userId:owner.id,total:780,items:{create:{productId:product.id,quantity:1,price:780}}}});
 const oldRevision=managed.revision;managed.product.name='Updated catalog fixture';await catalogManagement.save(owner.id,managed);
 await assert.rejects(()=>catalogManagement.save(owner.id,{...managed,revision:oldRevision}),/cambió/);
 assert.equal((await db.orderItem.findFirst({where:{orderId:order.id}})).productId,product.id);
 const copy=await catalogManagement.duplicate(owner.id,product.id);assert.equal(copy.status,'draft');assert.notEqual(copy.models[0].variants[0].id,first.id);assert.equal((await db.productSku.findUnique({where:{id:copy.models[0].variants[0].id}})).quantity,null);
 const batch=[await catalogManagement.get(product.id),copy].sort((a,b)=>a.id.localeCompare(b.id));await assert.rejects(()=>catalogManagement.bulk(owner.id,{items:batch.map((item,i)=>({id:item.id,revision:item.revision+(i===1?1:0)})),status:'archived'}),/cambió/);assert.equal((await catalogManagement.get(batch[0].id)).status,batch[0].status);
 const history=await catalogManagement.history(1);assert.ok(history.some(item=>item.id===input.key));
 const before=await catalogManagement.get(product.id);await catalogManagement.bulk(owner.id,{items:[{id:product.id,revision:before.revision}],status:'archived'});assert.equal(await products.get(product.id),null);assert.equal(await db.order.count({where:{id:order.id}}),1);
});

test('catalog import: preview is read-only, same-file retries are idempotent and stock changes are ledgered atomically',async()=>{
 const owner=await db.user.findUniqueOrThrow({where:{email}});
 const row={...templateRow,productCode:'IMP-'+randomUUID(),modelCode:'MODEL-'+randomUUID(),sku:'SKU-'+randomUUID(),images:'https://images.test.invalid/import.webp',quantity:'3',inventoryMode:'replace',reason:'Physical fixture count'};
 const input={key:randomUUID(),rows:[row],images:{}};const count=await db.product.count();const preview=await catalogManagement.preview(input);assert.equal(await db.product.count(),count);
 const result=await catalogManagement.apply(owner.id,input,preview.token);assert.equal(result.created,1);
 const sku=await db.productSku.findUniqueOrThrow({where:{code:row.sku}});assert.equal(sku.quantity,3);
 const repeated=await catalogManagement.apply(owner.id,{...input,key:randomUUID()},preview.token);assert.equal(repeated.skipped,1);assert.equal((await db.productSku.findUnique({where:{id:sku.id}})).quantity,3);
 const increase={key:randomUUID(),rows:[{...row,quantity:'2',inventoryMode:'increment',reason:'Receipt fixture'}],images:{}};const p=await catalogManagement.preview(increase);
 const secondRequest={...increase,key:randomUUID()},secondPreview=await catalogManagement.preview(secondRequest);
 const concurrent=await Promise.all([catalogManagement.apply(owner.id,increase,p.token),catalogManagement.apply(owner.id,secondRequest,secondPreview.token)]);assert.equal(concurrent[0].id,concurrent[1].id);
 assert.equal((await db.productSku.findUnique({where:{id:sku.id}})).quantity,5);assert.equal(await db.inventoryMovement.count({where:{skuId:sku.id}}),2);
 const revision=await catalogManagement.get((await db.product.findUnique({where:{code:row.productCode}})).id);revision.models[0].variants[0].color='Changed';await assert.rejects(()=>catalogManagement.save(owner.id,revision),/movimientos/);
 const bad={...input,key:randomUUID(),rows:[{...row,quantity:'-2'}]};assert.equal((await catalogManagement.preview(bad)).report.valid,false);
 await assert.rejects(async()=>catalogManagement.apply(owner.id,bad,(await catalogManagement.preview(bad)).token),/filas/);
 const changed={key:randomUUID(),rows:[{...row,name:'Changed after preview',quantity:''}],images:{}};const old=await catalogManagement.preview(changed);
 const inventory=createInventory(db,products,'capture');await inventory.move(owner.id,sku.id,{key:randomUUID(),type:'SALE',quantity:1,reason:'Concurrent fixture sale'});
 await assert.rejects(()=>catalogManagement.apply(owner.id,changed,old.token),/Simula/);
 assert.equal((await db.productSku.findUnique({where:{id:sku.id}})).quantity,4);
});
