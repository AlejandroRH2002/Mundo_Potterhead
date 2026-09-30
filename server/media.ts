import { randomUUID } from 'node:crypto';
import { S3Client } from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { z } from 'zod';
import { uploadInputSchema, type UploadInput, type UploadPolicy } from '../shared/mediaSchema.ts';

export interface MediaStorage { maxBytes: number; sign(input: UploadInput): Promise<UploadPolicy>; close(): void }
export function createMediaStorage(env: NodeJS.ProcessEnv): MediaStorage | undefined {
  if (env.MEDIA_STORAGE === undefined || env.MEDIA_STORAGE === 'inline') return undefined;
  if (env.MEDIA_STORAGE !== 's3') throw new Error('Invalid MEDIA_STORAGE.');
  const parsed = z.object({
    S3_BUCKET: z.string().min(3), S3_REGION: z.string().min(1),
    S3_PUBLIC_BASE_URL: z.string().url(), S3_ENDPOINT: z.string().url().optional(),
    S3_FORCE_PATH_STYLE: z.enum(['true', 'false']).default('false'),
  }).safeParse({ ...env, S3_ENDPOINT: env.S3_ENDPOINT || undefined });
  if (!parsed.success) throw new Error('Incomplete S3 configuration.');
  const config = parsed.data;
  for (const value of [config.S3_PUBLIC_BASE_URL, config.S3_ENDPOINT].filter((value): value is string => !!value)) {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('Storage endpoints must use HTTPS without credentials or query parameters.');
  }
  // Default AWS credential provider: IAM workload role preferred, private AWS_* env also supported.
  const client = new S3Client({ region: config.S3_REGION, endpoint: config.S3_ENDPOINT,
    forcePathStyle: config.S3_FORCE_PATH_STYLE === 'true', maxAttempts: 2 });
  return {
    maxBytes: 10 * 1024 * 1024,
    async sign(input) {
      const { contentType, size } = uploadInputSchema.parse(input);
      const extension = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[contentType];
      const key = `products/${randomUUID()}.${extension}`;
      const result = await createPresignedPost(client, { Bucket: config.S3_BUCKET, Key: key, Expires: 60,
        Fields: { 'Content-Type': contentType, 'Cache-Control': 'public,max-age=31536000,immutable', success_action_status: '204' },
        Conditions: [['content-length-range', size, size], ['eq', '$Content-Type', contentType],
          ['eq', '$Cache-Control', 'public,max-age=31536000,immutable'], ['eq', '$success_action_status', '204']],
      });
      return { ...result, publicUrl: config.S3_PUBLIC_BASE_URL.replace(/\/$/, '') + '/' + key };
    },
    close() { client.destroy(); },
  };
}
