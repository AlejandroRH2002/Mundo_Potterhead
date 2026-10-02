import { z } from 'zod';
import { categories, universes, belongsToCategory } from './catalogTaxonomy.ts';
import type { Product } from '../src/types/product.ts';
const price = z.string().regex(/^\d+(\.\d{1,2})?$/).transform(Number).pipe(z.number().min(0).max(1_000_000));
const integer = (max: number) => z.string().regex(/^[1-9]\d*$/).transform(Number).pipe(z.number().int().max(max));
export const catalogQuerySchema = z.object({
 universe: z.enum(universes).optional(), category: z.enum(categories).optional(), subcategory: z.string().min(1).max(80).optional(),
 onSale: z.enum(['true', 'false']).transform(value => value === 'true').optional(),
 minPrice: price.optional(), maxPrice: price.optional(), q: z.string().trim().max(150).optional(),
 sort: z.enum(['novedad', 'precio-asc', 'precio-desc', 'descuento']).default('novedad'),
 page: integer(100_000).default('1'), pageSize: integer(100).default('24'),
}).strict().superRefine((query, context) => {
 if (query.subcategory && (!query.category || !belongsToCategory(query.category, query.subcategory))) context.addIssue({ code: 'custom', path: ['subcategory'], message: 'Selecciona una subcategoría de la categoría indicada.' });
 if (query.minPrice !== undefined && query.maxPrice !== undefined && query.minPrice > query.maxPrice) context.addIssue({ code: 'custom', path: ['maxPrice'], message: 'El máximo debe ser mayor o igual al mínimo.' });
});
export type CatalogQuery = z.output<typeof catalogQuerySchema>;
export type Facets = { universe: Record<string, number>; category: Record<string, number>; subcategory: Record<string, number> };
export interface CatalogPage { items: Product[]; total: number; page: number; pageSize: number; facets: Facets }
export function parseCatalogQuery(params: URLSearchParams): CatalogQuery {
 const values: Record<string, string> = {};
 for (const [key, value] of params) { if (key in values) throw new Error('Parámetro repetido.'); values[key] = value; }
 return catalogQuerySchema.parse(values);
}
export function serializeCatalogQuery(query: CatalogQuery): URLSearchParams {
 const params = new URLSearchParams();
 for (const [key, value] of Object.entries(query)) if (value !== undefined && value !== '') params.set(key, String(value));
 return params;
}
// UI accepts the existing offers=1 links. Invalid bookmarks are recovered by
// clearing filters, while the API rejects invalid/unknown query parameters.
export function parseCatalogUrl(params: URLSearchParams, universe: Product['universe']): CatalogQuery {
 const next = new URLSearchParams(params);
 if (next.get('offers') === '1') next.set('onSale', 'true');
 const allOffers = next.get('offers') === '1'; next.delete('offers');
 const allUniverses = next.get('universe') === 'all';
 if (allUniverses) next.delete('universe');
 if (!next.has('universe') && !allOffers && !allUniverses) next.set('universe', universe);
 try { return parseCatalogQuery(next); } catch { return catalogQuerySchema.parse({ universe }); }
}
export const discount = (product: Product): number => product.isOnSale && product.originalPrice && product.originalPrice > product.price ? (product.originalPrice - product.price) / product.originalPrice : 0;
export function matchesCatalog(product: Product, query: CatalogQuery, ignore: string[] = []): boolean {
 return (ignore.includes('universe') || !query.universe || product.universe === query.universe) &&
  (ignore.includes('category') || !query.category || product.category === query.category) &&
  (ignore.includes('subcategory') || !query.subcategory || product.subcategory === query.subcategory) &&
  (query.onSale === undefined || Boolean(product.isOnSale) === query.onSale) &&
  (query.minPrice === undefined || product.price >= query.minPrice) && (query.maxPrice === undefined || product.price <= query.maxPrice) &&
  (!query.q || `${product.name} ${product.description}`.toLocaleLowerCase('es').includes(query.q.toLocaleLowerCase('es')));
}
// Used by repository fixtures; production filtering/pagination runs in SQL.
export function filterCatalog(products: Product[], query: CatalogQuery): CatalogPage {
 const facets: Facets = { universe: {}, category: {}, subcategory: {} };
 const ignores = { universe: ['universe','category','subcategory'], category: ['category','subcategory'], subcategory: ['subcategory'] };
 for (const field of ['universe','category','subcategory'] as const) for (const product of products) {
  const value = product[field]; if (value && matchesCatalog(product, query, ignores[field])) facets[field][value] = (facets[field][value] ?? 0) + 1;
 }
 const items = products.filter(product => matchesCatalog(product, query));
 if (query.sort === 'novedad') items.reverse(); // Fixture insertion order approximates creation time.
 else items.sort((a, b) => (query.sort === 'precio-asc' ? a.price-b.price : query.sort === 'precio-desc' ? b.price-a.price : discount(b)-discount(a)) || a.id.localeCompare(b.id));
 return { items: items.slice((query.page-1)*query.pageSize, query.page*query.pageSize).map(product => ({ ...product, image: product.image.startsWith('data:') ? '/images/product-placeholder.svg' : product.image })), total: items.length, page: query.page, pageSize: query.pageSize, facets };
}
