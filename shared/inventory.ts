import { skuInputSchema } from './sizes.ts';
export { skuInputSchema } from './sizes.ts';
import { z } from 'zod';

export type InventoryMode = 'capture' | 'enforce';
export class InventoryError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const amount = z.number().int().min(0).max(1_000_000);
export const movementSchema = z.object({
  key: z.string().uuid(), type: z.enum(['COUNT', 'RECEIPT', 'SALE', 'ADJUSTMENT']),
  quantity: amount, reason: z.string().trim().min(3).max(300),
  expectedVersion: z.number().int().nonnegative().optional(),
}).strict().superRefine((value, context) => {
  if (['SALE', 'RECEIPT'].includes(value.type) && value.quantity === 0)
    context.addIssue({ code: 'custom', path: ['quantity'], message: 'Indica al menos una unidad.' });
  if (['COUNT', 'ADJUSTMENT'].includes(value.type) && value.expectedVersion === undefined)
    context.addIssue({ code: 'custom', path: ['expectedVersion'], message: 'Recarga el saldo antes del conteo.' });
});
export const createSkuSchema=skuInputSchema;
export type MovementInput = z.infer<typeof movementSchema>;
export const modelSchema = z.object({ name: z.string().trim().min(1).max(100), image: z.string().max(2048).optional(), active: z.boolean().default(true) }).strict();
export const inventoryQuerySchema = z.object({
  q: z.string().trim().max(150).default(''), productId: z.string().max(100).optional(),
  status: z.enum(['all', 'pending', 'empty', 'low', 'available']).default('all'),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
}).strict();
export type InventoryQuery = z.infer<typeof inventoryQuerySchema>;
export interface SellableSku { color?:string; images?:string[]; active?:boolean; id:string; code:string; size:string; quantity:number|null; version:number }
export interface SellableModel { images?:string[]; skus?:SellableSku[]; thumbnail?:string|null; id: string; sku: string; name: string; image: string | null; active: boolean; quantity: number | null; version: number }
export interface InventoryRow extends SellableModel { color?:string; modelId?:string; size?:string; productId: string; productName: string; archived: boolean }
export interface MovementResult { id: string; modelId: string; skuId?:string; type: string; quantity: number; before: number | null; after: number; delta: number; reason: string; actorId: string; createdAt: string }
export interface InventoryPage { lowStockThreshold?:number; items: InventoryRow[]; total: number; page: number; pageSize: number }
export interface MovementPage { items: MovementResult[]; total: number; page: number; pageSize: number }
export function nextQuantity(current: number | null, version: number, input: MovementInput): number {
  if (input.expectedVersion !== undefined && input.expectedVersion !== version) throw new InventoryError(409, 'El saldo cambió. Recarga antes de confirmar.');
  if (current === null && input.type !== 'COUNT') throw new InventoryError(409, 'Primero captura el inventario inicial mediante un conteo.');
  if (current !== null && input.type === 'COUNT') throw new InventoryError(409, 'Ya existe un conteo inicial; usa un ajuste justificado.');
  const result = input.type === 'RECEIPT' ? current! + input.quantity : input.type === 'SALE' ? current! - input.quantity : input.quantity;
  if (!Number.isSafeInteger(result) || result < 0 || result > 1_000_000) throw new InventoryError(409, 'Existencias insuficientes o cantidad fuera de rango.');
  return result;
}
export const quoteSchema = z.object({ lines: z.array(z.object({ productId: z.string().min(1).max(100), modelId: z.string().max(100).optional(), skuId: z.string().max(100).optional(), quantity: z.number().int().min(1).max(99), selectedImage: z.string().max(2048).optional() }).strict()).min(1).max(100) }).strict();
