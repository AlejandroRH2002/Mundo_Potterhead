import { useCart } from '../hooks/useCart';
import { money } from '@/shared/lib/money';
import { Button } from '@/shared/components/Button';
export function MobileCartSummary({ onOpen }: { onOpen: () => void }) {
 const cart=useCart();const count=cart.lines.reduce((total,line)=>total+line.quantity,0)+cart.missing.reduce((total,line)=>total+line.quantity,0);
 return <aside className="mobile-cart-summary" aria-label="Resumen de tu cotización"><span>{count} artículos · {cart.loading?'Calculando…':cart.error?'Revisa tu cotización':`Estimado ${money(cart.total)}`}</span><Button size="sm" onClick={onOpen}>Ver cotización</Button></aside>;
}
