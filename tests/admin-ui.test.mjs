import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
test('admin views use responsive cards/tables without fixed pixel container widths', () => {
 for (const file of ['src/features/admin-products/pages/AdminDashboard.tsx','src/features/admin-users/pages/AdminUsers.tsx','src/features/admin-products/components/ProductEditor.tsx']) {
 const source=readFileSync(file,'utf8');assert.match(source,/admin-page/);assert.doesNotMatch(source,/(?:min-w|w|max-w)-\[\d+px\]|width:\s*['"]?\d+px/);
 }
 const css=readFileSync('src/index.css','utf8');assert.match(css,/@media \(max-width: 767px\)/);assert.match(css,/min-height: 2.75rem/);assert.match(css,/table-layout: fixed/);assert.match(css,/overflow-wrap: anywhere/);
});
