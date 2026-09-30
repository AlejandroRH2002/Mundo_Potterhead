import type { Product } from '@/types/product';
import { Link } from 'react-router-dom';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
export function ProductCard({ product }: { product: Product }) {
  const cart = useAddToCart();
  return <article className="rounded-xl bg-white text-gray-900 shadow-xl overflow-hidden flex flex-col">
    <Link to={`/product/${product.id}`}><img src={product.image} alt={product.name} loading="lazy" className="w-full h-60 object-cover" /></Link>
    <div className="p-5 flex flex-col flex-1">
      {product.isOnSale && <span className="text-red-800 font-bold">En oferta</span>}
      <Link className="font-cinzel text-xl font-bold" to={`/product/${product.id}`}>{product.name}</Link>
      <p className="line-clamp-2 my-3">{product.description}</p>
      <p className="text-xl font-bold mb-3">{money(product.price)} {product.isOnSale && product.originalPrice && <span className="text-sm text-gray-500 line-through">{money(product.originalPrice)}</span>}</p>
      <button className="shop-button mt-auto" onClick={() => cart.add(product.id)}>Agregar al carrito</button>
      <p role="status" className="text-sm mt-2">{cart.message}</p>
    </div>
  </article>;
}
