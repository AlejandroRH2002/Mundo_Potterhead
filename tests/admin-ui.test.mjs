import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('admin views use responsive cards/tables without fixed pixel container widths', () => {
 for (const file of ['src/features/admin-products/pages/AdminDashboard.tsx','src/features/admin-users/pages/AdminUsers.tsx','src/features/admin-products/components/ProductEditor.tsx']) {
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

import { createImagePreview } from '../src/features/admin-products/services/imagePreview.ts';
test('PNG/JPG file previews use local blob URLs and release them when replaced or unmounted', () => {
 for(const type of ['image/png','image/jpeg']) {const url=createImagePreview(new File(['preview'],'selected',{type}));assert.match(url,/^blob:/);URL.revokeObjectURL(url);}
 assert.throws(()=>createImagePreview(new File(['x'],'invalid',{type:'text/plain'})));
 const hook=readFileSync('src/features/admin-products/hooks/useProductEditor.ts','utf8');assert.match(hook,/setPreview\(createImagePreview\(file\)\)/);assert.match(hook,/URL.revokeObjectURL\(preview\)/);
 const view=readFileSync('src/features/admin-products/components/ProductEditor.tsx','utf8');assert.match(view,/src={editor.preview/);
});
