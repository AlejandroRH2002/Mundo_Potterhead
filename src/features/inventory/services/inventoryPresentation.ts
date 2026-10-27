import type { InventoryRow } from '../../../../shared/inventory';
export function physicalCount(value:string):number|null {
 if(!/^\d+$/.test(value.trim()))return null;
 const count=Number(value);return Number.isSafeInteger(count)&&count<=1_000_000?count:null;
}
export function stockStatus(quantity:number|null,threshold=10){
 return quantity===null?{key:'pending',label:'Pendiente de conteo'}:quantity===0?{key:'empty',label:'Agotado'}:quantity<=threshold?{key:'low',label:'Pocas piezas'}:{key:'available',label:'Disponible'};
}
export function inventorySummary(rows:InventoryRow[],threshold=10){return {models:new Set(rows.map(row=>row.modelId??row.id)).size,skus:rows.length,low:rows.filter(row=>stockStatus(row.quantity,threshold).key==='low').length,empty:rows.filter(row=>row.quantity===0).length,pending:rows.filter(row=>row.quantity===null).length};}

export function groupInventory(rows:InventoryRow[]){
 const groups=new Map<string,{key:string;row:InventoryRow;rows:InventoryRow[]}>();
 for(const row of rows){const key=JSON.stringify([row.productId,row.modelId??row.id]);let group=groups.get(key);if(!group){group={key,row,rows:[]};groups.set(key,group);}group.rows.push(row);}
 return [...groups.values()];
}
export const movementLabels:Record<string,string>={COUNT:'Conteo inicial',RECEIPT:'Entrada',SALE:'Venta',ADJUSTMENT:'Ajuste de existencias'};
