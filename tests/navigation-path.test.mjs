import {test} from 'node:test';
import assert from 'node:assert/strict';
import {safeInternalPath} from '../src/shared/lib/safeInternalPath.ts';
test('internal paths reject external, encoded separators and controls including unsafe fallbacks',()=>{
 for(const value of ['/\\evil.com','//evil.com','/%5Cevil.com','/%5cevil.com','\\\\evil.com','javascript:alert(1)','https://evil.com','',null,'/%255cevil.com','/%252f%252fevil.com','/%2f%2fevil.com','/%0aevil','/x\r\ny','/data:text/plain,x'])assert.equal(safeInternalPath(value), '/',String(value));
 for(const value of ['/','/product/1','/catalogo?q=su%C3%A9ter&page=1#lista','/admin?tab=users'])assert.equal(safeInternalPath(value),value);
 assert.equal(safeInternalPath(null,'/login'),'/login');assert.equal(safeInternalPath(null,'//bad'),'/' );
});

test('a single literal backslash and real control characters are rejected',()=>{assert.equal(safeInternalPath('/'+String.fromCharCode(92)+'evil.com'),'/');assert.equal(safeInternalPath('/x'+String.fromCharCode(10)+'y'),'/');});
