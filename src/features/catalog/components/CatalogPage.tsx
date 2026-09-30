import { ProductCard } from '@/shared/components/ProductCard';
import { DiscountBanner } from '@/features/marketing/components/DiscountBanner';
import { Subscription } from '@/features/marketing/components/Subscription';
import { useCatalog } from '../hooks/useCatalog';
import type { Product } from '@/types/product';
export function CatalogPage({ universe, title }: { universe: Product['universe']; title: string }) {
  const catalog = useCatalog(universe);
  return <div className="bg-magical"><section className="shop-page content-wrapper">
    <h1 className="shop-title">{catalog.offersOnly ? 'Ofertas mágicas' : title}</h1>
    <DiscountBanner />
    <label className="block mb-6">Buscar en el catálogo<input className="shop-input" type="search" value={catalog.search} onChange={event => catalog.setSearch(event.target.value)} placeholder="Nombre o descripción" /></label>
    {catalog.loading && <p role="status">Cargando catálogo…</p>}
    {catalog.error && <p role="alert" className="shop-error">{catalog.error}</p>}
    {!catalog.loading && !catalog.error && !catalog.items.length && <p>No encontramos productos con esos filtros.</p>}
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">{catalog.items.map(product => <ProductCard key={product.id} product={product} />)}</div>
    <Subscription />
  </section></div>;
}
