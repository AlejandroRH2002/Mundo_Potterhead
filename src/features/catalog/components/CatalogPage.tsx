import { ProductCard } from '@/shared/components/ProductCard';
import { DiscountBanner } from '@/features/marketing/components/DiscountBanner';
import { Subscription } from '@/features/marketing/components/Subscription';
import { useCatalog } from '../hooks/useCatalog';
import type { Product } from '@/types/product';
import { CatalogFilters } from './CatalogFilters';
export function CatalogPage({ universe, title }: { universe: Product['universe']; title: string }) {
  const catalog = useCatalog(universe);
  return <div className="bg-magical"><section className="shop-page content-wrapper">
    <h1 className="shop-title">{catalog.offersOnly ? 'Ofertas mágicas' : title}</h1>
    <DiscountBanner />
    <CatalogFilters query={catalog.query} facets={catalog.facets} change={catalog.change} reset={catalog.reset} />
    {catalog.loading && <p role="status">Cargando catálogo…</p>}
    {catalog.error && <p role="alert" className="shop-error">{catalog.error}</p>}
    {!catalog.loading && !catalog.error && !catalog.items.length && <div role="status"><p>No encontramos productos. Prueba otra subcategoría, amplía el rango de precios o elimina la búsqueda.</p><button type="button" className="shop-link" onClick={catalog.reset}>Limpiar filtros</button></div>}
    {!catalog.loading && !catalog.error && <p role="status">{catalog.total} productos encontrados</p>}
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{catalog.items.map((product, index) => <ProductCard key={product.id} product={product} priority={index === 0} />)}</div>
    {catalog.total > catalog.query.pageSize && <nav aria-label="Paginación del catálogo" className="flex gap-4 my-6"><button type="button" className="shop-button" disabled={catalog.loading || catalog.query.page === 1} onClick={()=>catalog.change({page:String(catalog.query.page-1)})}>Anterior</button><span>Página {catalog.query.page} de {Math.ceil(catalog.total/catalog.query.pageSize)}</span><button type="button" className="shop-button" disabled={catalog.loading || catalog.query.page*catalog.query.pageSize>=catalog.total} onClick={()=>catalog.change({page:String(catalog.query.page+1)})}>Siguiente</button></nav>}
    <Subscription />
  </section></div>;
}
