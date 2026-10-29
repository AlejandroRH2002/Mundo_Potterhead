import {useEffect,useState} from 'react';
import {Button} from '@/shared/components/Button';
import {inventoryService} from '@/features/inventory/services/inventoryService';
import type {InventoryRow} from '../../../../shared/inventory';
import type {ManagedProduct} from '../../../../shared/catalogManagement';
import {designReadiness} from '../services/designReadiness';

type Field='name'|'photo'|'options'|'stock';
export function DesignPreparation({value,model,persisted,onField,navigationBlocked=false}:{value:ManagedProduct;model:ManagedProduct['models'][number];persisted?:ManagedProduct;onField:(field:Field)=>void;navigationBlocked?:boolean}){
 const saved=persisted?.models.find(item=>item.code===model.code);
 const [inventory,setInventory]=useState<{modelId?:string;rows:InventoryRow[];loading:boolean;error:boolean}>({rows:[],loading:false,error:false});
 useEffect(()=>{
  if(!value.id||!saved?.id)return;
  const controller=new AbortController();setInventory({modelId:saved.id,rows:[],loading:true,error:false});
  void inventoryService.list(new URLSearchParams({productId:value.id,q:saved.name,page:'1',pageSize:'100'}),controller.signal).then(page=>{if(!controller.signal.aborted)setInventory({modelId:saved.id,rows:page.items,loading:false,error:false});}).catch(()=>{if(!controller.signal.aborted)setInventory({modelId:saved.id,rows:[],loading:false,error:true});});
  return()=>controller.abort();
 },[value.id,saved?.id,saved?.name,persisted?.revision]);
 const ready=designReadiness(value,model),hasPhoto=!ready.publication.includes('Fotografía principal');
 const photoSaved=hasPhoto&&!!saved&&saved.images[0]===model.images[0];
 const published=persisted?.status==='active'&&saved?.active;
 const active=model.variants.filter(option=>option.active);
 const rows=inventory.modelId===model.id?inventory.rows:[];
 const counted=active.filter(option=>rows.some(row=>row.id===option.id&&row.modelId===model.id&&row.quantity!==null)).length;
 const unknown=active.some(option=>option.id&&!rows.some(row=>row.id===option.id&&row.modelId===model.id));
 const stock=inventory.loading?'Consultando existencias…':inventory.error||unknown?'Existencias sin comprobar; revisa Inventario':active.length&&counted===active.length?'Existencias registradas en todas las opciones':counted+' de '+active.length+' opciones con existencias registradas';
 const checks:[Field,string,string,string][]=[
  ['name','Nombre',saved?.name===model.name?'Registrado':model.name.trim()?'Capturado · pendiente de guardar':'Pendiente obligatorio',model.name.trim()?'complete':'required'],
  ['photo','Fotografía principal',photoSaved?'Guardada en el producto':hasPhoto?'Subida · pendiente de guardar':'Pendiente obligatorio',photoSaved?'complete':hasPhoto?'pending':'required'],
  ['options','Tallas o presentaciones',active.length+' opciones activas'+(!active.length?' · pendiente obligatorio':''),active.length?'complete':'required'],
  ['options','Color',ready.optional.length?'Sin especificar · opcional':'Especificado',ready.optional.length?'optional':'complete'],
  ['stock','Existencias',stock,counted===active.length&&active.length?'complete':'pending'],
 ];
 return <section className="design-readiness design-preparation" aria-label="Preparación del diseño"><header><div><h3>{model.name||'Diseño sin nombre'}</h3><p>Estado: {published?'Publicado (confirmado)':ready.publication.length?'Borrador':'Listo para publicar'}{published&&!model.active?' · Retirada pendiente de guardar':''}</p></div><span className="preparation-chip" data-state={ready.publication.length?'required':'complete'}>{ready.publication.length?'Bloqueado para publicar':'Requisitos de datos completos'}</span></header><ul>{checks.map(([field,label,detail,state])=><li key={label} data-state={state}><span aria-hidden="true">{state==='complete'?'✓':state==='optional'?'○':'!'}</span><div><strong>{label}</strong><span>{detail}</span></div><Button type="button" size="sm" variant="secondary" aria-label={(state==='complete'?'Revisar ':'Completar ')+label+' de '+model.name} disabled={navigationBlocked||field==='stock'&&!value.id} onClick={()=>onField(field)}>{state==='complete'?'Revisar':'Completar'}</Button></li>)}</ul>{ready.publication.length>0&&<p>Requisitos de publicación pendientes: {ready.publication.join(' · ')}.</p>}<p>Los borradores no aparecen en el catálogo. Subir una foto no publica el diseño. El color es opcional; el servidor valida las existencias cuando se exige su control.</p></section>;
}
