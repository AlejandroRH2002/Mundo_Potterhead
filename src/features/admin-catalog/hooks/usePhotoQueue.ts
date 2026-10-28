import {useEffect,useRef,useState,useSyncExternalStore} from 'react';
import {PhotoQueue,type PhotoTarget} from '../services/photoQueue';
import {assignModelPhoto} from '../services/editorActions';
import {uploadProductImage,thumbnailForImage} from '@/features/admin-products/services/mediaService';
import {gallerySchema,type ManagedProduct} from '../../../../shared/catalogManagement';

function checkedGallery(images:string[]):string[]{
 const parsed=gallerySchema.safeParse(images);
 if(!parsed.success)throw Error('Se admiten hasta ocho fotografías válidas y diferentes. Revisa la galería antes de reintentar.');
 return parsed.data;
}

export function usePhotoQueue(value:ManagedProduct,onChange:(value:ManagedProduct)=>void,onBusy:(busy:boolean)=>void){
 const latest=useRef({value,onChange,onBusy});latest.current={value,onChange,onBusy};
 const [queue]=useState(()=>new PhotoQueue(uploadProductImage,(target:PhotoTarget,image:string)=>{
  checkedGallery([image]);let next=latest.current.value;
  if(next.code!==target.productCode)throw Error('El producto cambió. Vuelve a seleccionar su fotografía.');
  if(target.modelCode){
   const model=next.models.find(model=>model.code===target.modelCode);if(!model)throw Error('Este diseño ya no existe en el editor.');
   if(target.variantCode){
    if(!model.variants.some(option=>option.code===target.variantCode))throw Error('Esta opción ya no existe en el editor.');
    next={...next,models:next.models.map(item=>item.code===target.modelCode?{...item,variants:item.variants.map(option=>option.code===target.variantCode?{...option,images:checkedGallery([...new Set([...option.images,image])])}:option)}:item)};
   }else if(target.append)next={...next,models:next.models.map(item=>item.code===target.modelCode?{...item,images:checkedGallery([...new Set([...item.images,image])])}:item)};
   else next=assignModelPhoto(next,{productCode:target.productCode,modelCode:target.modelCode},image);
  }else{
   const images=checkedGallery([...new Set([next.product.image,...next.product.images??[],image].filter((image):image is string=>!!image))]);
   next={...next,product:{...next.product,image:images[0],images:images.slice(1)}};
  }
  const thumbnail=thumbnailForImage(image);if(thumbnail)next={...next,product:{...next.product,imageThumbnails:{...next.product.imageThumbnails,[image]:thumbnail}}};
  latest.current.value=next;latest.current.onChange(next);
 }));
 const jobs=useSyncExternalStore(queue.subscribe,queue.snapshot,queue.snapshot);
 const pending=jobs.some(job=>job.state==='pending'||job.state==='uploading');
 useEffect(()=>{latest.current.onBusy(pending);return()=>latest.current.onBusy(false);},[pending]);
 useEffect(()=>{if(!pending)return;const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[pending]);
 // Ignore late completions after leaving the editor; never attach them to a different product.
 useEffect(()=>{queue.activate();return()=>{queue.dispose();};},[queue]);
 return {queue,jobs,pending};
}
