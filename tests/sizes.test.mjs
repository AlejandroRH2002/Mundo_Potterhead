import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Readable} from 'node:stream';
import {S3Client} from '@aws-sdk/client-s3';
import {sizeTaxonomy,validSize,sizedSkuSchema} from '../shared/sizes.ts';
import {modelBackfillPlan} from '../server/catalog/modelBackfill.ts';
import {createDatabaseProducts} from '../server/repositories/products.ts';
import {catalogWhere} from '../server/repositories/catalog.ts';
import {parseCatalogQuery} from '../shared/catalogQuery.ts';
import {createMediaStorage} from '../server/media.ts';
import {createInventory} from '../server/repositories/inventory.ts';
import {compressImage} from '../src/features/admin-products/services/compressImage.ts';

test('the reused browser compressor generates a 400px WebP thumbnail without upscaling',async()=>{
 const oldDocument=globalThis.document,oldBitmap=globalThis.createImageBitmap;let closed=false;
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{}}),toBlob:(callback,type,quality)=>{assert.equal(type,'image/webp');assert.equal(quality,0.8);callback(new Blob(['fixture'],{type}));}};
 globalThis.document={createElement:()=>canvas};globalThis.createImageBitmap=async()=>({width:2400,height:1600,close:()=>{closed=true;}});
 try{const file=await compressImage(new File(['source'],'original.jpg',{type:'image/jpeg'}),400);assert.equal(canvas.width,400);assert.equal(canvas.height,267);assert.equal(file.type,'image/webp');assert.equal(closed,true);}
 finally{globalThis.document=oldDocument;globalThis.createImageBitmap=oldBitmap;}
});

