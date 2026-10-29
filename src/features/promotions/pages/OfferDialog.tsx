import {useEffect,useRef,type ReactNode} from 'react';
export function OfferDialog({children,onClose,busy}:{children:ReactNode;onClose:()=>void;busy:boolean}){
 const dialog=useRef<HTMLDialogElement>(null),closeRef=useRef(onClose);closeRef.current=onClose;
 useEffect(()=>{const node=dialog.current,previous=document.activeElement;node?.showModal();return()=>{node?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus({preventScroll:true});};},[]);
 return <dialog ref={dialog} className="offer-dialog" aria-labelledby="offer-dialog-title" onCancel={event=>{event.preventDefault();if(!busy)closeRef.current();}} onClick={event=>{if(event.target===event.currentTarget&&!busy){const box=event.currentTarget.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)closeRef.current();}}}><header><h2 id="offer-dialog-title">Oferta del producto</h2><button type="button" className="button-outline button-size-sm" disabled={busy} onClick={onClose} aria-label="Cerrar oferta">Cerrar</button></header>{children}</dialog>;
}
