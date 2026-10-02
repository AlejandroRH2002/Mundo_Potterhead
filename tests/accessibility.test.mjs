import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(path, 'utf8');
test('navigation, cart and admin keep explicit names and visible keyboard focus', () => {
  assert.match(read('src/app/App.tsx'), /href="#main-content"/);
  assert.match(read('src/app/App.tsx'), /id="main-content" tabIndex={-1}/);
  assert.match(read('src/index.css'), /:focus-visible/);
  assert.match(read('src/features/cart/pages/Cart.tsx'), /aria-label={`Eliminar/);
  const editor = read('src/features/admin-products/components/ProductEditor.tsx');
  assert.equal((editor.match(/<label/g) ?? []).length, (editor.match(/<(?:input|select|textarea)\b/g) ?? []).length);
  assert.doesNotMatch(editor, /tabIndex={[1-9]/);
  assert.doesNotMatch(read('src/features/content/pages/Contact.tsx'), /<iframe/);
  assert.doesNotMatch(read('src/index.css'), /fonts.googleapis/);
});
function luminance(hex) {
  const rgb = hex.match(/../g).map(part => parseInt(part, 16) / 255).map(v => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
test('base text palette has at least 4.5:1 contrast (not a rendered-page audit)', () => {
  for (const [fg, bg] of [['ffffff','2a0001'], ['fcd34d','2a0001'], ['4b5563','ffffff'], ['450a0a','fcd34d']]) {
    const a = luminance(fg); const b = luminance(bg);
    assert.ok((Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05) >= 4.5);
  }
});

test('new theme text tokens meet AA contrast on their intended solid surfaces', () => {
 const css=read('src/index.css');const token=name=>{const match=css.match(new RegExp('--brand-'+name+': #([a-f0-9]{6})'));assert.ok(match,name);return match[1];};
 for(const [foreground,background] of [['cream','bg'],['gold','bg'],['muted','bg'],['cream','panel'],['gold','panel'],['ink','cream'],['ink-muted','cream'],['ink','gold']]) {
  const a=luminance(token(foreground)),b=luminance(token(background));assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05)>=4.5,foreground+'/'+background);
 }
});

test('typography is local with one critical preload; motion is lazy and reduced-motion aware', () => {
 const css=read('src/index.css'),html=read('index.html');assert.equal((html.match(/as="font"/g)??[]).length,1);assert.match(css,/font-display: swap/);assert.doesNotMatch(css,/url\(['"]?https?:/);
 assert.match(read('src/app/App.tsx'),/LazyMotion features={loadMotion} strict/);assert.match(read('src/app/App.tsx'),/reducedMotion="user"/);assert.match(read('src/shared/lib/motionFeatures.ts'),/domAnimation/);
 assert.doesNotMatch(read('src/shared/components/PageTransition.tsx'),/filter:|background:/);assert.match(css,/prefers-reduced-motion: reduce/);
});

test('hero has one real h1, responsive eager decorative art and modal cart keeps the legal notice', () => {
 const hero=read('src/features/catalog/components/StoreHero.tsx');assert.equal((hero.match(/<h1\b/g)??[]).length,1);assert.match(hero,/<picture/);assert.match(hero,/<source media=/);assert.match(hero,/alt="" width="1080" height="640" fetchPriority="high"/);assert.doesNotMatch(hero,/loading="lazy"/);
 const drawer=read('src/features/cart/components/CartDrawer.tsx');assert.match(drawer,/<dialog/);assert.match(drawer,/showModal/);assert.match(drawer,/onCancel/);assert.match(drawer,/<Cart drawer/);
 const cart=read('src/features/cart/pages/Cart.tsx');assert.ok(cart.indexOf('REVISAR CON ASESOR LEGAL')<cart.indexOf('cart.checkout()'));assert.match(cart,/Total estimado/);
});
