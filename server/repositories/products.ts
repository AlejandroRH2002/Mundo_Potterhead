import { databaseDiagnostic } from '../lib/databaseDiagnostic.ts';
import { randomUUID } from 'node:crypto';
import type { InventoryMode } from '../../shared/inventory.ts';
import { serialQueue } from '../lib/catalogQueue.ts';
import { Prisma, type PrismaClient, type Product as Row } from '@prisma/client';
import type { Product } from '../../src/types/product.ts';
import { productDraftSchema } from '../../shared/productSchema.ts';
import type { ProductRepository } from '../http/products.ts';
import { catalogWhere, catalogOrder, catalogFacets } from './catalog.ts';
import { validSize } from '../../shared/sizes.ts';
import { InventoryError } from '../../shared/inventory.ts';

type CatalogRow=Pick<Row,'id'|'name'|'description'|'price'|'imageUrl'|'category'|'subcategory'|'universe'|'originalPrice'|'isOnSale'> & {images?:string[];imageThumbnails?:Prisma.JsonValue;thumbnail?:string;modelCount?:number;available?:boolean};
function product(row:CatalogRow):Product {const draft=productDraftSchema.parse({name:row.name,description:row.description??'',price:Number(row.price),image:row.imageUrl??'/images/product-placeholder.svg',images:row.images,category:row.category,subcategory:row.subcategory,universe:row.universe,originalPrice:row.originalPrice===null?undefined:Number(row.originalPrice),isOnSale:row.isOnSale,imageThumbnails:row.imageThumbnails??{}});return {id:row.id,...draft};}
function data(input:Omit<Product,'id'>){const draft=productDraftSchema.parse(input);return {name:draft.name,description:draft.description,price:new Prisma.Decimal(draft.price.toFixed(2)),imageUrl:draft.image,images:draft.images,imageThumbnails:draft.imageThumbnails,category:draft.category,subcategory:draft.subcategory??null,universe:draft.universe,originalPrice:draft.originalPrice===undefined?null:new Prisma.Decimal(draft.originalPrice.toFixed(2)),isOnSale:draft.isOnSale??false};}
export function createDatabaseProducts(db:PrismaClient,mode:InventoryMode='capture',admin=false,lowStockThreshold=10):ProductRepository {
 const queue=serialQueue();const cache=new Map<string,{expires:number;value:Awaited<ReturnType<typeof catalogFacets>>}>();
 async function detail(row:Row):Promise<Product>{const item=product(row);const models=await db.productModel.findMany({where:{productId:row.id,...(!admin?{active:true,...(mode==='enforce'?{skus:{some:{quantity:{gt:0},active:true}}}:{})}:{})},include:{skus:{orderBy:{size:'asc'}}},orderBy:[{createdAt:'asc'},{id:'asc'}]});
 const visible=new Set([item.image,...(item.images??[]),...models.flatMap(model=>[...model.images,...model.skus.filter(sku=>admin||sku.active).flatMap(sku=>sku.images)])]);
 return {...item,imageThumbnails:Object.fromEntries(Object.entries(item.imageThumbnails??{}).filter(([image])=>admin||visible.has(image))),images:item.images,inventoryMode:mode,lowStockThreshold,models:models.map(m=>({id:m.id,sku:m.sku,name:m.name,image:m.image,images:m.images,thumbnail:item.imageThumbnails?.[m.image??'']??m.image,active:m.active,quantity:m.skus.length===1?m.skus[0].quantity:null,version:m.skus[0]?.version??0,skus:m.skus.filter(s=>admin||s.active).map(({id,code,size,color,images,active,quantity,version})=>({id,code,size,color,images,active,quantity,version}))}))};}
 const repository:ProductRepository={
 async search(query){return queue(async()=>{try{const where=catalogWhere(query,[],mode,admin);const result=await db.$queryRaw<{items:CatalogRow[];total:bigint}[]>(Prisma.sql`WITH page AS (
 SELECT row_number() OVER (ORDER BY ${catalogOrder(query)}) AS "_position", "id","name","description","price","category","subcategory","universe","originalPrice","isOnSale",
 CASE WHEN "imageUrl" LIKE 'data:%' THEN '/api/products/'||"id"||'/image' ELSE "imageUrl" END AS "imageUrl",
 COALESCE("imageThumbnails"->>"imageUrl",CASE WHEN "imageUrl" LIKE 'data:%' THEN '/api/products/'||"id"||'/image' ELSE "imageUrl" END) AS "thumbnail",
 (SELECT COUNT(*)::int FROM "ProductModel" m WHERE m."productId"="Product"."id" ${admin?Prisma.empty:Prisma.sql`AND m."active"`}) AS "modelCount",
 EXISTS(SELECT 1 FROM "ProductModel" m JOIN "ProductSku" s ON s."modelId"=m."id" WHERE m."productId"="Product"."id" AND m."active" AND s."quantity">0 AND s."active") AS "available"
 FROM "Product" ${where} ORDER BY ${catalogOrder(query)} LIMIT ${query.pageSize} OFFSET ${(query.page-1)*query.pageSize})
 SELECT COALESCE((SELECT jsonb_agg(to_jsonb(page)-'_position' ORDER BY "_position") FROM page),'[]'::jsonb) AS items,(SELECT COUNT(*) FROM "Product" ${where}) AS total`);
 const key=JSON.stringify({...query,page:undefined,pageSize:undefined,sort:undefined}),cached=cache.get(key);const facets=cached&&cached.expires>Date.now()?cached.value:await catalogFacets(db,query,mode,admin);
 if(!cached||cached.expires<=Date.now()){if(cache.size>=100)cache.delete(cache.keys().next().value!);cache.set(key,{expires:Date.now()+30000,value:facets});}
 return {items:result[0].items.map(row=>{const {images,imageThumbnails,...item}=product(row);void images;void imageThumbnails;return {...item,inventoryMode:mode,priceMin:item.price,priceMax:item.price,thumbnail:row.thumbnail??item.image,modelCount:row.modelCount??0,available:row.available??false};}),total:Number(result[0].total),page:query.page,pageSize:query.pageSize,facets};}catch(error){databaseDiagnostic(error,'catalog.search');throw error;}});},
 async list(){const items:Product[]=[];for(let page=1;;page++){const result=await repository.search!({page,pageSize:100,sort:'novedad'});items.push(...result.items);if(!result.items.length||items.length>=result.total)return items;}},
 async get(id){const where:Prisma.ProductWhereInput={id};if(!admin){where.groupedIntoId=null;where.archived=false;if(mode==='enforce')where.models={some:{active:true,skus:{some:{quantity:{gt:0},active:true}}}};}const row=await db.product.findFirst({where});return row?detail(row):null;},
 async create(draft){const id=randomUUID();const row=await db.product.create({data:{...data(draft),models:{create:{id,sku:'MP-'+id,name:'General',active:mode!=='enforce',skus:{create:{id,code:'MP-'+id,size:'one'}}}}}});cache.clear();return detail(row);},
 async update(id,draft){const sizes=await db.productSku.findMany({where:{model:{productId:id}},select:{size:true}});if(sizes.some(s=>!validSize(draft.category,s.size)))throw new InventoryError(409,'Las tallas existentes no pertenecen a la nueva categoría.');try{const row=await db.product.update({where:{id,groupedIntoId:null},data:data(draft)});cache.clear();return detail(row);}catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2025')return null;throw error;}},
 async remove(id){cache.clear();return (await db.product.updateMany({where:{id},data:{archived:true}})).count>0;}
 };return repository;
}
