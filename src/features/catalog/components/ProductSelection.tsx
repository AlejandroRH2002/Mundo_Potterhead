import type { Product } from '@/types/product';
import { ProductCard } from '@/shared/components/ProductCard';
export function ProductSelection({ items, loading, error, title, eyebrow }: { items: Product[]; loading: boolean; error: string; title: string; eyebrow: string }) {
 return <section className="figma-selection"><header className="section-heading"><p className="eyebrow">{eyebrow}</p><h2>{title}</h2></header>
  {error ? <p className="shop-error" role="alert">{error}</p> : loading ? <div className="figma-product-grid" aria-busy="true"><span className="sr-only" role="status">Cargando productos</span>{Array.from({length:4},(_,index)=><div key={index} className="product-skeleton"><div className="skeleton-image shimmer"/><div className="skeleton-body"><div className="skeleton-line shimmer"/></div></div>)}</div> : items.length ? <div className="figma-product-grid">{items.map((product,index)=><ProductCard key={product.id} product={product} index={index}/>)}</div> : <p className="figma-empty" role="status">Pronto habrá más piezas para descubrir. Consulta disponibilidad por WhatsApp.</p>}
 </section>;
}
