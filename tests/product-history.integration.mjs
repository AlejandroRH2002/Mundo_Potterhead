import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {createDatabaseProducts} from '../server/repositories/products.ts';
import {createCatalogManagement} from '../server/repositories/catalogManagement.ts';
import {createInventory} from '../server/repositories/inventory.ts';
import {createApi} from '../server/http/app.ts';
import {createAuth} from './fixtures/memoryAuth.ts';
import {createTestViteServer} from './fixtures/viteServer.mjs';

let isolatedUrl;try{isolatedUrl=new URL(process.env.DATABASE_URL??'');}catch{throw Error('Use the isolated product-history runner.');}
if(process.env.MP_HISTORY_ISOLATED!=='true'||!['localhost','127.0.0.1'].includes(isolatedUrl.hostname)||isolatedUrl.username!=='mp_test'||isolatedUrl.pathname!=='/mp_test')throw Error('Use pnpm test:product-history; never run against an existing database.');
const stored=new Map();globalThis.window=new EventTarget();globalThis.localStorage={getItem:key=>stored.get(key)??null,setItem:(key,value)=>stored.set(key,value),removeItem:key=>stored.delete(key)};
const db=new PrismaClient(),secret=process.env.SESSION_SECRET,ownerId=randomUUID();
await db.user.create({data:{id:ownerId,email:randomUUID()+'@fixture.invalid',password:'unused-test-hash',role:'ADMIN',name:'Test admin'}});
const testPassword=randomBytes(32).toString('hex');
const auth=await createAuth([{id:ownerId,name:'Test admin',email:'admin@test.invalid',password:testPassword,role:'admin'}]);
const products=createDatabaseProducts(db),catalog=createCatalogManagement(db,secret),api=createApi({auth,products,adminProducts:createDatabaseProducts(db,'capture',true),inventory:createInventory(db,products,'capture'),origin:'http://localhost:5173',logger:()=>{}});
await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+api.address().port;
process.env.VITE_API_URL=origin+'/api';const vite=await createTestViteServer();
const {productService}=await vite.ssrLoadModule('/src/features/catalog/services/productService.ts');
after(async()=>{await vite.close();await new Promise(resolve=>api.close(resolve));await db.$disconnect();});
async function product(name,{status='active',models=1}={}){
 const code=randomUUID();return db.product.create({data:{name,code,description:'Fixture shared description',category:'bags',subcategory:'mochilas',universe:'harry-potter',price:500,status,imageUrl:'https://images.test.invalid/'+code+'-0.webp',models:{create:Array.from({length:models},(_,index)=>({name:'Design '+index,sku:'MODEL-'+randomUUID(),active:true,image:'https://images.test.invalid/'+code+'-'+index+'.webp',images:['https://images.test.invalid/'+code+'-'+index+'.webp'],skus:{create:{code:'SKU-'+randomUUID(),size:'one',active:true}}}))}},include:{models:{include:{skus:true}}}});
}
async function group(target,source){const request={key:randomUUID(),targetId:target.id,sourceIds:[source.id]},preview=await catalog.groupPreview(request);assert.equal(preview.report.valid,true,preview.report.conflicts.join('; '));await catalog.groupApply(ownerId,request,preview.token);}
const request=id=>fetch(origin+'/api/products/'+encodeURIComponent(id));

