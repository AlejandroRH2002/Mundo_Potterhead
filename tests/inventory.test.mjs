import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { movementSchema, modelSchema, nextQuantity, inventoryQuerySchema } from '../shared/inventory.ts';
import { createInventory, inventoryMode, assertInventoryReady } from '../server/repositories/inventory.ts';
import { createApi } from '../server/http/app.ts';
import { createAuth } from './fixtures/memoryAuth.ts';
import { parseCatalogQuery } from '../shared/catalogQuery.ts';
import { catalogWhere } from '../server/repositories/catalog.ts';
const input = (type, quantity, rest = {}) => movementSchema.parse({key:randomUUID(), type, quantity, reason:'Conteo probado', ...rest});

test('initial count distinguishes unknown from zero and never copies legacy stock', () => {
  assert.equal(nextQuantity(null,0,input('COUNT',0,{expectedVersion:0})),0);
  assert.equal(nextQuantity(null,0,input('COUNT',5,{expectedVersion:0})),5);
  assert.throws(()=>nextQuantity(null,0,input('RECEIPT',1)),/inicial/);
  assert.throws(()=>nextQuantity(5,1,input('COUNT',4,{expectedVersion:1})),/Ya existe/);
  const sql=readFileSync('prisma/migrations/20261021000000_model_inventory/migration.sql','utf8');
  assert.doesNotMatch(sql,/SELECT[^;]*"stock"/s);assert.match(sql,/BEGIN;/);assert.match(sql,/COMMIT;/);
});
test('receipts, one/multiple sales, shortage, recount with reason and stale versions', () => {
  assert.equal(nextQuantity(3,1,input('RECEIPT',2)),5);
  assert.equal(nextQuantity(3,1,input('SALE',1)),2);
  assert.equal(nextQuantity(3,1,input('SALE',3)),0);
  assert.throws(()=>nextQuantity(3,1,input('SALE',4)),/insuficientes/);
  assert.equal(nextQuantity(3,1,input('ADJUSTMENT',0,{expectedVersion:1})),0);
  assert.throws(()=>nextQuantity(3,2,input('ADJUSTMENT',1,{expectedVersion:1})),/cambió/);
  assert.throws(()=>nextQuantity(1_000_000,1,input('RECEIPT',1)),/rango/);
});
test('strict schemas reject extra fields, negative/fractional input, missing reason and invalid pagination', () => {
  for(const quantity of [-1,0.5,NaN,1000001])assert.equal(movementSchema.safeParse({key:randomUUID(),type:'SALE',quantity,reason:'Venta'}).success,false);
  assert.equal(movementSchema.safeParse({...input('SALE',1),stock:3}).success,false);
  assert.equal(movementSchema.safeParse({...input('SALE',1),reason:''}).success,false);
  assert.equal(movementSchema.safeParse({key:randomUUID(),type:'ADJUSTMENT',quantity:0,reason:'Conteo'}).success,false);
  assert.equal(modelSchema.safeParse({name:'Modelo',quantity:4}).success,false);
  assert.equal(inventoryQuerySchema.safeParse({page:0}).success,false);
});
const draft={id:'product',name:'Chamarra',description:'Dos diseños',price:780,image:'/images/a.webp',images:['/images/b.webp'],category:'clothing',universe:'harry-potter'};
const models=[{id:'a',sku:'MP-a',name:'Modelo A',image:'/images/a.webp',active:true,quantity:3,version:1},{id:'b',sku:'MP-b',name:'Modelo B',image:'/images/b.webp',active:true,quantity:0,version:1}];
const repository={list:()=>[],get:async id=>id==='product'?{...draft,models}:null};
test('quotes use chosen model, aggregate duplicate SKU quantities, preserve stock and reject stale selections', async () => {
  const inventory=createInventory({},repository,'enforce');
  const result=await inventory.quote({lines:[{productId:'product',modelId:'a',quantity:3}]});
  assert.equal(result.lines[0].modelName,'Modelo A');assert.equal(result.lines[0].sku,'MP-a');assert.equal(models[0].quantity,3);
  await assert.rejects(()=>inventory.quote({lines:[{productId:'product',modelId:'a',quantity:2},{productId:'product',modelId:'a',quantity:2}]}),/supera/);
  await assert.rejects(()=>inventory.quote({lines:[{productId:'product',modelId:'b',quantity:1}]}),/supera/);
  await assert.rejects(()=>inventory.quote({lines:[{productId:'product',quantity:1}]}),/Selecciona/);
  await assert.rejects(()=>inventory.quote({lines:[{productId:'product',modelId:'a',quantity:1,selectedImage:'/removed.webp'}]}),/imagen/);
});
test('capture permits unknown quantities; enforce rejects them and configuration is explicit/reversible', async () => {
  const pending={...models[0],quantity:null};const source={get:async()=>({...draft,models:[pending]})};
  assert.equal((await createInventory({},source,'capture').quote({lines:[{productId:'product',quantity:99}]})).lines.length,1);
  await assert.rejects(()=>createInventory({},source,'enforce').quote({lines:[{productId:'product',quantity:1}]}),/disponibilidad/);
  assert.equal(inventoryMode({}),'capture');assert.equal(inventoryMode({INVENTORY_MODE:'enforce'}),'enforce');assert.throws(()=>inventoryMode({INVENTORY_MODE:'random'}));
  await assertInventoryReady({product:{count:async()=>{throw Error('must not query');}}},'capture');
  await assert.rejects(()=>assertInventoryReady({product:{count:async()=>1}},'enforce'),/capturar/);
  await assertInventoryReady({product:{count:async()=>0}},'enforce');
});
test('availability applies before pagination and consistently to public predicates, never admin', () => {
  const query=parseCatalogQuery(new URLSearchParams());
  assert.match(catalogWhere(query,[],'enforce').text,/EXISTS.*ProductModel/);
  assert.match(catalogWhere(query,[],'enforce').text,/quantity">0/);
  assert.doesNotMatch(catalogWhere(query,[],'capture').text,/EXISTS/);
  assert.doesNotMatch(catalogWhere(query,[],'enforce',true).text,/EXISTS|archived/);
});
test('inventory endpoints require admin and CSRF; public quote validates strict input', async () => {
  const password=randomBytes(32).toString('hex'),origin='http://localhost:5173';
  const auth=await createAuth([{id:'admin',name:'Admin',email:'admin@test.invalid',password,role:'admin'},{id:'customer',name:'User',email:'user@test.invalid',password,role:'user'}]);
  const admin=await auth.authenticate('admin@test.invalid',password),user=await auth.authenticate('user@test.invalid',password);
  const inventory={...createInventory({},repository,'enforce'),list:async()=>({items:[],total:0,page:1,pageSize:24})};
  const api=createApi({auth,products:repository,adminProducts:repository,inventory,origin,logger:()=>{}});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  const send=(path,token,method='GET',body,headers={})=>fetch('http://127.0.0.1:'+api.address().port+path,{method,headers:{Origin:origin,'X-Requested-With':'MundoPotterhead','Content-Type':'application/json',...(token?{Cookie:'mp_session='+token}:{}),...headers},body:body?JSON.stringify(body):undefined});
  try {
    assert.equal((await send('/api/admin/inventory')).status,401);
    assert.equal((await send('/api/admin/inventory',user.token)).status,403);
    assert.equal((await send('/api/admin/inventory',admin.token)).status,200);
    assert.equal((await send('/api/admin/products',user.token)).status,403);
    assert.equal((await send('/api/admin/inventory/a/movements',admin.token,'POST',input('SALE',1),{'X-Requested-With':''})).status,403);
    assert.equal((await send('/api/admin/inventory/a/movements',admin.token,'POST',{...input('SALE',1),extra:1})).status,400);
    assert.equal((await send('/api/quote',null,'POST',{lines:[{productId:'product',modelId:'a',quantity:4}]})).status,409);
    assert.equal((await send('/api/quote',null,'POST',{lines:[{productId:'product',modelId:'a',quantity:1}]})).status,200);
  } finally {await new Promise(resolve=>api.close(resolve));}
});

test('repository fixture replays one operation and rolls back balance if ledger insertion fails (not a PostgreSQL test)', async () => {
  let state={quantity:null,version:0,rows:[]},fail=false,active=true;
  let queue=Promise.resolve();
  const tx={
    $queryRaw:async()=>[{id:'model',role:'ADMIN',isActive:active}],
    productModel:{findUnique:async()=>({id:'model',quantity:state.quantity,version:state.version}),update:async({data})=>{state.quantity=data.quantity;state.version++;return state;}},
    inventoryMovement:{findUnique:async({where})=>state.rows.find(row=>row.key===where.key),create:async({data})=>{if(fail)throw Error('fixture insert failed');const row={...data,createdAt:new Date()};state.rows.push(row);return row;}},
  };
  const db={inventoryMovement:tx.inventoryMovement,$transaction:fn=>{
    const result=queue.then(async()=>{const before=structuredClone(state);try{return await fn(tx);}catch(error){state=before;throw error;}});
    queue=result.catch(()=>{});return result;
  }};
  const inventory=createInventory(db,{},'capture');
  const opening=input('COUNT',1,{expectedVersion:0});
  await inventory.move('admin','model',opening);
  const sale=input('SALE',1);const repeated=await Promise.all([inventory.move('admin','model',sale),inventory.move('admin','model',sale)]);
  assert.equal(repeated[0].id,repeated[1].id);assert.equal(state.quantity,0);assert.equal(state.rows.length,2);
  await assert.rejects(()=>inventory.move('admin','model',{...sale,quantity:2}),/clave/);
  await inventory.move('admin','model',input('RECEIPT',2));const before=structuredClone(state);fail=true;
  await assert.rejects(()=>inventory.move('admin','model',input('SALE',1)),/insert failed/);
  assert.deepEqual(state,before);fail=false;
  const last=await Promise.allSettled([inventory.move('admin','model',input('SALE',2)),inventory.move('admin','model',input('SALE',2))]);
  assert.equal(last.filter(result=>result.status==='fulfilled').length,1);assert.equal(state.quantity,0);
  active=false;await assert.rejects(()=>inventory.move('admin','model',input('RECEIPT',1)),/administrador/);
});
