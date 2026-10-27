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
 const product=await captured.create({...draft,image:'/images/b.webp',name:'Inventory '+randomUUID()});const a=product.models[0];
 assert.equal(a.quantity,null);assert.ok(await captured.get(product.id));assert.equal(await enforced.get(product.id),null);
 await assert.rejects(()=>assertInventoryReady(db,'enforce'),/capturar/);
 const move=(id,type,quantity,extra={})=>inventory.move(owner.id,id,{key:randomUUID(),type,quantity,reason:'Isolated fixture',...extra});
 const opening=await move(a.id,'COUNT',3,{expectedVersion:0});assert.equal(opening.before,null);assert.equal(opening.after,3);
 await move(a.id,'RECEIPT',2);assert.equal((await move(a.id,'SALE',2)).after,3);
 const adjusted=await move(a.id,'ADJUSTMENT',1,{expectedVersion:3});assert.equal(adjusted.after,1);
 const last=await Promise.allSettled([move(a.id,'SALE',1),move(a.id,'SALE',1)]);assert.equal(last.filter(result=>result.status==='fulfilled').length,1);
 assert.equal((await db.productSku.findUnique({where:{id:a.id}})).quantity,0);
 assert.equal(await enforced.get(product.id),null);assert.ok(await administration.get(product.id));
 const b=await inventory.model(owner.id,product.id,{name:'Modelo B',image:'/images/b.webp',active:true});await move(b.id,'COUNT',2,{expectedVersion:0});
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

test('variant removal deletes unreferenced SKU, reserves historical codes and keeps ledger balances unchanged',async()=>{
 const owner=await db.user.findUniqueOrThrow({where:{email}});
 const row={...templateRow,status:'active',productCode:'REMOVE-'+randomUUID(),modelCode:'MODEL-'+randomUUID(),sku:'SKU-'+randomUUID(),images:'https://images.test.invalid/removal.webp'};
 const {planImport}=await import('../shared/catalogManagement.ts');
 let document=await catalogManagement.save(owner.id,planImport([row]).products[0]);const productId=document.id,modelId=document.models[0].id,first=document.models[0].variants[0];
 const ambiguous=structuredClone(document);ambiguous.removedVariantIds=[first.id];delete ambiguous.models[0].variants[0].id;await assert.rejects(()=>catalogManagement.save(owner.id,ambiguous),/mismo guardado/);assert.ok(await db.productSku.findUnique({where:{id:first.id}}));
 document.removedVariantIds=[first.id];document.models[0].variants=[];document=await catalogManagement.save(owner.id,document);
 assert.equal(await db.productSku.findUnique({where:{id:first.id}}),null);assert.equal(document.models[0].active,false);
 await assert.rejects(()=>createInventory(db,products,'capture').quote({lines:[{productId,skuId:first.id,quantity:1}]}),/variante activa/);
 document.models[0].active=true;document.models[0].variants=[{code:first.code,size:first.size,color:first.color,images:[],active:true}];document=await catalogManagement.save(owner.id,document);
 const reused=document.models[0].variants[0];assert.notEqual(reused.id,first.id);assert.equal(reused.code,first.code);
 const inventory=createInventory(db,products,'capture');await inventory.move(owner.id,reused.id,{key:randomUUID(),type:'COUNT',quantity:2,expectedVersion:0,reason:'Removal fixture count'});
 document=await catalogManagement.get(productId);document.removedVariantIds=[reused.id];document.models[0].variants=[];document=await catalogManagement.save(owner.id,document);
 const retired=await db.productSku.findUniqueOrThrow({where:{id:reused.id}});assert.equal(retired.active,false);assert.equal(retired.quantity,2);assert.equal(retired.version,1);assert.equal(await db.inventoryMovement.count({where:{skuId:reused.id}}),1);
 await assert.rejects(()=>db.productSku.create({data:{modelId,code:reused.code,size:'xl',color:'New'}}));
 document.models[0].active=true;document.models[0].variants[0].active=true;document=await catalogManagement.save(owner.id,document);assert.equal(document.models[0].variants[0].id,reused.id);
 assert.equal((await inventory.quote({lines:[{productId,skuId:reused.id,quantity:1}]})).lines.length,1);
 const foreign=await catalogManagement.duplicate(owner.id,productId);document=await catalogManagement.get(productId);document.removedVariantIds=[foreign.models[0].variants[0].id];await assert.rejects(()=>catalogManagement.save(owner.id,document),/otro producto/);
 assert.equal((await db.inventoryMovement.findFirst({where:{skuId:reused.id}})).after,2);assert.equal((await db.productSku.findUnique({where:{id:reused.id}})).quantity,2);
});

