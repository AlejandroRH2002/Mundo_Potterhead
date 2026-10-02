import { adminLabels } from '../../../../shared/adminLabels';
import { safeInternalPath } from '@/shared/lib/safeInternalPath';
import { Link } from 'react-router-dom';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { money } from '@/shared/lib/money';
export function AdminDashboard() {
  const admin = useAdminProducts();
  return <section className="shop-page">
    <div className="flex flex-wrap items-center justify-between gap-4"><Link className="shop-link" to="/admin/usuarios">{adminLabels.users}</Link><h1 className="shop-title">{adminLabels.productsTitle}</h1><Link className="shop-button" to="/products/new">Crear producto</Link></div>
    <label>Buscar producto<input className="shop-input mb-6" type="search" value={admin.search} onChange={event => admin.setSearch(event.target.value)} /></label>
    {admin.error && <p className="shop-error" role="alert">{admin.error}</p>}
    {admin.loading && <p role="status">Cargando productos…</p>}
    {!admin.loading && !admin.filtered.length && <p>No hay productos que coincidan con la búsqueda.</p>}
    {admin.filtered.map(product => <article key={product.id} className="shop-panel flex flex-wrap items-center gap-5">
      <img src={product.image} alt={product.name} className="h-20 w-20 rounded object-cover" />
      <div className="flex-1"><h2 className="font-bold">{product.name}</h2><p className="line-clamp-2">{product.description}</p><strong>{money(product.price)}</strong></div>
      <Link className="shop-link" to={safeInternalPath(`/product/${encodeURIComponent(product.id)}`)}>Ver</Link>
      <Link className="shop-button" to={safeInternalPath(`/products/edit/${encodeURIComponent(product.id)}`)}>Editar</Link>
      <button aria-label={`Eliminar ${product.name}`} className="shop-link" disabled={admin.deleting !== null} onClick={() => void admin.remove(product.id)}>{admin.deleting === product.id ? 'Eliminando…' : 'Eliminar'}</button>
    </article>)}
  </section>;
}
