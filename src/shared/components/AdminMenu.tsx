import {useEffect,useId,useRef,useState} from 'react';
import {NavLink,useLocation} from 'react-router-dom';
import {adminLabels} from '../../../shared/adminLabels';
export function AdminMenu(){
 const location=useLocation(),id=useId(),root=useRef<HTMLDetailsElement>(null),trigger=useRef<HTMLElement>(null),[open,setOpen]=useState(false);
 const close=()=>{if(root.current)root.current.open=false;setOpen(false);};
 useEffect(()=>{if(root.current)root.current.open=false;setOpen(false);},[location]);
 useEffect(()=>{if(!open)return;const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!root.current?.contains(event.target))close();};const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();trigger.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape,true);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape,true);};},[open]);
 return <details ref={root} className="nav-admin-menu" onToggle={event=>setOpen(event.currentTarget.open)}><summary ref={trigger} aria-expanded={open} aria-controls={id}>Administración</summary><div id={id} onClick={event=>{if(event.target instanceof Element&&event.target.closest('a'))close();}}>{[['/admin/catalogo',adminLabels.products],['/admin/inventario','Inventario'],['/admin/promociones','Promociones'],['/admin/usuarios',adminLabels.users],['/profile','Mi perfil']].map(([to,label])=><NavLink key={to} to={to}>{label}</NavLink>)}</div></details>;
}