test('legacy product orders prevent physical SKU deletion even without inventory movements',async()=>{
 const owner=await db.user.findUniqueOrThrow({where:{email}});const {planImport}=await import('../shared/catalogManagement.ts');
 const row={...templateRow,productCode:'ORDER-'+randomUUID(),modelCode:'MODEL-'+randomUUID(),sku:'SKU-'+randomUUID(),images:'https://images.test.invalid/order.webp'};
 let document=await catalogManagement.save(owner.id,planImport([row]).products[0]);const id=document.models[0].variants[0].id;
 const order=await db.order.create({data:{userId:owner.id,total:780,items:{create:{productId:document.id,quantity:1,price:780}}}});
 document.removedVariantIds=[id];document.models[0].variants=[];document=await catalogManagement.save(owner.id,document);
 assert.equal((await db.productSku.findUniqueOrThrow({where:{id}})).active,false);assert.equal(await db.orderItem.count({where:{orderId:order.id,productId:document.id}}),1);assert.equal(await db.inventoryMovement.count({where:{skuId:id}}),0);
});

test('inventory count racing a SKU removal either completes with preserved history or rejects the removed SKU',async()=>{
 const owner=await db.user.findUniqueOrThrow({where:{email}});const {planImport}=await import('../shared/catalogManagement.ts');
 const row={...templateRow,productCode:'RACE-'+randomUUID(),modelCode:'MODEL-'+randomUUID(),sku:'SKU-'+randomUUID(),images:'https://images.test.invalid/race.webp'};
 const document=await catalogManagement.save(owner.id,planImport([row]).products[0]);const id=document.models[0].variants[0].id;document.removedVariantIds=[id];document.models[0].variants=[];
 const inventory=createInventory(db,products,'capture');const outcomes=await Promise.allSettled([catalogManagement.save(owner.id,document),inventory.move(owner.id,id,{key:randomUUID(),type:'COUNT',quantity:2,expectedVersion:0,reason:'Concurrent removal count'})]);assert.equal(outcomes[0].status,'fulfilled');
 const sku=await db.productSku.findUnique({where:{id}}),movements=await db.inventoryMovement.count({where:{skuId:id}});
 if(sku){assert.equal(sku.active,false);assert.equal(sku.quantity,2);assert.equal(movements,1);}else{assert.equal(movements,0);assert.equal(outcomes[1].status,'rejected');}
});

