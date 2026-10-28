import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import {z} from 'zod';
import {groupingRequestSchema,groupingCompatibility,type GroupingRequest,type GroupingReport} from '../../shared/productGrouping.ts';
import {gallerySchema} from '../../shared/catalogManagement.ts';
import {productPlaceholder} from '../../shared/productSchema.ts';
import {validSize} from '../../shared/sizes.ts';
import {InventoryError} from '../../shared/inventory.ts';
type ReadDb=Pick<Prisma.TransactionClient,'product'|'productModel'|'productSku'>;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value,(_key,item:unknown)=>item&&typeof item==='object'&&!Array.isArray(item)&&!(item instanceof Date)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item)).digest('hex');
const parse=(value:unknown)=>{const input=groupingRequestSchema.parse(value);input.sourceIds.sort();return input;};
const normalize=(value:string)=>value.normalize('NFKC').trim().toLocaleLowerCase('es');
const included={models:{orderBy:{id:'asc'},include:{skus:{orderBy:{id:'asc'}},_count:{select:{movements:true}}}},_count:{select:{orderItems:true,groupedSources:true}}} as const;
const tokenSchema=z.object({fingerprint:z.string(),state:z.string(),expires:z.number()}).strict();
export function createProductGrouping(db:PrismaClient,secret:string){
 const sign=(payload:string)=>createHmac('sha256',secret).update('product-grouping:'+payload).digest('base64url');
 async function inspect(reader:ReadDb,input:GroupingRequest){
  const ids=[input.targetId,...input.sourceIds];
  if(await reader.productModel.count({where:{productId:{in:ids}}})>200||await reader.productSku.count({where:{model:{productId:{in:ids}}}})>1000)throw new InventoryError(400,'Agrupa en lotes de hasta 200 diseños y 1000 opciones.');
  const rows=await reader.product.findMany({where:{id:{in:ids}},include:included,orderBy:{id:'asc'}}),target=rows.find(row=>row.id===input.targetId);
  if(!target||rows.length!==ids.length)throw new InventoryError(404,'No se encontró alguno de los productos seleccionados.');
  const report:GroupingReport={valid:false,target:{id:target.id,name:target.name,description:target.description??'',price:Number(target.price),status:input.publishTarget?'active':target.status},sources:[],designs:[],conflicts:[],warnings:[],orders:0,movements:0};
  const conflict=(message:string)=>report.conflicts.push(message),warn=(message:string)=>report.warnings.push(message);
  if(target.groupedIntoId)conflict('El destino ya pertenece a otra familia.');
  if(target.stock!==0||target.models.some(model=>(model.quantity??0)!==0))conflict('El destino tiene cantidades antiguas sin asignación validada a tallas. Revisa su inventario antes de agrupar.');
  const publishing=target.status==='active'||input.publishTarget;
  if(!publishing)warn('La familia seguirá como borrador. No necesita fotografías nuevas para agruparse; completar fotografías y opciones es obligatorio antes de publicar.');
  const names=new Set(target.models.map(model=>normalize(model.name))),modelCodes=new Set(target.models.map(model=>model.sku)),skuCodes=new Set(target.models.flatMap(model=>model.skus.map(sku=>sku.code)));
  const thumbnails:Record<string,string>={...(target.imageThumbnails as Record<string,string>)};
  for(const source of rows.filter(row=>row.id!==target.id)){
   report.sources.push({id:source.id,name:source.name,description:source.description??'',orders:source._count.orderItems});report.orders+=source._count.orderItems;
   if(source.groupedIntoId||source._count.groupedSources)conflict(source.name+': ya está agrupado o es una familia con productos vinculados.');
   for(const reason of groupingCompatibility({...target,price:Number(target.price),originalPrice:target.originalPrice===null?null:Number(target.originalPrice)},{...source,price:Number(source.price),originalPrice:source.originalPrice===null?null:Number(source.originalPrice)}))conflict(source.name+': '+reason);
   if(normalize(source.description??'')!==normalize(target.description??'')){warn(source.name+': la descripción pública pasará a ser la del destino; la original se conserva en la ficha antigua.');if(!input.acceptSharedDescription)conflict(source.name+': revisa medidas/materiales y confirma expresamente la descripción compartida.');}
   if(source.stock!==0||source.models.some(model=>(model.quantity??0)!==0))conflict(source.name+': tiene cantidades antiguas sin asignación validada a tallas. Registra y revisa el inventario antes de agrupar.');
   if(!source.models.length)conflict(source.name+': no tiene diseños registrados.');
   const general=[source.imageUrl,...source.images].filter((image):image is string=>!!image&&image!==productPlaceholder);
   if(source.models.length>1&&general.some(image=>!source.models.some(model=>model.image===image||model.images.includes(image)||model.skus.some(sku=>sku.images.includes(image)))))conflict(source.name+': asigna sus fotografías generales a cada diseño antes de agrupar.');
   for(const [image,thumbnail] of Object.entries(source.imageThumbnails as Record<string,string>))if(!thumbnails[image])thumbnails[image]=thumbnail;
   for(const model of source.models){
    const name=input.names[model.id]??(source.models.length===1?source.name:source.name+' · '+model.name).slice(0,100);
    if(names.has(normalize(name)))conflict('Nombre de diseño repetido: '+name);names.add(normalize(name));
    if(modelCodes.has(model.sku))conflict('Código de diseño repetido.');modelCodes.add(model.sku);
    const rawImages=[...new Set([model.image,...model.images,...(source.models.length===1?general:[])].filter((image):image is string=>!!image&&image!==productPlaceholder))];
    if(!gallerySchema.safeParse(rawImages).success)conflict(name+': fotografías incompatibles, inline o más de ocho. Deben alojarse y asignarse antes de agrupar.');
    const images=rawImages.filter(image=>gallerySchema.safeParse([image]).success).slice(0,8);
    if(publishing&&model.active&&!images.length)conflict(name+': falta fotografía; completa o desactiva el diseño antes de agrupar.');
    if(!model.skus.length)conflict(name+': no tiene opciones de talla/presentación.');
    for(const sku of model.skus){if(skuCodes.has(sku.code))conflict(name+': código de opción repetido.');skuCodes.add(sku.code);if(!validSize(target.category,sku.size))conflict(name+': talla incompatible con la categoría del destino.');if(!gallerySchema.safeParse(sku.images).success)conflict(name+': fotografías de una opción no válidas.');}
    report.movements+=model._count.movements;report.designs.push({id:model.id,sourceId:source.id,sourceName:source.name,beforeName:model.name,name,code:model.sku,active:model.active,images,movements:model._count.movements,options:model.skus.map(sku=>({id:sku.id,code:sku.code,size:sku.size,color:sku.color,quantity:sku.quantity,active:sku.active,version:sku.version,images:sku.images.filter(image=>gallerySchema.safeParse([image]).success).slice(0,8)}))});
   }
  }
  if(Object.keys(input.names).some(id=>!report.designs.some(model=>model.id===id)))conflict('Se intentó renombrar un diseño ajeno a los productos seleccionados.');
  if(Object.keys(thumbnails).length>1600)conflict('El resultado supera el límite de miniaturas.');
  const active=[...target.models.map(model=>({active:model.active,images:model.images.length?model.images:model.image?[model.image]:[],options:model.skus})),...report.designs];
  if(publishing&&active.some(model=>model.active&&(!model.images.length||!model.options.some(sku=>sku.active))))conflict('Completa fotografía y opciones de cada diseño activo antes de publicar.');
  if(publishing&&!active.some(model=>model.active&&model.images.length&&model.options.some(sku=>sku.active)))conflict('La familia necesita al menos un diseño con foto y una opción activa.');
  if(publishing&&process.env.INVENTORY_MODE==='enforce'&&active.some(model=>model.active&&model.options.some(sku=>sku.active&&sku.quantity===null)))conflict('Completa los conteos antes de publicar con control de existencias.');
  report.warnings.push('Al confirmar se ocultarán las fichas de origen del catálogo; se conservarán con sus pedidos y precios históricos. Los carritos anteriores deben revisarse y volver a seleccionar el diseño.');
  const cover=target.imageUrl&&target.imageUrl!==productPlaceholder?target.imageUrl:active.find(model=>model.active&&model.images.length)?.images[0];
  report.valid=!report.conflicts.length;return {report,state:hash(rows),thumbnails,cover};
 }
 return {
  async preview(value:unknown){const input=parse(value);const plan=await inspect(db,input);const {key:unused,...body}=input;void unused;const expires=Date.now()+15*60_000;const payload=Buffer.from(JSON.stringify({fingerprint:hash(body),state:plan.state,expires})).toString('base64url');return {report:{...plan.report,expiresAt:expires},token:payload+'.'+sign(payload)};},
  async apply(actorId:string,value:unknown,token:string){const input=parse(value),{key,...body}=input,fingerprint=hash(body);
   return db.$transaction(async tx=>{
    await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(73190423)`;
    const actors=await tx.$queryRaw<{role:string;isActive:boolean}[]>`SELECT "role","isActive" FROM "User" WHERE "id"=${actorId} FOR SHARE`;
    if(!actors[0]?.isActive||actors[0].role!=='ADMIN')throw new InventoryError(403,'Se requiere administrador activo.');
    const previous=await tx.productGrouping.findUnique({where:{id:key}});if(previous){if(previous.fingerprint!==fingerprint)throw new InventoryError(409,'La confirmación ya corresponde a otra agrupación.');return previous.report as unknown as GroupingReport;}
    const repeated=await tx.productGrouping.findUnique({where:{fingerprint}});if(repeated)return repeated.report as unknown as GroupingReport;
    const ids=[input.targetId,...input.sourceIds].sort();
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "Product" WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`);
    // Keep foreign-key KEY SHARE locks from movement inserts compatible while waiting for SKU locks.
    await tx.$queryRaw(Prisma.sql`SELECT "id" FROM "ProductModel" WHERE "productId" IN (${Prisma.join(ids)}) ORDER BY "id" FOR NO KEY UPDATE`);
    await tx.$queryRaw(Prisma.sql`SELECT s."id" FROM "ProductSku" s JOIN "ProductModel" m ON m."id"=s."modelId" WHERE m."productId" IN (${Prisma.join(ids)}) ORDER BY s."id" FOR UPDATE OF s`);
    const [payload,mac,extra]=token.split('.'),expected=Buffer.from(sign(payload??'')),actual=Buffer.from(mac??'');if(!payload||extra||expected.length!==actual.length||!timingSafeEqual(expected,actual))throw new InventoryError(409,'La simulación no es válida. Simula de nuevo.');
    let signed;try{signed=tokenSchema.parse(JSON.parse(Buffer.from(payload,'base64url').toString()));}catch{throw new InventoryError(409,'La simulación no es válida.');}
    const plan=await inspect(tx,input);if(signed.expires<Date.now()||signed.state!==plan.state||signed.fingerprint!==fingerprint)throw new InventoryError(409,'Los productos o existencias cambiaron o la simulación caducó. Simula de nuevo.');
    if(!plan.report.valid)throw new InventoryError(400,'Resuelve los conflictos antes de agrupar.');
    for(const model of plan.report.designs)await tx.productModel.update({where:{id:model.id},data:{productId:input.targetId,name:model.name,image:model.images[0]??null,images:model.images}});
    await tx.product.update({where:{id:input.targetId},data:{imageThumbnails:plan.thumbnails,...(plan.cover?{imageUrl:plan.cover}:{}),...(input.publishTarget?{status:'active',archived:false}:{})}});
    for(const id of input.sourceIds)await tx.product.update({where:{id},data:{groupedIntoId:input.targetId,status:'archived',archived:true}});
    for(const id of ids)await tx.$executeRaw`SELECT mp_refresh_search(${id})`;
    const report={...plan.report,id:key};await tx.productGrouping.create({data:{id:key,actorId,targetId:input.targetId,fingerprint,report:report as unknown as Prisma.InputJsonValue}});return report;
   },{timeout:30000,maxWait:15000});
  },
 };
}
