import type { InventoryRow } from '../../../../shared/inventory';
export function physicalCount(value:string):number|null {
 if(!/^\d+$/.test(value.trim()))return null;
 const count=Number(value);return Number.isSafeInteger(count)&&count<=1_000_000?count:null;
}
export function stockStatus(quantity:number|null,threshold=10){
 return quantity===null?{key:'pending',label:'Pendiente de conteo'}:quantity===0?{key:'empty',label:'Agotado'}:quantity<=threshold?{key:'low',label:'Stock bajo'}:{key:'available',label:'Disponible'};
}
export function inventorySummary(rows:InventoryRow[],threshold=10){return {models:new Set(rows.map(row=>row.modelId??row.id)).size,skus:rows.length,low:rows.filter(row=>stockStatus(row.quantity,threshold).key==='low').length,empty:rows.filter(row=>row.quantity===0).length,pending:rows.filter(row=>row.quantity===null).length};}
