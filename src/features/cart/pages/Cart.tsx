import { Link } from 'react-router-dom';
import { useCart } from '../hooks/useCart';
import { money } from '@/shared/lib/money';
export function Cart() {
  const cart = useCart();
  return <section className="shop-page">
    <Link to="/" className="shop-link">← Seguir comprando</Link>
    <h1 className="shop-title">Mi carrito</h1>
    {cart.loading && <p role="status">Cargando carrito…</p>}
    {cart.error && <p role="alert" className="shop-error">{cart.error}</p>}
    {!cart.loading && !cart.lines.length && !cart.missing.length && <p>Tu carrito está vacío. Explora el catálogo para comenzar.</p>}
    {cart.missing.map(item => <div className="shop-panel" key={item.productId}>
      <p>Producto ya no disponible ({item.productId}). Retíralo para continuar.</p>
      <button className="shop-button" onClick={() => cart.remove(item.productId)}>Retirar</button>
    </div>)}
    {cart.lines.map(line => <article className="shop-panel flex flex-wrap items-center gap-5" key={line.productId}>
      <img className="h-24 w-24 rounded object-cover" src={line.product.image} alt={line.product.name} />
      <div className="flex-1"><Link className="shop-link" to={`/product/${line.productId}`}>{line.product.name}</Link><p>{money(line.product.price)} por unidad</p></div>
      <label>Cantidad
        <input className="shop-input w-24" type="number" min="1" max="99" step="1" value={line.quantity} onChange={event => cart.setQuantity(line.productId, Number(event.target.value))} aria-label={`Cantidad de ${line.product.name}`} />
      </label>
      <strong>{money(line.subtotal)}</strong>
      <button className="shop-link" onClick={() => cart.remove(line.productId)}>Eliminar</button>
    </article>)}
    {!!cart.lines.length && <div className="shop-panel">
      <p className="text-2xl font-bold">Total: {money(cart.total)} MXN</p>
      <p className="my-3">Coordinaremos disponibilidad, envío y pago por WhatsApp. El envío no está incluido.</p>
      {/* REVISAR CON ASESOR LEGAL */}
      <p className="mb-4 text-sm">Este carrito es una cotización, no una compra. Confirmaremos precios, disponibilidad y envío por WhatsApp. Consulta los <Link className="shop-link" to="/terms">términos</Link> y el <Link className="shop-link" to="/privacy">aviso de privacidad</Link> antes de continuar.</p>
      <button className="shop-button" disabled={cart.sending || cart.loading || cart.missing.length > 0} onClick={() => void cart.checkout()}>{cart.sending ? 'Preparando pedido…' : 'Enviar pedido por WhatsApp'}</button>
      <button className="ml-6 shop-link" onClick={cart.clear}>Vaciar carrito</button>
    </div>}
  </section>;
}
