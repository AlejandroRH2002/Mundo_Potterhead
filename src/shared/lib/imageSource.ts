import {allowedImageSource,imageOrigins,imagePlaceholder} from '../../../shared/imageSource.ts';
const ownedPreviews=new Map<string,string>();
function policy(){const origin=typeof location!=='undefined'?location.origin:import.meta.env?.VITE_SITE_URL||'https://local.invalid';return {origin,allowedOrigins:[...imageOrigins(import.meta.env?.VITE_IMAGE_ORIGINS),...imageOrigins(import.meta.env?.VITE_SITE_URL)]};}
export function checkedImageSource(value:unknown):string|undefined{return typeof value==='string'&&ownedPreviews.has(value)?ownedPreviews.get(value):allowedImageSource(value,policy());}
export const safeImageSource=(value:unknown):string=>checkedImageSource(value)??imagePlaceholder;
export function createOwnedImagePreview(file:File):string{
 if(!['image/png','image/jpeg','image/webp'].includes(file.type)||!file.size)throw new Error('Selecciona una imagen PNG, JPEG o WebP.');
 if(file.size>10*1024*1024)throw new Error('El archivo original no puede superar 10 MB.');
 const url=URL.createObjectURL(file);ownedPreviews.set(url,url);return url;
}
export function releaseImagePreview(value:string|undefined):void{if(value&&ownedPreviews.delete(value))URL.revokeObjectURL(value);}