test('controlled sizes accept category-specific values and default to one size',()=>{
 for(const category of Object.keys(sizeTaxonomy))assert.equal(sizedSkuSchema.parse({category}).size,'one');
 for(const size of ['xs','s','m','l','xl','xxl','one'])assert.ok(validSize('clothing',size));
 assert.equal(sizeTaxonomy.footwear.length,18);for(const size of ['22','22.5','29.5','30'])assert.ok(validSize('footwear',size));
 for(const [category,size] of [['clothing','22'],['footwear','xs'],['footwear','30.5'],['bags','m'],['toys','22'],['accessories','xl']])assert.equal(sizedSkuSchema.safeParse({category,size}).success,false);
 assert.throws(()=>parseCatalogQuery(new URLSearchParams('category=clothing&size=22')));
 assert.equal(parseCatalogQuery(new URLSearchParams('category=clothing&size=m')).size,'m');
});
test('model and size are uniquely constrained; migration preserves legacy references and balances',()=>{
 const schema=readFileSync('prisma/schema.prisma','utf8');assert.match(schema,/@@unique\(\[modelId, size, color\]\)/);
 const sql=readFileSync('prisma/migrations/20261026000000_sized_skus_search/migration.sql','utf8');
 assert.match(sql,/UNIQUE \("modelId","size"\)/);assert.match(sql,/SELECT "id","id","sku","quantity","version" FROM "ProductModel"/);
 assert.match(sql,/UPDATE "InventoryMovement" SET "skuId"="modelId"/);assert.doesNotMatch(sql,/DROP TABLE|DELETE FROM|"stock"/);
});
test('legacy gallery backfill is deterministic, reuses an uncounted default, and is idempotent',()=>{
 const product={id:'legacy',imageUrl:'/images/a.webp',images:['/images/a.webp','/images/b.webp'],models:[{id:'general',name:'General',image:null,skus:[{quantity:null}]}]};
 const plan=modelBackfillPlan(product);assert.equal(plan.length,2);assert.equal(plan[0].id,'general');assert.equal(plan[0].reuse,true);
 assert.deepEqual(plan,modelBackfillPlan(product));
 for(const item of plan){const old=product.models.find(model=>model.id===item.id);if(old)old.image=item.image;else product.models.push({id:item.id,name:item.name,image:item.image,skus:[{quantity:null}]});}
 assert.deepEqual(modelBackfillPlan(product),[]);
 const counted={id:'counted',imageUrl:'/images/c.webp',images:[],models:[{id:'keep',name:'General',image:null,skus:[{quantity:3}]}]};
 assert.equal(modelBackfillPlan(counted)[0].reuse,false);assert.equal(counted.models[0].skus[0].quantity,3);
});
test('listing returns a product summary without models, sizes, image arrays or Base64; q uses denormalized model names',async()=>{
 const row={id:'p',name:'Chamarra',description:'Fixture',price:780,imageUrl:'/images/a.webp',images:['/images/b.webp'],category:'clothing',subcategory:null,universe:'harry-potter',originalPrice:null,isOnSale:false,modelCount:2,available:true,thumbnail:'/images/mini.webp'};
 const queries=[];const db={$queryRaw:async sql=>{queries.push(sql);return sql.text.includes('UNION ALL')?[]:[{items:[row],total:1n}];}};
 const repository=createDatabaseProducts(db);const result=await repository.search(parseCatalogQuery(new URLSearchParams('q=Modelo%20Rojo')));
 assert.equal(result.items.length,1);const item=result.items[0];assert.equal(item.modelCount,2);assert.equal(item.thumbnail,'/images/mini.webp');assert.equal(item.priceMin,780);assert.equal(item.priceMax,780);
 for(const key of ['models','skus','images','imageThumbnails'])assert.equal(key in item,false,key);
 const predicate=catalogWhere(parseCatalogQuery(new URLSearchParams('q=Modelo%20Rojo')));assert.match(predicate.text,/searchText/);assert.doesNotMatch(predicate.text,/JOIN/);assert.ok(predicate.values.includes('%Modelo Rojo%'));
 const sql=readFileSync('prisma/migrations/20261026000000_sized_skus_search/migration.sql','utf8');assert.match(sql,/string_agg\(m\."name"/);assert.match(sql,/CREATE TRIGGER model_search/);
 const before=queries.length;await repository.search(parseCatalogQuery(new URLSearchParams('q=Modelo%20Rojo')));assert.equal(queries.length-before,1,'facets cached for the second call');
});
test('S3 reuses a verified hash and refuses bytes that do not match the declared SHA-256',async()=>{
 const bytes=Buffer.alloc(20);bytes.write('RIFF');bytes.write('WEBP',8);bytes.write('VP8 ',12);
 const hash=createHash('sha256').update(bytes).digest('hex');let stored=false,copies=0;
 const env={NODE_ENV:'production',MEDIA_STORAGE:'s3',SESSION_SECRET:'test-secret-at-least-thirty-two-characters',S3_ENDPOINT:'https://s3.test.invalid',S3_BUCKET:'fixture',S3_REGION:'auto',S3_PUBLIC_BASE_URL:'https://images.test.invalid'};
 const client=new S3Client({region:'auto',endpoint:env.S3_ENDPOINT,credentials:{accessKeyId:'TEST',secretAccessKey:'TEST'}});
 client.send=async command=>{
  if(command.constructor.name==='HeadObjectCommand'){if(!stored)throw Object.assign(new Error('NotFound'),{name:'NotFound',$metadata:{httpStatusCode:404}});return {ContentLength:20,ContentType:'image/webp',Metadata:{sha256:hash}};}
  if(command.constructor.name==='GetObjectCommand')return {Body:Readable.from([bytes]),ContentLength:20,ContentType:'image/webp',ETag:'version'};
  if(command.constructor.name==='CopyObjectCommand'){copies++;stored=true;assert.equal(command.input.Metadata.sha256,hash);return {};}
  if(command.constructor.name==='DeleteObjectCommand')return {};
  throw Error('Unexpected command');
 };
 const storage=createMediaStorage(env,client);
 try {const policy=await storage.sign({size:20,contentType:'image/webp',sha256:hash});assert.ok('ticket' in policy);const url=await storage.complete(policy.ticket);assert.equal(copies,1);const reused=await storage.sign({size:20,contentType:'image/webp',sha256:hash});assert.equal(reused.publicUrl,url);assert.equal(copies,1);
  stored=false;const bad=await storage.sign({size:20,contentType:'image/webp',sha256:'0'.repeat(64)});await assert.rejects(()=>storage.complete(bad.ticket),/huella/);assert.equal(copies,1);
 }finally{storage.close();}
});
test('capture permits unknown/zero sized SKUs while enforce validates the selected size independently',async()=>{
 const models=[{id:'design',name:'Rojo',sku:'legacy',active:true,quantity:null,version:0,image:null,skus:[{id:'xs',code:'XS-1',size:'xs',quantity:0,version:1},{id:'m',code:'M-1',size:'m',quantity:2,version:1}]}];
 const product={id:'p',name:'Product',price:10,image:'/images/a.webp',models};const repo={get:async()=>product};
 const input={lines:[{productId:'p',skuId:'xs',quantity:3}]};assert.equal((await createInventory({},repo,'capture').quote(input)).lines[0].size,'xs');
 await assert.rejects(()=>createInventory({},repo,'enforce').quote(input),/supera/);
 const accepted=await createInventory({},repo,'enforce').quote({lines:[{productId:'p',skuId:'m',quantity:2}]});assert.equal(accepted.lines[0].sku,'M-1');assert.equal(models[0].skus[1].quantity,2);
});
