import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { S3Client } from '@aws-sdk/client-s3';
import { createMediaStorage, imageMime } from '../server/media.ts';
const env = { NODE_ENV: 'production', MEDIA_STORAGE: 's3', SESSION_SECRET: 'test-secret-at-least-thirty-two-chars', S3_ENDPOINT: 'https://objects.test.invalid', S3_REGION: 'auto', S3_BUCKET: 'test-bucket', S3_PUBLIC_BASE_URL: 'https://images.test.invalid' };
const png = () => { const bytes=Buffer.alloc(24); bytes.set([137,80,78,71,13,10,26,10]); bytes.write('IHDR',12); return bytes; };
test('production rejects inline and missing S3 configuration with field names only', () => {
  assert.throws(() => createMediaStorage({ NODE_ENV: 'production' }), /MEDIA_STORAGE=s3/);
  assert.throws(() => createMediaStorage({ ...env, MEDIA_STORAGE: 'inline' }), /MEDIA_STORAGE=s3/);
  for (const field of ['S3_ENDPOINT','S3_REGION','S3_BUCKET','S3_PUBLIC_BASE_URL','SESSION_SECRET']) assert.throws(() => createMediaStorage({ ...env, [field]: undefined }), new RegExp(field));
  assert.equal(createMediaStorage({ NODE_ENV: 'test', MEDIA_STORAGE: 'inline' }), undefined);
});
test('completion checks actual bytes and size before copying the inspected object', async () => {
  let bytes=png(), declared='image/png', copied=0, deleted=0, expectedLength=bytes.length;
  const client = new S3Client({ region:'auto', endpoint:env.S3_ENDPOINT, credentials:{ accessKeyId:'TEST', secretAccessKey:'TEST' } });
  client.send = async command => {
    if (command.constructor.name === 'GetObjectCommand') return { Body:Readable.from([bytes]), ContentLength:expectedLength, ContentType:declared, ETag:'verified-version' };
    if (command.constructor.name === 'CopyObjectCommand') { assert.equal(command.input.CopySourceIfMatch,'verified-version'); copied++; return {}; }
    if (command.constructor.name === 'HeadObjectCommand') return { ContentLength:24 };
    if (command.constructor.name === 'DeleteObjectCommand') { deleted++; return {}; }
    throw Error('Unexpected object operation');
  };
  const storage=createMediaStorage(env,client);
  try {
    const valid=await storage.sign({ contentType:'image/png',size:24 });
    assert.match(await storage.complete(valid.ticket), /^https:\/\/images.test.invalid\/products\/sha256-[a-f0-9]{64}\.png$/); assert.equal(copied,1); assert.equal(deleted,1);
    bytes=Buffer.alloc(24); await assert.rejects(storage.complete(valid.ticket), /contenido/); assert.equal(copied,1);
    expectedLength=25; await assert.rejects(storage.complete(valid.ticket), /Tamaño/); assert.equal(copied,1);
    await assert.rejects(storage.complete(valid.ticket + 'tampered'), /inválida/);
    const wrong=await storage.sign({ contentType:'image/jpeg',size:24 }); bytes=png(); declared='image/jpeg'; expectedLength=24;
    await assert.rejects(storage.complete(wrong.ticket), /MIME/); assert.equal(copied,1);
  } finally { storage.close(); }
});
test('binary signatures distinguish JPEG/WebP and reject MIME spoofing', () => {
  assert.equal(imageMime(png()),'image/png');
  const jpeg=Buffer.alloc(12); jpeg.set([255,216,255]); jpeg.set([255,217],10); assert.equal(imageMime(jpeg),'image/jpeg');
  const webp=Buffer.alloc(20); webp.write('RIFF'); webp.write('WEBP',8); webp.write('VP8 ',12); assert.equal(imageMime(webp),'image/webp');
  assert.throws(() => imageMime(Buffer.from('not an image')), /contenido/);
});

test('photo API requires administrator and CSRF headers; invalid or unavailable storage returns no image',async()=>{
 const {createApi}=await import('../server/http/app.ts'),{createAuth}=await import('./fixtures/memoryAuth.ts'),{createProductRepository}=await import('./fixtures/memoryProducts.ts');const {randomBytes}=await import('node:crypto');
 const password=randomBytes(32).toString('hex'),origin='http://localhost:5173';const auth=await createAuth([{id:'a',name:'Admin',email:'a@test.invalid',password,role:'admin'},{id:'u',name:'User',email:'u@test.invalid',password,role:'user'}]);const admin=await auth.authenticate('a@test.invalid',password),user=await auth.authenticate('u@test.invalid',password);let fail=false,signs=0;
 const media={maxBytes:1048576,sign:async()=>{if(fail)throw Error('test storage unavailable');signs++;return {publicUrl:'https://images.test.invalid/verified.webp'};},complete:async()=>{if(fail)throw Error('test storage unavailable');return 'https://images.test.invalid/verified.webp';},putVerified:async()=>'',close:()=>{}};
 const api=createApi({auth,products:createProductRepository([]),origin,media,logger:()=>{}});await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));const send=(path,token,method='GET',body,headers={})=>fetch('http://127.0.0.1:'+api.address().port+'/api/media/'+path,{method,headers:{Origin:origin,'X-Requested-With':'MundoPotterhead','Content-Type':'application/json',...(token?{Cookie:'mp_session='+token}:{}),...headers},body:body?JSON.stringify(body):undefined});
 try{for(const [path,method,body] of [['config','GET'],['upload','POST',{contentType:'image/png',size:24}],['complete','POST',{ticket:'test-ticket'}]]){assert.equal((await send(path,null,method,body)).status,401);assert.equal((await send(path,user.token,method,body)).status,403);}
 assert.equal((await (await send('config',admin.token)).json()).enabled,true);assert.equal((await send('upload',admin.token,'POST',{contentType:'text/html',size:24})).status,400);assert.equal(signs,0);assert.equal((await send('upload',admin.token,'POST',{contentType:'image/png',size:24},{'X-Requested-With':''})).status,403);assert.equal((await send('upload',admin.token,'POST',{contentType:'image/png',size:24})).status,200);fail=true;const failed=await send('upload',admin.token,'POST',{contentType:'image/png',size:24});assert.equal(failed.status,500);assert.equal('publicUrl'in await failed.json(),false);
 }finally{await new Promise(resolve=>api.close(resolve));}
});
