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

async function photoBrowser(scenario,work){
 const server=await createTestViteServer(),original={document:globalThis.document,createImageBitmap:globalThis.createImageBitmap,Image:globalThis.Image,window:globalThis.window,fetch:globalThis.fetch};
 const calls=[],images=[];let policies=0,completed=0,decoded=0;
 const canvas={width:0,height:0,getContext:()=>({drawImage:()=>{}}),toBlob:(callback,type)=>callback(new Blob(['mock encoded image '+canvas.width],{type}))};
 globalThis.document={createElement:()=>canvas};globalThis.createImageBitmap=async()=>{decoded++;if(scenario.decodeError)throw Error('bad image');return {width:2400,height:1600,close:()=>{}};};
 globalThis.window=Object.assign(new EventTarget(),{setTimeout,clearTimeout});
 globalThis.Image=class{set src(value){images.push(value);queueMicrotask(()=>{if(scenario.publicError)this.onerror?.();else this.onload?.();});}};
 globalThis.fetch=async(url,init={})=>{const path=String(url);calls.push({path,method:init.method??'GET',credentials:init.credentials});const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
  if(path.endsWith('/media/config'))return response(scenario.authError?{message:'Inicia sesión'}:{enabled:!scenario.disabled,maxBytes:1048576},scenario.authError?403:200);
  if(path.endsWith('/media/upload')){policies++;return response(scenario.dedupe?{publicUrl:'https://images.test.invalid/dedupe-'+policies+'.webp'}:{url:'https://objects.test.invalid/pending-'+policies,method:'PUT',headers:{'Content-Type':'image/webp'},ticket:'ticket-'+policies});}
  if(path.startsWith('https://objects.test.invalid/'))return new Response(null,{status:scenario.putError?403:200});
  if(path.endsWith('/media/complete')){completed++;return response({publicUrl:'https://images.test.invalid/'+(completed===1?'thumb':'full')+'.webp'});}
  throw Error('Unexpected mocked request');
 };
 try{const media=await server.ssrLoadModule('/src/features/admin-products/services/mediaService.ts');await work(media,{calls,images,decoded:()=>decoded});}finally{Object.assign(globalThis,original);await server.close();}
}
test('photo upload verifies both objects, uses signed PUT without cookies and keeps the thumbnail',async()=>photoBrowser({},async(media,state)=>{
 const url=await media.uploadProductImage(new File(['valid input'],'photo.png',{type:'image/png'}));assert.equal(url,'https://images.test.invalid/full.webp');assert.equal(media.thumbnailForImage(url),'https://images.test.invalid/thumb.webp');assert.equal(state.calls.filter(c=>c.path.endsWith('/media/config')).length,1);assert.equal(state.images.length,2);assert.ok(state.calls.filter(c=>c.method==='PUT').every(c=>c.credentials==='omit'));assert.equal(media.imagePreview(url,{[url]:'https://images.test.invalid/thumb.webp'}),'https://images.test.invalid/thumb.webp');
}));
test('disabled object storage fails before compression, without generating inline references',async()=>photoBrowser({disabled:true},async(media,state)=>{
 await assert.rejects(()=>media.uploadProductImage(new File(['valid'],'photo.jpg',{type:'image/jpeg'})),/no están habilitadas/);assert.equal(state.decoded(),0);assert.equal(state.calls.length,1);
}));
test('invalid originals and undecodable images are rejected without uploading',async()=>{
 await photoBrowser({},async(media,state)=>{await assert.rejects(()=>media.uploadProductImage(new File(['bad'],'file.txt',{type:'text/plain'})),/PNG/);assert.equal(state.calls.length,0);});
 await photoBrowser({decodeError:true},async(media,state)=>{await assert.rejects(()=>media.uploadProductImage(new File(['broken'],'photo.png',{type:'image/png'})),/decodificar/);assert.equal(state.calls.some(c=>c.method==='PUT'),false);});
});
test('storage and public-read failures never return a valid full-image reference',async()=>{
 await photoBrowser({putError:true},async(media)=>{await assert.rejects(()=>media.uploadProductImage(new File(['valid'],'photo.png',{type:'image/png'})),/rechazó/);assert.equal(media.thumbnailForImage('https://images.test.invalid/full.webp'),undefined);});
 await photoBrowser({dedupe:true,publicError:true},async(media,state)=>{await assert.rejects(()=>media.uploadProductImage(new File(['valid'],'photo.png',{type:'image/png'})),/no puede verse/);assert.equal(state.images.length,1);assert.equal(state.calls.some(c=>c.method==='PUT'),false);});
 await photoBrowser({authError:true},async(media)=>{await assert.rejects(()=>media.uploadProductImage(new File(['valid'],'photo.png',{type:'image/png'})),/HTTP 403/);});
});
test('deduplicated images also verify public visibility before success',async()=>photoBrowser({dedupe:true},async(media,state)=>{
 const url=await media.uploadProductImage(new File(['valid'],'photo.png',{type:'image/png'}));assert.equal(url,'https://images.test.invalid/dedupe-2.webp');assert.equal(state.images.length,2);assert.equal(state.calls.some(c=>c.method==='PUT'),false);
}));
