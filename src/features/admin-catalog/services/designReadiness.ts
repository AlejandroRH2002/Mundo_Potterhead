import type {ManagedProduct} from '../../../../shared/catalogManagement';
import {productPlaceholder} from '../../../../shared/productSchema.ts';
import {validSize} from '../../../../shared/sizes.ts';

export function designReadiness(value:ManagedProduct,model:ManagedProduct['models'][number]){
 const publication:string[]=[];
 if(!model.name.trim())publication.push('Nombre del diseño');
 if(!model.images[0]||model.images[0]===productPlaceholder)publication.push('Fotografía principal');
 if(!model.variants.some(option=>option.active))publication.push('Al menos una talla o presentación activa');
 if(model.variants.some(option=>!validSize(value.product.category,option.size)))publication.push('Revisa las tallas de este diseño');
 if(new Set(model.variants.map(option=>JSON.stringify([option.size,option.color.toLocaleLowerCase('es')]))).size!==model.variants.length)publication.push('Tallas o colores repetidos');
 if(value.models.filter(item=>item.name===model.name).length>1)publication.push('Nombre de diseño repetido');
 const optional=model.variants.some(option=>option.active&&!option.color.trim())?['Color sin especificar (opcional)']:[];
 return {publication,optional,state:!model.active?'Borrador o inactivo':value.status==='active'?'Publicado (si los cambios están guardados)':'Listo al publicar el producto',
  sale:'Consulta las existencias en Inventario. Si se exige control, solo se cotizan opciones con existencias verificadas y disponibles.'};
}
