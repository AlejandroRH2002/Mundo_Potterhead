import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { useProducts } from './useProducts';
import { productService } from '../services/productService';
import { errorMessage } from '@/shared/lib/money';
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
  const [state, setState] = useState<{ product?: Product; loading: boolean; error: string }>({ loading: true, error: '' });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: '' });
    if (!id) { setState({ loading: false, error: 'Producto no encontrado.' }); return; }
    void productService.getById(id, controller.signal).then(product => {
      if (!controller.signal.aborted) setState({ product, loading: false, error: '' });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setState({ loading: false, error: errorMessage(cause) });
    });
    return () => controller.abort();
  }, [id]);
  return state;
}
