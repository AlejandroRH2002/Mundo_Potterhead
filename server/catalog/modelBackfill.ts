import { createHash } from 'node:crypto';
import { catalogImage } from '../../shared/productImage.ts';
interface LegacyProduct { id:string; imageUrl:string|null; images:string[]; models:{id:string;name:string;image:string|null;skus:{quantity:number|null}[]}[] }
export function modelBackfillPlan(product:LegacyProduct) {
  const images=[...new Set([product.imageUrl,...product.images].filter((image):image is string=>!!image).map(image=>catalogImage(product.id,image)))].slice(0,8);
  let reusable=product.models.find(model=>!model.image&&model.skus.every(sku=>sku.quantity===null));
  return images.flatMap((image,index)=>{
    if(product.models.some(model=>model.image===image))return [];
    const digest=createHash('sha256').update(product.id+'\n'+image).digest('hex');
    const reuseId=reusable?.id;reusable=undefined;
    return [{id:reuseId??'image-'+digest,sku:'MP-'+digest,name:`Modelo ${index+1} · ${digest.slice(0,8)}`,image,reuse:!!reuseId}];
  });
}
