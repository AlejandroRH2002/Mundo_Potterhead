import { useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useProducts } from './useProducts';
import type { Product } from '@/types/product';
export function useCatalog(universe: Product['universe']) {
  const catalog = useProducts();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const category = params.get('category');
  const offersOnly = params.get('offers') === '1';
  const items = catalog.products.filter(product =>
    (offersOnly || product.universe === universe) &&
    (!category || product.category === category) &&
    (!offersOnly || product.isOnSale) &&
    `${product.name} ${product.description}`.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))
  );
  return { ...catalog, search, setSearch, items, offersOnly };
}
export function useProductDetail() {
  const { id } = useParams<{ id: string }>();
  const catalog = useProducts();
  return { ...catalog, product: catalog.products.find(product => product.id === id) };
}
