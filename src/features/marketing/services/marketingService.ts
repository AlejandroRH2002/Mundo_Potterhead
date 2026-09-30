import { createLocalStore } from '@/shared/lib/localStore';
import type { Product } from '@/types/product';
interface Subscription { email: string; subscribedAt: string }
const valid = (value: unknown): value is Subscription[] => Array.isArray(value) && value.every((item: unknown) => {
  if (!item || typeof item !== 'object') return false;
  return 'email' in item && typeof item.email === 'string' && 'subscribedAt' in item && typeof item.subscribedAt === 'string';
});
const store = createLocalStore<Subscription[]>('mp.subscriptions.v1', [], valid);
export const marketingService = {
  subscribe: (email: string, consent: boolean) => {
    const normalized = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) || normalized.length > 254) throw new Error('Introduce un correo electrónico válido.');
    if (!consent) throw new Error('Acepta recibir novedades para suscribirte.');
    if (store.getSnapshot().some(item => item.email === normalized)) return 'Este correo ya está suscrito en este dispositivo.';
    store.set([...store.getSnapshot(), { email: normalized, subscribedAt: new Date().toISOString() }]);
    return 'Preferencia guardada. Esta suscripción es una simulación; no se enviarán correos.';
  },
  discount: (products: Product[]) => Math.max(0, ...products.filter(p => p.isOnSale && p.originalPrice && p.originalPrice > p.price).map(p => Math.floor((1 - p.price / (p.originalPrice ?? p.price)) * 100))),
};
