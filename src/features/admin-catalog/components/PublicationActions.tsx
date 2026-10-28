import {useRef,useState} from 'react';
import {Button} from '@/shared/components/Button';
import {errorMessage} from '@/shared/lib/money';
import {managedProductSchema,type ManagedProduct} from '../../../../shared/catalogManagement';
import {preparePublication,publicationSummary} from '../services/publication';
import {catalogService} from '../services/catalogService';

export function PublicationActions({value,onSave,disabled=false}:{value:ManagedProduct;onSave:(value:ManagedProduct)=>Promise<unknown>;disabled?:boolean}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 const inFlight=useRef(false);
 async function publish(){
  if(disabled||inFlight.current)return;
  setError('');setMessage('');
  try{
   const plan=preparePublication(value);
   if(!window.confirm('Guardar y publicar: '+plan.ready.map(model=>model.name).join(', ')+'.\nPermanecen pendientes: '+(plan.pending.map(model=>model.name).join(', ')||'ninguno')+'.\nEl servidor comprobará los requisitos y el inventario. ¿Continuar?'))return;
   inFlight.current=true;setBusy(true);
   const result=await onSave(plan.value),parsed=managedProductSchema.safeParse(result);
   if(!parsed.success||!parsed.data.id)throw Error('No se pudo confirmar la publicación. Conservamos el formulario; revisa el error del servidor y el estado guardado antes de reintentar.');
   setMessage(publicationSummary(parsed.data));
  }catch(cause){
   setError(errorMessage(cause));
   // A lost response is not proof of rollback. Read the stored state without replacing edits.
   if(value.id)try{setMessage('Estado comprobado después del error: '+publicationSummary(await catalogService.get(value.id)));}catch{/* Keep the unconfirmed error; never invent a successful result. */}
  }finally{inFlight.current=false;setBusy(false);}
 }
 return <section className="publication-actions" aria-label="Guardar y publicar"><p>Guardar cambios conserva el estado actual. Publicar es una acción distinta: guarda los diseños completos y deja los incompletos pendientes, en una sola operación.</p><Button type="button" loading={busy} disabled={disabled} onClick={()=>void publish()}>Guardar y publicar diseños listos</Button>{message&&<p role="status">{message}</p>}{error&&<p className="shop-error" role="alert">{error}</p>}</section>;
}
