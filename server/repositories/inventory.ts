import { sizedSkuSchema } from '../../shared/sizes.ts';
import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient, type InventoryMovement } from '@prisma/client';
import { InventoryError, nextQuantity, type InventoryMode, type InventoryQuery, type InventoryPage, type InventoryRow, type MovementInput, type MovementResult, type MovementPage } from '../../shared/inventory.ts';
import type { z } from 'zod';
import type { modelSchema, quoteSchema } from '../../shared/inventory.ts';
import type { ProductRepository } from '../http/products.ts';
import { catalogImage } from '../../shared/productImage.ts';

export interface InventoryRepository {
  addSku(actorId:string,modelId:string,size:string):Promise<unknown>;
  archive(actorId: string, productId: string, archived: boolean): Promise<void>;
  get(id: string): Promise<InventoryRow>;
  list(query: InventoryQuery): Promise<InventoryPage>;
  history(modelId: string, query: InventoryQuery): Promise<MovementPage>;
  move(actorId: string, modelId: string, input: MovementInput): Promise<MovementResult>;
  model(actorId: string, productId: string, input: z.infer<typeof modelSchema>, id?: string): Promise<unknown>;
  quote(input: z.infer<typeof quoteSchema>): Promise<unknown>;
}
const dto = (row: InventoryMovement): MovementResult => ({ id: row.id, modelId: row.modelId, skuId:row.skuId, type: row.type, quantity: row.quantity, before: row.before, after: row.after, delta: row.delta, reason: row.reason, actorId: row.actorId, createdAt: row.createdAt.toISOString() });
async function actor(tx: Prisma.TransactionClient, id: string) {
  const rows = await tx.$queryRaw<{role: string; isActive: boolean}[]>`SELECT "role", "isActive" FROM "User" WHERE "id"=${id} FOR SHARE`;
  if (!rows[0]?.isActive || rows[0].role !== 'ADMIN') throw new InventoryError(403, 'Se requiere un administrador activo.');
}
export function inventoryMode(env: NodeJS.ProcessEnv): InventoryMode {
  const mode = env.INVENTORY_MODE ?? 'capture';
  if (mode !== 'capture' && mode !== 'enforce') throw new Error('INVENTORY_MODE debe ser capture o enforce.');
  return mode;
}
export async function assertInventoryReady(db: PrismaClient, mode: InventoryMode) {
  if (mode !== 'enforce') return;
  const pending = await db.product.count({ where: { archived: false, OR: [{ models: { none: {} } }, {models:{some:{active:true,OR:[{skus:{none:{}}},{skus:{some:{active:true,quantity:null}}}]}}}] } });
  if (pending) throw new Error('INVENTORY_MODE=enforce requiere capturar todos los modelos activos de productos no archivados.');
}
export function createInventory(db: PrismaClient, products: ProductRepository, mode: InventoryMode, lowStockThreshold=10): InventoryRepository {
  return {
    async addSku(actorId,modelId,size) {return db.$transaction(async tx=>{await actor(tx,actorId);const model=await tx.productModel.findUnique({where:{id:modelId},include:{product:{select:{category:true}}}});if(!model)throw new InventoryError(404,'Modelo no encontrado.');if(!sizedSkuSchema.safeParse({category:model.product.category,size}).success)throw new InventoryError(400,'La talla no pertenece a la categoría.');const id=randomUUID();return tx.productSku.create({data:{id,modelId,code:'MP-'+id,size}});});},
    async archive(actorId, productId, archived) { await db.$transaction(async tx=>{await actor(tx,actorId);if(!archived && mode==='enforce' && await tx.productModel.count({where:{productId,active:true,OR:[{skus:{none:{}}},{skus:{some:{active:true,quantity:null}}}]}}))throw new InventoryError(409,'Captura los modelos pendientes antes de mostrar el producto.');await tx.product.update({where:{id:productId},data:{archived}});}); },
    async get(id) { const row=await db.productSku.findUnique({where:{id},include:{model:{include:{product:{select:{name:true,archived:true,imageThumbnails:true}}}}}});if(!row)throw new InventoryError(404,'SKU no encontrado.');const {model,...sku}=row;const {product,...design}=model;return {...design,id:sku.id,modelId:model.id,size:sku.size,color:sku.color,sku:sku.code,active:sku.active&&model.active,modelActive:model.active,quantity:sku.quantity,version:sku.version,thumbnail:model.image&&product.imageThumbnails&&typeof product.imageThumbnails==='object'&&!Array.isArray(product.imageThumbnails)&&typeof product.imageThumbnails[model.image]==='string'?product.imageThumbnails[model.image] as string:model.image,productName:product.name,archived:product.archived}; },
    async list(query) {
      const status:Prisma.ProductSkuWhereInput=query.status==='pending'?{quantity:null}:query.status==='empty'?{quantity:0}:query.status==='low'?{quantity:{gt:0,lte:lowStockThreshold}}:query.status==='available'?{quantity:{gt:0}}:{};
      const where:Prisma.ProductSkuWhereInput={...status,...(query.productId?{model:{productId:query.productId}}:{}),...(query.q?{OR:[{code:{contains:query.q,mode:'insensitive'}},{model:{name:{contains:query.q,mode:'insensitive'}}},{model:{product:{name:{contains:query.q,mode:'insensitive'}}}},{model:{productId:{contains:query.q}}}]}:{})};
      const [rows,total]=await Promise.all([db.productSku.findMany({where,include:{model:{include:{product:{select:{name:true,archived:true,imageThumbnails:true}}}}},orderBy:[{modelId:'asc'},{size:'asc'}],skip:(query.page-1)*query.pageSize,take:query.pageSize}),db.productSku.count({where})]);
      return {items:rows.map(({model,...sku})=>{const {product,...design}=model;return {...design,id:sku.id,modelId:model.id,size:sku.size,color:sku.color,sku:sku.code,active:sku.active&&model.active,modelActive:model.active,quantity:sku.quantity,version:sku.version,thumbnail:model.image&&product.imageThumbnails&&typeof product.imageThumbnails==='object'&&!Array.isArray(product.imageThumbnails)&&typeof product.imageThumbnails[model.image]==='string'?product.imageThumbnails[model.image] as string:model.image,productName:product.name,archived:product.archived};}),total,page:query.page,pageSize:query.pageSize,lowStockThreshold};
    },
    async history(modelId, query) {
      const where = { skuId:modelId };
      const [rows, total] = await db.$transaction([db.inventoryMovement.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), db.inventoryMovement.count({ where })]);
      return { items: rows.map(dto), total, page: query.page, pageSize: query.pageSize };
    },
    async move(actorId, modelId, input) {
      const fingerprint = createHash('sha256').update(JSON.stringify({ actorId, modelId, type: input.type, quantity: input.quantity, reason: input.reason, expectedVersion: input.expectedVersion })).digest('hex');
      const replay = (row: InventoryMovement) => { if (row.fingerprint !== fingerprint) throw new InventoryError(409, 'La clave ya se usó para otra operación.'); return dto(row); };
      try {
        return await db.$transaction(async tx => {
          await actor(tx, actorId);
          // Serialize only this model, never all catalog writes.
          await tx.$queryRaw`SELECT "id" FROM "ProductSku" WHERE "id"=${modelId} FOR UPDATE`;
          const prior = await tx.inventoryMovement.findUnique({ where: { key: input.key } });
          if (prior) return replay(prior);
          const model = await tx.productSku.findUnique({ where: { id: modelId } });
          if (!model) throw new InventoryError(404, 'Modelo no encontrado.');
          const after = nextQuantity(model.quantity, model.version, input);
          await tx.productSku.update({ where: { id: modelId }, data: { quantity: after, version: { increment: 1 } } });
          const row = await tx.inventoryMovement.create({ data: { key: input.key, type: input.type, quantity: input.quantity, reason: input.reason, id: randomUUID(), fingerprint, modelId:model.modelId, skuId:model.id, actorId, before: model.quantity, after, delta: after - (model.quantity ?? 0) } });
          return dto(row);
        }, { maxWait: 5000, timeout: 10000 });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const prior = await db.inventoryMovement.findUnique({ where: { key: input.key } });
          if (prior) return replay(prior);
        }
        throw error;
      }
    },
    async model(actorId, productId, input, id) {
      return db.$transaction(async tx => {
        await actor(tx, actorId);
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${productId} FOR UPDATE`;
        const product = await tx.product.findUnique({ where: { id: productId } });
        if (!product) throw new InventoryError(404, 'Producto no encontrado.');
        if (input.image && ![product.imageUrl,catalogImage(product.id,product.imageUrl??''), ...product.images].includes(input.image)&&!await tx.productModel.findFirst({where:{productId,OR:[{image:input.image},{images:{has:input.image}},{skus:{some:{images:{has:input.image}}}}]},select:{id:true}})) throw new InventoryError(400, 'La imagen debe pertenecer a la galería del producto.');
        if (id) {
          const model = await tx.productModel.findUnique({ where: { id } });
          if (model?.productId !== productId) throw new InventoryError(404, 'Modelo no encontrado.');
          if (mode === 'enforce' && input.active && (!await tx.productSku.count({where:{modelId:id}})||await tx.productSku.count({where:{modelId:id,quantity:null}}))) throw new InventoryError(409, 'Captura primero el conteo antes de activar este modelo.');
          if(input.active&&!model.active&&!input.image&&!model.image&&!model.images?.length)throw new InventoryError(400,'Añade una fotografía al diseño antes de publicarlo.');
          return tx.productModel.update({ where: { id }, data: { name: input.name, image: input.image || model.images?.[0] || null, images: input.image ? [input.image,...(model.images??[]).filter(image=>image!==input.image)] : model.images??[], active: input.active } });
        }
        const uuid = randomUUID();
        return tx.productModel.create({ data: { id: uuid, productId, sku: 'MP-' + uuid, name: input.name, image: input.image || null, active: mode === 'enforce' ? false : !!input.image&&input.active, skus:{create:{id:uuid,code:'MP-'+uuid,size:'one'}} } });
      });
    },
    async quote(input) {
      const totals = new Map<string, number>();
      const snapshots=new Map<string,Awaited<ReturnType<ProductRepository['get']>>>();
      const lines = [];
      for (const line of input.lines) {
        if(!snapshots.has(line.productId))snapshots.set(line.productId,await products.get(line.productId));
        const product = snapshots.get(line.productId);
        if (!product) throw new InventoryError(409, 'Un producto ya no está disponible. Revisa el carrito.');
        const models = product.models?.filter(model => model.active) ?? [];
        const chosenId=line.skuId??line.modelId;
        const model=chosenId?models.find(m=>m.skus?.some(s=>s.id===chosenId)||m.id===chosenId):models.length===1?models[0]:undefined;
        const skus=model?.skus?.filter(s=>s.active!==false)??(model?[{id:model.id,code:model.sku,size:'one',quantity:model.quantity,version:model.version}]:[]);
        const sku=chosenId?skus.find(s=>s.id===chosenId)??(skus.length===1?skus[0]:undefined):skus.length===1?skus[0]:undefined;
        if(product.models!==undefined&&(!model||!sku))throw new InventoryError(409,'Selecciona una variante activa de diseño y talla antes de cotizar.');
        if(mode==='enforce'&&(!sku||sku.quantity===null))throw new InventoryError(409,'SKU sin disponibilidad confirmada.');
        if(sku){const total=(totals.get(sku.id)??0)+line.quantity;totals.set(sku.id,total);if(mode==='enforce'&&total>sku.quantity!)throw new InventoryError(409,'La cantidad supera las existencias de '+model!.name+'.');}
        if (line.selectedImage && ![catalogImage(product.id, product.image), ...(product.images ?? []),model?.image,...(model?.images??[]),...(sku&&'images' in sku?sku.images??[]:[])].includes(line.selectedImage)) throw new InventoryError(409, 'La imagen elegida ya no está disponible.');
        lines.push({ ...line, modelId: model?.id, skuId:sku?.id, size:sku?.size, color:sku&&'color' in sku?sku.color:undefined, modelName: model?.name, sku: sku?.code, product, subtotal: Math.round(product.price * 100) * line.quantity / 100 });
      }
      return { lines, mode, notice: 'Disponibilidad sujeta a confirmación. Esta cotización no reserva existencias.' };
    },
  };
}
