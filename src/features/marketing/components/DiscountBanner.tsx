import { Link } from 'react-router-dom';
import { useDiscount } from '../hooks/useMarketing';
export function DiscountBanner() {
  const discount = useDiscount();
  if (!discount) return null;
  return <aside className="rounded-2xl bg-gradient-to-r from-amber-300 via-yellow-100 to-amber-400 p-6 my-8 text-red-950 shadow-xl flex flex-wrap items-center justify-between gap-4">
    <div><p className="uppercase tracking-widest text-sm">Ofertas mágicas</p><p className="text-3xl font-cinzel font-bold">Hasta {discount}% de descuento</p><p>En productos seleccionados de nuestros universos.</p></div>
    <Link to="/?offers=1" className="rounded-lg bg-red-950 px-6 py-3 text-white">Ver ofertas</Link>
  </aside>;
}
