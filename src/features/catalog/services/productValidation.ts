import { z } from 'zod';
import type { Product } from '@/types/product';
import { productDraftSchema } from '../../../../shared/productSchema.ts';
export { categories, universes, validImage } from '../../../../shared/productSchema.ts';
export type ProductDraft = Omit<Product, 'id'>;
export function validateDraft(draft: unknown): ProductDraft {
  const result = productDraftSchema.safeParse(draft);
  if (!result.success) throw new Error(result.error.issues.find(issue => issue.path[0] === 'subcategory')?.message ?? 'Revisa el nombre, la descripción, los precios, la categoría y la imagen del producto.');
  return result.data;
}
const modelsSchema=z.array(z.object({id:z.string(),sku:z.string(),name:z.string(),image:z.string().nullable(),active:z.boolean(),quantity:z.number().int().nonnegative().nullable(),version:z.number().int().nonnegative()}));
export function isProduct(value: unknown): value is Product {
  return !!value && typeof value === 'object' && 'id' in value && typeof value.id === 'string' && productDraftSchema.safeParse(value).success && (!('models' in value) || modelsSchema.safeParse(value.models).success) && (!('inventoryMode' in value) || value.inventoryMode === 'capture' || value.inventoryMode === 'enforce');
}
export const isProductList = (value: unknown): value is Product[] => Array.isArray(value) && value.every(isProduct);
