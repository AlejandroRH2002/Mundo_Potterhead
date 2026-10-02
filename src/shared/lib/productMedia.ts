import type { Product } from '@/types/product';
import { validImage } from '../../../shared/productSchema.ts';
export function productImages(product: Product): string[] {
 const extra: unknown = 'images' in product ? product.images : undefined;
 return [...new Set([product.image,...(Array.isArray(extra)?extra.filter((url): url is string=>typeof url==='string'&&validImage(url)&&!url.startsWith('data:')):[])])];
}
