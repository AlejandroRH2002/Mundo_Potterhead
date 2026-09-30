import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { productService } from '../services/productService';
import { errorMessage } from '@/shared/lib/money';
export function useProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let revision = 0;
    const load = async () => {
      const current = ++revision;
      try {
        const items = await productService.list();
        if (active && current === revision) { setProducts(items); setError(''); }
      } catch (cause: unknown) { if (active && current === revision) setError(errorMessage(cause)); }
      finally { if (active && current === revision) setLoading(false); }
    };
    void load();
    const unsubscribe = productService.subscribe(() => { void load(); });
    return () => { active = false; unsubscribe(); };
  }, []);
  return { products, loading, error, setProducts };
}
