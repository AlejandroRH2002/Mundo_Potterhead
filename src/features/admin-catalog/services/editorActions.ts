import type { ManagedProduct } from '../../../../shared/catalogManagement';
import { sizeTaxonomy } from '../../../../shared/sizes.ts';
import { categories } from '../../../../shared/catalogTaxonomy.ts';

export function removeVariant(value:ManagedProduct,modelIndex:number,variantIndex:number):ManagedProduct {
 const selected=value.models[modelIndex]?.variants[variantIndex];if(!selected)return value;
 return {...value,models:value.models.map((model,index)=>index===modelIndex?{...model,variants:model.variants.filter((_,i)=>i!==variantIndex)}:model),
  ...(selected.id?{removedVariantIds:[...(value.removedVariantIds??[]),selected.id]}:{})};
}
export function addVariant(value:ManagedProduct,modelIndex:number):ManagedProduct {
 const category=categories.find(category=>category===value.product.category)??'clothing';
 return {...value,models:value.models.map((model,index)=>{
  if(index!==modelIndex)return model;
  const sizes=['one',...sizeTaxonomy[category].map(size=>size.slug)];
  const size=sizes.find(size=>!model.variants.some(sku=>sku.size===size&&!sku.color))??'one';
  return {...model,active:model.active,variants:[...model.variants,{code:'S-'+crypto.randomUUID(),size,color:'',images:[],active:true}]};
 })};
}
export function duplicateModel(value:ManagedProduct,index:number):ManagedProduct {
 const source=value.models[index];if(!source)return value;
 const names=new Set(value.models.map(model=>model.name));let n=1,name='';
 do{name=source.name.slice(0,80)+' (copia '+n+')';n++;}while(names.has(name));
 const copy={...source,id:undefined,code:'M-'+crypto.randomUUID(),name,active:false,images:[...source.images],variants:source.variants.map(sku=>({...sku,id:undefined,code:'S-'+crypto.randomUUID(),images:[...sku.images]}))};
 return {...value,models:[...value.models,copy]};
}
