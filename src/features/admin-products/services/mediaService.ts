import { requestJson } from '@/shared/lib/httpClient';
import { imageTypes, mediaConfigSchema, uploadPolicySchema, completedUploadSchema } from '../../../../shared/mediaSchema';

export async function uploadProductImage(file: File): Promise<string> {
  if (!imageTypes.some(type => type === file.type) || file.size === 0) throw new Error('Selecciona una imagen PNG, JPEG o WebP.');
  const config = mediaConfigSchema.parse(await requestJson<unknown>('/media/config'));
  if (file.size > config.maxBytes) throw new Error(`La imagen debe ocupar como máximo ${config.maxBytes / 1024 / 1024} MB.`);
  if (!config.enabled) {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('Imagen inválida.'));
      reader.readAsDataURL(file);
    });
  }
  const policy = uploadPolicySchema.parse(await requestJson<unknown>('/media/upload', {
    method: 'POST', body: JSON.stringify({ size: file.size, contentType: file.type }),
  }));
  const url = new URL(policy.url);
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Destino de carga inválido.');
  const response = await fetch(url, { method: policy.method, headers: policy.headers, body: file, credentials: 'omit', signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error('No se pudo subir la imagen. Inténtalo de nuevo.');
  const completed = completedUploadSchema.parse(await requestJson<unknown>('/media/complete', { method: 'POST', body: JSON.stringify({ ticket: policy.ticket }) }));
  return completed.publicUrl;
}
