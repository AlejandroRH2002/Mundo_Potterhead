import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type PrismaClient, type InventoryMovement } from '@prisma/client';
import { InventoryError, nextQuantity, type InventoryMode, type InventoryQuery, type InventoryPage, type InventoryRow, type MovementInput, type MovementResult, type MovementPage } from '../../shared/inventory.ts';
import type { z } from 'zod';
import type { modelSchema, quoteSchema } from '../../shared/inventory.ts';
import type { ProductRepository } from '../http/products.ts';
import { catalogImage } from '../../shared/productImage.ts';

export interface InventoryRepository {
  archive(actorId: string, productId: string, archived: boolean): Promise<void>;
  get(id: string): Promise<InventoryRow>;
  list(query: InventoryQuery): Promise<InventoryPage>;
  history(modelId: string, query: InventoryQuery): Promise<MovementPage>;
  move(actorId: string, modelId: string, input: MovementInput): Promise<MovementResult>;
  model(actorId: string, productId: string, input: z.infer<typeof modelSchema>, id?: string): Promise<unknown>;
  quote(input: z.infer<typeof quoteSchema>): Promise<unknown>;
}
const dto = (row: InventoryMovement): MovementResult => ({ id: row.id, modelId: row.modelId, type: row.type, quantity: row.quantity, before: row.before, after: row.after, delta: row.delta, reason: row.reason, actorId: row.actorId, createdAt: row.createdAt.toISOString() });
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
  const pending = await db.product.count({ where: { archived: false, OR: [{ models: { none: {} } }, { models: { some: { active: true, quantity: null } } }] } });
  if (pending) throw new Error('INVENTORY_MODE=enforce requiere capturar todos los modelos activos de productos no archivados.');
}
export function createInventory(db: PrismaClient, products: ProductRepository, mode: InventoryMode): InventoryRepository {
  return {
    async archive(actorId, productId, archived) { await db.$transaction(async tx=>{await actor(tx,actorId);if(!archived && mode==='enforce' && await tx.productModel.count({where:{productId,active:true,quantity:null}}))throw new InventoryError(409,'Captura los modelos pendientes antes de mostrar el producto.');await tx.product.update({where:{id:productId},data:{archived}});}); },
    async get(id) {const row=await db.productModel.findUnique({where:{id},include:{product:{select:{name:true,archived:true}}}});if(!row)throw new InventoryError(404,'Modelo no encontrado.');const {product,...model}=row;return {...model,productName:product.name,archived:product.archived};},
    async list(query) {
      const status: Prisma.ProductModelWhereInput = query.status === 'pending' ? { quantity: null } : query.status === 'empty' ? { quantity: 0 } : query.status === 'low' ? { quantity: { gt: 0, lte: 3 } } : query.status === 'available' ? { quantity: { gt: 0 } } : {};
      const where: Prisma.ProductModelWhereInput = { ...status, productId: query.productId, ...(query.q ? { OR: [{ name: { contains: query.q, mode: 'insensitive' } }, { sku: { contains: query.q, mode: 'insensitive' } }, { id: { contains: query.q } }, { product: { name: { contains: query.q, mode: 'insensitive' } } }] } : {}) };
      const [rows, total] = await db.$transaction([db.productModel.findMany({ where, include: { product: { select: { name: true, archived: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }), db.productModel.count({ where })]);
      return { items: rows.map(({ product, ...row }) => ({ ...row, productName: product.name, archived: product.archived })), total, page: query.page, pageSize: query.pageSize };
    },
    async history(modelId, query) {
      const where = { modelId };
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
          await tx.$queryRaw`SELECT "id" FROM "ProductModel" WHERE "id"=${modelId} FOR UPDATE`;
          const prior = await tx.inventoryMovement.findUnique({ where: { key: input.key } });
          if (prior) return replay(prior);
          const model = await tx.productModel.findUnique({ where: { id: modelId } });
          if (!model) throw new InventoryError(404, 'Modelo no encontrado.');
          const after = nextQuantity(model.quantity, model.version, input);
          await tx.productModel.update({ where: { id: modelId }, data: { quantity: after, version: { increment: 1 } } });
          const row = await tx.inventoryMovement.create({ data: { key: input.key, type: input.type, quantity: input.quantity, reason: input.reason, id: randomUUID(), fingerprint, modelId, actorId, before: model.quantity, after, delta: after - (model.quantity ?? 0) } });
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
        if (input.image && ![product.imageUrl, ...product.images].includes(input.image)) throw new InventoryError(400, 'La imagen debe pertenecer a la galería del producto.');
        if (id) {
          const model = await tx.productModel.findUnique({ where: { id } });
          if (model?.productId !== productId) throw new InventoryError(404, 'Modelo no encontrado.');
          if (mode === 'enforce' && input.active && model.quantity === null) throw new InventoryError(409, 'Captura primero el conteo antes de activar este modelo.');
          return tx.productModel.update({ where: { id }, data: { name: input.name, image: input.image || null, active: input.active } });
        }
        const uuid = randomUUID();
        return tx.productModel.create({ data: { id: uuid, productId, sku: 'MP-' + uuid, name: input.name, image: input.image || null, active: mode === 'enforce' ? false : input.active } });
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
        const model = line.modelId ? models.find(model => model.id === line.modelId) : models.length === 1 ? models[0] : undefined;
        if (models.length && !model) throw new InventoryError(409, 'Selecciona el modelo del producto antes de cotizar.');
        if (mode === 'enforce' && (!model || model.quantity === null)) throw new InventoryError(409, 'Modelo sin disponibilidad confirmada.');
        if (model) {
          const total = (totals.get(model.id) ?? 0) + line.quantity; totals.set(model.id, total);
          if (mode === 'enforce' && total > model.quantity!) throw new InventoryError(409, 'La cantidad supera las existencias de ' + model.name + '.');
        }
        if (line.selectedImage && ![catalogImage(product.id, product.image), ...(product.images ?? [])].includes(line.selectedImage)) throw new InventoryError(409, 'La imagen elegida ya no está disponible.');
        lines.push({ ...line, modelId: model?.id, modelName: model?.name, sku: model?.sku, product, subtotal: Math.round(product.price * 100) * line.quantity / 100 });
      }
      return { lines, mode, notice: 'Disponibilidad sujeta a confirmación. Esta cotización no reserva existencias.' };
    },
  };
}
