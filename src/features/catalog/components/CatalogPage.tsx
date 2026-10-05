import { CatalogSearch } from '@/shared/components/CatalogSearch';
import { ProductCard } from '@/shared/components/ProductCard';
import { DiscountBanner } from '@/features/marketing/components/DiscountBanner';
import { Subscription } from '@/features/marketing/components/Subscription';
import { useCatalog } from '../hooks/useCatalog';
import type { Product } from '@/types/product';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { catalogChips } from '../hooks/catalogChips';
import { CatalogFilters } from './CatalogFilters';
import { AnimatePresence, m, useReducedMotion } from 'framer-motion';
import { useGridLayout } from '../hooks/useGridLayout';
export function CatalogPage({ universe, title }: { universe: Product['universe']; title: string }) {
  const catalog = useCatalog(universe);
  const grid = useGridLayout(catalog.items.map(product=>product.id).join(','));
  const reduce = useReducedMotion();
  return <div className="bg-magical"><header className="figma-catalog-heading"><div className="figma-container"><Breadcrumbs items={[{label:'Inicio',to:'/'},{label:catalog.offersOnly?'Ofertas':'Productos'}]}/><div className="flex flex-wrap items-end justify-between gap-4"><div><h1 className="shop-title">{catalog.offersOnly ? 'Ofertas mágicas' : title}</h1><p>Encuentra el objeto que faltaba en tu colección.</p></div><CatalogSearch/></div></div></header><section className="shop-page content-wrapper"><DiscountBanner />
    <div id="catalogo" className="section-heading catalog-heading"><p className="eyebrow">Piezas con personalidad</p><h2 className="sr-only">{catalog.offersOnly ? 'Selección en oferta' : 'El catálogo'}</h2><p>Elige tus favoritos. Confirmaremos disponibilidad por WhatsApp.</p></div>
    <div className="catalog-layout"><CatalogFilters total={catalog.total} query={catalog.query} facets={catalog.facets} change={catalog.change} reset={catalog.reset} />
    <div id="catalog-results" className="catalog-results" tabIndex={-1}>
    <div className="catalog-toolbar"><p aria-live="polite">{catalog.loading?'Cargando…':catalog.total+' resultados'+(catalog.query.q?' para «'+catalog.query.q+'»':'')}</p><label>Ordenar <select className="shop-input" value={catalog.query.sort} onChange={e=>catalog.change({sort:e.target.value})}><option value="novedad">Novedad</option><option value="precio-asc">Precio: menor a mayor</option><option value="precio-desc">Precio: mayor a menor</option><option value="descuento">Mayor descuento</option></select></label></div><div className="filter-chips" aria-label="Filtros activos">{catalogChips(catalog.query).map(chip=><button type="button" className="shop-link" key={chip.key} aria-label={'Quitar filtro: '+chip.label} onClick={()=>catalog.change({[chip.key]:undefined})}>{chip.label} ×</button>)}<button className="shop-link" type="button" onClick={catalog.reset}>Limpiar todo</button></div>
    {catalog.loading && <><p role="status">Cargando catálogo…</p><div className="product-grid" aria-hidden="true">{Array.from({length:6},(_,index)=><div className="product-skeleton" key={index}><div className="skeleton-image shimmer"/><div className="skeleton-body"><div className="skeleton-line shimmer"/><div className="skeleton-line shimmer"/><div className="skeleton-line shimmer"/></div></div>)}</div></>}
    {catalog.error && <div role="alert" className="shop-error state-panel"><h3>No pudimos mostrar esta selección</h3><p>{catalog.error}</p><p>Comprueba tu conexión o prueba con menos filtros.</p><div className="flex flex-wrap gap-4 justify-center"><button type="button" className="shop-button" onClick={()=>window.location.reload()}>Reintentar</button><button type="button" className="shop-link" onClick={catalog.reset}>Restablecer filtros</button></div></div>}
    {!catalog.loading && !catalog.error && !catalog.items.length && <div role="status" className="state-panel"><p className="eyebrow">Hay más por descubrir</p><h3>Esta combinación todavía no tiene productos</h3><p>Prueba otra subcategoría, amplía el rango de precios o elimina la búsqueda.</p><button type="button" className="shop-button" onClick={catalog.reset}>Limpiar filtros</button></div>}
    <div ref={grid} className="product-grid"><AnimatePresence initial={false}>{catalog.items.map((product, index) => <m.div data-product-id={product.id} key={product.id} exit={{opacity:0}} transition={{duration:reduce?0.14:0.2}}><ProductCard product={product} priority={index === 0} index={index}/></m.div>)}</AnimatePresence></div>
    {catalog.total > catalog.query.pageSize && <nav aria-label="Paginación del catálogo" className="flex flex-wrap items-center gap-4 my-6"><button type="button" className="shop-button" disabled={catalog.loading || catalog.query.page === 1} onClick={()=>catalog.change({page:String(catalog.query.page-1)})}>Anterior</button><span>Página {catalog.query.page} de {Math.ceil(catalog.total/catalog.query.pageSize)}</span><button type="button" className="shop-button" disabled={catalog.loading || catalog.query.page*catalog.query.pageSize>=catalog.total} onClick={()=>catalog.change({page:String(catalog.query.page+1)})}>Siguiente</button></nav>}
    </div></div><Subscription />
  </section></div>;
}
