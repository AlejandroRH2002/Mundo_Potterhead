import type { Product } from '../../src/types/product.ts';
import type { CatalogQuery, CatalogPage } from '../../shared/catalogQuery.ts';
type Result<T> = T | Promise<T>;
export interface ProductRepository {
  search?(query: CatalogQuery): Result<CatalogPage>;
  list(): Result<Product[]>;
  get(id: string): Result<Product | null | undefined>;
  create(draft: Omit<Product, 'id'>): Result<Product>;
  update(id: string, draft: Omit<Product, 'id'>): Result<Product | null>;
  remove(id: string): Result<boolean>;
}
