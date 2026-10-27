import { readFile, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { databaseUrl } from '../database.ts';
import { loadLocalDevelopment } from '../localDevelopment.ts';

// Read-only. Remote connections must be supplied explicitly by the operator.
await loadLocalDevelopment();
const db=new PrismaClient({datasources:{db:{url:databaseUrl(process.env)}}});
let stage='connection';
try{
 const result=await db.$transaction(async tx=>{
  await tx.$executeRaw`SET TRANSACTION READ ONLY`;
  stage='migration-history';
  const migrations=await tx.$queryRaw<{migration_name:string;checksum:string;finished_at:Date|null;rolled_back_at:Date|null}[]>`SELECT migration_name,checksum,finished_at,rolled_back_at FROM _prisma_migrations`;
  const directories=(await readdir('prisma/migrations',{withFileTypes:true})).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort();
  const pending:string[]=[],checksumMismatch:string[]=[];
  stage='checksums';
  for(const name of directories){const applied=migrations.find(row=>row.migration_name===name&&row.finished_at&&!row.rolled_back_at);if(!applied){pending.push(name);continue;}const source=await readFile('prisma/migrations/'+name+'/migration.sql','utf8');const lf=source.replace(/\r\n/g,'\n');if(![source,lf,lf.replace(/\n/g,'\r\n')].some(value=>createHash('sha256').update(value).digest('hex')===applied.checksum))checksumMismatch.push(name);}
  const failed=migrations.filter(row=>!row.finished_at&&!row.rolled_back_at).map(row=>row.migration_name);
  stage='orders';
  const [{orphans}]=await tx.$queryRaw<{orphans:bigint}[]>`SELECT count(*) AS orphans FROM "OrderItem" i LEFT JOIN "Product" p ON p.id=i."productId" WHERE p.id IS NULL`;
  const counts={ordersWithoutProduct:Number(orphans),modelsWithoutProduct:0,skusWithoutModel:0,movementsWithoutSku:0,duplicateVariants:0};
  const [{present}]=await tx.$queryRaw<{present:boolean}[]>`SELECT to_regclass('public."ProductSku"') IS NOT NULL AS present`;
  stage='inventory';
  if(present){
   const [row]=await tx.$queryRaw<{models:bigint;skus:bigint;movements:bigint}[]>`SELECT
    (SELECT count(*) FROM "ProductModel" m LEFT JOIN "Product" p ON p.id=m."productId" WHERE p.id IS NULL) AS models,
    (SELECT count(*) FROM "ProductSku" s LEFT JOIN "ProductModel" m ON m.id=s."modelId" WHERE m.id IS NULL) AS skus,
    (SELECT count(*) FROM "InventoryMovement" i LEFT JOIN "ProductSku" s ON s.id=i."skuId" WHERE s.id IS NULL) AS movements`;
   counts.modelsWithoutProduct=Number(row.models);counts.skusWithoutModel=Number(row.skus);counts.movementsWithoutSku=Number(row.movements);
   const [{color}]=await tx.$queryRaw<{color:boolean}[]>`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name='ProductSku' AND column_name='color') AS color`;
   const duplicates=color?await tx.$queryRaw<{count:bigint}[]>`SELECT count(*) FROM (SELECT "modelId",size,lower(btrim(color)) FROM "ProductSku" GROUP BY "modelId",size,lower(btrim(color)) HAVING count(*)>1) d`:await tx.$queryRaw<{count:bigint}[]>`SELECT count(*) FROM (SELECT "modelId",size FROM "ProductSku" GROUP BY "modelId",size HAVING count(*)>1) d`;
   counts.duplicateVariants=Number(duplicates[0].count);
  }
  return {readOnly:true,pending,failed,checksumMismatch,integrity:counts};
 },{timeout:15000});
 console.log(JSON.stringify(result));if(result.pending.length||result.failed.length||result.checksumMismatch.length||Object.values(result.integrity).some(Boolean))process.exitCode=1;
}catch(error:unknown){const code=error&&typeof error==='object'&&'code' in error&&typeof error.code==='string'&&/^P\d{4}$/.test(error.code)?error.code:'CATALOG_CHECK_FAILED';console.error(JSON.stringify({code,stage,message:'Revisa permisos, conexión y esquema en el entorno privado.'}));process.exitCode=1;}finally{await db.$disconnect();}
