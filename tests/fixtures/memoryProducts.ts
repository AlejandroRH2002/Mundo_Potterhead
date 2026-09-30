import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { Product } from '../../src/types/product.ts';
import { isProductList } from '../../src/features/catalog/services/productValidation.ts';

export function createProductRepository(seed: Product[], file?: string) {
  let products = seed.map(product => ({ ...product }));
  if (file && existsSync(file)) {
    const saved: unknown = JSON.parse(readFileSync(file, 'utf8'));
    if (!isProductList(saved)) throw new Error('El archivo del catálogo no es válido.');
    products = saved;
  }
  const commit = (next: Product[]) => {
    if (file) {
      mkdirSync(dirname(file), { recursive: true });
      const temporary = file + '.' + randomUUID() + '.tmp';
      writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
      renameSync(temporary, file);
    }
    products = next;
  };
  return {
    list: () => products.map(product => ({ ...product })),
    get: (id: string) => products.find(product => product.id === id),
    create: (draft: Omit<Product, 'id'>) => {
      const product = { ...draft, id: randomUUID() };
      commit([...products, product]);
      return product;
    },
    update: (id: string, draft: Omit<Product, 'id'>) => {
      if (!products.some(product => product.id === id)) return null;
      const product = { ...draft, id };
      commit(products.map(current => current.id === id ? product : current));
      return product;
    },
    remove: (id: string) => {
      if (!products.some(product => product.id === id)) return false;
      commit(products.filter(product => product.id !== id));
      return true;
    },
  };
}
export type ProductRepository = ReturnType<typeof createProductRepository>;
