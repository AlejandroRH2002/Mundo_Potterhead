import { deduplicatedRequests } from '@/shared/lib/deduplicate';
import type { Product } from '@/types/product';
import { requestJson } from '@/shared/lib/httpClient';
import { isProduct, isProductList, validateDraft, type ProductDraft } from './productValidation';
import { serializeCatalogQuery, parseCatalogQuery, type CatalogQuery, type CatalogPage } from '../../../../shared/catalogQuery.ts';
export type { ProductDraft } from './productValidation';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
function parseProduct(value: unknown): Product {
  if (!isProduct(value)) throw new Error('El producto recibido no es válido.');
  return value;
}
async function loadSearch(query: CatalogQuery, signal?: AbortSignal): Promise<CatalogPage> {
  const value = await requestJson<unknown>(`/products?${serializeCatalogQuery(query)}`, { signal });
  if (!value || typeof value !== 'object' || !('items' in value) || !isProductList(value.items) ||
    !('total' in value) || !Number.isSafeInteger(value.total) || Number(value.total) < 0 ||
    !('page' in value) || value.page !== query.page || !('pageSize' in value) || value.pageSize !== query.pageSize ||
    !('facets' in value) || !value.facets || typeof value.facets !== 'object') throw new Error('El catálogo recibido no es válido.');
  for (const field of ['universe', 'category', 'subcategory']) {
    const counts: unknown = Reflect.get(value.facets, field);
    if (!counts || typeof counts !== 'object' || Array.isArray(counts) || Object.values(counts).some(count => !Number.isSafeInteger(count) || count < 0)) throw new Error('Las facetas recibidas no son válidas.');
  }
  return value as CatalogPage;
}
const sharedSearch=deduplicatedRequests<CatalogPage>();
function search(query:CatalogQuery,signal?:AbortSignal){const key=serializeCatalogQuery(query).toString();return sharedSearch(key,transport=>loadSearch(query,transport),signal);}
export const productService = {
  search,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  list: async (): Promise<Product[]> => {
    const items: Product[] = [];
    let page = 1;
    while (true) {
      const result = await search(parseCatalogQuery(new URLSearchParams({ page: String(page), pageSize: '100', sort: 'novedad' })));
      items.push(...result.items);
      if (!result.items.length || items.length >= result.total) return items;
      page++;
    }
  },
  getById: async (id: string, signal?: AbortSignal) => parseProduct(await requestJson<unknown>(`/products/${encodeURIComponent(id)}`, { signal })),
  create: async (draft: ProductDraft): Promise<Product> => {
    const product = parseProduct(await requestJson<unknown>('/products', { method: 'POST', body: JSON.stringify(validateDraft(draft)) }));
    notify();
    return product;
  },
  update: async (id: string, draft: ProductDraft): Promise<Product> => {
    const product = parseProduct(await requestJson<unknown>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(validateDraft(draft)) }));
    notify();
    return product;
  },
  remove: async (id: string): Promise<void> => {
    await requestJson<void>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });
    notify();
  },
};
