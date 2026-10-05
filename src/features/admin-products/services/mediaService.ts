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

export async function uploadProductImage(file: File): Promise<string> {
  if (!imageTypes.some(type => type === file.type) || file.size === 0) throw new Error('Selecciona una imagen PNG, JPEG o WebP.');
  file = await compressImage(file);
  const config = mediaConfigSchema.parse(await mediaRequest('/media/config', 'Configuración de imágenes'));
  if (file.size > config.maxBytes) throw new Error(`La imagen debe ocupar como máximo ${config.maxBytes / 1024 / 1024} MB.`);
  if (!config.enabled) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagen inválida.'));
      reader.readAsDataURL(file);
    });
  }
  const policy = uploadPolicySchema.parse(await mediaRequest('/media/upload', 'Autorización de subida', {
    method: 'POST', body: JSON.stringify({ size: file.size, contentType: file.type }),
  }));
  const url = new URL(policy.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Destino de carga inválido.');
  let response: Response;
  try { response = await fetch(url, { method: policy.method, headers: policy.headers, body: file, credentials: 'omit', signal: AbortSignal.timeout(120_000) }); }
  catch { throw new Error('Subida a R2 bloqueada o sin respuesta. Revisa CORS del bucket: origen de la tienda, método PUT y cabecera Content-Type; comprueba también tu conexión.'); }
  if (!response.ok) throw new Error('R2 rechazó la subida (HTTP ' + response.status + '). Revisa los permisos del token S3 y vuelve a seleccionar la imagen para renovar la autorización.');
  const completed = completedUploadSchema.parse(await mediaRequest('/media/complete', 'Confirmación de imagen en R2', { method: 'POST', body: JSON.stringify({ ticket: policy.ticket }) }));
  // Do not report success while the public bucket route is unavailable.
  await new Promise<void>((resolve, reject) => {
    const image = new Image();
    const timer = window.setTimeout(() => finish(false), 20_000);
    const finish = (ok: boolean) => {
      window.clearTimeout(timer); image.onload = null; image.onerror = null;
      if (ok) resolve();
      else reject(new Error('La imagen se subió, pero no puede verse públicamente. Revisa PRODUCT_IMAGES en Pages y S3_PUBLIC_BASE_URL en Render.'));
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = completed.publicUrl;
  });
  return completed.publicUrl;
}
