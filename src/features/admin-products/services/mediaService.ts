import {checkedImageSource} from '@/shared/lib/imageSource';
import { compressImage } from './compressImage';
import { ApiError, requestJson } from '@/shared/lib/httpClient';
import { imageTypes, mediaConfigSchema, uploadPolicySchema, completedUploadSchema } from '../../../../shared/mediaSchema';

async function mediaRequest(path: string, stage: string, init?: RequestInit): Promise<unknown> {
  try { return await requestJson<unknown>(path, { ...init, signal: AbortSignal.timeout(45_000) }); }
  catch (error: unknown) {
    if (error instanceof ApiError) throw new Error(stage + ' (HTTP ' + error.status + '): ' + error.message);
    throw new Error(stage + ': no hubo respuesta. Comprueba la conexión y el servicio API.');
  }
}

const thumbnails=new Map<string,string>();
export const thumbnailForImage=(image:string,persisted?:Record<string,string>)=>thumbnails.get(image)??persisted?.[image];
export const imagePreview=(image:string,persisted?:Record<string,string>)=>thumbnailForImage(image,persisted)??image;
export async function uploadProductImage(file:File):Promise<string>{
 if(!imageTypes.some(type=>type===file.type)||!file.size)throw new Error('Selecciona una fotografía PNG, JPEG o WebP.');
 const config=mediaConfigSchema.parse(await mediaRequest('/media/config','Configuración de fotografías'));
 if(!config.enabled)throw new Error('Las fotografías no están habilitadas en este entorno. Pide al administrador configurar la conexión de imágenes de la API.');
 const full=await compressImage(file);const thumb=await compressImage(file,400);const thumbUrl=await uploadPreparedImage(thumb,config);const fullUrl=await uploadPreparedImage(full,config);thumbnails.set(fullUrl,thumbUrl);return fullUrl;
}
async function uploadPreparedImage(file: File,config:{enabled:boolean;maxBytes:number}): Promise<string> {
  if (!imageTypes.some(type => type === file.type) || file.size === 0) throw new Error('Selecciona una imagen PNG, JPEG o WebP.');
  const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
  if(file.size>config.maxBytes)throw new Error('La fotografía supera el tamaño admitido.');
  const policy = uploadPolicySchema.parse(await mediaRequest('/media/upload', 'Autorización de subida', {
    method: 'POST', body: JSON.stringify({ size: file.size, contentType: file.type, sha256 }),
  }));
  if('publicUrl' in policy){await verifyPublicImage(policy.publicUrl);return policy.publicUrl;}
  const url = new URL(policy.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Destino de carga inválido.');
  let response: Response;
  try { response = await fetch(url, { method: policy.method, headers: policy.headers, body: file, credentials: 'omit', signal: AbortSignal.timeout(120_000) }); }
  catch { throw new Error('Subida a R2 bloqueada o sin respuesta. Revisa CORS del bucket: origen de la tienda, método PUT y cabecera Content-Type; comprueba también tu conexión.'); }
  if (!response.ok) throw new Error('R2 rechazó la subida (HTTP ' + response.status + '). Revisa los permisos del token S3 y vuelve a seleccionar la imagen para renovar la autorización.');
  const completed = completedUploadSchema.parse(await mediaRequest('/media/complete', 'Confirmación de imagen en R2', { method: 'POST', body: JSON.stringify({ ticket: policy.ticket }) }));
  await verifyPublicImage(completed.publicUrl);
  return completed.publicUrl;
}

async function verifyPublicImage(url:string):Promise<void>{
 const source=checkedImageSource(url);if(!source)throw new Error('La dirección pública de la fotografía no es válida.');
 await new Promise<void>((resolve,reject)=>{const image=new Image();const timer=window.setTimeout(()=>finish(false),20_000);const finish=(ok:boolean)=>{window.clearTimeout(timer);image.onload=null;image.onerror=null;if(ok)resolve();else reject(new Error('La fotografía se cargó pero no puede verse. Pide revisar la conexión de lectura de imágenes en Pages y la dirección pública configurada en la API.'));};image.onload=()=>finish(true);image.onerror=()=>finish(false);image.src=source;});
}
