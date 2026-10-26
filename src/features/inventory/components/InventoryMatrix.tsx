import { useState } from 'react';
import type { InventoryRow } from '../../../../shared/inventory';
import { sizeLabel } from '../../../../shared/sizes';
import { Button } from '@/shared/components/Button';
function Cell({row,busy,save}:{row:InventoryRow;busy:boolean;save:(row:InventoryRow,value:number)=>Promise<void>}) {
 const [value,setValue]=useState(row.quantity===null?'':String(row.quantity));
 return <form onSubmit={event=>{event.preventDefault();if(window.confirm(`¿Establecer ${value} unidades de ${row.name}, talla ${sizeLabel(row.size??'one')}? Se registrará un movimiento.`))void save(row,Number(value));}}>
  <label><span className="sr-only">Cantidad de {row.productName}, {row.name}, {sizeLabel(row.size??'one')}</span><input className="shop-input" required type="number" min="0" max="1000000" step="1" placeholder="Pendiente" value={value} onChange={event=>setValue(event.target.value)}/></label>
  <Button size="sm" variant="secondary" type="submit" disabled={busy||value===''||Number(value)===row.quantity}>Guardar conteo</Button>
 </form>;
}
export function InventoryMatrix({rows,busy,save}:{rows:InventoryRow[];busy:boolean;save:(row:InventoryRow,value:number)=>Promise<void>}) {
 const groups=[...new Set(rows.map(row=>(row.modelId??row.id)+'|'+(row.color??'')))];const sizes=[...new Set(rows.map(row=>row.size??'one'))];
 if(!rows.length)return null;
 return <div className="inventory-matrix" role="region" aria-label="Cuadrícula de existencias por diseño y talla" tabIndex={0}><table><caption>Conteo físico rápido · SKU de esta página · cada guardado registra un movimiento</caption><thead><tr><th scope="col">Producto / diseño</th>{sizes.map(size=><th scope="col" key={size}>{sizeLabel(size)}</th>)}</tr></thead><tbody>{groups.map(id=>{const models=rows.filter(row=>(row.modelId??row.id)+'|'+(row.color??'')===id);return <tr key={id}><th scope="row">{models[0].productName}<br/>{models[0].name}{models[0].color?' / '+models[0].color:''}</th>{sizes.map(size=>{const row=models.find(item=>(item.size??'one')===size);return <td key={size}>{row?<Cell key={row.id+':'+row.version} row={row} busy={busy} save={save}/>:<span>—</span>}</td>;})}</tr>;})}</tbody></table></div>;
}
