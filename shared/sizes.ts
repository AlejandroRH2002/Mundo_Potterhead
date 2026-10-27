import { z } from 'zod';
export const oneSize = { slug: 'one', label: 'Única' };
const clothing = ['XS', 'S', 'M', 'L', 'XL', 'XXL'].map(label => ({ slug: label.toLowerCase(), label }));
const footwear = Array.from({ length: 17 }, (_, index) => { const cm = 22 + index / 2; return { slug: String(cm), label: `${cm} cm` }; });
export const sizeTaxonomy = {
  clothing: [...clothing, oneSize], footwear: [...footwear, oneSize],
  accessories: [oneSize], toys: [oneSize], bags: [oneSize],
};
export type SizeCategory = keyof typeof sizeTaxonomy;
export function validSize(category: string, size: string): boolean { return category in sizeTaxonomy && sizeTaxonomy[category as SizeCategory].some(entry => entry.slug === size); }
export const skuInputSchema = z.object({ size: z.string().default('one') }).strict();
export const sizedSkuSchema = z.object({ category: z.enum(['clothing','footwear','accessories','toys','bags']), size: z.string().default('one') }).strict().refine(value => validSize(value.category, value.size), 'La talla no pertenece a la categoría.');
export const sizeLabel = (size: string) => size === 'one' ? 'Única' : clothing.find(entry => entry.slug === size)?.label ?? `${size} cm`;
