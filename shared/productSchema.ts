import { z } from 'zod';

export const categories = ['accessories', 'clothing', 'footwear', 'toys', 'bags'] as const;
export const universes = ['harry-potter', 'otros-universos'] as const;
export function validImage(value: string): boolean {
  return /^\/(?!\/)[^\s\\]+$/.test(value) || /^https:\/\/[^\s]+$/.test(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
const money = z.number().finite().min(0.01).max(1000000).transform(value => Math.round(value * 100) / 100);
export const productDraftSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  price: money,
  originalPrice: money.optional(),
  isOnSale: z.boolean().optional(),
  image: z.string().trim().max(2_800_000).refine(validImage, 'Imagen no válida.'),
  category: z.enum(categories),
  universe: z.enum(universes),
}).strip().superRefine((draft, context) => {
  if (draft.originalPrice !== undefined && draft.originalPrice <= draft.price)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['originalPrice'], message: 'El precio anterior debe superar el precio actual.' });
  if (draft.isOnSale && draft.originalPrice === undefined)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['originalPrice'], message: 'Indica el precio anterior de la oferta.' });
});
