import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestViteServer } from './fixtures/viteServer.mjs';
import { createProductRepository } from './fixtures/memoryProducts.ts';
import { validateDraft } from '../src/features/catalog/services/productValidation.ts';

const stored = new Map();
globalThis.window = new EventTarget();
globalThis.localStorage = { getItem: key => stored.get(key) ?? null, setItem: (key, value) => { stored.set(key, value); }, removeItem: key => { stored.delete(key); } };
const server = await createTestViteServer();
after(() => server.close());
const load = path => server.ssrLoadModule('/src/' + path);
const { cartService, resolveCart, whatsappOrder } = await load('features/cart/services/cartService.ts');
const { marketingService } = await load('features/marketing/services/marketingService.ts');
const { createLocalStore } = await load('shared/lib/localStore.ts');
const draft = { name: 'Varita & magia', description: 'Edición de prueba', price: 0.1, image: '/images/product-placeholder.svg', category: 'accessories', universe: 'harry-potter' };

test('invalid prices, offers and image URLs are rejected', () => {
  for (const price of [NaN, Infinity, -1, 0, 0.001, 1000001]) assert.throws(() => validateDraft({ ...draft, price }));
  assert.throws(() => validateDraft({ ...draft, isOnSale: true }));
  assert.throws(() => validateDraft({ ...draft, image: 'javascript:alert(1)' }));
  assert.throws(() => validateDraft({ ...draft, originalPrice: 0.05 }));
});
test('cart quantities, price changes, deleted items and WhatsApp totals remain consistent', () => {
  const repository = createProductRepository([]);
  const first = repository.create(draft);
  const second = repository.create({ ...draft, name: 'Libro #2', price: 0.2 });
  cartService.add(first.id); cartService.add(first.id); cartService.add(second.id);
  cartService.setQuantity(first.id, 3);
  assert.throws(() => cartService.setQuantity(first.id, 0));
  assert.throws(() => cartService.setQuantity(first.id, 1.5));
  assert.throws(() => cartService.setQuantity(first.id, 100));
  let cart = resolveCart(cartService.getSnapshot(), repository.list());
  assert.equal(cart.total, 0.5);
  const url = new URL(whatsappOrder(cart.lines, '12025550123'));
  assert.equal(url.origin, 'https://wa.me');
  assert.match(url.searchParams.get('text'), /Varita & magia/);
  assert.match(url.searchParams.get('text'), /Cantidad: 3/);
  assert.match(url.searchParams.get('text'), /Total de productos: \$0\.50 MXN/);
  assert.throws(() => whatsappOrder([], '12025550123'));
  assert.throws(() => whatsappOrder(cart.lines, 'TU_NUMERO'));
  repository.update(first.id, { ...draft, price: 1.25 });
  cart = resolveCart(cartService.getSnapshot(), repository.list());
  assert.equal(cart.total, 3.95);
  repository.remove(first.id);
  assert.equal(resolveCart(cartService.getSnapshot(), repository.list()).missing.length, 1);
  cartService.clear();
  assert.equal(cartService.getSnapshot().length, 0);
});
test('marketing requires consent, deduplicates and derives the actual discount', () => {
  assert.throws(() => marketingService.subscribe('bad', true));
  assert.throws(() => marketingService.subscribe('cliente@example.com', false));
  marketingService.subscribe(' Cliente@Example.com ', true);
  assert.match(marketingService.subscribe('cliente@example.com', true), /ya está/);
  assert.equal(JSON.parse(localStorage.getItem('mp.subscriptions.v1')).length, 1);
  assert.equal(marketingService.discount([{ ...draft, id: 'sale', price: 75, originalPrice: 100, isOnSale: true }]), 25);
});
test('corrupt storage recovers; failed writes do not report a false success', () => {
  localStorage.setItem('test', '{broken');
  const store = createLocalStore('test', [], Array.isArray);
  assert.deepEqual(store.getSnapshot(), []);
  const write = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  try { assert.throws(() => store.set([1]), /Quota/); assert.deepEqual(store.getSnapshot(), []); }
  finally { localStorage.setItem = write; }
});
