import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/shared/lib/money';
import { catalogService, type CatalogRow } from '../services/catalogService';
import type { ManagedProduct } from '../../../../shared/catalogManagement';
import { managedProductSchema } from '../../../../shared/catalogManagement';

function fieldLabel(path:PropertyKey[]):string {
 const names:Record<string,string>={name:'nombre',description:'descripción',price:'precio',category:'categoría',subcategory:'subcategoría',universe:'universo',code:'código',images:'imágenes',size:'talla',color:'color'};
 if(path[0]==='models')return `Diseño ${Number(path[1]??0)+1}${path[2]==='variants'?', variante '+(Number(path[3]??0)+1):''}`;
 return names[String(path[path[0]==='product'?1:0])]??'Datos del producto';
}

export function newManagedProduct():ManagedProduct {
 const id=crypto.randomUUID();return {code:'P-'+id,status:'draft',product:{name:'',description:'',price:0,category:'clothing',subcategory:null,universe:'harry-potter',images:[]},models:[{code:'M-'+id,name:'General',active:true,images:[],variants:[{code:'S-'+id,size:'one',color:'',images:[],active:true}]}]};
}
export function useCatalogManagement(){
 const [items,setItems]=useState<CatalogRow[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[q,setQ]=useState(''),[category,setCategory]=useState('');
 const [draft,setDraft]=useState<ManagedProduct>(),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const [baseline,setBaseline]=useState('');
 const [loading,setLoading]=useState(true);
 const inFlight=useRef(false);
 const dirty=!!draft&&JSON.stringify(draft)!==baseline;
 const begin=(value:ManagedProduct)=>{setDraft(value);setBaseline(JSON.stringify(value));setError('');setMessage('');};
 const close=()=>{if(dirty&&!window.confirm('Tienes cambios sin guardar. ¿Descartarlos y volver al listado?'))return false;setDraft(undefined);setBaseline('');setError('');return true;};
 useEffect(()=>{if(!dirty)return;const beforeUnload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',beforeUnload);return()=>window.removeEventListener('beforeunload',beforeUnload);},[dirty]);
 const refresh=useCallback(async()=>{const result=await catalogService.list(new URLSearchParams({page:String(page),...(q?{q}:{}),...(category?{category}:{})}));setItems(result.items);setTotal(result.total);},[page,q,category]);
 const run=useCallback(async(operation:()=>Promise<void>)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');setMessage('');try{await operation();}catch(error){setError(errorMessage(error));}finally{inFlight.current=false;setBusy(false);}},[]);
 useEffect(()=>{let ignore=false;setLoading(true);void catalogService.list(new URLSearchParams({page:String(page),...(q?{q}:{}),...(category?{category}:{})})).then(value=>{if(!ignore){setItems(value.items);setTotal(value.total);setSelected([]);}}).catch(error=>{if(!ignore)setError(errorMessage(error));}).finally(()=>{if(!ignore)setLoading(false);});return()=>{ignore=true;};},[page,q,category]);
 return {items,total,page,setPage,q,setQ,category,setCategory,draft,setDraft,begin,close,dirty,selected,setSelected,busy,loading,error,message,run,refresh:()=>run(refresh),
  open:(id:string)=>run(async()=>begin(await catalogService.get(id))),
  save:()=>run(async()=>{if(draft){const parsed=managedProductSchema.safeParse(draft);if(!parsed.success)throw new Error('Revisa '+parsed.error.issues.map(issue=>fieldLabel(issue.path)+': '+issue.message).slice(0,3).join(' · '));const removed=draft.removedVariantIds??[];const saved=await catalogService.save(parsed.data);begin(saved);const remaining=new Set(saved.models.flatMap(model=>model.variants.map(sku=>sku.id)));const deactivated=removed.filter(id=>remaining.has(id)).length;setMessage(removed.length?`Guardado: ${removed.length-deactivated} variantes eliminadas y ${deactivated} desactivadas para conservar sus referencias.`:'Cambios guardados correctamente.');await refresh();}}),
  duplicate:(id:string)=>run(async()=>{begin(await catalogService.duplicate(id));setMessage('Copia creada como borrador, sin existencias.');await refresh();}),
  bulk:(changes:{status?:ManagedProduct['status'];category?:string})=>run(async()=>{await catalogService.bulk(items.filter(item=>selected.includes(item.id)).map(({id,revision})=>({id,revision})),changes);setSelected([]);await refresh();setMessage('Cambios aplicados a la selección.');}),
 };
}
