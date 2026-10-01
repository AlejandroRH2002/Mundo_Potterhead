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
    assert.match(await storage.complete(valid.ticket), /^https:\/\/images.test.invalid\/products\/[a-f0-9-]+\.png$/); assert.equal(copied,1); assert.equal(deleted,1);
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
