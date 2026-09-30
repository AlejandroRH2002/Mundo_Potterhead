import { z } from 'zod';
export const imageTypes = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const uploadInputSchema = z.object({
  contentType: z.enum(imageTypes), size: z.number().int().min(1).max(10 * 1024 * 1024),
}).strict();
export const uploadPolicySchema = z.object({
  url: z.string().url(), fields: z.record(z.string()), publicUrl: z.string().url(),
});
export const mediaConfigSchema = z.object({ enabled: z.boolean(), maxBytes: z.number().int().positive() });
export type UploadInput = z.infer<typeof uploadInputSchema>;
export type UploadPolicy = z.infer<typeof uploadPolicySchema>;