for(const format of ['csv','xlsx'])test(`real PostgreSQL ${format}+ZIP: base product, designs, sizes, image references, replay, update and public detail`,async()=>{
 const {csvFile,parseCsv,recordsFromRows,workbookFile,parseWorkbook,imageArchive}=await import('../shared/catalogFiles.ts');
 const {planImport}=await import('../shared/catalogManagement.ts');
 const {zipSync}=await import('fflate');
 const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='FILES-'+randomUUID();
 const baseRow={...templateRow,productCode:prefix,modelCode:prefix+'-BASE',sku:prefix+'-BASE-M',images:'',status:'active',quantity:'',inventoryMode:'',reason:''};
 const baseProduct=await catalogManagement.save(owner.id,planImport([baseRow]).products[0]);
 // These are archive reference fixtures, NOT an R2 upload or a browser image decoding test.
 const archive=imageArchive(zipSync({'designs/a.png':new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]),'designs/b.png':new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,1])}));
 const images=Object.fromEntries(Object.keys(archive).map(name=>[name,'https://images.test.invalid/'+prefix+'/'+name]));
 const source=[['A','m','3'],['A','l','0'],['B','m','2'],['B','l','']].map(([design,size,quantity])=>({...baseRow,modelCode:prefix+'-'+design,modelName:'Design '+design,sku:prefix+'-'+design+'-'+size,size,images:'designs/'+design.toLowerCase()+'.png',quantity,inventoryMode:quantity?'replace':'',reason:quantity?'Physical fixture count':''}));
 const rows=format==='csv'?recordsFromRows(parseCsv(csvFile(source))):parseWorkbook(workbookFile(source));
 assert.deepEqual(rows,source);
 const request={key:randomUUID(),rows,images};const preview=await catalogManagement.preview(request);assert.equal(preview.report.valid,true);
 assert.equal((await catalogManagement.apply(owner.id,request,preview.token)).updated,1);
 let persisted=await db.product.findUniqueOrThrow({where:{id:baseProduct.id},include:{models:{include:{skus:true}}}});
 assert.equal(persisted.stock,0);assert.equal(persisted.models.length,3);assert.equal(persisted.models.reduce((n,m)=>n+m.skus.length,0),5);assert.ok(persisted.models.every(m=>m.quantity===null));
 for(const design of ['A','B']){const model=persisted.models.find(m=>m.sku===prefix+'-'+design);assert.deepEqual(model.images,[images['designs/'+design.toLowerCase()+'.png']]);for(const sku of model.skus)assert.deepEqual(sku.images,model.images);}
 const beforeReplay=await db.inventoryMovement.count({where:{model:{productId:persisted.id}}});
 await catalogManagement.apply(owner.id,request,preview.token);
 const replay=await catalogManagement.apply(owner.id,{...request,key:randomUUID()},preview.token);assert.equal(replay.skipped,4);assert.equal(await db.inventoryMovement.count({where:{model:{productId:persisted.id}}}),beforeReplay);
 const update={key:randomUUID(),rows:[{...source[0],modelName:'Design A updated',quantity:'',inventoryMode:'',reason:''}],images};
 await catalogManagement.apply(owner.id,update,(await catalogManagement.preview(update)).token);
 persisted=await db.product.findUniqueOrThrow({where:{id:baseProduct.id},include:{models:{include:{skus:true}}}});
 assert.equal(persisted.models.length,3);const modelA=persisted.models.find(m=>m.sku===prefix+'-A');assert.equal(modelA.name,'Design A updated');assert.equal(modelA.skus.length,2);assert.equal(modelA.skus.find(s=>s.size==='m').quantity,3);
 const publicRepo=createDatabaseProducts(db,'capture');const detail=await publicRepo.get(persisted.id);assert.equal(detail.models.length,2);assert.equal(detail.models.find(m=>m.id===modelA.id).skus.length,2);
 const {parseCatalogQuery}=await import('../shared/catalogQuery.ts');const listed=await publicRepo.search(parseCatalogQuery(new URLSearchParams({q:'Design A updated'})));assert.ok(listed.items.some(p=>p.id===persisted.id));assert.ok(listed.items.every(p=>!('models'in p)&&!JSON.stringify(p).includes('data:image')));
 const inventory=createInventory(db,publicRepo,'capture');const exhausted=modelA.skus.find(s=>s.size==='l');
 await assert.rejects(()=>inventory.move(owner.id,exhausted.id,{key:randomUUID(),type:'SALE',quantity:1,reason:'Must not oversell fixture'}),/insuficientes/);
 const strictInventory=createInventory(db,createDatabaseProducts(db,'enforce'),'enforce');await assert.rejects(()=>strictInventory.quote({lines:[{productId:persisted.id,skuId:exhausted.id,quantity:1}]}),/existencias/);
 const available=modelA.skus.find(s=>s.size==='m');const quote=await strictInventory.quote({lines:[{productId:persisted.id,skuId:available.id,quantity:1}]});assert.equal(quote.lines[0].sku,available.code);assert.equal(quote.lines[0].modelName,'Design A updated');
 const history=await inventory.history(available.id,{page:1,pageSize:24});assert.equal(history.items.length,1);assert.equal(history.items[0].after,3);assert.equal(history.items[0].actorId,owner.id);assert.ok((await catalogManagement.history(1)).some(item=>item.id===update.key));
});

test('failed multi-product import rolls back products, images, quantities, history and request key, then retries',async()=>{
 const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='ROLL-'+randomUUID();
 const make=(suffix,reason)=>({...templateRow,productCode:prefix+'-'+suffix,modelCode:prefix+'-MODEL-'+suffix,sku:prefix+'-SKU-'+suffix,images:'https://images.test.invalid/'+suffix+'.webp',quantity:'2',inventoryMode:'replace',reason});
 const request={key:randomUUID(),rows:[make('A','Valid fixture'),make('B','import-rollback-fixture')],images:{}};
 const initial={key:randomUUID(),rows:[{...make('A','Existing fixture'),name:'Before rollback',images:'https://images.test.invalid/before.webp',quantity:'1'}],images:{}};await catalogManagement.apply(owner.id,initial,(await catalogManagement.preview(initial)).token);
 const original=await db.product.findUniqueOrThrow({where:{code:prefix+'-A'},include:{models:{include:{skus:true}}}});
 const preview=await catalogManagement.preview(request);assert.equal(preview.report.valid,true);
 await db.$executeRaw`CREATE FUNCTION mp_import_test_fail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW."reason"='import-rollback-fixture' THEN RAISE EXCEPTION 'import fixture failure'; END IF; RETURN NEW; END; $$`;
 await db.$executeRaw`CREATE TRIGGER mp_import_test_fail BEFORE INSERT ON "InventoryMovement" FOR EACH ROW EXECUTE FUNCTION mp_import_test_fail()`;
 try{await assert.rejects(()=>catalogManagement.apply(owner.id,request,preview.token));}finally{await db.$executeRaw`DROP TRIGGER mp_import_test_fail ON "InventoryMovement"`;await db.$executeRaw`DROP FUNCTION mp_import_test_fail()`;}
 assert.equal(await db.product.count({where:{code:{startsWith:prefix}}}),1);assert.equal(await db.productModel.count({where:{sku:{startsWith:prefix}}}),1);assert.equal(await db.productSku.count({where:{code:{startsWith:prefix}}}),1);assert.deepEqual(await db.product.findUniqueOrThrow({where:{id:original.id},include:{models:{include:{skus:true}}}}),original);assert.equal(await db.catalogImport.count({where:{id:request.key}}),0);assert.equal(await db.inventoryMovement.count({where:{reason:'import-rollback-fixture'}}),0);
 const retried=await catalogManagement.apply(owner.id,request,preview.token);assert.equal(retried.created,1);assert.equal(retried.updated,1);assert.equal(await db.inventoryMovement.count({where:{model:{product:{code:{startsWith:prefix}}}}}),3);
});

