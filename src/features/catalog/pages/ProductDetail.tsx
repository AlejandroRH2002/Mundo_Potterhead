import { lazy, Suspense } from 'react';
import { Button } from '@/shared/components/Button';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ProductGallery } from '../components/ProductGallery';
import { Link } from 'react-router-dom';
import { useProductDetail } from '../hooks/useCatalog';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
import { usePageMetadata } from '@/shared/lib/usePageMetadata';
import { taxonomy } from '../../../../shared/catalogTaxonomy.ts';
const RelatedProducts=lazy(()=>import('../components/RelatedProducts').then(module=>({default:module.RelatedProducts})));
export function ProductDetail() {
  const detail = useProductDetail();
  const cart = useAddToCart();
  usePageMetadata({ title: detail.product?.name ?? 'Producto', description: detail.product?.description, image: detail.product?.image, noindex: !detail.product || !!detail.error });
  if (detail.loading) return <section className="shop-page" role="status">Cargando producto…</section>;
  if (detail.error) return <section className="shop-page shop-error" role="alert">{detail.error}</section>;
  if (!detail.product) return <section className="shop-page"><h1 className="shop-title">Producto no encontrado</h1><Link className="shop-link" to="/">Volver al catálogo</Link></section>;
  const product = detail.product;
  return <section className="shop-page product-detail-page">
    <Breadcrumbs items={[{label:'Inicio',to:'/'},{label:'Catálogo',to:'/#catalogo'},{label:product.name}]}/><Link to="/#catalogo" className="shop-link">← Volver al catálogo</Link>
    <article className="shop-panel grid gap-8 md:grid-cols-2">
      <ProductGallery key={product.id} product={product}/>
      <div className="product-detail-info">{product.subcategory && <span className="eyebrow">{taxonomy[product.category].find(item=>item.slug===product.subcategory)?.label}</span>}<h1 className="shop-title">{product.name}</h1><p className="whitespace-pre-line">{product.description}</p>
        <p className="product-detail-price text-3xl font-bold my-5">{money(product.price)}</p>
        {product.isOnSale && product.originalPrice && <p className="line-through mb-4">{money(product.originalPrice)}</p>}
        <p className="my-4">Disponibilidad por confirmar. Te ayudaremos a coordinar tu selección por WhatsApp.</p>
        <div className="product-detail-actions"><Button onClick={() => cart.add(product.id)}>Añadir a mi cotización</Button>
        <Link className="shop-link ml-6" to="/cart">Ver carrito</Link></div>
        <p role="status" className="mt-4">{cart.message}</p>
      </div>
    </article>
    <div className="mobile-product-cta"><span>{money(product.price)}<small>Disponibilidad a confirmar</small></span><Button size="sm" onClick={()=>cart.add(product.id)}>Añadir a mi cotización</Button></div>
    <Suspense fallback={<p role="status">Buscando piezas relacionadas…</p>}><RelatedProducts key={product.id} product={product}/></Suspense>
  </section>;
}
