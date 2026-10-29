import {quoteSubtotal} from '../../../../shared/money.ts';
import {shippingMessage,type ShippingEligibility} from '../../../../shared/promotions.ts';
import { sizeLabel } from '../../../../shared/sizes';
import { productImages } from '@/shared/lib/productMedia';
import { validImage } from '../../../../shared/productSchema';
import { createLocalStore } from '@/shared/lib/localStore';
import { toCents, money } from '@/shared/lib/money';
import type { Product } from '@/types/product';
export interface CartEntry { productId: string; quantity: number; selectedImage?: string; modelId?: string;skuId?:string }
export interface CartLine extends CartEntry { product: Product; subtotal: number; modelName?: string; sku?: string;size?:string;color?:string }
export const cartEntryKey = (entry: Pick<CartEntry, 'productId' | 'selectedImage' | 'modelId' | 'skuId'>) => JSON.stringify([entry.productId, entry.skuId ?? entry.modelId ?? entry.selectedImage ?? '']);
function validEntries(value: unknown): value is CartEntry[] {
  return Array.isArray(value) && value.length <= 100 && value.every(item => {
    if (!item || typeof item !== 'object') return false;
    const entry = item as Record<string, unknown>;
    return (entry.skuId===undefined || typeof entry.skuId==='string'&&entry.skuId.length<=100) && (entry.modelId === undefined || (typeof entry.modelId === 'string' && entry.modelId.length <= 100)) && typeof entry.productId === 'string' && typeof entry.quantity === 'number' && Number.isInteger(entry.quantity) && entry.quantity > 0 && entry.quantity <= 99 && (entry.selectedImage === undefined || (typeof entry.selectedImage === 'string' && entry.selectedImage.length <= 2048 && validImage(entry.selectedImage) && !entry.selectedImage.startsWith('data:')));
  }) && new Set(value.map(item => cartEntryKey(item as CartEntry))).size === value.length;
}
const store = createLocalStore<CartEntry[]>('mp.cart.v1', [], validEntries);
export const cartService = {
  getSnapshot: store.getSnapshot,
  subscribe: store.subscribe,
  add: (id: string, selectedImage?: string, modelId?: string) => {
    if (selectedImage && (selectedImage.length > 2048 || !validImage(selectedImage) || selectedImage.startsWith('data:'))) throw new Error('Selecciona una imagen válida del producto.');
    const matches = (item: CartEntry) => item.productId === id && (modelId ? (item.skuId??item.modelId) === modelId : !item.modelId && !item.skuId && item.selectedImage === selectedImage);
    const current = store.getSnapshot();
    const found = current.find(matches);
    if (found && found.quantity >= 99) throw new Error('Máximo 99 unidades por producto.');
    if (!found && current.length >= 100) throw new Error('Máximo 100 productos por pedido.');
    store.set(found ? current.map(item => matches(item) ? { ...item, quantity: item.quantity + 1 } : item) : [...current, { productId: id, quantity: 1, ...(modelId ? {skuId:modelId} : {}), ...(selectedImage ? { selectedImage } : {}) }]);
  },
  setQuantity: (id: string, quantity: number, selectedImage?: string, modelId?: string) => {
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error('La cantidad debe estar entre 1 y 99.');
    store.set(store.getSnapshot().map(item => item.productId === id && (modelId ? (item.skuId??item.modelId) === modelId : !item.modelId && !item.skuId && item.selectedImage === selectedImage) ? { ...item, quantity } : item));
  },
  remove: (id: string, selectedImage?: string, modelId?: string) => store.set(store.getSnapshot().filter(item => item.productId !== id || (modelId ? (item.skuId??item.modelId) !== modelId : !!item.modelId || !!item.skuId || item.selectedImage !== selectedImage))),
  clear: () => store.set([]),
};
export function resolveCart(entries: CartEntry[], products: Product[]) {
  const lines: CartLine[] = [];
  const missing: CartEntry[] = [];
  for (const entry of entries) {
    if(!Number.isInteger(entry.quantity)||entry.quantity<1||entry.quantity>99){missing.push(entry);continue;}
    const product = products.find(p => p.id === entry.productId);
    const models=product?.models?.filter(model=>model.active)??[];
    const chosen=entry.skuId??entry.modelId;
    const model=chosen?models.find(model=>model.skus?.some(sku=>sku.id===chosen)||model.id===chosen):models.length===1?models[0]:undefined;
    const skus=model?.skus?.filter(s=>s.active!==false)??(model?[{id:model.id,code:model.sku,size:'one',quantity:model.quantity,version:model.version}]:[]);
    const sku=chosen?skus.find(sku=>sku.id===chosen)??(skus.length===1?skus[0]:undefined):skus.length===1?skus[0]:undefined;
    const requested=sku?entries.filter(item=>item.productId===entry.productId&&((item.skuId??item.modelId)===sku.id||!(item.skuId??item.modelId)&&skus.length===1&&models.length===1)).reduce((sum,item)=>sum+item.quantity,0):0;
    const overStock=product?.inventoryMode==='enforce'&&(!sku||sku.quantity===null||sku.quantity<requested);
    if (product && !overStock && (product.models===undefined || model&&sku) && (!entry.selectedImage || [...productImages(product),model?.image,...(model?.images??[]),...(sku&&'images' in sku?sku.images??[]:[])].includes(entry.selectedImage))) lines.push({ ...entry, product, modelName:model?.name,sku:sku?.code,size:sku?.size,color:sku&&'color' in sku?sku.color:undefined, subtotal: toCents(product.price) * entry.quantity / 100 });
    else missing.push(entry);
  }
  return { lines, missing, total:quoteSubtotal(lines) };
}
export function whatsappOrder(lines: CartLine[], phone: string, origin?: string, shipping?:ShippingEligibility) {
  if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('Configura el número de WhatsApp con código de país, sin espacios ni signos.');
  if (!lines.length) throw new Error('Agrega productos antes de enviar el pedido.');
  const total = quoteSubtotal(lines);
  const message = [
    'Hola, Mundo Potterhead. Quisiera solicitar el siguiente pedido:',
    '',
    ...lines.map((line, index) => `${index + 1}. ${line.product.name} (ID: ${line.productId})${line.modelName ? ' · Modelo: ' + line.modelName + ' · Talla: '+sizeLabel(line.size??'one')+(line.color?' / Color: '+line.color:'')+' · SKU: ' + line.sku : ''}${origin ? '\n   Producto: ' + new URL('/product/' + encodeURIComponent(line.productId), origin).href : ''}${line.selectedImage ? '\n   Imagen elegida: ' + (origin ? new URL(line.selectedImage, origin).href : line.selectedImage) : ''}\n   Cantidad: ${line.quantity} · Precio unitario: ${money(line.product.price)}\n   Subtotal: ${money(toCents(line.product.price) * line.quantity / 100)}`),
    '',
    `Total de productos: ${money(total)} MXN`,
    ...(shipping&&shippingMessage(shipping)?['',shippingMessage(shipping),'']:[]),
    'Envío no incluido. Por favor confirmen disponibilidad, costo de entrega y forma de pago.',
    'Esta cotización no reserva existencias; disponibilidad sujeta a confirmación.',
    'Gracias.',
  ].join('\n');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