test('import updates inventory without reactivating retired model/SKU or changing prior ledger entries',async()=>{
 const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='RETIRED-'+randomUUID();
 const row={...templateRow,productCode:prefix,modelCode:prefix+'-MODEL',sku:prefix+'-M',images:'https://images.test.invalid/retired.webp',quantity:'2',inventoryMode:'replace',reason:'Initial fixture'};
 const first={key:randomUUID(),rows:[row],images:{}};await catalogManagement.apply(owner.id,first,(await catalogManagement.preview(first)).token);
 const product=await db.product.findUniqueOrThrow({where:{code:prefix}});let managed=await catalogManagement.get(product.id);managed.models[0].active=false;managed.models[0].variants[0].active=false;managed=await catalogManagement.save(owner.id,managed);
 const sku=managed.models[0].variants[0];const ledgerBefore=await db.inventoryMovement.findMany({where:{skuId:sku.id}});
 const receipt={key:randomUUID(),rows:[{...row,quantity:'1',inventoryMode:'increment',reason:'Receipt fixture'}],images:{}};await catalogManagement.apply(owner.id,receipt,(await catalogManagement.preview(receipt)).token);
 const after=await db.productSku.findUniqueOrThrow({where:{id:sku.id},include:{model:true}});assert.equal(after.quantity,3);assert.equal(after.active,false);assert.equal(after.model.active,false);assert.deepEqual(await db.inventoryMovement.findMany({where:{id:{in:ledgerBefore.map(m=>m.id)}}}),ledgerBefore);
 const same={key:randomUUID(),rows:[{...row,quantity:'3',reason:'No change fixture'}],images:{}};await catalogManagement.apply(owner.id,same,(await catalogManagement.preview(same)).token);assert.equal(await db.inventoryMovement.count({where:{skuId:sku.id}}),2);
});

