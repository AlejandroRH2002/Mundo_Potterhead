import { z } from 'zod';

import { categories, universes, belongsToCategory } from './catalogTaxonomy.ts';
export { categories, universes } from './catalogTaxonomy.ts';
export function validImage(value: string): boolean {
  return /^\/(?!\/)[^\s\\]+$/.test(value) || /^https:\/\/[^\s]+$/.test(value) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}
export const productPlaceholder = '/images/product-placeholder.svg';
const money = z.number().finite().min(0.01).max(1000000).transform(value => Math.round(value * 100) / 100);
export const productDraftSchema = z.object({
  name: z.string().trim().min(1).max(150),
  description: z.string().trim().min(1).max(5000),
  price: money,
  originalPrice: money.optional(),
  isOnSale: z.boolean().optional(),
  image: z.preprocess(value => value == null || (typeof value === 'string' && !value.trim()) ? productPlaceholder : value, z.string().trim().max(2_800_000).refine(validImage, 'Imagen no válida.')),
  images: z.array(z.string().trim().max(2048).refine(value => validImage(value) && !value.startsWith('data:'), 'Usa una imagen alojada, no Base64.')).max(7, 'Puedes añadir hasta 8 imágenes contando la principal.').optional(),
  category: z.enum(categories),
  subcategory: z.string().max(80).nullable().optional(),
  universe: z.enum(universes),
}).strip().superRefine((draft, context) => {
  if (draft.subcategory != null && !belongsToCategory(draft.category, draft.subcategory))
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['subcategory'], message: 'La subcategoría no pertenece a la categoría seleccionada.' });
  if (draft.originalPrice !== undefined && draft.originalPrice <= draft.price)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['originalPrice'], message: 'El precio anterior debe superar el precio actual.' });
  if (draft.isOnSale && draft.originalPrice === undefined)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ['originalPrice'], message: 'Indica el precio anterior de la oferta.' });
});
