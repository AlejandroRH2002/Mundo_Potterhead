import { Prisma, PrismaClient } from '@prisma/client';
import { backfillSubcategories, type BackfillRow } from '../catalog/backfill.ts';
const args = process.argv.slice(2);
if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || (args.includes('--apply') && args.includes('--dry-run'))) throw new Error('Usa --dry-run (por defecto) o --apply.');
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL.');
const apply = args.includes('--apply');
const db = new PrismaClient();
try {
 const result = await backfillSubcategories({
  // JSON lookup permits dry runs before the incremental migration is applied.
  page: (cursor, size) => db.$queryRaw<BackfillRow[]>`SELECT "id", "name", "description", "category", to_jsonb(p)->>'subcategory' AS subcategory FROM "Product" p WHERE "id" > ${cursor} ORDER BY "id" LIMIT ${size}`,
  assign: async (id, subcategory) => (await db.product.updateMany({ where: { id, subcategory: null }, data: { subcategory } })).count,
 }, apply, product => console.log(JSON.stringify(product)));
 console.log(JSON.stringify(result));
} catch (error: unknown) {
 const code = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : 'DATABASE_UNAVAILABLE';
 console.error(`No se pudo clasificar el catálogo (${code}); comprueba la conexión y, para --apply, la migración.`); process.exitCode = 1;
}
finally { await db.$disconnect(); }