test('import HTTP authorization, history, strict invalid rows and failed requests leave no writes',async()=>{
 const ownerSession=await auth.authenticate(email,password),ownerCookie='__Host-mp_session='+ownerSession.token;
 const {hashPassword}=await import('../server/security/password.ts');const customer=await db.user.create({data:{email:randomUUID()+'@test.invalid',password:await hashPassword(password),role:'CUSTOMER'}});const session=await auth.authenticate(customer.email,password),cookie='__Host-mp_session='+session.token;
 const prefix='HTTPIMP-'+randomUUID(),row={...templateRow,productCode:prefix,modelCode:prefix+'-MODEL',sku:prefix+'-SKU',images:'https://images.test.invalid/http.webp',quantity:'2',inventoryMode:'replace',reason:'HTTP fixture'};
 const request={key:randomUUID(),rows:[row],images:{}};const preview=await catalogManagement.preview(request);
 for(const [path,method,payload] of [['/api/admin/catalog/import','POST',{request,token:preview.token}],['/api/admin/catalog/history','GET',undefined],['/api/admin/catalog','GET',undefined],['/api/admin/catalog','POST',{}],['/api/admin/catalog/bulk','PATCH',{}],['/api/admin/catalog/missing/duplicate','POST',{}]]){
  assert.equal((await send(path,{method,payload})).status,401);assert.equal((await send(path,{method,payload,cookie})).status,403);
 }
 assert.equal((await send('/api/admin/catalog/import',{method:'POST',cookie:ownerCookie,payload:{request,token:preview.token},headers:{'X-Requested-With':''}})).status,403);
 assert.equal((await send('/api/admin/catalog/import',{method:'POST',cookie:ownerCookie,from:'https://outside.test.invalid',payload:{request,token:preview.token}})).status,403);
 assert.equal((await send('/api/admin/catalog/import',{method:'POST',cookie:ownerCookie,payload:{request,token:'tampered'}})).status,409);
 for(const rows of [[{...row,quantity:'-1'}],[row,row],[{...row,size:'invalid'}],[{...row,images:'javascript:alert(1)'}],[{...row,unexpected:'value'}]]){
  const invalid={...request,key:randomUUID(),rows};const check=await catalogManagement.preview(invalid);assert.equal(check.report.valid,false);assert.ok(check.report.errors.every(issue=>issue.row>=2));
  assert.equal((await send('/api/admin/catalog/import',{method:'POST',cookie:ownerCookie,payload:{request:invalid,token:check.token}})).status,400);
 }
 assert.equal(await db.product.count({where:{code:prefix}}),0);assert.equal(await db.catalogImport.count({where:{id:request.key}}),0);
 assert.equal((await send('/api/admin/catalog/import',{method:'POST',cookie:ownerCookie,payload:{request,token:preview.token}})).status,200);
 const history=await send('/api/admin/catalog/history',{cookie:ownerCookie});assert.equal(history.status,200);assert.ok((await history.json()).some(item=>item.id===request.key));
 const product=await db.product.findUniqueOrThrow({where:{code:prefix}}),managed=await catalogManagement.get(product.id);
 const duplicate=await send('/api/admin/catalog/'+product.id+'/duplicate',{method:'POST',cookie:ownerCookie});assert.equal(duplicate.status,201);const copy=await duplicate.json();assert.equal(copy.status,'draft');assert.notEqual(copy.models[0].variants[0].code,managed.models[0].variants[0].code);assert.equal((await db.productSku.findUnique({where:{id:copy.models[0].variants[0].id}})).quantity,null);
 const collision={...request,rows:[{...row,name:'Different payload'}]};await assert.rejects(()=>catalogManagement.apply(ownerSession.user.id,collision,preview.token),/clave/);
});

test('isolated enforce import applies initial counts before readiness and rolls back incomplete active products',async()=>{
 const previous=process.env.INVENTORY_MODE;process.env.INVENTORY_MODE='enforce';
 try{
  const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='ENFORCE-'+randomUUID();
  const row={...templateRow,productCode:prefix,modelCode:prefix+'-MODEL',sku:prefix+'-M',images:'https://images.test.invalid/enforce.webp',status:'active',quantity:'2',inventoryMode:'replace',reason:'Initial active fixture'};
  const request={key:randomUUID(),rows:[row],images:{}};assert.equal((await catalogManagement.preview(request)).report.valid,true);await catalogManagement.apply(owner.id,request,(await catalogManagement.preview(request)).token);assert.equal((await db.productSku.findUniqueOrThrow({where:{code:row.sku}})).quantity,2);
  const incomplete={key:randomUUID(),rows:[{...row,productCode:prefix+'-PENDING',modelCode:prefix+'-PENDING-MODEL',sku:prefix+'-PENDING-M',quantity:'',inventoryMode:'',reason:''}],images:{}};
  const check=await catalogManagement.preview(incomplete);await assert.rejects(()=>catalogManagement.apply(owner.id,incomplete,check.token),/inventario/);
  assert.equal(await db.product.count({where:{code:prefix+'-PENDING'}}),0);assert.equal(await db.catalogImport.count({where:{id:incomplete.key}}),0);
 }finally{if(previous===undefined)delete process.env.INVENTORY_MODE;else process.env.INVENTORY_MODE=previous;}
});

