import { Link } from 'react-router-dom';
import { useProductDetail } from '../hooks/useCatalog';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
export function ProductDetail() {
  const detail = useProductDetail();
  const cart = useAddToCart();
  if (detail.loading) return <section className="shop-page" role="status">Cargando producto…</section>;
  if (detail.error) return <section className="shop-page shop-error" role="alert">{detail.error}</section>;
  if (!detail.product) return <section className="shop-page"><h1 className="shop-title">Producto no encontrado</h1><Link className="shop-link" to="/">Volver al catálogo</Link></section>;
  const product = detail.product;
  return <section className="shop-page">
    <Link to="/" className="shop-link">← Volver al catálogo</Link>
    <article className="shop-panel grid gap-8 md:grid-cols-2">
      <img className="w-full rounded-lg object-cover" src={product.image} alt={product.name} />
      <div><h1 className="shop-title">{product.name}</h1><p className="whitespace-pre-line">{product.description}</p>
        <p className="text-3xl font-bold text-amber-300 my-5">{money(product.price)}</p>
        {product.isOnSale && product.originalPrice && <p className="line-through mb-4">{money(product.originalPrice)}</p>}
        <button className="shop-button" onClick={() => cart.add(product.id)}>Agregar al carrito</button>
        <Link className="shop-link ml-6" to="/cart">Ver carrito</Link>
        <p role="status" className="mt-4">{cart.message}</p>
      </div>
    </article>
  </section>;
}
