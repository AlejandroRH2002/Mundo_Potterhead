import { PrismaClient } from '@prisma/client';
import { databaseUrl } from '../database.ts';
import { modelBackfillPlan } from '../catalog/modelBackfill.ts';
const args=process.argv.slice(2);
if(args.some(arg=>!['--dry-run','--apply'].includes(arg))||args.includes('--apply')&&args.includes('--dry-run'))throw new Error('Usa --dry-run (por defecto) o --apply.');
const apply=args.includes('--apply');
if(apply&&process.env.INVENTORY_MODE==='enforce')throw new Error('El backfill de imágenes requiere capture.');
const db=new PrismaClient({datasources:{db:{url:databaseUrl(process.env)}}});
let cursor:string|undefined,scanned=0,planned=0,missingSkus=0;
try { while(true){const rows=await db.product.findMany({take:100,orderBy:{id:'asc'},...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,imageUrl:true,images:true,models:{select:{id:true,name:true,image:true,skus:{select:{quantity:true}}}}}});if(!rows.length)break;
 for(const row of rows){scanned++;missingSkus+=row.models.filter(model=>!model.skus.length).length;planned+=modelBackfillPlan(row).length;if(apply)await db.$transaction(async tx=>{
   await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${row.id} FOR UPDATE`;
   const current=await tx.product.findUniqueOrThrow({where:{id:row.id},include:{models:{include:{skus:true}}}});
   for(const model of current.models)if(!model.skus.length){const sku=await tx.productSku.upsert({where:{id:model.id},update:{},create:{id:model.id,modelId:model.id,code:model.sku,size:'one',quantity:null}});model.skus.push(sku);}
   for(const item of modelBackfillPlan(current)){if(item.reuse)await tx.productModel.update({where:{id:item.id},data:{image:item.image}});else await tx.productModel.upsert({where:{id:item.id},update:{},create:{id:item.id,productId:row.id,sku:item.sku,name:item.name,image:item.image,skus:{create:{id:item.id,code:item.sku,size:'one',quantity:null}}}});}
 });}cursor=rows[rows.length-1].id;
 }console.log(JSON.stringify({mode:apply?'apply':'dry-run',products:scanned,plannedModels:planned,missingSkus}));
}catch{console.error('MODEL_BACKFILL_FAILED: revisa configuración y esquema en un entorno privado.');process.exitCode=1;}finally{await db.$disconnect();}
