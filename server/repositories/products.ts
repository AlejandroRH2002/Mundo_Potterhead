import { Prisma, type PrismaClient, type Product as Row } from '@prisma/client';
import type { Product } from '../../src/types/product.ts';
import { productDraftSchema } from '../../shared/productSchema.ts';
import type { ProductRepository } from '../http/products.ts';

type CatalogRow = Pick<Row, 'id' | 'name' | 'description' | 'price' | 'imageUrl' | 'category' | 'universe' | 'originalPrice' | 'isOnSale'>;
function product(row: CatalogRow): Product {
  const draft = productDraftSchema.parse({ name: row.name, description: row.description ?? '', price: Number(row.price),
    image: row.imageUrl ?? '/images/product-placeholder.svg', category: row.category, universe: row.universe,
    originalPrice: row.originalPrice === null ? undefined : Number(row.originalPrice), isOnSale: row.isOnSale });
  return { id: row.id, ...draft };
}
function data(input: Omit<Product, 'id'>) {
  const draft = productDraftSchema.parse(input);
  return { name: draft.name, description: draft.description, price: new Prisma.Decimal(draft.price.toFixed(2)),
    imageUrl: draft.image, category: draft.category, universe: draft.universe,
    originalPrice: draft.originalPrice === undefined ? null : new Prisma.Decimal(draft.originalPrice.toFixed(2)), isOnSale: draft.isOnSale ?? false };
}
export function createDatabaseProducts(db: PrismaClient): ProductRepository {
  return {
    async list() {
      // CASE keeps large legacy data URLs out of both the DB result and JSON list.
      const rows = await db.$queryRaw<CatalogRow[]>`SELECT "id", "name", "description", "price", "category", "universe", "originalPrice", "isOnSale",
        CASE WHEN "imageUrl" LIKE 'data:%' THEN '/images/product-placeholder.svg' ELSE "imageUrl" END AS "imageUrl"
        FROM "Product" ORDER BY "createdAt" ASC, "id" ASC`;
      return rows.map(product);
    },
    async get(id) { const row = await db.product.findUnique({ where: { id } }); return row ? product(row) : null; },
    async create(draft) { return product(await db.product.create({ data: data(draft) })); },
    async update(id, draft) {
      try { return product(await db.product.update({ where: { id }, data: data(draft) })); }
      catch (error: unknown) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return null; throw error; }
    },
    async remove(id) { return (await db.product.deleteMany({ where: { id } })).count > 0; },
  };
}
