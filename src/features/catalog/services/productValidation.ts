import type { Product } from '@/types/product';
import { productDraftSchema } from '../../../../shared/productSchema.ts';
export { categories, universes, validImage } from '../../../../shared/productSchema.ts';
export type ProductDraft = Omit<Product, 'id'>;
export function validateDraft(draft: unknown): ProductDraft {
  const result = productDraftSchema.safeParse(draft);
  if (!result.success) throw new Error(result.error.issues.find(issue => issue.path[0] === 'subcategory')?.message ?? 'Revisa el nombre, la descripción, los precios, la categoría y la imagen del producto.');
  return result.data;
}
export function isProduct(value: unknown): value is Product {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && productDraftSchema.safeParse(value).success;
}
export const isProductList = (value: unknown): value is Product[] => Array.isArray(value) && value.every(isProduct);
