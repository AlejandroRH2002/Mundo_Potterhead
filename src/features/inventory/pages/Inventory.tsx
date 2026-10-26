import { sizeTaxonomy,sizeLabel } from '../../../../shared/sizes';
import { InventoryMatrix } from '../components/InventoryMatrix';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useInventory } from '../hooks/useInventory';
import { usePageMetadata } from '@/shared/lib/usePageMetadata';
import { Button } from '@/shared/components/Button';
import type { InventoryRow, MovementInput } from '../../../../shared/inventory.ts';
export function Inventory() {
  usePageMetadata({ title: 'Inventario por modelo', description: 'Gestión de existencias', noindex: true });
  const [params, setParams] = useSearchParams();
  const admin = useInventory(params);
  const [selected, setSelected] = useState<InventoryRow>();
  const [type, setType] = useState<MovementInput['type']>('SALE');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');
  const [modelName, setModelName] = useState('');
  const [image, setImage] = useState('');
  const [newSize,setNewSize]=useState('one');
  const [active, setActive] = useState(true);
  useEffect(()=>{setQuantity('');setReason('');},[admin.saved]);
  const filter = (key: string, value: string) => { const next = new URLSearchParams(params); next.delete('page'); if (value) next.set(key, value); else next.delete(key); setParams(next); setSelected(undefined); };
  const choose = (row: InventoryRow) => { setNewSize('one');setSelected(row);void admin.loadGallery(row.productId); setType(row.quantity === null ? 'COUNT' : 'SALE'); setQuantity(''); setReason(''); setModelName(row.name); setImage(row.image ?? ''); setActive(row.active);requestAnimationFrame(()=>{const form=document.getElementById('inventory-operation');form?.scrollIntoView({block:'start',behavior:'auto'});form?.focus({preventScroll:true});}); };
  const current = selected && admin.data?.items.find(row => row.id === selected.id);
  const operation:MovementInput['type']=current?.quantity===null?'COUNT':type==='COUNT'?'SALE':type;
  return <section className="shop-page admin-page inventory-page">
    <Link className="button-outline button-size-md" to="/admin">← Productos</Link>
    <h1 className="shop-title">Inventario por modelo</h1>
    <p>Captura cantidades reales. Cotizar por WhatsApp no reserva ni descuenta mercancía. Stock bajo: hasta {admin.data?.lowStockThreshold??10} unidades.</p>
    <div className="inventory-filters"><label>Buscar producto, modelo o SKU<input className="shop-input" type="search" value={params.get('q') ?? ''} onChange={event => filter('q', event.target.value)}/></label>
      <label>Estado<select className="shop-input" value={params.get('status') ?? 'all'} onChange={event => filter('status', event.target.value)}>{[['all','Todos'],['pending','Pendientes'],['empty','Agotados'],['low','Stock bajo'],['available','Disponibles']].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <Button variant="secondary" onClick={() => { setParams({}); setSelected(undefined); }}>Limpiar filtros</Button></div>
    {admin.error && <p className="shop-error" role="alert">{admin.error}</p>}
    <p role="status" aria-live="polite">{admin.notice}</p>
    {admin.loading && <p role="status">Cargando inventario…</p>}
    {!admin.loading && !admin.data?.items.length && <p>No hay modelos con estos filtros.</p>}
    <InventoryMatrix rows={admin.data?.items??[]} busy={admin.busy} save={(row,value)=>admin.move(row,{type:row.quantity===null?'COUNT':'ADJUSTMENT',quantity:value,expectedVersion:row.version,reason:'Conteo rápido de cuadrícula'})}/>
    <div className="inventory-grid">{admin.data?.items.map(row => <article key={row.id} className="shop-panel inventory-card">
      <h2>{row.productName}</h2><p><strong>{row.name} · {sizeLabel(row.size??'one')}</strong> · {row.sku}</p><p>{row.quantity === null ? 'Pendiente de captura' : `${row.quantity} unidades${row.quantity === 0 ? ' · Agotado' : row.quantity <= (admin.data?.lowStockThreshold??10) ? ' · Stock bajo' : ''}`}</p>
      <p>{row.active ? 'Modelo activo' : 'Modelo inactivo'}{row.archived ? ' · Producto archivado' : ''}</p>
      <div className="admin-actions"><Button disabled={admin.busy} onClick={() => choose(row)}>Gestionar modelo</Button><Button variant="secondary" disabled={admin.busy} onClick={() => void admin.loadHistory(row.id)}>Movimientos</Button>
      <Button variant="secondary" disabled={admin.busy} onClick={() => { if (window.confirm(row.archived ? '¿Mostrar este producto según su disponibilidad?' : '¿Archivar la ficha completa sin borrar su historial?')) void admin.archive(row.productId, !row.archived); }}>{row.archived ? 'Mostrar producto' : 'Archivar producto'}</Button></div>
    </article>)}</div>
    {admin.data && <nav className="admin-actions" aria-label="Páginas de inventario"><Button variant="secondary" disabled={admin.loading || admin.data.page <= 1} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(admin.data!.page - 1)); setParams(next); setSelected(undefined); }}>Anterior</Button><span>Página {admin.data.page} · {admin.data.total} modelos</span><Button variant="secondary" disabled={admin.loading || admin.data.page * admin.data.pageSize >= admin.data.total} onClick={() => { const next = new URLSearchParams(params); next.set('page', String(admin.data!.page + 1)); setParams(next); setSelected(undefined); }}>Siguiente</Button></nav>}
    {current && <div className="inventory-forms"><form id="inventory-operation" tabIndex={-1} className="shop-panel" onSubmit={event => { event.preventDefault(); if (window.confirm(`¿Confirmar ${operation} de ${quantity} para ${current.name}?`)) void admin.move(current, { type:operation, quantity: Number(quantity), reason, expectedVersion: current.version }); }}>
      <h2>Actualizar {current.name}</h2><p>Saldo actual: {current.quantity ?? 'pendiente'}. Conteo y ajuste establecen una cantidad absoluta.</p>
      <label>Operación<select className="shop-input" value={operation} onChange={event => setType(event.target.value as MovementInput['type'])}>{(current.quantity === null ? [['COUNT','Conteo inicial']] : [['SALE','Registrar venta'],['RECEIPT','Registrar entrada'],['ADJUSTMENT','Conteo / corrección justificada']]).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label>Cantidad<input className="shop-input" type="number" min={operation === 'SALE' || operation === 'RECEIPT' ? 1 : 0} max="1000000" step="1" required value={quantity} onChange={event => setQuantity(event.target.value)}/></label>
      <label>Motivo (sin datos personales)<input className="shop-input" required minLength={3} maxLength={300} value={reason} onChange={event => setReason(event.target.value)}/></label>
      <Button loading={admin.busy} type="submit">Confirmar movimiento</Button>
    </form><form className="shop-panel" onSubmit={event => { event.preventDefault(); void admin.saveModel(current.productId, modelName, image, active, current.modelId??current.id); }}>
      <h2>Identidad del modelo</h2><p>SKU inmutable: {current.sku}. Una foto no equivale a una unidad. Puedes asociar una imagen ya guardada en la galería.</p>
      <label>Nombre del modelo<input className="shop-input" required maxLength={100} value={modelName} onChange={event => setModelName(event.target.value)}/></label>
      <label>Imagen del modelo<select className="shop-input" value={image} onChange={event=>setImage(event.target.value)}><option value="">Usar imagen principal del producto</option>{admin.gallery.map((url,index)=><option key={url} value={url}>Imagen {index+1} de la galería</option>)}</select></label>
      <label><input type="checkbox" checked={active} onChange={event => setActive(event.target.checked)}/> Modelo activo</label>
      <label>Añadir talla<select className="shop-input" value={newSize} onChange={event=>setNewSize(event.target.value)}>{sizeTaxonomy[admin.category].map(size=><option key={size.slug} value={size.slug}>{size.label}</option>)}</select></label><Button type="button" variant="secondary" disabled={admin.busy} onClick={()=>void admin.addSku(current.modelId??current.id,newSize)}>Crear talla pendiente</Button>
      <div className="admin-actions"><Button loading={admin.busy} type="submit">Guardar modelo</Button><Button variant="secondary" disabled={admin.busy || !modelName.trim() || modelName === current.name} onClick={() => { if (window.confirm('¿Crear un modelo diferente con este nombre? Su cantidad quedará pendiente.')) void admin.saveModel(current.productId, modelName, image, active); }}>Crear otro modelo</Button></div>
    </form></div>}
    {admin.history && <section className="shop-panel"><h2>Movimientos del SKU {admin.historyId}</h2>{!admin.history.items.length && <p>Aún no hay movimientos.</p>}<ol>{admin.history.items.map(item => <li key={item.id}><strong>{item.type}: {item.before ?? 'pendiente'} → {item.after}</strong><p>{item.reason} · {new Date(item.createdAt).toLocaleString('es-MX')} · Responsable: {item.actorId}</p></li>)}</ol><div className="admin-actions"><Button variant="secondary" disabled={admin.busy || admin.history.page <= 1} onClick={() => void admin.loadHistory(admin.historyId, admin.history!.page - 1)}>Anteriores</Button><Button variant="secondary" disabled={admin.busy || admin.history.page * admin.history.pageSize >= admin.history.total} onClick={() => void admin.loadHistory(admin.historyId, admin.history!.page + 1)}>Más movimientos</Button></div></section>}
  </section>;
}
