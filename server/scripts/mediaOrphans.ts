import { PrismaClient } from '@prisma/client';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { databaseUrl } from '../database.ts';
if(process.argv.slice(2).filter(arg=>arg!=='--').some(arg=>arg!=='--dry-run'))throw new Error('Solo se permite --dry-run. Este script nunca borra objetos.');
for(const name of ['S3_ENDPOINT','S3_BUCKET','S3_REGION','S3_PUBLIC_BASE_URL'])if(!process.env[name])throw new Error('Falta '+name);
const prefix=process.env.S3_PUBLIC_BASE_URL!.replace(/\/$/,'')+'/';
const db=new PrismaClient({datasources:{db:{url:databaseUrl(process.env)}}});
const s3=new S3Client({endpoint:process.env.S3_ENDPOINT,region:process.env.S3_REGION,forcePathStyle:process.env.S3_FORCE_PATH_STYLE==='true'});
const referenced=new Set<string>();
let cursor:string|undefined,token:string|undefined,objects=0,orphans=0,bytes=0;
const keep=(value:unknown)=>{if(typeof value==='string'&&value.startsWith(prefix))referenced.add(value.slice(prefix.length));};
try {
 while(true){const rows=await db.product.findMany({take:100,orderBy:{id:'asc'},...(cursor?{cursor:{id:cursor},skip:1}:{}),select:{id:true,imageUrl:true,images:true,imageThumbnails:true,models:{select:{image:true}}}});if(!rows.length)break;
  for(const row of rows){keep(row.imageUrl);row.images.forEach(keep);row.models.forEach(model=>keep(model.image));if(row.imageThumbnails&&typeof row.imageThumbnails==='object')Object.values(row.imageThumbnails).forEach(keep);}cursor=rows[rows.length-1].id;
 }
 do {const page=await s3.send(new ListObjectsV2Command({Bucket:process.env.S3_BUCKET,Prefix:'products/',ContinuationToken:token,MaxKeys:1000}));for(const object of page.Contents??[]){objects++;if(object.Key&&!referenced.has(object.Key)){orphans++;bytes+=object.Size??0;}}token=page.NextContinuationToken;}while(token);
 console.log(JSON.stringify({mode:'dry-run',objects,possibleOrphans:orphans,possibleOrphanBytes:bytes,deleted:0,notice:'Solo diagnóstico; revisar uploads en curso y referencias externas antes de cualquier limpieza futura.'}));
}catch{console.error('MEDIA_ORPHANS_FAILED: revisa permisos y configuración en un entorno privado.');process.exitCode=1;}finally{await db.$disconnect();s3.destroy();}
