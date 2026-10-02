import { Button } from './Button';
import { productImages } from '@/shared/lib/productMedia';
import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { Link } from 'react-router-dom';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
import { m, useReducedMotion } from 'framer-motion';
import { taxonomy } from '../../../shared/catalogTaxonomy.ts';
export function ProductCard({ product, priority = false, index = 0 }: { product: Product; priority?: boolean; index?: number }) {
  const secondary = productImages(product)[1];
  const isNew = 'isNew' in product && product.isNew === true;
  const cart = useAddToCart();
  const reduce = useReducedMotion();
  const [notice, setNotice] = useState(false);
  const [noticeVersion, setNoticeVersion] = useState(0);
  useEffect(()=>{ if(!noticeVersion)return; const timer=window.setTimeout(()=>setNotice(false),3500); return ()=>window.clearTimeout(timer); },[noticeVersion]);
  const percentage = product.isOnSale && product.originalPrice ? Math.round((1-product.price/product.originalPrice)*100) : 0;
  const label = taxonomy[product.category].find(item => item.slug === product.subcategory)?.label;
  return <m.article className="product-card" initial={{ opacity: 0, y: reduce ? 0 : 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.1 }} transition={{ duration: reduce ? 0.14 : 0.45, delay: reduce ? 0 : (index % 3)*0.09 }} whileHover={reduce ? undefined : { y: -4 }}>
    <Link className="product-image-link" to={`/product/${product.id}`}><img src={product.image} alt={product.name} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" width={600} height={400} className="w-full aspect-[3/2] object-cover" />{secondary && <img className="product-secondary" src={secondary} alt="" loading="lazy" decoding="async" width={600} height={400}/>} {isNew && !product.isOnSale && <span className="sale-badge">Nuevo</span>}{product.isOnSale && <span className="sale-badge">Oferta{percentage > 0 ? ` · −${percentage}%` : ''}</span>}</Link>
    <div className="p-5 flex flex-col flex-1">
      {label && <span className="subcategory-chip">{label}</span>}
      <Link className="font-cinzel text-xl font-bold" to={`/product/${product.id}`}>{product.name}</Link>
      <p className="line-clamp-2 my-3 product-description">{product.description}</p>
      <p className="availability-note">Disponibilidad por confirmar</p>
      <p className="text-xl font-bold mb-3">{money(product.price)} {product.isOnSale && product.originalPrice && <span className="text-sm text-gray-600 line-through">{money(product.originalPrice)}</span>}</p>
      <Button aria-label={`Añadir ${product.name} a mi cotización`} className="quick-add mt-auto" onClick={() => { cart.add(product.id); setNotice(true); setNoticeVersion(value=>value+1); }}>Añadir a mi cotización</Button>
      <p role="status" aria-live="polite" className="cart-feedback text-sm mt-2">{cart.message === 'Producto agregado al carrito.' && !notice ? '' : cart.message}</p>
    </div>
  </m.article>;
}
