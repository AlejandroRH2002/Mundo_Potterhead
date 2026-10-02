import { adminLabels } from '../../../../shared/adminLabels';
import { safeInternalPath } from '@/shared/lib/safeInternalPath';
import { Link } from 'react-router-dom';
import { useAdminProducts } from '../hooks/useAdminProducts';
import { money } from '@/shared/lib/money';
export function AdminDashboard() {
  const admin = useAdminProducts();
  return <section className="shop-page admin-page">
    <div className="flex flex-wrap items-center justify-between gap-4"><Link className="shop-link" to="/admin/usuarios">{adminLabels.users}</Link><h1 className="shop-title">{adminLabels.productsTitle}</h1><Link className="shop-button" to="/products/new">Crear producto</Link></div>
    <label>Buscar producto<input className="shop-input mb-6" type="search" value={admin.search} onChange={event => admin.setSearch(event.target.value)} /></label>
    {admin.error && <p className="shop-error" role="alert">{admin.error}</p>}
    {admin.loading && <p role="status">Cargando productos…</p>}
    {!admin.loading && !admin.filtered.length && <p>No hay productos que coincidan con la búsqueda.</p>}
    <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">{adminLabels.products}</caption>
      <thead><tr><th scope="col">Imagen</th><th scope="col">Producto</th><th scope="col">Precio y etiquetas</th><th scope="col">Acciones</th></tr></thead>
      <tbody>{admin.filtered.map(product => <tr key={product.id}>
        <td className="admin-thumbnail"><img src={product.image} alt={product.name} loading="lazy" decoding="async" width={80} height={80} /></td>
        <th scope="row" className="admin-name"><h2 className="line-clamp-2 break-words font-bold">{product.name}</h2><p className="font-normal">{product.description}</p></th>
        <td><strong>{money(product.price)}</strong><div className="admin-chips">{product.isOnSale && <span>Oferta</span>}{product.subcategory && <span>{product.subcategory}</span>}<span>Disponibilidad a confirmar</span></div></td>
        <td><div className="admin-actions">
          <Link className="shop-link" to={safeInternalPath(`/product/${encodeURIComponent(product.id)}`)}>Ver</Link>
          <Link className="shop-button" to={safeInternalPath(`/products/edit/${encodeURIComponent(product.id)}`)}>Editar</Link>
          <button aria-label={`Eliminar ${product.name}`} className="shop-link" disabled={admin.deleting !== null} onClick={() => void admin.remove(product.id)}>{admin.deleting === product.id ? 'Eliminando…' : 'Eliminar'}</button>
        </div></td>
      </tr>)}</tbody>
    </table></div>
  </section>;
}