test('parent design import: 30 drafts, inherited properties, progressive photos, SKU history and replay',async()=>{
 const {planImport,designColumns}=await import('../shared/catalogManagement.ts');const {csvFile,parseCsv,recordsFromRows}=await import('../shared/catalogFiles.ts');const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='PARENT-'+randomUUID();
 const parentDraft=planImport([{...templateRow,productCode:prefix,modelCode:prefix+'-BASE',sku:prefix+'-BASE',images:'',status:'active',quantity:'',inventoryMode:'',reason:''}]).products[0];parentDraft.models=[];const parent=await catalogManagement.save(owner.id,parentDraft);
 const original=await db.product.findUniqueOrThrow({where:{id:parent.id}});const order=await db.order.create({data:{userId:owner.id,total:Number(original.price),items:{create:{productId:parent.id,quantity:1,price:Number(original.price)}}}});
 const rows=recordsFromRows(parseCsv(csvFile(Array.from({length:30},(_,i)=>({modelCode:prefix+'-'+i,modelName:'Design '+i,size:'one',quantity:String(i%4),sku:'',color:''})),designColumns)),'designs');
 const request={key:randomUUID(),parentId:parent.id,rows,images:{}};const check=await catalogManagement.preview(request);assert.equal(check.report.valid,true);assert.equal(check.report.newModels,30);assert.equal(check.report.newSkus,30);
 await catalogManagement.apply(owner.id,request,check.token);let managed=await catalogManagement.get(parent.id);const designs=managed.models.filter(model=>model.code!==prefix+'-BASE');assert.equal(designs.length,30);assert.ok(designs.every(model=>!model.active&&!model.images.length&&model.variants.length===1));
 const identities=designs.map(model=>model.variants[0].id);const inventory=createInventory(db,products,'capture');const listed=await inventory.list({productId:parent.id,page:1,pageSize:100,status:'all',q:''});assert.equal(listed.items.length,30);assert.equal(listed.items.find(row=>row.id===designs.find(model=>model.code===prefix+'-1').variants[0].id).quantity,1);
 assert.equal((await products.get(parent.id)).models.length,0);const beforeLedger=await db.inventoryMovement.findMany({where:{skuId:{in:identities}},orderBy:{id:'asc'}});assert.equal(beforeLedger.length,30);
 const incomplete=structuredClone(managed);incomplete.models.find(model=>model.code===designs[1].code).active=true;await assert.rejects(()=>catalogManagement.save(owner.id,incomplete),/fotografía/);
 managed.product.price=999;managed.product.description='Parent description updated';managed=await catalogManagement.save(owner.id,managed);
 const chosen=managed.models.find(model=>model.code===designs[0].code);chosen.images=['https://images.test.invalid/design-first.webp'];managed=await catalogManagement.save(owner.id,managed);assert.equal(managed.models.find(model=>model.id===chosen.id).active,false);assert.equal(managed.models.filter(m=>m.images.length).length,1);
 managed.models.find(model=>model.id===chosen.id).active=true;managed=await catalogManagement.save(owner.id,managed);
 const detail=await products.get(parent.id);assert.equal(detail.price,999);assert.equal(detail.description,'Parent description updated');assert.equal(detail.models.length,1);assert.equal(detail.models[0].id,chosen.id);assert.deepEqual(detail.models[0].images,chosen.images);
 const quote=await inventory.quote({lines:[{productId:parent.id,skuId:chosen.variants[0].id,quantity:1,selectedImage:chosen.images[0]}]});assert.equal(quote.lines[0].product.price,999);
 const secondPhoto='https://images.test.invalid/design-replaced.webp';managed.models.find(model=>model.id===chosen.id).images=[secondPhoto];await catalogManagement.save(owner.id,managed);assert.equal((await products.get(parent.id)).models[0].image,secondPhoto);
 const replay=await catalogManagement.apply(owner.id,{...request,key:randomUUID()},check.token);assert.equal(replay.skipped,30);assert.equal((await catalogManagement.get(parent.id)).product.price,999);assert.equal(await db.productModel.count({where:{productId:parent.id}}),30);assert.deepEqual(await db.inventoryMovement.findMany({where:{skuId:{in:identities}},orderBy:{id:'asc'}}),beforeLedger);
 assert.equal((await db.orderItem.findFirst({where:{orderId:order.id}})).price,Number(original.price));assert.equal((await db.product.findUniqueOrThrow({where:{id:parent.id}})).stock,0);
 const changedRequest={...request,key:randomUUID(),rows:[{...rows[0],quantity:'2'}]};const oldPreview=await catalogManagement.preview(changedRequest);managed=await catalogManagement.get(parent.id);managed.product.price=1001;await catalogManagement.save(owner.id,managed);await assert.rejects(()=>catalogManagement.apply(owner.id,changedRequest,oldPreview.token),/Simula/);
});

