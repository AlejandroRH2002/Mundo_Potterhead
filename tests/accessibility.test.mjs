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
