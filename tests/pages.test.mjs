import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { proxyApi } from '../shared/pagesProxy.ts';
import { onRequest as media } from '../functions/media/[[path]].ts';
import { assertLocalSeed } from '../server/lib/localSeed.ts';
test('Pages proxy preserves method, body, CSRF origin and individual cookies without caching',async()=>{
 const headers=new Headers({'Content-Type':'application/json','Origin':'https://shop.pages.dev','X-Requested-With':'MundoPotterhead',Cookie:'__Host-mp_session=test'});
 const req=new Request('https://shop.pages.dev/api/auth/login?q=a',{method:'POST',headers,body:'{"fixture":true}'});
 const response=await proxyApi(req,{API_ORIGIN:'https://backend.onrender.com'},async(request,options)=>{assert.equal(request.url,'https://backend.onrender.com/api/auth/login?q=a');assert.equal(request.method,'POST');assert.equal(request.headers.get('origin'),'https://shop.pages.dev');assert.equal(request.headers.get('x-requested-with'),'MundoPotterhead');assert.equal(request.headers.get('cookie'),'__Host-mp_session=test');assert.equal(await request.text(),'{"fixture":true}');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'manual');const h=new Headers();h.append('Set-Cookie','__Host-mp_session=test; Secure; HttpOnly; Path=/');h.append('Set-Cookie','second=value; Expires=Wed, 01 Jan 2031 00:00:00 GMT; Path=/');return new Response('ok',{headers:h});});
 assert.equal(response.headers.getSetCookie().length,2);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(await response.text(),'ok');
});
test('proxy rejects outside API and invalid origins; health remains inside API namespace',async()=>{
 let calls=0;const send=async request=>{calls++;assert.equal(new URL(request.url).pathname,'/health/ready');return Response.json({status:'ok'});};
 assert.equal((await proxyApi(new Request('https://shop.pages.dev/admin'),{API_ORIGIN:'https://backend.onrender.com'},send)).status,404);
 for(const origin of [undefined,'http://backend.onrender.com','https://user:secret@backend.onrender.com','https://backend.onrender.com/api','https://shop.pages.dev'])assert.equal((await proxyApi(new Request('https://shop.pages.dev/api/products'),{API_ORIGIN:origin},send)).status,503);
 assert.equal((await proxyApi(new Request('https://shop.pages.dev/api/health/ready'),{API_ORIGIN:'https://backend.onrender.com'},send)).status,200);assert.equal(calls,1);
 const routes=JSON.parse(readFileSync('public/_routes.json','utf8'));assert.ok(routes.include.includes('/api/*'));assert.equal(readFileSync('public/_redirects','utf8').trim(),'/* /index.html 200');
});
test('R2 serving allows product images only and never pending uploads',async()=>{
 let calls=0;const env={PRODUCT_IMAGES:{get:async key=>{calls++;assert.equal(key,'products/test.webp');return {body:new ReadableStream({start(c){c.enqueue(new Uint8Array([1]));c.close();}}),httpEtag:'"fixture"',writeHttpMetadata:h=>h.set('Content-Type','image/webp')};}}};
 for(const path of ['/media/_pending/test.webp','/media/products/../private.webp'])assert.equal((await media({request:new Request('https://shop.pages.dev'+path),env})).status,404);
 assert.equal((await media({request:new Request('https://shop.pages.dev/media/products/test.webp'),env})).status,200);assert.equal(calls,1);
});
test('seed refuses production and remote URLs before opening a database',()=>{
 for(const env of [{NODE_ENV:'production',DATABASE_URL:'postgresql://localhost/dev'},{DATABASE_URL:'postgresql://remote.invalid/shop'},{}])assert.throws(()=>assertLocalSeed(env));
 for(const host of ['localhost','127.0.0.1','[::1]'])assert.doesNotThrow(()=>assertLocalSeed({DATABASE_URL:'postgresql://'+host+'/dev'}));
});

test('Workers getAll cookie path retains cookies containing Expires commas',async()=>{
 const upstream=new Response(null);Object.defineProperty(upstream.headers,'getAll',{value:()=>['first=1; Expires=Wed, 01 Jan 2031 00:00:00 GMT','second=2; Path=/']});
 const response=await proxyApi(new Request('https://shop.pages.dev/api/auth/session'),{API_ORIGIN:'https://backend.onrender.com'},async()=>upstream);assert.equal(response.headers.getSetCookie().length,2);assert.match(response.headers.getSetCookie()[0],/Expires=Wed,/);
});
