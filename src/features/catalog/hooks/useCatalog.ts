import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'react-router-dom';
import { productService } from '../services/productService';
import { errorMessage } from '@/shared/lib/money';
import type { Product } from '@/types/product';
import { parseCatalogUrl, parseCatalogQuery, serializeCatalogQuery, type CatalogPage, type CatalogQuery } from '../../../../shared/catalogQuery.ts';
export function useCatalog(universe: Product['universe']) {
  const [params, setParams] = useSearchParams();
  const query = parseCatalogUrl(params, universe);
  const key = serializeCatalogQuery(query).toString();
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{ data?: CatalogPage; loading: boolean; error: string; key: string }>({ loading: true, error: '', key: '' });
  const [inputError, setInputError] = useState('');
  useEffect(() => productService.subscribe(() => setRevision(value => value + 1)), []);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, error: '', key });
    setInputError('');
    void productService.search(parseCatalogQuery(new URLSearchParams(key)), controller.signal).then(data => {
      if (!controller.signal.aborted) setState({ data, loading: false, error: '', key });
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setState({ loading: false, error: errorMessage(cause), key });
    });
    return () => controller.abort();
  }, [key, revision]);
  const change = (patch: Record<string, string | undefined>) => {
    const next = serializeCatalogQuery(query);
    if ('universe' in patch) { next.delete('category'); next.delete('subcategory'); }
    else if ('category' in patch) next.delete('subcategory');
    if (!('page' in patch)) next.set('page', '1');
    for (const [name, value] of Object.entries(patch)) if (value === undefined || value === '') next.delete(name); else next.set(name, value);
    try {
      const normalized = serializeCatalogQuery(parseCatalogQuery(next));
      if (!normalized.has('universe')) normalized.set('universe', 'all');
      setParams(normalized); setInputError('');
    }
    catch { setInputError('Revisa el rango de precios y los filtros seleccionados.'); }
  };
  const reset = () => { setInputError(''); setParams(serializeCatalogQuery(parseCatalogQuery(new URLSearchParams({ universe })))); };
  const current = state.key === key;
  return { query: query as CatalogQuery, change, reset, loading: !current || state.loading, error: inputError || (current ? state.error : ''), items: current ? state.data?.items ?? [] : [], total: current ? state.data?.total ?? 0 : 0, facets: current ? state.data?.facets : undefined, offersOnly: query.onSale === true };
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
