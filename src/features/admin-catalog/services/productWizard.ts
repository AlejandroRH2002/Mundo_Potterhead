import type {ManagedProduct} from '../../../../shared/catalogManagement.ts';
import {productDraftSchema,productPlaceholder} from '../../../../shared/productSchema.ts';
export const productSteps=['Información general','Diseños y opciones','Fotografías','Revisar y guardar'];
export function publicationProblem(value:ManagedProduct):string|undefined{
 if(!productDraftSchema.safeParse(value.product).success)return 'Revisa nombre, descripción, precio y categoría.';
 if(!value.models.some(m=>m.active&&m.images.some(url=>url!==productPlaceholder)&&m.variants.some(s=>s.active)))return 'Selecciona al menos un diseño con fotografía y una opción de venta para publicar.';
 if(value.models.some(m=>m.active&&!m.images.some(url=>url!==productPlaceholder)))return 'Desactiva los diseños sin fotografía antes de publicar.';
}
import {planDesignImport} from '../../../../shared/designImport.ts';
import type {ImportRecord} from '../../../../shared/catalogManagement.ts';
export function stageDesigns(value:ManagedProduct,rows:ImportRecord[]){
 if(rows.some(row=>row.quantity?.trim()))throw new Error('Para importar existencias, guarda primero el producto y usa Importar diseños desde su ficha.');
 return planDesignImport(value,rows,()=> 'S-'+crypto.randomUUID());
}
