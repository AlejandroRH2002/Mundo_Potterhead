import { randomUUID } from 'node:crypto';
import type { InventoryMode } from '../../shared/inventory.ts';
import { databaseDiagnostic } from '../lib/databaseDiagnostic.ts';
import { serialQueue } from '../lib/catalogQueue.ts';
import { Prisma, type PrismaClient, type Product as Row } from '@prisma/client';
import type { Product } from '../../src/types/product.ts';
import { productDraftSchema } from '../../shared/productSchema.ts';
import type { ProductRepository } from '../http/products.ts';
import { catalogWhere, catalogOrder, catalogFacets } from './catalog.ts';

type CatalogRow = Pick<Row, 'id' | 'name' | 'description' | 'price' | 'imageUrl' | 'category' | 'subcategory' | 'universe' | 'originalPrice' | 'isOnSale' | 'images'>;
function product(row: CatalogRow): Product {
  const draft = productDraftSchema.parse({ name: row.name, description: row.description ?? '', price: Number(row.price),
    images: row.images ?? [], image: row.imageUrl ?? '/images/product-placeholder.svg', category: row.category, subcategory: row.subcategory, universe: row.universe,
    originalPrice: row.originalPrice === null ? undefined : Number(row.originalPrice), isOnSale: row.isOnSale });
  return { id: row.id, ...draft };
}
function data(input: Omit<Product, 'id'>) {
  const draft = productDraftSchema.parse(input);
  return { name: draft.name, description: draft.description, price: new Prisma.Decimal(draft.price.toFixed(2)),
    imageUrl: draft.image, images: draft.images, category: draft.category, subcategory: draft.subcategory ?? null, universe: draft.universe,
    originalPrice: draft.originalPrice === undefined ? null : new Prisma.Decimal(draft.originalPrice.toFixed(2)), isOnSale: draft.isOnSale ?? false };
}
export function createDatabaseProducts(db: PrismaClient, mode: InventoryMode = 'capture', admin = false): ProductRepository {
  async function enrich(items: Product[]): Promise<Product[]> {
    const models = await db.productModel.findMany({where:{productId:{in:items.map(item=>item.id)},...(!admin?{active:true,...(mode==='enforce'?{quantity:{gt:0}}:{})}:{})},orderBy:[{createdAt:'asc'},{id:'asc'}]});
    return items.map(item=>({...item,inventoryMode:mode,models:models.filter(model=>model.productId===item.id).map(({id,sku,name,image,active,quantity,version})=>({id,sku,name,image,active,quantity,version}))}));
  }
  const queue=serialQueue();
  const facetsCache=new Map<string,{expires:number;value:Awaited<ReturnType<typeof catalogFacets>>}>();
  const invalidate=()=>{facetsCache.clear();};
  return {
    async search(query) { return queue(async()=>{
      let stage='catalog.rows';
      try {
        const where=catalogWhere(query,[],mode,admin);
        const result=await db.$queryRaw<{items:CatalogRow[];total:bigint}[]>(Prisma.sql`WITH page AS (
          SELECT row_number() OVER (ORDER BY ${catalogOrder(query)}) AS "_position", "id","name","description","price","category","subcategory","universe","originalPrice","isOnSale",
          CASE WHEN "imageUrl" LIKE 'data:%' THEN '/api/products/' || "id" || '/image' ELSE "imageUrl" END AS "imageUrl", "images"
          FROM "Product" ${where} ORDER BY ${catalogOrder(query)} LIMIT ${query.pageSize} OFFSET ${(query.page-1)*query.pageSize})
          SELECT COALESCE((SELECT jsonb_agg(to_jsonb(page)-'_position' ORDER BY "_position") FROM page),'[]'::jsonb) AS items,
          (SELECT COUNT(*) FROM "Product" ${where}) AS total`);
        stage='catalog.facets';
        const facetKey=JSON.stringify({...query,page:undefined,pageSize:undefined,sort:undefined});
        const cached=facetsCache.get(facetKey);
        const facets=mode !== 'enforce' && cached&&cached.expires>Date.now()?cached.value:await catalogFacets(db,query,mode,admin);
        if(!cached||cached.expires<=Date.now()){if(facetsCache.size>=100)facetsCache.delete(facetsCache.keys().next().value!);facetsCache.set(facetKey,{expires:Date.now()+30_000,value:facets});}
        const value={items:await enrich(result[0].items.map(product)),total:Number(result[0].total),page:query.page,pageSize:query.pageSize,facets};
        return value;
      } catch(error:unknown){
        databaseDiagnostic(error,stage);
        throw error;
      }
    }); },
    async list() {
      // CASE keeps large legacy data URLs out of both the DB result and JSON list.
      const rows = await db.$queryRaw<CatalogRow[]>(Prisma.sql`SELECT "id", "name", "description", "price", "category", "subcategory", "universe", "originalPrice", "isOnSale",
        CASE WHEN "imageUrl" LIKE 'data:%' THEN '/api/products/' || "id" || '/image' ELSE "imageUrl" END AS "imageUrl", "images"
        FROM "Product" ${catalogWhere({page:1,pageSize:100,sort:'novedad'},[],mode,admin)} ORDER BY "createdAt" ASC, "id" ASC`);
      return enrich(rows.map(product));
    },
    async get(id) { const row = await db.product.findFirst({ where: { id, ...(!admin?{archived:false,...(mode==='enforce'?{models:{some:{active:true,quantity:{gt:0}}}}:{})}:{}) } }); return row ? (await enrich([product(row)]))[0] : null; },
    async create(draft) { const id=randomUUID();const value=product(await db.product.create({ data: {...data(draft),models:{create:{id,sku:'MP-'+id,name:'General',active:mode!=='enforce'}}} }));invalidate();return (await enrich([value]))[0]; },
    async update(id, draft) {
      try { const value=product(await db.product.update({ where: { id }, data: data(draft) }));invalidate();return value; }
      catch (error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null; throw error; }
    },
    async remove(id) { const removed=(await db.product.updateMany({ where: { id },data:{archived:true} })).count > 0;invalidate();return removed; },
  };
}
