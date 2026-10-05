import { productImages } from '@/shared/lib/productMedia';
import { validImage } from '../../../../shared/productSchema';
import { createLocalStore } from '@/shared/lib/localStore';
import { toCents, money } from '@/shared/lib/money';
import type { Product } from '@/types/product';
export interface CartEntry { productId: string; quantity: number; selectedImage?: string }
export interface CartLine extends CartEntry { product: Product; subtotal: number }
export const cartEntryKey = (entry: Pick<CartEntry, 'productId' | 'selectedImage'>) => JSON.stringify([entry.productId, entry.selectedImage ?? '']);
function validEntries(value: unknown): value is CartEntry[] {
  return Array.isArray(value) && value.length <= 100 && value.every(item => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Record<string, unknown>;
    return typeof entry.productId === 'string' && typeof entry.quantity === 'number' && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 99 && (entry.selectedImage === undefined || (typeof entry.selectedImage === 'string' && entry.selectedImage.length <= 2048 && validImage(entry.selectedImage) && !entry.selectedImage.startsWith('data:')));
  }) && new Set(value.map(item => cartEntryKey(item as CartEntry))).size === value.length;
}
const store = createLocalStore<CartEntry[]>('mp.cart.v1', [], validEntries);
export const cartService = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  add: (id: string, selectedImage?: string) => {
    if (selectedImage && (selectedImage.length > 2048 || !validImage(selectedImage) || selectedImage.startsWith('data:'))) throw new Error('Selecciona una imagen válida del producto.');
    const matches = (item: CartEntry) => item.productId === id && item.selectedImage === selectedImage;
    const current = store.getSnapshot();
    const found = current.find(matches);
    if (found && found.quantity >= 99) throw new Error('Máximo 99 unidades por producto.');
    if (!found && current.length >= 100) throw new Error('Máximo 100 productos por pedido.');
    store.set(found ? current.map(item => matches(item) ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { productId: id, quantity: 1, ...(selectedImage ? { selectedImage } : {}) }]);
  },
  setQuantity: (id: string, quantity: number, selectedImage?: string) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('La cantidad debe estar entre 1 y 99.');
    store.set(store.getSnapshot().map(item => item.productId === id && item.selectedImage === selectedImage ? { ...item, quantity } : item));
  },
  remove: (id: string, selectedImage?: string) => store.set(store.getSnapshot().filter(item => item.productId !== id || item.selectedImage !== selectedImage)),
  clear: () => store.set([]),
};
export function resolveCart(entries: CartEntry[], products: Product[]) {
  const lines: CartLine[] = [];
  const missing: CartEntry[] = [];
  for (const entry of entries) {
    const product = products.find(p => p.id === entry.productId);
    if (product && (!entry.selectedImage || productImages(product).includes(entry.selectedImage))) lines.push({ ...entry, product, subtotal: toCents(product.price) * entry.quantity / 100 });
    else missing.push(entry);
  }
  return { lines, missing, total: lines.reduce((sum, line) => sum + toCents(line.subtotal), 0) / 100 };
}
export function whatsappOrder(lines: CartLine[], phone: string, origin?: string) {
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('Configura el número de WhatsApp con código de país, sin espacios ni signos.');
  if (!lines.length) throw new Error('Agrega productos antes de enviar el pedido.');
  const total = lines.reduce((sum, line) => sum + toCents(line.product.price) * line.quantity, 0) / 100;
  const message = [
    'Hola, Mundo Potterhead. Quisiera solicitar el siguiente pedido:',
    '',
    ...lines.map((line, index) => `${index + 1}. ${line.product.name} (ID: ${line.productId})${line.selectedImage ? '\n   Imagen elegida: ' + (origin ? new URL(line.selectedImage, origin).href : line.selectedImage) : ''}\n   Cantidad: ${line.quantity} · Precio unitario: ${money(line.product.price)}\n   Subtotal: ${money(toCents(line.product.price) * line.quantity / 100)}`),
    '',
    `Total de productos: ${money(total)} MXN`,
    'Envío no incluido. Por favor confirmen disponibilidad, costo de entrega y forma de pago.',
    'Gracias.',
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
