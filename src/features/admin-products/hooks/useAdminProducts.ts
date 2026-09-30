import { useState } from 'react';
import { useProducts } from '@/features/catalog/hooks/useProducts';
import { productService } from '@/features/catalog/services/productService';
import { errorMessage } from '@/shared/lib/money';
export function useAdminProducts() {
  const catalog = useProducts();
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const remove = async (id: string) => {
    if (!window.confirm('¿Eliminar este producto? También dejará de estar disponible en los carritos.')) return;
    setDeleting(id); setError('');
    try { await productService.remove(id); catalog.setProducts(current => current.filter(product => product.id !== id)); }
    catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setDeleting(null); }
  };
  return { ...catalog, error: error || catalog.error, search, setSearch, remove, deleting,
    filtered: catalog.products.filter(product => product.name.toLocaleLowerCase('es').includes(search.toLocaleLowerCase('es'))) };
}
