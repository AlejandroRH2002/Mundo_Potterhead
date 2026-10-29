import {managedProductSchema,type ManagedProduct} from '../../../../shared/catalogManagement.ts';
import {designReadiness} from './designReadiness.ts';
import {productPlaceholder} from '../../../../shared/productSchema.ts';

export function preparePublication(value:ManagedProduct){
 const validated=managedProductSchema.safeParse(value);
 if(!validated.success)throw Error('Revisa los datos antes de publicar: '+validated.error.issues.map(issue=>issue.message).slice(0,3).join(' · '));
 const ready=value.models.filter(model=>designReadiness(value,model).publication.length===0);
 const pending=value.models.filter(model=>!ready.includes(model));
 if(!ready.length)throw Error('Ningún diseño está listo. Completa fotografía principal y una talla o presentación activa.');
 const image=value.product.image&&value.product.image!==productPlaceholder?value.product.image:ready[0].images[0];
 return {value:{...value,product:{...value.product,image},status:'active' as const,models:value.models.map(model=>({...model,active:ready.includes(model)}))},ready,pending};
}

export function publicationSummary(saved:ManagedProduct){
 const published=saved.models.filter(model=>saved.status==='active'&&model.active);
 const pending=saved.models.filter(model=>!published.includes(model));
 return 'Confirmado por el servidor. Publicados: '+(published.map(model=>model.name).join(', ')||'ninguno')+'. Pendientes o en borrador: '+(pending.map(model=>model.name).join(', ')||'ninguno')+'.';
}

export function returnDesignToDraft(value:ManagedProduct,code:string):ManagedProduct{
 const models=value.models.map(model=>model.code===code?{...model,active:false}:model);
 return {...value,models,status:models.some(model=>model.active)?value.status:'draft'};
}
