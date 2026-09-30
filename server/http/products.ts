import type { Product } from '../../src/types/product.ts';
type Result<T> = T | Promise<T>;
export interface ProductRepository {
  list(): Result<Product[]>;
  get(id: string): Result<Product | null | undefined>;
  create(draft: Omit<Product, 'id'>): Result<Product>;
  update(id: string, draft: Omit<Product, 'id'>): Result<Product | null>;
  remove(id: string): Result<boolean>;
}
