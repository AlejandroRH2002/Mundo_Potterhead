import { inferSubcategory } from '../../shared/catalogTaxonomy.ts';
import { PrismaClient } from '@prisma/client';
import { readConfig } from '../config.ts';
import { productDraftSchema } from '../../shared/productSchema.ts';
import { assertLocalSeed } from '../lib/localSeed.ts';

// Explicit development seed only. Never runs at API startup or during migration.
assertLocalSeed(process.env);
const {products}=await import('../../src/features/catalog/mocks/products.ts');
const {otherUniversesProducts}=await import('../../src/features/catalog/mocks/otherUniverses.ts');
const config = readConfig(process.env);
const db = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
try {
  const rows = [...products, ...otherUniversesProducts].map(item => {
    const draft = productDraftSchema.parse({ ...item, subcategory: inferSubcategory(item.category, item.name, item.description) });
    return { id: item.id, name: draft.name, description: draft.description, price: draft.price,
      imageUrl: draft.image, category: draft.category, subcategory: draft.subcategory, universe: draft.universe,
      originalPrice: draft.originalPrice, isOnSale: draft.isOnSale ?? false };
  });
  await db.product.createMany({ data: rows, skipDuplicates: true });
  console.log('Development catalog seeded without overwriting existing products.');
} catch { console.error('Catalog seed failed.'); process.exitCode = 1; }
finally { await db.$disconnect(); }