test('active individual and multi-design family work through frontend service and real API',async()=>{
 const single=await product('Single'),family=await product('Family',{models:3});const loaded=await productService.getById(single.id);assert.equal(loaded.id,single.id);assert.equal(loaded.models[0].skus[0].id,single.models[0].skus[0].id);assert.equal((await productService.getById(family.id)).models.length,3);
});
test('old grouped link resolves a public family and original design without changing inventory/orders',async()=>{
 const target=await product('Parent'),source=await product('Hedwig');const sku=source.models[0].skus[0];await createInventory(db,products,'capture').move(ownerId,sku.id,{key:randomUUID(),type:'COUNT',quantity:3,expectedVersion:0,reason:'Fixture initial count'});await db.order.create({data:{userId:ownerId,total:450,items:{create:{productId:source.id,price:450,quantity:1}}}});await group(target,source);
 const before=await db.productSku.findUniqueOrThrow({where:{id:sku.id}}),ledger=await db.inventoryMovement.findMany({where:{skuId:sku.id}}),orders=await db.orderItem.findMany({where:{productId:source.id}});const loaded=await productService.getById(source.id);assert.equal(loaded.id,target.id);assert.deepEqual(loaded.resolvedFrom,{id:source.id,modelId:source.models[0].id});assert.ok(loaded.models.some(model=>model.id===loaded.resolvedFrom.modelId));assert.equal(await products.get(source.id),null);const inventory=createInventory(db,products,'capture'),quote=await inventory.quote({lines:[{productId:loaded.id,skuId:sku.id,selectedImage:source.models[0].image,quantity:1}]});assert.equal(quote.lines[0].skuId,sku.id);assert.equal(quote.lines[0].product.id,target.id);const {whatsappOrder}=await vite.ssrLoadModule('/src/features/cart/services/cartService.ts');const message=new URL(whatsappOrder(quote.lines,'15555550123')).searchParams.get('text');assert.ok(message.includes('Hedwig')&&message.includes(sku.code));await assert.rejects(()=>inventory.quote({lines:[{productId:source.id,skuId:sku.id,quantity:1}]}),error=>error.status===409);const listing=await products.list();assert.ok(!listing.some(item=>item.id===source.id));const search=await productService.search({page:1,pageSize:24,sort:'novedad',q:'Hedwig'});assert.ok(search.items.some(item=>item.id===target.id));assert.ok(!search.items.some(item=>item.id===source.id));assert.deepEqual(await db.productSku.findUniqueOrThrow({where:{id:sku.id}}),before);assert.deepEqual(await db.inventoryMovement.findMany({where:{skuId:sku.id}}),ledger);assert.deepEqual(await db.orderItem.findMany({where:{productId:source.id}}),orders);
});
test('archived is unavailable, nonexistent/private draft is not found and no hidden details are returned',async()=>{
 const archived=await product('SECRET ARCHIVED',{status:'archived'}),draft=await product('SECRET DRAFT',{status:'draft'});for(const [id,code] of [[archived.id,'PRODUCT_UNAVAILABLE'],[draft.id,undefined],[randomUUID(),undefined]]){const response=await request(id);assert.equal(response.status,404);const body=await response.json();assert.equal(body.code,code);assert.ok(!JSON.stringify(body).includes('SECRET'));await assert.rejects(()=>productService.getById(id),error=>error.status===404);}
});
test('historical IDs cannot expose unpublished family or inactive designs; multi-design origins are not guessed',async()=>{
 const target=await product('Family secure'),source=await product('Original secure');await group(target,source);await db.product.update({where:{id:target.id},data:{status:'draft'}});let response=await request(source.id);assert.equal(response.status,404);assert.ok(!JSON.stringify(await response.json()).includes(target.id));const session=await auth.authenticate('admin@test.invalid',testPassword);assert.equal((await fetch(origin+'/api/admin/products/'+target.id,{headers:{Cookie:'mp_session='+session.token}})).status,200);assert.equal((await fetch(origin+'/api/products/'+source.id,{headers:{Cookie:'mp_session='+session.token}})).status,404);assert.equal((await createDatabaseProducts(db,'capture',true).resolvePublic(source.id)).kind,'not-found');await db.product.update({where:{id:target.id},data:{status:'active'}});await db.productModel.update({where:{id:source.models[0].id},data:{active:false}});assert.equal((await request(source.id)).status,404);
 const second=await product('Second parent'),multiple=await product('Two original designs',{models:2});await group(second,multiple);const loaded=await productService.getById(multiple.id);assert.equal(loaded.id,second.id);assert.equal(loaded.resolvedFrom.modelId,undefined);
});
test('aliases with no audit mapping and alias chains fail closed; enforce visibility is retained',async()=>{
 const target=await product('Public family'),source=await product('Unmapped original',{status:'archived'});await db.product.update({where:{id:source.id},data:{groupedIntoId:target.id}});assert.equal((await request(source.id)).status,404);const hidden=await product('Hidden middle',{status:'archived'});await db.product.update({where:{id:hidden.id},data:{groupedIntoId:target.id}});await db.product.update({where:{id:source.id},data:{groupedIntoId:hidden.id}});assert.equal((await request(source.id)).status,404);
 const parent=await product('Enforced family'),original=await product('Enforced original');await group(parent,original);assert.equal((await createDatabaseProducts(db,'enforce').resolvePublic(original.id)).kind,'unavailable');
});
