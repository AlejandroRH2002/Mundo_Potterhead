import type {Product} from '../../../types/product.ts';
import {productImages} from '../../../shared/lib/productMedia.ts';
export interface DetailSelection {model?:{productId:string;id:string};sku?:{modelId:string;id:string};image?:{id:string;image:string}|null}
export function commercialProductTitle(parent:string,design?:string):string {
 const label=design?.trim();return !label||['general','único','unico','única','unica'].includes(label.toLocaleLowerCase('es'))||label.toLocaleLowerCase('es')===parent.trim().toLocaleLowerCase('es')?parent:parent+' — '+label;
}
// Resolve the existing selection rules once for the title, gallery and both quotation buttons.
export function resolveProductDetail(product:Product,selection:DetailSelection={}){
 const models=product.models?.filter(model=>model.active)??[];
 const selectedModel=models.find(model=>selection.model?.productId===product.id&&model.id===selection.model.id)??(models.length===1?models[0]:undefined);
 const skus=selectedModel?.skus?.filter(sku=>sku.active!==false)??(selectedModel?[{id:selectedModel.id,code:selectedModel.sku,size:'one',quantity:selectedModel.quantity,version:selectedModel.version}]:[]);
 const selectedSku=skus.find(sku=>selection.sku?.modelId===selectedModel?.id&&sku.id===selection.sku?.id)??(skus.length===1?skus[0]:undefined);
 const requiresModel=product.models!==undefined&&(!selectedModel||!selectedSku||product.inventoryMode==='enforce'&&(selectedSku.quantity===null||selectedSku.quantity===0));
 const pictures=selectedSku?.images?.length?selectedSku.images:selectedModel?.images?.length?selectedModel.images:selectedModel?.image?[selectedModel.image]:[product.image,...(product.images??[])];
 const title=commercialProductTitle(product.name,selectedModel?.name);
 const galleryProduct={...product,name:title,image:pictures[0]??product.image,images:pictures.slice(1)};
 const gallery=productImages(galleryProduct);
 const selectedImage=selection.image?.id===product.id&&gallery.includes(selection.image.image)?selection.image.image:gallery[0];
 return {models,selectedModel,skus,selectedSku,requiresModel,galleryProduct,gallery,selectedImage,title};
}

export function selectRelatedProducts(items:Product[],productId:string):Product[]{return items.filter(item=>item.id!==productId).slice(0,4);}
