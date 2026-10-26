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

test('model cart groups one SKU across photos and WhatsApp includes model and product link',()=>{
 cartService.clear();const product={...draft,id:'model-fixture',models:[{id:'model-a',sku:'MP-a',name:'Modelo A',active:true,quantity:2,version:1,image:null}],inventoryMode:'enforce'};
 cartService.add(product.id,product.image,'model-a');cartService.add(product.id,'/images/other.webp','model-a');
 assert.equal(cartService.getSnapshot().length,1);assert.equal(cartService.getSnapshot()[0].quantity,2);
 const resolved=resolveCart(cartService.getSnapshot(),[product]);assert.equal(resolved.lines.length,1);
 const message=new URL(whatsappOrder(resolved.lines,'521234567890','https://shop.test.invalid')).searchParams.get('text');assert.match(message,/Modelo A/);assert.match(message,/MP-a/);assert.match(message,/https:\/\/shop.test.invalid\/product\/model-fixture/);assert.match(message,/no reserva/);
 cartService.setQuantity(product.id,3,product.image,'model-a');assert.equal(resolveCart(cartService.getSnapshot(),[product]).missing.length,1);
 cartService.remove(product.id,product.image,'model-a');assert.equal(cartService.getSnapshot().length,0);
});
test('legacy cart cannot guess a model when a product has several independently sold designs',()=>{
 const models=[{id:'a',name:'A',active:true,quantity:3},{id:'b',name:'B',active:true,quantity:2}];
 assert.equal(resolveCart([{productId:'legacy',quantity:1}],[{...draft,id:'legacy',models,inventoryMode:'enforce'}]).missing.length,1);
});

test('a removed last SKU never becomes a generic legacy cart line',()=>{
 const product={...draft,id:'retired',models:[],inventoryMode:'capture'};
 const result=resolveCart([{productId:'retired',skuId:'removed-sku',quantity:1}],[product]);assert.equal(result.lines.length,0);assert.equal(result.missing.length,1);
 assert.equal(resolveCart([{productId:'retired',quantity:1}],[product]).missing.length,1);
});