test('parent design XLSX imports multiple sizes and stable generated SKUs, rejects wrong sizes and duplicates',async()=>{
 const {planImport,designColumns}=await import('../shared/catalogManagement.ts');const {workbookFile,parseWorkbook}=await import('../shared/catalogFiles.ts');const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='SIZES-'+randomUUID();
 const parent=await catalogManagement.save(owner.id,planImport([{...templateRow,productCode:prefix,modelCode:prefix+'-BASE',sku:prefix+'-BASE',images:'',status:'draft'}]).products[0]);
 const rows=parseWorkbook(workbookFile(['s','m','l','xl'].map(size=>({modelCode:prefix+'-DESIGN',modelName:'Design sizes',size,quantity:'2',color:'Rojo',sku:''})),designColumns),'designs');const request={key:randomUUID(),parentId:parent.id,rows,images:{}};
 const check=await catalogManagement.preview(request);assert.equal(check.report.newModels,1);assert.equal(check.report.newSkus,4);await catalogManagement.apply(owner.id,request,check.token);const model=await db.productModel.findUniqueOrThrow({where:{sku:prefix+'-DESIGN'},include:{skus:true}});assert.equal(model.skus.length,4);assert.equal(new Set(model.skus.map(s=>s.code)).size,4);assert.ok(model.skus.every(s=>s.quantity===2));
 for(const invalidRows of [[rows[0],rows[0]],[{...rows[0],size:'22'}],[{...rows[0],price:'1'}],[{...rows[0],sku:model.skus.find(s=>s.size!=='s').code}]]){const invalid={...request,key:randomUUID(),rows:invalidRows};const p=await catalogManagement.preview(invalid);assert.equal(p.report.valid,false);await assert.rejects(()=>catalogManagement.apply(owner.id,invalid,p.token));}
 const again=await catalogManagement.preview({...request,key:randomUUID()});assert.equal(again.report.existingModels,1);assert.equal(again.report.existingSkus,4);
});

test('100 independent design photo galleries remain valid and public detail contains no photo-less designs',async()=>{
 const {planImport}=await import('../shared/catalogManagement.ts');const owner=await db.user.findUniqueOrThrow({where:{email}}),prefix='HUNDRED-'+randomUUID();
 const parent=await catalogManagement.save(owner.id,planImport([{...templateRow,productCode:prefix,modelCode:prefix+'-BASE',sku:prefix+'-BASE',images:'',status:'active'}]).products[0]);
 const request={key:randomUUID(),parentId:parent.id,rows:Array.from({length:100},(_,i)=>({modelCode:prefix+'-'+i,modelName:'Design '+i})),images:{}};const p=await catalogManagement.preview(request);assert.equal(p.report.valid,true);await catalogManagement.apply(owner.id,request,p.token);
 let managed=await catalogManagement.get(parent.id);for(const [i,model] of managed.models.entries())if(model.code!==prefix+'-BASE'){model.images=['https://images.test.invalid/100/'+i+'.webp'];model.active=true;}
 managed=await catalogManagement.save(owner.id,managed);const detail=await products.get(parent.id);assert.equal(detail.models.length,100);assert.ok(detail.models.every(model=>model.images.length===1));assert.ok((detail.images??[]).length<=7);
 const {isProduct}=await import('../src/features/catalog/services/productValidation.ts');assert.equal(isProduct(detail),true);assert.equal((await catalogManagement.get(parent.id)).models.length,101);
});

test('guided product workflow stages 30 designs atomically, edits one, preserves history and returns a parent-only listing',async()=>{
 const {stageDesigns,publicationProblem}=await import('../src/features/admin-catalog/services/productWizard.ts');const {singleDesign,addVariant,removeVariant,removeDesign}=await import('../src/features/admin-catalog/services/editorActions.ts');const owner=await db.user.findUniqueOrThrow({where:{email}}),code='GUIDED-'+randomUUID();
 const value={code,status:'draft',product:{name:'Frazada individual '+code,description:'Medidas 1.60 × 2.20 m. Características compartidas.',price:350,category:'accessories',universe:'harry-potter',images:[]},models:[]};
 const single=singleDesign(value);assert.equal(single.models[0].variants.length,1);assert.equal(single.models[0].variants[0].size,'one');
 const rows=Array.from({length:30},(_,i)=>({modelCode:code+'-'+i,modelName:'Diseño '+i}));const plan=stageDesigns(value,rows);assert.equal(plan.errors.length,0);assert.equal(await db.product.count({where:{code}}),0);let saved=await catalogManagement.save(owner.id,plan.products[0]);assert.equal(saved.models.length,30);assert.equal(await products.get(saved.id),null);
 saved.models[0].images=['https://images.test.invalid/guided.webp'];saved.models[0].active=true;saved.status='active';assert.equal(publicationProblem(saved),undefined);saved=await catalogManagement.save(owner.id,saved);
 const unchanged=saved.models.slice(1);saved.models[0].name='Diseño editado';saved=await catalogManagement.save(owner.id,saved);assert.deepEqual(saved.models.slice(1),unchanged);
 const before=saved.models[0].variants.length,withOption=addVariant(saved,0);assert.equal(withOption.models[0].variants.length,before+1);assert.equal(removeVariant(withOption,0,before).models[0].variants.length,before);
 const inventory=createInventory(db,products,'capture'),option=saved.models[0].variants[0];await inventory.move(owner.id,option.id,{key:randomUUID(),type:'COUNT',quantity:3,expectedVersion:0,reason:'Guided count'});const history=await inventory.history(option.id,{page:1,pageSize:24});saved.product.price=400;saved=await catalogManagement.save(owner.id,saved);assert.equal((await products.get(saved.id)).price,400);assert.deepEqual(await inventory.history(option.id,{page:1,pageSize:24}),history);
 const listed=await catalogManagement.list({page:1,q:value.product.name});const row=listed.items.find(p=>p.id===saved.id);assert.equal(row.designCount,30);assert.equal(row.price,400);assert.equal(row.image,'https://images.test.invalid/guided.webp');assert.equal('models'in row,false);
 const retired=removeDesign(saved,0);saved=await catalogManagement.save(owner.id,retired);assert.equal(saved.models[0].active,false);assert.equal((await db.productSku.findUniqueOrThrow({where:{id:option.id}})).quantity,3);assert.deepEqual(await inventory.history(option.id,{page:1,pageSize:24}),history);assert.equal((await products.get(saved.id)).models.length,0);
});

