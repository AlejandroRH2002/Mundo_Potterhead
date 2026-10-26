import { useState } from 'react';
import { Button } from '@/shared/components/Button';
import { InventoryMatrix } from '@/features/inventory/components/InventoryMatrix';
import { useInventory } from '@/features/inventory/hooks/useInventory';

export function VariantInventory({productId,disabled}:{productId:string;disabled:boolean}){
 const [page,setPage]=useState(1);
 const inventory=useInventory(new URLSearchParams({productId,page:String(page),pageSize:'20'}));
 return <section className="shop-panel catalog-stock-panel" aria-label="Existencias de las variantes"><h2>Existencias e historial</h2><p>Los conteos se guardan por separado y registran un movimiento. Guarda primero los cambios del editor.</p>
  {inventory.loading&&<p role="status">Cargando existencias…</p>}{inventory.error&&<p role="alert" className="shop-error">{inventory.error}</p>}{inventory.notice&&<p role="status">{inventory.notice}</p>}
  <fieldset disabled={disabled||inventory.busy}><legend className="sr-only">Conteo de existencias</legend><InventoryMatrix rows={inventory.data?.items??[]} busy={disabled||inventory.busy||inventory.loading} threshold={inventory.data?.lowStockThreshold??10} save={(row,quantity)=>inventory.move(row,{type:row.quantity===null?'COUNT':'ADJUSTMENT',quantity,reason:'Conteo físico desde variantes',expectedVersion:row.version})}/></fieldset>
  {!inventory.loading&&!inventory.data?.items.length&&<p>No hay SKU guardados. Añade una variante y guarda el producto.</p>}
  <div className="admin-actions"><Button type="button" variant="secondary" disabled={page===1||inventory.busy} onClick={()=>setPage(page-1)}>Anterior</Button><span>Página {page}</span><Button type="button" variant="secondary" disabled={inventory.busy||page*20>=(inventory.data?.total??0)} onClick={()=>setPage(page+1)}>Siguiente</Button></div>
  {inventory.history&&<details><summary>Últimos movimientos del SKU seleccionado</summary><ul>{inventory.history.items.map(item=><li key={item.id}>{item.type}: {item.before??'pendiente'} → {item.after} · {item.reason}</li>)}</ul></details>}
 </section>;
}
