import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { z } from 'zod';
import { uploadInputSchema, type UploadInput, type UploadPolicy } from '../shared/mediaSchema.ts';
const maxBytes = 10 * 1024 * 1024;
export class MediaConfigError extends Error {}
export class MediaValidationError extends Error {}
export function imageMime(bytes: Uint8Array): UploadInput['contentType'] {
  if (bytes.length >= 24 && [137,80,78,71,13,10,26,10].every((value, i) => bytes[i] === value) && Buffer.from(bytes.subarray(12,16)).toString() === 'IHDR') return 'image/png';
  if (bytes.length >= 12 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 && bytes[bytes.length-2] === 255 && bytes[bytes.length-1] === 217) return 'image/jpeg';
  if (bytes.length >= 20 && Buffer.from(bytes.subarray(0,4)).toString() === 'RIFF' && Buffer.from(bytes.subarray(8,12)).toString() === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(Buffer.from(bytes.subarray(12,16)).toString())) return 'image/webp';
  throw new MediaValidationError('El contenido no corresponde a PNG, JPEG o WebP.');
}
const extension = (type: UploadInput['contentType']) => ({ 'image/png':'png', 'image/jpeg':'jpg', 'image/webp':'webp' })[type];
export interface MediaStorage {
  maxBytes: number; sign(input: UploadInput): Promise<UploadPolicy>; complete(ticket: string): Promise<string>;
  putVerified(bytes: Buffer, key: string): Promise<string>; close(): void;
}
export function createMediaStorage(env: NodeJS.ProcessEnv, suppliedClient?: S3Client): MediaStorage | undefined {
  if (env.NODE_ENV === 'production' && env.MEDIA_STORAGE !== 's3') throw new MediaConfigError('MEDIA_STORAGE=s3 es obligatorio en producción.');
  if (env.MEDIA_STORAGE === undefined || env.MEDIA_STORAGE === 'inline') return undefined;
  if (env.MEDIA_STORAGE !== 's3') throw new MediaConfigError('MEDIA_STORAGE debe ser inline (desarrollo) o s3.');
  const schema = z.object({ S3_BUCKET: z.string().min(3), S3_REGION: z.string().min(1), S3_ENDPOINT: z.string().url(),
    S3_PUBLIC_BASE_URL: z.string().url(), S3_FORCE_PATH_STYLE: z.enum(['true','false']).default('false'), SESSION_SECRET: z.string().min(32) });
  const parsed = schema.safeParse(env);
  if (!parsed.success) throw new MediaConfigError('Configuración S3 ausente o inválida: ' + [...new Set(parsed.error.issues.map(issue => issue.path[0]))].join(', '));
  const config = parsed.data;
  for (const field of ['S3_ENDPOINT','S3_PUBLIC_BASE_URL'] as const) {
    const url = new URL(config[field]);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new MediaConfigError(field + ' requiere HTTPS sin credenciales ni parámetros.');
  }
  const client = suppliedClient ?? new S3Client({ region: config.S3_REGION, endpoint: config.S3_ENDPOINT, forcePathStyle: config.S3_FORCE_PATH_STYLE === 'true', maxAttempts: 2,
    requestChecksumCalculation: 'WHEN_REQUIRED', responseChecksumValidation: 'WHEN_REQUIRED' });
  const publicUrl = (key: string) => config.S3_PUBLIC_BASE_URL.replace(/\/$/, '') + '/' + key;
  const signature = (payload: string) => createHmac('sha256', config.SESSION_SECRET).update('media:' + payload).digest('base64url');
  const payloadSchema = uploadInputSchema.extend({ id: z.string().uuid(), expires: z.number() }).strict();
  return {
    maxBytes,
    async sign(input) {
      const parsed = uploadInputSchema.parse(input);
      const id = randomUUID();
      const payload = Buffer.from(JSON.stringify({ ...parsed, id, expires: Date.now() + 5 * 60_000 })).toString('base64url');
      const key = '_pending/' + id;
      const url = await getSignedUrl(client, new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, ContentType: parsed.contentType, ContentLength: parsed.size }), { expiresIn: 60, signableHeaders: new Set(['content-type', 'content-length']) });
      return { url, method: 'PUT', headers: { 'Content-Type': parsed.contentType }, ticket: payload + '.' + signature(payload) };
    },
    async complete(ticket) {
      const [payload, mac, extra] = ticket.split('.');
      const expected = Buffer.from(signature(payload ?? ''));
      const actual = Buffer.from(mac ?? '');
      if (!payload || extra || actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new MediaValidationError('Carga inválida o caducada.');
      let data;
      try { data = payloadSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString())); } catch { throw new MediaValidationError('Carga inválida.'); }
      if (data.expires <= Date.now()) throw new MediaValidationError('La carga caducó.');
      const key = '_pending/' + data.id;
      const object = await client.send(new GetObjectCommand({ Bucket: config.S3_BUCKET, Key: key }), { abortSignal: AbortSignal.timeout(15_000) });
      if (!object.Body) throw new MediaValidationError('La carga está vacía.');
      if (object.ContentLength !== data.size || object.ContentLength > maxBytes || object.ContentType !== data.contentType) {
        (object.Body as { destroy?: () => void }).destroy?.(); throw new MediaValidationError('Tamaño o tipo de carga inválido.');
      }
      const chunks: Buffer[] = []; let length = 0;
      for await (const chunk of object.Body as AsyncIterable<Uint8Array>) { length += chunk.length; if (length > maxBytes) throw new MediaValidationError('Imagen demasiado grande.'); chunks.push(Buffer.from(chunk)); }
      const bytes = Buffer.concat(chunks);
      if (bytes.length !== data.size || imageMime(bytes) !== data.contentType) throw new MediaValidationError('El contenido no coincide con el MIME declarado.');
      const target = 'products/' + data.id + '.' + extension(data.contentType);
      // Copy only the object version that was inspected; a reused PUT URL cannot replace it.
      if (!object.ETag) throw new MediaValidationError('No se pudo confirmar la versión cargada.');
      await client.send(new CopyObjectCommand({ Bucket: config.S3_BUCKET, Key: target, CopySource: encodeURIComponent(config.S3_BUCKET + '/' + key), CopySourceIfMatch: object.ETag,
        MetadataDirective: 'REPLACE', ContentType: data.contentType, CacheControl: 'public,max-age=31536000,immutable' }));
      const confirmed = await client.send(new HeadObjectCommand({ Bucket: config.S3_BUCKET, Key: target }));
      if (confirmed.ContentLength !== data.size) throw new MediaValidationError('No se pudo confirmar la imagen publicada.');
      await client.send(new DeleteObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
      return publicUrl(target);
    },
    async putVerified(bytes, key) {
      if (!bytes.length || bytes.length > maxBytes || !/^products\/migrated-[a-f0-9]{64}\.(png|jpg|webp)$/.test(key)) throw new MediaValidationError('Imagen de migración inválida.');
      const contentType = imageMime(bytes);
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      await client.send(new PutObjectCommand({ Bucket: config.S3_BUCKET, Key: key, Body: bytes, ContentType: contentType, ContentLength: bytes.length,
        CacheControl: 'public,max-age=31536000,immutable', Metadata: { sha256 } }));
      const head = await client.send(new HeadObjectCommand({ Bucket: config.S3_BUCKET, Key: key }));
      if (head.ContentLength !== bytes.length || head.Metadata?.sha256 !== sha256) throw new MediaValidationError('No se pudo confirmar la subida.');
      return publicUrl(key);
    },
    close() { client.destroy(); },
  };
}