test('employee photo and inventory lifecycle: three designs, persisted thumbnails, stock, size and publication',async()=>{
 const {planDesignImport}=await import('../server/lib/designImport.ts');const owner=await db.user.findUniqueOrThrow({where:{email}}),code='PHOTO-LIFE-'+randomUUID();const parent={code,status:'draft',product:{name:'Frazada individual '+code,description:'Medida individual. Información compartida.',price:350,category:'clothing',universe:'harry-potter',images:[]},models:[]};
 const plan=planDesignImport(parent,[1,2,3].map(i=>({modelCode:code+'-'+i,modelName:'Diseño '+i})));assert.equal(plan.errors.length,0);let saved=await catalogManagement.save(owner.id,plan.products[0]);assert.equal(await products.get(saved.id),null);
 const chosen=saved.models.find(m=>m.code===code+'-1'),other=saved.models.filter(m=>m.id!==chosen.id),full='https://images.test.invalid/lifecycle-full.webp',thumb='https://images.test.invalid/lifecycle-thumb.webp';chosen.images=[full];chosen.variants[0].size='m';saved.product.imageThumbnails={[full]:thumb};saved=await catalogManagement.save(owner.id,saved);const reloaded=await catalogManagement.get(saved.id);assert.deepEqual(reloaded.models.filter(m=>m.id!==chosen.id),other);assert.equal(reloaded.product.imageThumbnails[full],thumb);assert.equal(reloaded.models.find(m=>m.id===chosen.id).variants[0].size,'m');
 const inventory=createInventory(db,products,'capture'),sku=chosen.variants[0];await inventory.move(owner.id,sku.id,{key:randomUUID(),type:'COUNT',quantity:8,expectedVersion:0,reason:'Employee physical count'});const history=await inventory.history(sku.id,{page:1,pageSize:24});assert.equal(history.items[0].after,8);
 const invalid=structuredClone(reloaded);invalid.models.find(m=>m.id===chosen.id).variants[0].size='l';await assert.rejects(()=>catalogManagement.save(owner.id,invalid),/movimientos/);
 const replacement='https://images.test.invalid/lifecycle-replaced.webp',replacementThumb='https://images.test.invalid/lifecycle-replaced-thumb.webp';reloaded.models.find(m=>m.id===chosen.id).images=[replacement];reloaded.models.find(m=>m.id===chosen.id).active=true;reloaded.product.imageThumbnails={[replacement]:replacementThumb};reloaded.status='active';saved=await catalogManagement.save(owner.id,reloaded);
 const publicDetail=await products.get(saved.id);assert.equal(publicDetail.models.length,1);assert.equal(publicDetail.models[0].id,chosen.id);assert.equal(publicDetail.models[0].thumbnail,replacementThumb);assert.equal(publicDetail.models[0].skus[0].quantity,8);assert.deepEqual(await inventory.history(sku.id,{page:1,pageSize:24}),history);assert.equal((await inventory.get(sku.id)).thumbnail,replacementThumb);assert.deepEqual((await catalogManagement.get(saved.id)).models.filter(m=>m.id!==chosen.id),other);
 const incomplete=await catalogManagement.get(saved.id);incomplete.models.find(m=>m.id!==chosen.id).active=true;await assert.rejects(()=>catalogManagement.save(owner.id,incomplete),/fotografía/);assert.equal((await products.get(saved.id)).models.length,1);
});
