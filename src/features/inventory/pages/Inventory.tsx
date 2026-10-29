import {InventoryOperationDialog} from '../components/InventoryOperationDialog';
import { inventorySummary, movementLabels } from '../services/inventoryPresentation';
import { sizeTaxonomy,sizeLabel } from '../../../../shared/sizes';
import { InventoryMatrix } from '../components/InventoryMatrix';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { usePageMetadata } from '@/shared/lib/usePageMetadata';
import { Button } from '@/shared/components/Button';
import type { InventoryRow, MovementInput } from '../../../../shared/inventory.ts';
export function Inventory() {
  usePageMetadata({ title: 'Existencias por producto y diseño', description: 'Gestión de existencias', noindex: true });
  const [params, setParams] = useSearchParams();
  const admin = useInventory(params);
  const movementTrigger=useRef<HTMLButtonElement|null>(null);
  const [selected, setSelected] = useState<InventoryRow>();
  const [pending,setPending]=useState(false),[showCodes,setShowCodes]=useState(false);
  const allowLeave=()=>!pending||window.confirm('Hay conteos sin guardar. ¿Descartarlos al cambiar la vista?');
  const summary=inventorySummary(admin.data?.items??[],admin.data?.lowStockThreshold??10);
  const [type, setType] = useState<MovementInput['type']>('SALE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [modelName, setModelName] = useState('');
  const [image, setImage] = useState('');
  const [newSize,setNewSize]=useState('one');
  const [active, setActive] = useState(true);
  useEffect(()=>{setQuantity('');setReason('');},[admin.saved]);
  const filter = (key: string, value: string) => { if(!allowLeave())return; const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, value); else next.delete(key); setParams(next); setSelected(undefined); };
  const choose = (row: InventoryRow,trigger:HTMLButtonElement) => { movementTrigger.current=trigger; setNewSize('one');setSelected(row);void admin.loadGallery(row.productId); setType(row.quantity === null ? 'COUNT' : 'SALE'); setQuantity(''); setReason(''); setModelName(row.name); setImage(row.image ?? ''); setActive(row.modelActive??row.active); };
  const closeOperation=()=>{if(admin.busy)return;const dirty=!!quantity||!!reason||!!selected&&(modelName!==selected.name||image!==(selected.image??'')||active!==(selected.modelActive??selected.active));if(!dirty||window.confirm('Hay cambios sin guardar. ¿Descartarlos y cerrar?'))setSelected(undefined);};
  const current = selected && admin.data?.items.find(row => row.id === selected.id);
  const operation:MovementInput['type']=current?.quantity===null?'COUNT':type==='COUNT'?'SALE':type;
  return <section className="shop-page admin-page inventory-page">
    <div className="inventory-heading"><div><span className="inventory-eyebrow">Control de existencias</span><h1 className="shop-title">Inventario por modelo</h1></div></div>
    <p>Captura cantidades reales. Cotizar por WhatsApp no reserva ni descuenta mercancía. Existencias bajas: hasta {admin.data?.lowStockThreshold??10} unidades.</p>
    <div className="inventory-summary" aria-label="Resumen de la página visible">{[["Diseños en página",summary.models],["Opciones en página",summary.skus],["Pocas piezas",summary.low],["Agotados",summary.empty],["Sin conteo",summary.pending]].map(([label,value])=><div key={label}><strong>{admin.loading?"—":value}</strong><span>{label}</span></div>)}</div><p className="inventory-scope">Resumen de las opciones de esta página, con los filtros actuales. Total de opciones encontradas: {admin.data?.total??"—"}.</p><div className="inventory-filters"><label>Buscar producto o diseño<input className="shop-input" type="search" value={params.get('q') ?? ''} onChange={event => filter('q', event.target.value)}/></label>
      <label>Estado<select className="shop-input" value={params.get('status') ?? 'all'} onChange={event => filter('status', event.target.value)}>{[['all','Todos'],['pending','Pendientes'],['empty','Agotados'],['low','Pocas piezas'],['available','Disponibles']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button variant="secondary" onClick={() => { if(!allowLeave())return; setParams({}); setSelected(undefined); }}>Limpiar filtros</Button><Button variant="secondary" disabled={admin.busy||admin.loading} onClick={()=>void admin.run(async()=>{})}>Actualizar vista</Button></div>
    {admin.error && <p className="shop-error" role="alert">{admin.error}</p>}
    <p role="status" aria-live="polite">{admin.notice}</p>
    {admin.loading && <p role="status">Cargando inventario…</p>}
    {!admin.loading && !admin.error && !admin.data?.items.length && <div className="inventory-empty"><h2>No hay opciones con estos filtros</h2><p>Prueba otro producto o diseño, o limpia los filtros.</p></div>}
    <details className="inventory-advanced"><summary>Datos avanzados</summary><label><input type="checkbox" checked={showCodes} onChange={event=>setShowCodes(event.target.checked)}/> Mostrar códigos internos</label></details>
    <InventoryMatrix showCodes={showCodes} key={params.toString()} rows={admin.data?.items??[]} busy={admin.busy||admin.loading} threshold={admin.data?.lowStockThreshold??10} onDirtyChange={setPending} save={(row,value)=>admin.move(row,{type:row.quantity===null?'COUNT':'ADJUSTMENT',quantity:value,expectedVersion:row.version,reason:'Conteo físico desde inventario'})} actions={row=><><Button size="sm" variant="secondary" disabled={admin.busy} onClick={event=>choose(row,event.currentTarget)}>Entradas y ventas</Button><Button size="sm" variant="secondary" disabled={admin.busy} onClick={()=>void admin.loadHistory(row.id)}>Historial</Button><Button size="sm" variant="secondary" disabled={admin.busy} onClick={()=>{if(window.confirm(row.archived?'¿Mostrar este producto según su disponibilidad?':'¿Archivar la ficha completa sin borrar su historial?'))void admin.archive(row.productId,!row.archived);}}>{row.archived?'Mostrar':'Archivar'}</Button></>}/>
    {admin.data && <nav className="admin-actions" aria-label="Páginas de inventario"><Button variant="secondary" disabled={admin.loading || admin.data.page <= 1} onClick={() => { if(!allowLeave())return; const next = new URLSearchParams(params); next.set('page', String(admin.data!.page - 1)); setParams(next); setSelected(undefined); }}>Anterior</Button><span>Página {admin.data.page} · {admin.data.total} opciones</span><Button variant="secondary" disabled={admin.loading || admin.data.page * admin.data.pageSize >= admin.data.total} onClick={() => { if(!allowLeave())return; const next = new URLSearchParams(params); next.set('page', String(admin.data!.page + 1)); setParams(next); setSelected(undefined); }}>Siguiente</Button></nav>}
    {current && <InventoryOperationDialog returnFocusTo={movementTrigger.current} busy={admin.busy} onClose={closeOperation}>{admin.error&&<p role="alert" className="shop-error">{admin.error}</p>}<p><strong>{current.productName}</strong> · {current.name} · {sizeLabel(current.size??'one')}{current.color?' · '+current.color:''}</p><fieldset disabled={admin.busy} className="inventory-operation-fields"><div className="inventory-forms"><form id="inventory-operation" className="shop-panel" onSubmit={event => { event.preventDefault(); if (window.confirm(`¿Confirmar ${movementLabels[operation]} de ${quantity} para ${current.name}, ${sizeLabel(current.size??'one')}${current.color?' · '+current.color:''}?`)) void admin.move(current, { type:operation, quantity: Number(quantity), reason, expectedVersion: current.version }).then(ok=>{if(ok)setSelected(undefined);}); }}>
      <div className="admin-actions"><h2>Actualizar {current.name} · {sizeLabel(current.size??'one')}{current.color?' · '+current.color:''}</h2><Button type="button" variant="secondary" disabled={admin.busy} onClick={closeOperation}>Cancelar</Button></div><p>Existencias actuales: {current.quantity ?? 'pendiente'}. Un conteo establece la cantidad total que hay físicamente.</p>
      <label>Operación<select className="shop-input" value={operation} onChange={event => setType(event.target.value as MovementInput['type'])}>{(current.quantity === null ? [['COUNT','Conteo inicial']] : [['SALE','Registrar venta'],['RECEIPT','Registrar entrada'],['ADJUSTMENT','Conteo / corrección justificada']]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Cantidad<input className="shop-input" type="number" min={operation === 'SALE' || operation === 'RECEIPT' ? 1 : 0} max="1000000" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)}/></label>
      <label>Motivo (sin datos personales)<input className="shop-input" required minLength={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)}/></label>
      <Button loading={admin.busy} type="submit">Confirmar movimiento</Button>
    </form><form className="shop-panel inventory-design-form" onSubmit={event => { event.preventDefault(); void admin.saveModel(current.productId, modelName, image, active, current.modelId??current.id); }}>
      <h2>Información del diseño</h2><p>Las fotografías no representan unidades. Puedes elegir una fotografía ya guardada.</p><details><summary>Datos avanzados</summary><p>Código interno: {current.sku}</p></details>
      <label>Nombre del diseño<input className="shop-input" required maxLength={100} value={modelName} onChange={event => setModelName(event.target.value)}/></label>
      <label>Fotografía del diseño<select className="shop-input" value={image} onChange={event=>setImage(event.target.value)}><option value="">Sin fotografía seleccionada</option>{admin.gallery.map((url,index)=><option key={url} value={url}>Imagen {index+1} de la galería</option>)}</select></label>
      <label><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/> Diseño activo</label>
      <label>Añadir talla<select className="shop-input" value={newSize} onChange={event=>setNewSize(event.target.value)}>{sizeTaxonomy[admin.category].map(size=><option key={size.slug} value={size.slug}>{size.label}</option>)}</select></label><Button type="button" variant="secondary" disabled={admin.busy} onClick={()=>void admin.addSku(current.modelId??current.id,newSize)}>Agregar talla sin existencias registradas</Button>
      <div className="admin-actions"><Button loading={admin.busy} type="submit">Guardar diseño</Button><Button variant="secondary" disabled={admin.busy || !modelName.trim() || modelName === current.name} onClick={() => { if (window.confirm('¿Crear otro diseño con este nombre? Sus existencias quedarán sin registrar.')) void admin.saveModel(current.productId, modelName, image, active); }}>Crear otro diseño</Button></div>
    </form></div></fieldset></InventoryOperationDialog>}
    {admin.history && <section className="shop-panel"><h2>Historial de existencias</h2>{!admin.history.items.length && <p>Aún no hay movimientos.</p>}<ol>{admin.history.items.map(item => <li key={item.id}><strong>{movementLabels[item.type]??item.type}: {item.before ?? 'pendiente'} → {item.after}</strong><p>{item.reason} · {new Date(item.createdAt).toLocaleString('es-MX')}</p></li>)}</ol><div className="admin-actions"><Button variant="secondary" disabled={admin.busy || admin.history.page <= 1} onClick={() => void admin.loadHistory(admin.historyId, admin.history!.page - 1)}>Anteriores</Button><Button variant="secondary" disabled={admin.busy || admin.history.page * admin.history.pageSize >= admin.history.total} onClick={() => void admin.loadHistory(admin.historyId, admin.history!.page + 1)}>Más movimientos</Button></div></section>}
  </section>;
}
