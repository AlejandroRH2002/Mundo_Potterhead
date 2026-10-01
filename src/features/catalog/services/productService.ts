import type { Product } from '@/types/product';
import { requestJson } from '@/shared/lib/httpClient';
import { isProduct, isProductList, validateDraft, type ProductDraft } from './productValidation';
export type { ProductDraft } from './productValidation';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(listener => listener());
function parseProduct(value: unknown): Product {
  if (!isProduct(value)) throw new Error('El producto recibido no es válido.');
  return value;
}
export const productService = {
  subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
  list: async (): Promise<Product[]> => {
    const value = await requestJson<unknown>('/products');
    if (!isProductList(value)) throw new Error('El catálogo recibido no es válido.');
    return value;
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
