import { Link } from 'react-router-dom';
import { lazy, Suspense, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useNavigation } from '@/app/useNavigation';
const CartDrawer = lazy(() => import('@/features/cart/components/CartDrawer').then(module => ({ default: module.CartDrawer })));
export function Navbar() {
  const nav = useNavigation();
  const [drawer, setDrawer] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const closeDrawer = () => { setDrawer(false); requestAnimationFrame(()=>trigger.current?.focus({ preventScroll: true })); };
  return <><nav aria-label="Navegación principal" className="site-nav sticky top-0 z-50 text-white">
    <div className="mx-auto max-w-7xl px-4 min-h-20 flex items-center justify-between gap-4 flex-wrap py-3">
      <Link to="/" className="nav-brand flex items-center gap-3"><span className="brand-monogram" aria-hidden="true">mp</span><span>Mundo Potterhead</span></Link>
      <button className="md:hidden shop-link" aria-expanded={nav.open} aria-controls="navigation-links" onClick={nav.toggle}>Menú</button>
      <div id="navigation-links" className={`${nav.open ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-5`}>
        <Link to="/">Tienda</Link><Link to="/otros-universos">Otros universos</Link><Link to="/contact">Contacto</Link>
        <Link ref={trigger} className="shop-link" to="/cart" aria-label={`Carrito, ${nav.count} productos`} aria-haspopup="dialog" aria-expanded={drawer} onClick={event=>{if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();setDrawer(true);}}}>Carrito <m.span key={nav.count} className="cart-count" initial={reduce?false:{scale:0.85}} animate={{scale:1}} transition={{duration:reduce?0:0.18}} aria-hidden="true">{nav.count}</m.span></Link>
        {nav.user?.role === 'admin' && <Link to="/admin">Administrar</Link>}
        {nav.user ? <><Link to="/profile">{nav.user.name || 'Mi perfil'}</Link><button disabled={nav.busy} onClick={() => void nav.logout()}>Cerrar sesión</button></> : <Link to="/login">Ingresar</Link>}
      </div>
      {nav.error && <p role="alert">{nav.error}</p>}
    </div>
  </nav>{drawer && <Suspense fallback={<p className="sr-only" role="status">Abriendo carrito…</p>}><CartDrawer onClose={closeDrawer}/></Suspense>}</>;
}
