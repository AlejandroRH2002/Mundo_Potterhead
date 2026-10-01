import { z } from 'zod';
export const imageTypes = ['image/png', 'image/jpeg', 'image/webp'] as const;
export const uploadInputSchema = z.object({ contentType: z.enum(imageTypes), size: z.number().int().min(12).max(10 * 1024 * 1024) }).strict();
export const uploadPolicySchema = z.object({ url: z.string().url(), method: z.literal('PUT'), headers: z.record(z.string()), ticket: z.string().max(2048) }).strict();
export const completeUploadSchema = z.object({ ticket: z.string().min(1).max(2048) }).strict();
export const completedUploadSchema = z.object({ publicUrl: z.string().url() }).strict();
export const mediaConfigSchema = z.object({ enabled: z.boolean(), maxBytes: z.number().int().positive() });
export type UploadInput = z.infer<typeof uploadInputSchema>;
export type UploadPolicy = z.infer<typeof uploadPolicySchema>;
