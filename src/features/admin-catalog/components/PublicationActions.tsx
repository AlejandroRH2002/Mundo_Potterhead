import {useRef,useState} from 'react';
import {Button} from '@/shared/components/Button';
import {safeInternalPath} from '@/shared/lib/safeInternalPath';
import {managedProductSchema,type ManagedProduct} from '../../../../shared/catalogManagement';
import {preparePublication,publicationSummary} from '../services/publication';
import {publicationFailure} from '../services/publicationFailure';
import {catalogService} from '../services/catalogService';

export function PublicationActions({value,onSave,disabled=false}:{value:ManagedProduct;onSave:(value:ManagedProduct)=>Promise<unknown>;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const [needsCheck,setNeedsCheck]=useState(false),[storedId,setStoredId]=useState<string>();
 const inFlight=useRef(false);
 async function checkStored(){
  let stored:ManagedProduct|undefined;
  if(value.id)stored=await catalogService.get(value.id);
  else{
   for(let page=1;page<=10;page++){
    const result=await catalogService.list(new URLSearchParams({q:value.code,page:String(page)}));
    const match=result.items.find(item=>item.code===value.code);
    if(match){stored=await catalogService.get(match.id);break;}
    if(page*20>=result.total)break;
    if(page===10)throw Error('No se pudo comprobar todo el listado. Revisa el producto antes de reintentar.');
   }
  }
  if(!stored){setMessage('Consulta confirmada: no se encontró el código del producto. Puedes reintentar manualmente con el mismo código.');setNeedsCheck(false);setStoredId(undefined);return;}
  setMessage('Estado comprobado en el servidor: '+publicationSummary(stored));
  const changed=!value.id||stored.revision!==value.revision;
  setNeedsCheck(changed);setStoredId(changed?stored.id:undefined);
 }
 async function verify(){if(inFlight.current)return;inFlight.current=true;setBusy(true);try{await checkStored();}catch(cause){setError(publicationFailure(cause));}finally{inFlight.current=false;setBusy(false);}}
 async function publish(){
  if(disabled||needsCheck||inFlight.current)return;
  setError('');setMessage('');
  let submitted=false;
  try{
   const plan=preparePublication(value);
   if(!window.confirm('Guardar y publicar: '+plan.ready.map(model=>model.name).join(', ')+'.\nPermanecen pendientes: '+(plan.pending.map(model=>model.name).join(', ')||'ninguno')+'.\nEl servidor comprobará los requisitos y el inventario. ¿Continuar?'))return;
   inFlight.current=true;setBusy(true);submitted=true;
   const result=await onSave(plan.value),parsed=managedProductSchema.safeParse(result);
   if(!parsed.success||!parsed.data.id)throw Error('El servidor no devolvió una confirmación válida de publicación. Comprueba el estado guardado antes de reintentar.');
   setMessage(publicationSummary(parsed.data));
  }catch(cause){
   setError(publicationFailure(cause));
   if(submitted){setNeedsCheck(true);const expired=cause&&typeof cause==='object'&&'status' in cause&&cause.status===401;if(!expired)try{await checkStored();}catch{/* Unconfirmed result remains blocked. No automatic publication retry. */}}
  }finally{inFlight.current=false;setBusy(false);}
 }
 return <section className="publication-actions" aria-label="Guardar y publicar"><p>Guardar cambios conserva el estado actual. Publicar es una acción distinta: guarda los diseños completos y deja los incompletos pendientes, en una sola operación.</p><Button type="button" loading={busy} disabled={disabled||needsCheck} onClick={()=>void publish()}>Guardar y publicar diseños listos</Button>{needsCheck&&<Button type="button" variant="secondary" disabled={disabled||busy} onClick={()=>void verify()}>Comprobar estado guardado</Button>}{storedId&&<p>El producto tiene una versión guardada distinta. <a className="button-outline button-size-sm" href={safeInternalPath('/admin/catalogo/'+encodeURIComponent(storedId))}>Abrir ficha guardada</a>. Revisa esa versión antes de volver a guardar.</p>}{message&&<p role="status">{message}</p>}{error&&<p className="shop-error" role="alert">{error}</p>}</section>;
}
