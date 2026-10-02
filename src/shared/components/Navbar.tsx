import { useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { BrandMark } from './BrandMark';
import { useNavigation } from '@/app/useNavigation';
const MobileCartSummary = lazy(()=>import('@/features/cart/components/MobileCartSummary').then(module=>({default:module.MobileCartSummary})));
const CartDrawer = lazy(() => import('@/features/cart/components/CartDrawer').then(module => ({ default: module.CartDrawer })));
export function Navbar() {
  const nav = useNavigation();
  const {pathname}=useLocation();const [mobile,setMobile]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(max-width: 767px)');const update=()=>setMobile(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const navigation = useRef<HTMLElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(()=>{
   const element=navigation.current; if(!element)return;
   const root=document.documentElement, old=root.style.getPropertyValue('--nav-height');
   const measure=()=>root.style.setProperty('--nav-height',element.getBoundingClientRect().height+'px');
   measure(); const observer=typeof ResizeObserver==='undefined'?undefined:new ResizeObserver(measure); observer?.observe(element);
   return ()=>{observer?.disconnect();if(old)root.style.setProperty('--nav-height',old);else root.style.removeProperty('--nav-height');};
  },[]);
  const [scrolled, setScrolled] = useState(false);
  useEffect(()=>{ const update=()=>setScrolled(window.scrollY>24); update(); window.addEventListener('scroll',update,{passive:true}); return ()=>window.removeEventListener('scroll',update); }, []);
  const [drawer, setDrawer] = useState(false);
  const trigger = useRef<HTMLAnchorElement>(null);
  const reduce = useReducedMotion();
  const closeDrawer = () => { setDrawer(false); requestAnimationFrame(()=>trigger.current?.focus({ preventScroll: true })); };
  return <><nav ref={navigation} onKeyDown={event=>{if(event.key==='Escape'&&nav.open){nav.toggle();menuTrigger.current?.focus();}}} aria-label="Navegación principal" className={'site-nav sticky top-0 z-50 text-white'+(scrolled?' is-scrolled':'')}>
    <div className="mx-auto max-w-7xl px-4 min-h-20 flex items-center justify-between gap-4 flex-wrap py-3">
      <Link to="/" className="nav-brand flex items-center gap-3"><BrandMark/><span>Mundo Potterhead</span></Link>
      <button ref={menuTrigger} className="lg:hidden button-icon" aria-expanded={nav.open} aria-controls="navigation-links" onClick={nav.toggle}>Menú</button>
      <m.div id="navigation-links" className={`navigation-links ${nav.open ? 'is-open' : ''}`} initial={false} animate={reduce?{opacity:nav.open?1:0.99}:{y:nav.open?0:-12,opacity:nav.open?1:0.99}} transition={reduce?{duration:0.14}:{type:'spring',stiffness:260,damping:26}}>
        <Link to="/">Tienda</Link><Link to="/otros-universos">Otros universos</Link><Link to="/contact">Contacto</Link>
        <Link ref={trigger} className="shop-link" to="/cart" aria-label={`Carrito, ${nav.count} productos`} aria-haspopup="dialog" aria-expanded={drawer} onClick={event=>{if(!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();setDrawer(true);}}}>Carrito <m.span key={nav.count} className="cart-count" initial={{opacity:reduce?0.55:1,scale:reduce?1:0.7}} animate={{opacity:1,scale:1}} transition={reduce?{duration:0.14}:{type:'spring',stiffness:460,damping:12}} aria-hidden="true">{nav.count}</m.span></Link>
        {nav.user?.role === 'admin' && <Link to="/admin">Administrar</Link>}
        {nav.user ? <><Link to="/profile">{nav.user.name || 'Mi perfil'}</Link><button aria-busy={nav.busy} disabled={nav.busy} onClick={() => void nav.logout()}>Cerrar sesión</button></> : <Link to="/login">Ingresar</Link>}
      </m.div>
      {nav.error && <p role="alert">{nav.error}</p>}
    </div>
  </nav>{drawer && <Suspense fallback={<p className="sr-only" role="status">Abriendo carrito…</p>}><CartDrawer onClose={closeDrawer}/></Suspense>}{mobile && nav.count>0 && !drawer && !pathname.startsWith('/product/') && pathname!=='/cart' && <Suspense fallback={null}><MobileCartSummary onOpen={()=>setDrawer(true)}/></Suspense>}</>;
}
