import { useState, useSyncExternalStore } from 'react';
import { cartService, resolveCart, whatsappOrder } from '../services/cartService';
import { useProducts } from '@/features/catalog/hooks/useProducts';
import { productService } from '@/features/catalog/services/productService';
import { errorMessage } from '@/shared/lib/money';
export function useCartCount() {
  const entries = useSyncExternalStore(cartService.subscribe, cartService.getSnapshot);
  return entries.reduce((sum, entry) => sum + entry.quantity, 0);
}
export function useAddToCart() {
  const [message, setMessage] = useState('');
  const add = (id: string, selectedImage?: string) => {
    try { cartService.add(id, selectedImage); setMessage('Producto agregado al carrito.'); }
    catch (cause: unknown) { setMessage(errorMessage(cause)); }
  };
  return { add, message };
}
export function useCart() {
  const entries = useSyncExternalStore(cartService.subscribe, cartService.getSnapshot);
  const catalog = useProducts();
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const resolved = resolveCart(entries, catalog.products);
  const change = (action: () => void) => {
    try { action(); setError(''); } catch (cause: unknown) { setError(errorMessage(cause)); }
  };
  const checkout = async () => {
    if (sending) return;
    setError(''); setSending(true);
    try {
      // Resolve again at checkout to avoid stale prices, quantities or deleted products.
      const products = await productService.list();
      const latest = resolveCart(cartService.getSnapshot(), products);
      catalog.setProducts(products);
      if (latest.missing.length) throw new Error('Retira los productos o imágenes elegidas que ya no están disponibles antes de enviar.');
      if (latest.lines.some(line => catalog.products.find(product => product.id === line.productId)?.price !== line.product.price)) {
        throw new Error('Se actualizaron los precios. Revisa el nuevo total y vuelve a enviar el pedido.');
      }
      const phone = import.meta.env.VITE_WHATSAPP_NUMBER ?? '';
      window.location.assign(whatsappOrder(latest.lines, phone, window.location.origin));
    } catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setSending(false); }
  };
  return { ...resolved, loading: catalog.loading, error: error || catalog.error, sending, checkout,
    setQuantity: (id: string, quantity: number, selectedImage?: string) => change(() => cartService.setQuantity(id, quantity, selectedImage)),
    remove: (id: string, selectedImage?: string) => change(() => cartService.remove(id, selectedImage)),
    clear: () => change(cartService.clear),
  };
}
