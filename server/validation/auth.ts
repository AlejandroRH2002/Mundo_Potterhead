import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
}).strict();
export const registerSchema = loginSchema.extend({
  name: z.string().trim().min(1).max(150),
  password: z.string().min(12).max(256),
}).strict();
export const profileSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().email().max(254),
}).strict();
