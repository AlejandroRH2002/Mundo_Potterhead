import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestViteServer } from './fixtures/viteServer.mjs';
import { createApi } from '../server/http/app.ts';
import { createAuth } from './fixtures/memoryAuth.ts';
import { createProductRepository } from './fixtures/memoryProducts.ts';
import { randomBytes } from 'node:crypto';
test('catalog listing substitutes legacy inline data without changing the stored detail', async () => {
  const bytes=Buffer.alloc(24); bytes.set([137,80,78,71,13,10,26,10]); bytes.write('IHDR',12);
  const image='data:image/png;base64,'+bytes.toString('base64');
  const repository=createProductRepository([]); const product=repository.create({name:'Fixture',description:'Test',price:1,category:'accessories',universe:'harry-potter',image});
  const auth=await createAuth([{id:'a',name:'A',email:'a@test.invalid',password:randomBytes(32).toString('hex'),role:'admin'}]);
  const api=createApi({auth,products:repository,origin:'http://localhost:5173',logger:()=>{}}); await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));
  try { const response=await fetch('http://127.0.0.1:'+api.address().port+'/api/products'); const list=await response.json(); assert.equal(list.items[0].image,'/api/products/'+encodeURIComponent(product.id)+'/image'); assert.equal(repository.get(product.id).image,image); }
  finally { await new Promise(resolve=>api.close(resolve)); }
});
test('canvas compression caps dimensions, requests WebP at 0.8 and releases the bitmap', async () => {
  const server=await createTestViteServer();
  const originalDocument=globalThis.document, originalBitmap=globalThis.createImageBitmap;
  let closed=0; const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{}}),toBlob:(callback,type,quality)=>{assert.equal(type,'image/webp');assert.equal(quality,0.8);callback(new Blob(['encoded'],{type}));}};
  globalThis.document={createElement:()=>canvas}; globalThis.createImageBitmap=async()=>({width:2400,height:1600,close:()=>{closed++;}});
  try { const {compressImage}=await server.ssrLoadModule('/src/features/admin-products/services/compressImage.ts'); const output=await compressImage(new File(['input'],'original.jpg',{type:'image/jpeg'})); assert.equal(output.type,'image/webp'); assert.equal(canvas.width,1200); assert.equal(canvas.height,800); assert.equal(closed,1); }
  finally { globalThis.document=originalDocument;globalThis.createImageBitmap=originalBitmap;await server.close(); }
});
