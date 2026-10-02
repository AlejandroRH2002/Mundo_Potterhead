import { useEffect, useRef } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Cart } from '../pages/Cart';
export function CartDrawer({ onClose }: { onClose: () => void }) {
 const dialog = useRef<HTMLDialogElement>(null);
 const reduce = useReducedMotion();
 useEffect(() => { const element=dialog.current; if(element && !element.open) element.showModal(); }, []);
 return <dialog ref={dialog} className="cart-dialog" aria-labelledby="cart-drawer-title" onCancel={event=>{event.preventDefault();onClose();}} onClose={onClose} onClick={event=>{
  if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}
 }} onClickCapture={event=>{if(event.target instanceof Element&&event.target.closest('a[href]'))onClose();}}>
  <m.div initial={{x:reduce?0:80,opacity:0}} animate={{x:0,opacity:1}} transition={reduce?{duration:0.14}:{type:'spring',stiffness:300,damping:32}}>
   <header className="cart-dialog-header"><h2 id="cart-drawer-title" className="font-cinzel">Tu selección</h2><button className="shop-link" type="button" onClick={onClose}>Cerrar carrito</button></header>
   <Cart drawer/><div className="px-6 pb-6"><Link className="shop-link" to="/cart">Abrir carrito completo</Link></div>
  </m.div>
 </dialog>;
}
