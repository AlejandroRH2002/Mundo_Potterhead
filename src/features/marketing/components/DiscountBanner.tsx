import {usePromotions} from '@/features/promotions/hooks/usePromotions';
import { Link } from 'react-router-dom';
import { useDiscount } from '../hooks/useMarketing';
export function DiscountBanner() {
  const discount = useDiscount();
  const promotion=usePromotions()?.general;
  return <aside aria-label={discount ? 'Ofertas destacadas' : 'Descubre el catálogo'} className="discount-strip rounded-2xl p-6 my-8 flex flex-wrap items-center justify-between gap-4">
    <div><p className="uppercase tracking-widest text-sm">{promotion?.enabled?'Promoción de la tienda':discount ? 'Ofertas mágicas' : 'Una selección para ti'}</p><p className="text-3xl font-cinzel font-bold">{promotion?.enabled?promotion.title:discount ? `Hasta ${discount}% de descuento` : 'Tu próxima pieza favorita'}</p><p>{promotion?.enabled?promotion.message:'En productos seleccionados de nuestros universos.'}</p></div>
    <Link to={discount ? '/?offers=1#catalogo' : '/#catalogo'} className="button-outline">{discount ? 'Ver ofertas' : 'Ver catálogo'} <span aria-hidden="true">↗</span></Link>
  </aside>;
}
