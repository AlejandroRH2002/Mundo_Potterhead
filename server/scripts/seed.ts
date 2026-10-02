import { inferSubcategory } from '../../shared/catalogTaxonomy.ts';
import { PrismaClient } from '@prisma/client';
import { readConfig } from '../config.ts';
import { productDraftSchema } from '../../shared/productSchema.ts';
import { products } from '../../src/features/catalog/mocks/products.ts';
import { otherUniversesProducts } from '../../src/features/catalog/mocks/otherUniverses.ts';

// Explicit development seed only. Never runs at API startup or during migration.
if (process.env.NODE_ENV === 'production') throw new Error('Development seed disabled in production.');
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
