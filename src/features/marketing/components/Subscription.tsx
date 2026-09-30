import { useSubscription } from '../hooks/useMarketing';
export function Subscription() {
  const subscription = useSubscription();
  return <section className="shop-panel my-10"><h2 className="text-2xl font-cinzel text-amber-300">Recibe novedades mágicas</h2>
    <p className="my-3">Guarda tu interés en descuentos y nuevos productos. Suscripción de demostración, sin envío de correos.</p>
    <form onSubmit={event => { event.preventDefault(); subscription.subscribe(); }} className="space-y-3">
      <label className="block">Correo electrónico<input className="shop-input" type="email" maxLength={254} required value={subscription.email} onChange={event => subscription.setEmail(event.target.value)} autoComplete="email" /></label>
      <label className="flex items-center gap-3"><input type="checkbox" required checked={subscription.consent} onChange={event => subscription.setConsent(event.target.checked)} /> Deseo recibir novedades y descuentos.</label>
      <button className="shop-button">Suscribirme</button>
      <p role="status">{subscription.message}</p>
    </form>
  </section>;
}
