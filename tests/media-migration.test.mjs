import { test } from 'node:test';
import assert from 'node:assert/strict';
import { migrateBase64 } from '../server/mediaMigration.ts';
const image = () => { const bytes=Buffer.alloc(24); bytes.set([137,80,78,71,13,10,26,10]); bytes.write('IHDR',12); return 'data:image/png;base64,' + bytes.toString('base64'); };
function fixture() {
  const rows = ['a','b','c'].map(id => ({id, imageUrl:image()}));
  const db = { product: {
    findMany: async ({where,take}) => rows.filter(row => row.imageUrl.startsWith('data:image/') && (!where.id || row.id > where.id.gt)).slice(0,take).map(row => ({...row})),
    updateMany: async ({where,data}) => { const row=rows.find(row => row.id===where.id && row.imageUrl===where.imageUrl); if (!row) return {count:0}; row.imageUrl=data.imageUrl; return {count:1}; },
  } };
  return { rows, db };
}
test('dry-run batches without writes; applying is repeatable and preserves originals on failure', async () => {
  const f=fixture(); const original=f.rows.map(row=>row.imageUrl); let uploads=0;
  const keys=new Set(); const storage={putVerified:async (_bytes,key)=> { uploads++; keys.add(key); return 'https://cdn.test.invalid/'+key; }};
  const dry=await migrateBase64(f.db,storage,{apply:false,batchSize:1}); assert.equal(dry.scanned,3); assert.equal(dry.batches,3); assert.equal(uploads,0); assert.deepEqual(f.rows.map(row=>row.imageUrl),original);
  const failed=await migrateBase64(f.db,{putVerified:async()=>{throw Error('upload not confirmed');}},{apply:true,batchSize:2}); assert.equal(failed.failed,3); assert.deepEqual(f.rows.map(row=>row.imageUrl),original);
  const applied=await migrateBase64(f.db,storage,{apply:true,batchSize:2}); assert.equal(applied.migrated,3); assert.equal(keys.size,3);
  const again=await migrateBase64(f.db,storage,{apply:true,batchSize:2}); assert.equal(again.scanned,0); assert.equal(uploads,3);
});
test('concurrent catalog edits are retained; invalid images remain unchanged', async () => {
  const f=fixture(); f.rows[1].imageUrl='data:image/png;base64,invalid';
  const storage={putVerified:async (_bytes,key)=> { f.rows[0].imageUrl='https://cdn.test.invalid/new.png'; return 'https://cdn.test.invalid/'+key; }};
  const result=await migrateBase64(f.db,storage,{apply:true,batchSize:3}); assert.equal(result.invalid,1); assert.equal(result.conflicts,1); assert.equal(f.rows[0].imageUrl,'https://cdn.test.invalid/new.png'); assert.equal(f.rows[1].imageUrl,'data:image/png;base64,invalid');
});
