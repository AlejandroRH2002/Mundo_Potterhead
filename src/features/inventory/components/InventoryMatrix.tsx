import { useCallback, useEffect, useState, type ReactNode } from 'react';
import type { InventoryRow } from '../../../../shared/inventory';
import { sizeLabel } from '../../../../shared/sizes';
import { Button } from '@/shared/components/Button';
import { physicalCount, stockStatus } from '../services/inventoryPresentation';
function InventoryLine({row,busy,save,threshold,actions,onDirty,showCodes}:{row:InventoryRow;busy:boolean;threshold:number;showCodes:boolean;save:(row:InventoryRow,value:number)=>Promise<unknown>;actions?:(row:InventoryRow)=>ReactNode;onDirty:(id:string,dirty:boolean)=>void}) {
 const initial=row.quantity===null?'':String(row.quantity);
 const [draft,setDraft]=useState({value:initial,baseline:initial,version:row.version});
 const dirty=draft.value!==draft.baseline;
 const [saving,setSaving]=useState(false);
 const stale=dirty&&draft.version!==row.version;
 useEffect(()=>{if(!dirty&&row.version>=draft.version)setDraft({value:initial,baseline:initial,version:row.version});},[dirty,initial,row.version,draft.version]);
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[dirty]);
 useEffect(()=>{onDirty(row.id,dirty);return()=>onDirty(row.id,false);},[dirty,row.id,onDirty]);
 const value=physicalCount(draft.value),status=stockStatus(row.quantity,threshold);
 const commit=async()=>{
  if(value===null||!dirty||value===row.quantity||busy||saving||stale)return;
  if(row.quantity!==null&&!window.confirm(`¿Cambiar el stock de ${row.productName} · ${row.name} · ${sizeLabel(row.size??'one')}${row.color?' · '+row.color:''} de ${row.quantity} a ${value}? Se registrará un movimiento.`))return;
  setSaving(true);try{const result=await save({...row,version:draft.version},value);if(result===true)setDraft({value:String(value),baseline:String(value),version:row.version+1});}finally{setSaving(false);}
 };
 return <tr className={dirty?'inventory-row-dirty':''}>
  <th scope="row" data-label="Producto / modelo"><div className="inventory-product">{row.image&& !row.image.startsWith('data:')&&<img src={row.image} alt="" width="56" height="56" loading="lazy" decoding="async"/>}<div><strong>{row.productName}</strong><span>{row.name}</span>{(!row.active||row.archived)&&<span className="inventory-badge inventory-inactive">{row.archived?'Producto archivado':'Variante o modelo inactivo'}</span>}</div></div></th>
  {showCodes&&<td data-label="SKU"><code>{row.sku}</code></td>}
  <td data-label="Variante"><span>{sizeLabel(row.size??'one')}</span>{row.color&&<span className="inventory-color">{row.color}</span>}</td>
  <td data-label="Stock actual"><strong className="inventory-stock">{row.quantity??'—'}</strong><span className="inventory-unit">{row.quantity===null?'Sin capturar':'unidades'}</span></td>
  <td data-label="Estado"><span className={'inventory-badge inventory-'+status.key}>{status.label}</span></td>
  <td data-label="Conteo físico"><form className="inventory-count" onSubmit={event=>{event.preventDefault();void commit();}}><label htmlFor={'count-'+row.id} className="sr-only">Conteo físico de {row.productName}, {row.name}, talla {sizeLabel(row.size??'one')}, {row.color||'sin color'}, SKU {row.sku}</label><input id={'count-'+row.id} className="shop-input" type="number" inputMode="numeric" min="0" max="1000000" step="1" required placeholder="Contar" value={draft.value} disabled={busy||saving} aria-invalid={dirty&&(value===null||stale)} aria-describedby={'count-status-'+row.id} onChange={event=>setDraft({...draft,value:event.target.value})}/><Button size="sm" variant="secondary" type="submit" loading={saving} disabled={busy||!dirty||value===null||value===row.quantity||stale}>Guardar</Button></form><span id={'count-status-'+row.id} className="inventory-count-status" role="status">{stale?'El saldo cambió. Descarta el conteo y revisa el stock.':dirty&&value===null?'Introduce un entero entre 0 y 1 000 000.':dirty?'Sin guardar':''}</span>{dirty&&<Button size="sm" variant="secondary" disabled={busy||saving} onClick={()=>setDraft({value:initial,baseline:initial,version:row.version})}>Descartar</Button>}</td>
  <td data-label="Acciones"><div className="inventory-row-actions">{actions?.(row)??<span className="inventory-unit">Conteo individual</span>}</div></td>
 </tr>;
}
export function InventoryMatrix({rows,busy,save,threshold=10,actions,onDirtyChange,showCodes=true}:{rows:InventoryRow[];busy:boolean;save:(row:InventoryRow,value:number)=>Promise<unknown>;threshold?:number;showCodes?:boolean;actions?:(row:InventoryRow)=>ReactNode;onDirtyChange?:(dirty:boolean)=>void}) {
 const [dirtyIds,setDirtyIds]=useState<Set<string>>(()=>new Set());
 const onDirty=useCallback((id:string,dirty:boolean)=>setDirtyIds(current=>{const next=new Set(current);if(dirty)next.add(id);else next.delete(id);return next;}),[]);
 useEffect(()=>{onDirtyChange?.(dirtyIds.size>0);},[dirtyIds,onDirtyChange]);
 if(!rows.length)return null;
 return <div className="inventory-matrix inventory-table-shell" role="region" aria-label={showCodes?'Inventario por SKU':'Existencias por opción'} tabIndex={0}><table className="inventory-table"><caption>Stock actual y conteo físico por {showCodes?'SKU':'opción'} · cada guardado registra un movimiento</caption><thead><tr>{['Producto / diseño',...(showCodes?['SKU']:[]),'Talla y color','Stock actual','Estado','Conteo físico','Acciones'].map(label=><th scope="col" key={label}>{label}</th>)}</tr></thead><tbody>{rows.map(row=><InventoryLine key={row.id} row={row} busy={busy} save={save} threshold={threshold} actions={actions} onDirty={onDirty} showCodes={showCodes}/>)}</tbody></table></div>;
}
