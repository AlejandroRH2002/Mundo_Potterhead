import { useCallback, useEffect, useState } from 'react';
import { errorMessage } from '@/shared/lib/money';
import { catalogService, type CatalogRow } from '../services/catalogService';
import type { ManagedProduct } from '../../../../shared/catalogManagement';

export function newManagedProduct():ManagedProduct {
 const id=crypto.randomUUID();return {code:'P-'+id,status:'draft',product:{name:'',description:'',price:0,category:'clothing',subcategory:null,universe:'harry-potter',images:[]},models:[{code:'M-'+id,name:'General',active:true,images:[],variants:[{code:'S-'+id,size:'one',color:'',images:[],active:true}]}]};
}
export function useCatalogManagement(){
 const [items,setItems]=useState<CatalogRow[]>([]),[total,setTotal]=useState(0),[page,setPage]=useState(1),[q,setQ]=useState(''),[category,setCategory]=useState('');
 const [draft,setDraft]=useState<ManagedProduct>(),[selected,setSelected]=useState<string[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[message,setMessage]=useState('');
 const refresh=useCallback(async()=>{const result=await catalogService.list(new URLSearchParams({page:String(page),...(q?{q}:{}),...(category?{category}:{})}));setItems(result.items);setTotal(result.total);},[page,q,category]);
 const run=useCallback(async(operation:()=>Promise<void>)=>{setBusy(true);setError('');setMessage('');try{await operation();}catch(error){setError(errorMessage(error));}finally{setBusy(false);}},[]);
 useEffect(()=>{let ignore=false;void catalogService.list(new URLSearchParams({page:String(page),...(q?{q}:{}),...(category?{category}:{})})).then(value=>{if(!ignore){setItems(value.items);setTotal(value.total);setSelected([]);}}).catch(error=>{if(!ignore)setError(errorMessage(error));});return()=>{ignore=true;};},[page,q,category]);
 return {items,total,page,setPage,q,setQ,category,setCategory,draft,setDraft,selected,setSelected,busy,error,message,run,refresh:()=>run(refresh),
  open:(id:string)=>run(async()=>setDraft(await catalogService.get(id))),
  save:()=>run(async()=>{if(draft){const saved=await catalogService.save(draft);setDraft(saved);setMessage('Producto guardado. Las cantidades se cambian desde Inventario.');await refresh();}}),
  duplicate:(id:string)=>run(async()=>{setDraft(await catalogService.duplicate(id));await refresh();}),
  bulk:(changes:{status?:ManagedProduct['status'];category?:string})=>run(async()=>{await catalogService.bulk(items.filter(item=>selected.includes(item.id)).map(({id,revision})=>({id,revision})),changes);setSelected([]);await refresh();setMessage('Cambios aplicados a la selección.');}),
 };
}
