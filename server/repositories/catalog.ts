import { Prisma, type PrismaClient } from '@prisma/client';
import type { CatalogQuery, Facets } from '../../shared/catalogQuery.ts';
export function catalogWhere(query: CatalogQuery, ignore: string[] = []): Prisma.Sql {
 const clauses: Prisma.Sql[] = [];
 if (query.universe && !ignore.includes('universe')) clauses.push(Prisma.sql`"universe" = ${query.universe}`);
 if (query.category && !ignore.includes('category')) clauses.push(Prisma.sql`"category" = ${query.category}`);
 if (query.subcategory && !ignore.includes('subcategory')) clauses.push(Prisma.sql`"subcategory" = ${query.subcategory}`);
 if (query.onSale !== undefined) clauses.push(Prisma.sql`"isOnSale" = ${query.onSale}`);
 if (query.minPrice !== undefined) clauses.push(Prisma.sql`"price" >= ${query.minPrice}`);
 if (query.maxPrice !== undefined) clauses.push(Prisma.sql`"price" <= ${query.maxPrice}`);
 if (query.q) {
  // Escape LIKE metacharacters so search remains literal, not a wildcard input.
  const pattern = '%' + query.q.replace(/[\\%_]/g, value => '\\' + value) + '%';
  clauses.push(Prisma.sql`("name" ILIKE ${pattern} OR COALESCE("description", '') ILIKE ${pattern})`);
 }
 return clauses.length ? Prisma.sql`WHERE ${Prisma.join(clauses, ' AND ')}` : Prisma.empty;
}
export function catalogOrder(query: CatalogQuery): Prisma.Sql {
 if (query.sort === 'precio-asc') return Prisma.sql`"price" ASC, "id" ASC`;
 if (query.sort === 'precio-desc') return Prisma.sql`"price" DESC, "id" ASC`;
 if (query.sort === 'descuento') return Prisma.sql`CASE WHEN "isOnSale" AND "originalPrice" > "price" THEN ("originalPrice"-"price")/"originalPrice" ELSE 0 END DESC, "id" ASC`;
 return Prisma.sql`"createdAt" DESC, "id" ASC`;
}
export async function catalogFacets(db: Prisma.TransactionClient | PrismaClient, query: CatalogQuery): Promise<Facets> {
 const facets: Facets = { universe: {}, category: {}, subcategory: {} };
 const specs = [
  { field: 'universe' as const, column: Prisma.sql`"universe"`, ignore: ['universe','category','subcategory'] },
  { field: 'category' as const, column: Prisma.sql`"category"`, ignore: ['category','subcategory'] },
  { field: 'subcategory' as const, column: Prisma.sql`"subcategory"`, ignore: ['subcategory'] },
 ];
 for (const spec of specs) {
  const rows = await db.$queryRaw<{ value: string | null; count: bigint }[]>(Prisma.sql`SELECT ${spec.column} AS value, COUNT(*) AS count FROM "Product" ${catalogWhere(query, spec.ignore)} GROUP BY ${spec.column}`);
  for (const row of rows) if (row.value != null) facets[spec.field][row.value] = Number(row.count);
 }
 return facets;
}
