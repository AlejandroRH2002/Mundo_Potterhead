import type { Product } from '@/types/product';
import { Link } from 'react-router-dom';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
import { m, useReducedMotion } from 'framer-motion';
import { taxonomy } from '../../../shared/catalogTaxonomy.ts';
export function ProductCard({ product, priority = false, index = 0 }: { product: Product; priority?: boolean; index?: number }) {
  const cart = useAddToCart();
  const reduce = useReducedMotion();
  const percentage = product.isOnSale && product.originalPrice ? Math.round((1-product.price/product.originalPrice)*100) : 0;
  const label = taxonomy[product.category].find(item => item.slug === product.subcategory)?.label;
  return <m.article className="product-card" initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduce ? 0 : 0.3, delay: reduce ? 0 : (index % 3)*0.045 }} whileHover={reduce ? undefined : { y: -4 }}>
    <Link className="product-image-link" to={`/product/${product.id}`}><img src={product.image} alt={product.name} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" width={600} height={400} className="w-full aspect-[3/2] object-cover" />{product.isOnSale && <span className="sale-badge">Oferta{percentage > 0 ? ` · −${percentage}%` : ''}</span>}</Link>
    <div className="p-5 flex flex-col flex-1">
      {label && <span className="subcategory-chip">{label}</span>}
      <Link className="font-cinzel text-xl font-bold" to={`/product/${product.id}`}>{product.name}</Link>
      <p className="line-clamp-2 my-3 product-description">{product.description}</p>
      <p className="availability-note">Disponibilidad por confirmar</p>
      <p className="text-xl font-bold mb-3">{money(product.price)} {product.isOnSale && product.originalPrice && <span className="text-sm text-gray-600 line-through">{money(product.originalPrice)}</span>}</p>
      <button aria-label={`Agregar ${product.name} al carrito`} className="shop-button mt-auto" onClick={() => cart.add(product.id)}>Agregar al carrito</button>
      <p role="status" aria-live="polite" className="cart-feedback text-sm mt-2">{cart.message}</p>
    </div>
  </m.article>;
}
