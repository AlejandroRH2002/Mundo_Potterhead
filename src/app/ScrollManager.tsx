import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { scrollIntent } from './scrollPolicy';
type Position = { x: number; y: number };
export function ScrollManager() {
 const location=useLocation(),action=useNavigationType();
 const previous=useRef<typeof location>();const positions=useRef(new Map<string,Position>());
 useEffect(()=>{const old=history.scrollRestoration;history.scrollRestoration='manual';return()=>{history.scrollRestoration=old;};},[]);
 useEffect(()=>{
  const pathChanged=!previous.current||previous.current.pathname!==location.pathname;
  const saved=positions.current.get(location.key),intent=scrollIntent(previous.current,location,action,Boolean(saved));previous.current=location;
  const main=document.getElementById('main-content');let focused=false,applied=false,frame=0;
  if(intent==='top')window.scrollTo({top:0,left:0,behavior:'auto'});
  const execute=()=>{
   frame=0;const route=main?.querySelector('[data-route-key="'+CSS.escape(location.key)+'"]');if(!route)return;
   if(intent==='restore'&&saved&&!applied){window.scrollTo({left:saved.x,top:saved.y,behavior:'auto'});applied=Math.abs(window.scrollY-saved.y)<2;}
   else if(!applied&&intent!=='restore'){
    const target=intent==='catalog'?document.getElementById('catalogo'):intent==='results'?document.getElementById('catalog-results'):undefined;
    if(target)target.scrollIntoView({behavior:'auto',block:'start'});else if(intent==='top')window.scrollTo({top:0,left:0,behavior:'auto'});
    applied=true;
   }
   if(!focused && (intent==='top'||intent==='catalog'||intent==='restore'&&pathChanged)){
    const target=intent==='catalog'?document.getElementById('catalogo'):route.querySelector<HTMLElement>('h1');
    const focus=target&&target.getBoundingClientRect().width>2?target:main;if(focus){focus.setAttribute('tabindex','-1');focus.focus({preventScroll:true});focused=true;}
   }
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(execute);};schedule();
  // Retry when lazy routes/data appear. POP restores again if content was initially shorter.
  const observer=new MutationObserver(schedule);if(main)observer.observe(main,{childList:true,subtree:true});
  const deadline=window.setTimeout(()=>observer.disconnect(),12000);
  const record=()=>{positions.current.set(location.key,{x:window.scrollX,y:window.scrollY});if(positions.current.size>100)positions.current.delete(positions.current.keys().next().value!);};
  if(!positions.current.has(location.key))positions.current.set(location.key,{x:window.scrollX,y:window.scrollY});
  const userScrolled=()=>{if(intent==='restore')applied=true;};
  window.addEventListener('wheel',userScrolled,{passive:true});window.addEventListener('touchstart',userScrolled,{passive:true});
  window.addEventListener('scroll',record,{passive:true});
  return()=>{window.removeEventListener('scroll',record);window.removeEventListener('wheel',userScrolled);window.removeEventListener('touchstart',userScrolled);observer.disconnect();clearTimeout(deadline);cancelAnimationFrame(frame);};
 },[location,action]);
 return null;
}
