import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('admin views use responsive cards/tables without fixed pixel container widths', () => {
 for (const file of ['src/features/admin-users/pages/AdminUsers.tsx','src/features/admin-products/components/ProductEditor.tsx']) {
 const source=readFileSync(file,'utf8');assert.match(source,/admin-page/);assert.doesNotMatch(source,/(?:min-w|w|max-w)-\[\d+px\]|width:\s*['"]?\d+px/);
 }
 const css=readFileSync('src/index.css','utf8');assert.match(css,/@media \(max-width: 767px\)/);assert.match(css,/min-height: 2.75rem/);assert.match(css,/table-layout: fixed/);assert.match(css,/overflow-wrap: anywhere/);
});

import { generatePassword } from '../src/features/admin-users/services/generatePassword.ts';
test('initial passwords contain 24 random characters and every required group', () => {
 const passwords = new Set();
 for(let index=0;index<100;index++) { const password=generatePassword();assert.equal(password.length,24);for(const pattern of [/[A-Z]/,/[a-z]/,/[2-9]/,/[!@#$%*\-_+?]/])assert.match(password,pattern);assert.doesNotMatch(password,/[01IOl]/);passwords.add(password); }
 assert.equal(passwords.size,100);
});
test('initial password stays ephemeral and is cleared on close or successful creation',()=>{
 const source=readFileSync('src/features/admin-users/hooks/useAdminUsers.ts','utf8');assert.match(source,/closeForm.*setDraft\(blank\)/);assert.match(source,/await userService.create\(draft\); setDraft\(blank\); setFormOpen\(false\)/);
 const field=readFileSync('src/features/admin-users/components/InitialPassword.tsx','utf8');assert.match(field,/aria-live="polite"/);assert.match(field,/navigator.clipboard.writeText/);assert.doesNotMatch(source+field,/localStorage|sessionStorage|console\.|URLSearchParams/);
});

import { createImagePreview, releaseImagePreview } from '../src/features/admin-products/services/imagePreview.ts';
test('PNG/JPG file previews use local blob URLs and release them when replaced or unmounted', () => {
 for(const type of ['image/png','image/jpeg']) {const url=createImagePreview(new File(['preview'],'selected',{type}));assert.match(url,/^blob:/);releaseImagePreview(url);}
 assert.throws(()=>createImagePreview(new File(['x'],'invalid',{type:'text/plain'})));
 const hook=readFileSync('src/features/admin-products/hooks/useProductEditor.ts','utf8');assert.match(hook,/replacePreview\(createImagePreview\(files\[0\]\)\)/);assert.match(hook,/releaseImagePreview\(previewResource.current\)/);
 const view=readFileSync('src/features/admin-products/components/ProductEditor.tsx','utf8');assert.match(view,/src={editor.preview/);
 assert.match(view,/type="file" multiple/);
 assert.match(hook,/for \(const file of files\)/);
 assert.match(hook,/images: all\.slice\(1\)/);
});

import { normalizePriceInput } from '../src/features/admin-products/services/priceInput.ts';
test('price entry can stay empty, removes leading zeros and retains decimals',()=>{
 for(const [input,output] of [['',''],['0','0'],['0780','780'],['00780','780'],['780','780'],['0.80','0.80'],['780.50','780.50']]) assert.equal(normalizePriceInput(input),output);
 const hook=readFileSync('src/features/admin-products/hooks/useProductEditor.ts','utf8');assert.match(hook,/\[priceInput, setPriceInput\] = useState\(''\)/);assert.match(hook,/price: Number\(priceInput\)/);assert.match(hook,/setPriceInput\(String\(product.price\)\)/);
 const view=readFileSync('src/features/admin-products/components/ProductEditor.tsx','utf8');assert.match(view,/value={editor.priceInput}/);
});

import {allowedImageSource,imageOrigins} from '../shared/imageSource.ts';
test('image sources require exact approved origins and reconstruct safe URL components',()=>{
 const policy={origin:'https://shop.test.invalid',allowedOrigins:['https://images.test.invalid']};
 for(const source of ['/images/product-placeholder.svg','/brand/logo.svg','/media/products/hash.webp','/api/products/id/image','https://shop.test.invalid/media/products/a.webp','https://images.test.invalid/products/a.webp'])assert.equal(allowedImageSource(source,policy),source);
 assert.equal(allowedImageSource('/images/azul%20claro.webp',policy),'/images/azul%20claro.webp');
 assert.equal(allowedImageSource('https://images.test.invalid/a.webp?w=400&q=80',policy),'https://images.test.invalid/a.webp?w=400&q=80');
 for(const source of [null,undefined,{},'', ' javascript:alert(1)','javascript:alert(1)','data:text/html,<script>alert(1)</script>','data:image/svg+xml,<svg/>','data:image/png;base64,YQ==','blob:https://shop.test.invalid/forged','file:///tmp/image.png','http://images.test.invalid/a.webp','//evil.test/a.webp','/\\evil.test/a.webp','/%5cevil.test/x','/%255cevil.test/x','/%2f%2fevil.test/x','https://images.test.invalid.evil.test/a','https://images.test.invalid@evil.test/a','https://user:pass@images.test.invalid/a','https://images.test.invalid:8443/a','https://images.test.invalid/a#javascript:alert(1)','https://images.test.invalid/a%0A.jpg','/images/%2500.png','/images/%253csvg%253e','/images/%22onerror=%22x','/images/<svg>','/images/\u0000a.png','/images/%zz.png'])assert.equal(allowedImageSource(source,policy),undefined,String(source));
 assert.deepEqual(imageOrigins('https://images.test.invalid,https://cdn.test.invalid'),['https://images.test.invalid','https://cdn.test.invalid']);for(const value of ['http://images.test.invalid','https://images.test.invalid/path','https://user:pass@images.test.invalid','*'])assert.throws(()=>imageOrigins(value));
});
test('only application-owned blob previews survive the image boundary, replacement and release revoke them',async()=>{
 const {createOwnedImagePreview,checkedImageSource,releaseImagePreview}=await import('../src/shared/lib/imageSource.ts');const oldRevoke=URL.revokeObjectURL;const revoked=[];URL.revokeObjectURL=url=>{revoked.push(url);oldRevoke.call(URL,url);};
 try{const first=createOwnedImagePreview(new File(['png'],'first.png',{type:'image/png'}));const second=createOwnedImagePreview(new File(['jpeg'],'second.jpg',{type:'image/jpeg'}));assert.equal(checkedImageSource(first),first);assert.equal(checkedImageSource('blob:https://evil.test/fake'),undefined);releaseImagePreview(first);assert.equal(checkedImageSource(first),undefined);assert.equal(checkedImageSource(second),second);releaseImagePreview(second);releaseImagePreview(second);assert.deepEqual(revoked,[first,second]);assert.throws(()=>createOwnedImagePreview(new File(['html'],'bad.svg',{type:'image/svg+xml'})));}finally{URL.revokeObjectURL=oldRevoke;}
});
