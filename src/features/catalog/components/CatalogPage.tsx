import { ProductCard } from '@/shared/components/ProductCard';
import { DiscountBanner } from '@/features/marketing/components/DiscountBanner';
import { Subscription } from '@/features/marketing/components/Subscription';
import { useCatalog } from '../hooks/useCatalog';
import type { Product } from '@/types/product';
import { CatalogFilters } from './CatalogFilters';
import { StoreHero } from './StoreHero';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useGridLayout } from '../hooks/useGridLayout';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
export function CatalogPage({ universe, title }: { universe: Product['universe']; title: string }) {
  const catalog = useCatalog(universe);
  const grid = useGridLayout(catalog.items.map(product=>product.id).join(','));
  const reduce = useReducedMotion();
  const { hash, search } = useLocation();
  useEffect(() => { if (hash === '#catalogo') document.getElementById('catalogo')?.scrollIntoView({ behavior: 'auto', block: 'start' }); }, [hash, search]);
  return <div className="bg-magical"><section className="shop-page content-wrapper">
    {universe === 'harry-potter' ? <StoreHero/> : <header className="catalog-heading"><p className="eyebrow">Historias que trascienden universos</p><h1 className="shop-title">{catalog.offersOnly ? 'Ofertas mágicas' : title}</h1></header>}
    <DiscountBanner />
    <div id="catalogo" className="section-heading catalog-heading"><p className="eyebrow">Piezas con personalidad</p><h2>{catalog.offersOnly ? 'Selección en oferta' : 'El catálogo'}</h2><p>Elige tus favoritos. Confirmaremos disponibilidad por WhatsApp.</p></div>
    <CatalogFilters query={catalog.query} facets={catalog.facets} change={catalog.change} reset={catalog.reset} />
    {catalog.loading && <><p role="status">Cargando catálogo…</p><div className="product-grid" aria-hidden="true">{Array.from({length:6},(_,index)=><div className="product-skeleton" key={index}><div className="skeleton-image shimmer"/><div className="skeleton-body"><div className="skeleton-line shimmer"/><div className="skeleton-line shimmer"/><div className="skeleton-line shimmer"/></div></div>)}</div></>}
    {catalog.error && <div role="alert" className="shop-error state-panel"><h3>No pudimos mostrar esta selección</h3><p>{catalog.error}</p><p>Comprueba tu conexión o prueba con menos filtros.</p><div className="flex flex-wrap gap-4 justify-center"><button type="button" className="shop-button" onClick={()=>window.location.reload()}>Reintentar</button><button type="button" className="shop-link" onClick={catalog.reset}>Restablecer filtros</button></div></div>}
    {!catalog.loading && !catalog.error && !catalog.items.length && <div role="status" className="state-panel"><p className="eyebrow">Hay más por descubrir</p><h3>Esta combinación todavía no tiene productos</h3><p>Prueba otra subcategoría, amplía el rango de precios o elimina la búsqueda.</p><button type="button" className="shop-button" onClick={catalog.reset}>Limpiar filtros</button></div>}
    {!catalog.loading && !catalog.error && <p role="status">{catalog.total} productos encontrados</p>}
    <div ref={grid} className="product-grid"><AnimatePresence initial={false}>{catalog.items.map((product, index) => <m.div data-product-id={product.id} key={product.id} exit={{opacity:0}} transition={{duration:reduce?0:0.12}}><ProductCard product={product} priority={index === 0} index={index}/></m.div>)}</AnimatePresence></div>
    {catalog.total > catalog.query.pageSize && <nav aria-label="Paginación del catálogo" className="flex gap-4 my-6"><button type="button" className="shop-button" disabled={catalog.loading || catalog.query.page === 1} onClick={()=>catalog.change({page:String(catalog.query.page-1)})}>Anterior</button><span>Página {catalog.query.page} de {Math.ceil(catalog.total/catalog.query.pageSize)}</span><button type="button" className="shop-button" disabled={catalog.loading || catalog.query.page*catalog.query.pageSize>=catalog.total} onClick={()=>catalog.change({page:String(catalog.query.page+1)})}>Siguiente</button></nav>}
    <Subscription />
  </section></div>;
}
