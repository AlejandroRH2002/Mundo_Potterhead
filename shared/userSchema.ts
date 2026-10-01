import { z } from 'zod';
export const userRoleSchema = z.enum(['user', 'admin']);
export const createUserSchema = z.object({
  name: z.string().trim().min(1).max(150),
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(20).max(256),
  role: userRoleSchema,
}).strict();
export const changeUserSchema = z.object({ role: userRoleSchema.optional(), isActive: z.boolean().optional() }).strict()
  .refine(value => value.role !== undefined || value.isActive !== undefined, 'Indica un cambio.');
export const userPageSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(20) }).strict();
export const managedUserSchema = z.object({ id: z.string(), name: z.string().nullable(), email: z.string(), role: userRoleSchema, isActive: z.boolean() }).strict();
export const userListSchema = z.object({ users: z.array(managedUserSchema), total: z.number().int().nonnegative(), page: z.number().int().positive(), pageSize: z.number().int().positive() }).strict();
export type ManagedUser = z.infer<typeof managedUserSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type ChangeUser = z.infer<typeof changeUserSchema>;
export type UserPage = z.infer<typeof userPageSchema>;
export type UserList = z.infer<typeof userListSchema>;
