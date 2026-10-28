import type {ManagedProduct} from '../../../../shared/catalogManagement';
import {productPlaceholder} from '../../../../shared/productSchema.ts';

export function designReadiness(value:ManagedProduct,model:ManagedProduct['models'][number]){
 const publication:string[]=[];
 if(!model.name.trim())publication.push('Nombre del diseño');
 if(!model.images.some(image=>image!==productPlaceholder))publication.push('Fotografía principal');
 if(!model.variants.some(option=>option.active))publication.push('Al menos una talla o presentación activa');
 const optional=model.variants.some(option=>option.active&&!option.color.trim())?['Color sin especificar (opcional)']:[];
 return {publication,optional,state:!model.active?'Borrador o inactivo':value.status==='active'?'Publicado (si los cambios están guardados)':'Listo al publicar el producto',
  sale:'Consulta las existencias en Inventario. Si se exige control, solo se cotizan opciones con existencias verificadas y disponibles.'};
}
