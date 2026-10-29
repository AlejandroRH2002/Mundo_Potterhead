import {groupingCompatibility} from '../../shared/productGrouping.ts';
import {createProductGrouping} from './productGrouping.ts';
import {planDesignImport} from '../lib/designImport.ts';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma, type PrismaClient } from '@prisma/client';
import { bulkChangeSchema, importRequestSchema, managedProductSchema, planImport, type ImportReport, type ManagedProduct } from '../../shared/catalogManagement.ts';
import { productDraftSchema, productPlaceholder } from '../../shared/productSchema.ts';
import { InventoryError, nextQuantity } from '../../shared/inventory.ts';
import { validSize } from '../../shared/sizes.ts';

type Tx=Prisma.TransactionClient;
type Request=ReturnType<typeof importRequestSchema.parse>;
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value,(_key,item:unknown)=>item&&typeof item==='object'&&!Array.isArray(item)&&!(item instanceof Date)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item)).digest('hex');
export function createCatalogManagement(db:PrismaClient,secret:string){
 async function lock(tx:Tx,actorId:string){
  await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(73190423)`;
  const actors=await tx.$queryRaw<{role:string;isActive:boolean}[]>`SELECT "role","isActive" FROM "User" WHERE "id"=${actorId} FOR SHARE`;
  if(!actors[0]?.isActive||actors[0].role!=='ADMIN')throw new InventoryError(403,'Se requiere administrador activo.');
 }
 async function load(tx:Tx,id:string):Promise<ManagedProduct>{
  const product=await tx.product.findUnique({where:{id},include:{models:{orderBy:{id:'asc'},include:{skus:{orderBy:{id:'asc'}}}}}});
  if(!product)throw new InventoryError(404,'Producto no encontrado.');
  return {id:product.id,revision:product.revision,code:product.code??product.id,status:product.status as ManagedProduct['status'],
   product:{name:product.name,description:product.description??'',price:Number(product.price),image:product.imageUrl??productPlaceholder,images:product.images,imageThumbnails:product.imageThumbnails as Record<string,string>,category:product.category,subcategory:product.subcategory,universe:product.universe,originalPrice:product.originalPrice===null?undefined:Number(product.originalPrice),isOnSale:product.isOnSale},
   models:product.models.map(model=>({id:model.id,code:model.sku,name:model.name,active:model.active,images:model.images.length?model.images:model.image?[model.image]:[],variants:model.skus.map(sku=>({id:sku.id,code:sku.code,size:sku.size,color:sku.color,images:sku.images,active:sku.active}))}))};
 }
 async function save(tx:Tx,input:ManagedProduct,merge=false){
  const existing=input.id?await tx.product.findUnique({where:{id:input.id}}):await tx.product.findFirst({where:{OR:[{code:input.code},{id:input.code}]}});
  if(existing?.groupedIntoId)throw new InventoryError(409,'Este producto ya está agrupado. Edita la familia de destino.');
  if(input.id&&!existing)throw new InventoryError(404,'Producto no encontrado.');
  if(existing?.code&&existing.code!==input.code)throw new InventoryError(409,'El código de producto es estable y no se puede renumerar.');
  if(existing){await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${existing.id} FOR UPDATE`;
   const latest=await tx.product.findUniqueOrThrow({where:{id:existing.id}});if(input.revision!==undefined&&input.revision!==latest.revision)throw new InventoryError(409,'El producto cambió. Recarga antes de guardar.');
  }
  if(input.removedVariantIds?.length){
   if(!existing)throw new InventoryError(400,'Solo se pueden quitar variantes del producto guardado.');
   const hasOrders=await tx.orderItem.count({where:{product:{OR:[{id:existing.id},{groupedIntoId:existing.id}]}}})>0;
   for(const id of [...input.removedVariantIds].sort()){
    await tx.$queryRaw`SELECT "id" FROM "ProductSku" WHERE "id"=${id} FOR UPDATE`;
    const sku=await tx.productSku.findUnique({where:{id},include:{model:{select:{productId:true}}}});
    if(!sku||sku.model.productId!==existing.id)throw new InventoryError(409,'Una variante ya no existe o pertenece a otro producto. Recarga el editor.');
    if(input.models.some(model=>model.variants.some(variant=>variant.code===sku.code)))throw new InventoryError(409,'No reutilices un SKU pendiente de quitar en el mismo guardado. Guarda el retiro primero o reactiva la variante existente.');
    const hasHistory=await tx.inventoryMovement.count({where:{skuId:id}})>0;
    // Legacy orders reference products, so any order protects all their SKU identities.
    if(hasOrders||hasHistory||(sku.quantity??0)>0||sku.version>0)await tx.productSku.update({where:{id},data:{active:false}});
    else await tx.productSku.delete({where:{id}});
   }
  }
  if(input.status==='active'&&existing?.status!=='active'&&input.models.some(model=>model.active&&(!model.images.length||!model.variants.some(option=>option.active))))throw new InventoryError(400,'Completa fotografía y talla de cada diseño activo antes de publicar.');
  const draft=productDraftSchema.parse(input.product);
  const allImages=new Set([draft.image,...(draft.images??[]),...input.models.flatMap(model=>[...model.images,...model.variants.flatMap(sku=>sku.images)])].filter(image=>image!==productPlaceholder));
  if(process.env.NODE_ENV==='production'&&[...allImages].some(image=>!image.startsWith('https://')))throw new InventoryError(400,'Las im?genes requieren HTTPS en producci?n.');
  const productId=existing?.id??randomUUID();
  const oldSkus=existing?await tx.productSku.findMany({where:{model:{productId}}}):[];
  if(oldSkus.some(sku=>!validSize(draft.category,sku.size)))throw new InventoryError(409,'La categoría no admite las tallas existentes.');
  const values={code:input.code,status:input.status,name:draft.name,description:draft.description,price:new Prisma.Decimal(draft.price.toFixed(2)),category:draft.category,subcategory:draft.subcategory??null,universe:draft.universe,imageUrl:draft.image,images:draft.images??[],originalPrice:draft.originalPrice===undefined?null:new Prisma.Decimal(draft.originalPrice.toFixed(2)),isOnSale:draft.isOnSale??false};
  const media=draft.imageThumbnails?{imageThumbnails:draft.imageThumbnails}:{};
  if(existing)await tx.product.update({where:{id:productId},data:{...values,...media}});else await tx.product.create({data:{id:productId,...values,...media}});
  for(const model of input.models){
   const current=await tx.productModel.findUnique({where:{sku:model.code}});
   if(current&&current.productId!==productId||model.id&&current?.id!==model.id)throw new InventoryError(409,'Código de modelo asociado a otro registro.');
   const modelId=current?.id??randomUUID();
   const pictures=model.images;
   if(model.active&&!pictures.length&&(!current?.active||!!current.image||current.images.length>0))throw new InventoryError(400,'Añade una fotografía al diseño antes de publicarlo.');
   const values={name:model.name,image:pictures[0]??null,images:pictures,active:merge&&current?current.active:model.active};
   if(current)await tx.productModel.update({where:{id:modelId},data:values});else await tx.productModel.create({data:{id:modelId,productId,sku:model.code,...values}});
   for(const variant of model.variants){
    const old=await tx.productSku.findUnique({where:{code:variant.code}});
    if(old&&old.modelId!==modelId||variant.id&&old?.id!==variant.id)throw new InventoryError(409,'SKU asociado a otro registro.');
    if(old&&(old.size!==variant.size||old.color!==variant.color)&&await tx.inventoryMovement.count({where:{skuId:old.id}}))throw new InventoryError(409,'Un SKU con movimientos conserva talla y color. Desactívalo y crea otra variante.');
    // Codes and IDs remain stable. Quantity changes are exclusively ledger operations.
    const values={size:variant.size,color:variant.color,images:variant.images,active:merge&&old?old.active:variant.active};
    if(old)await tx.productSku.update({where:{id:old.id},data:values});else await tx.productSku.create({data:{id:randomUUID(),code:variant.code,modelId,...values}});
   }
   if(!await tx.productSku.count({where:{modelId,active:true}}))await tx.productModel.update({where:{id:modelId},data:{active:false}});
   if(merge&&current){/* Omitted variants are deliberately preserved by import. */}
  }
  if(!merge&&process.env.INVENTORY_MODE==='enforce'&&input.status==='active'&&await tx.productModel.count({where:{productId,active:true,OR:[{skus:{none:{active:true}}},{skus:{some:{active:true,quantity:null}}}]}}))throw new InventoryError(409,'Captura el inventario antes de activar el producto.');
  return {id:productId,created:!existing};
 }
 async function snapshot(tx:Tx,request:Request){
  const codes=[...new Set([request.parentId,...request.rows.map(row=>row.productCode)].filter((value):value is string=>!!value))];
  const products=await tx.product.findMany({where:{OR:[{code:{in:codes}},{id:{in:codes}}]},orderBy:{id:'asc'},select:{id:true,revision:true,models:{orderBy:{id:'asc'},select:{id:true,updatedAt:true,skus:{orderBy:{id:'asc'},select:{id:true,version:true,active:true,color:true,size:true}}}}}});
  return hash(products);
 }
 const signature=(request:Request,state:string)=>createHmac('sha256',secret).update(hash(request)+':'+state).digest('hex');
 async function inspect(tx:Tx,request:Request){
  const plan=request.parentId?planDesignImport(await load(tx,request.parentId),request.rows):planImport(request.rows,request.images);
  for(const product of plan.products){
   const old=await tx.product.findFirst({where:{OR:[{code:product.code},{id:product.code}]},select:{id:true}});
   if(old){
    const current=await load(tx,old.id);const incoming=structuredClone(product);
    incoming.models=[...current.models.filter(model=>!incoming.models.some(m=>m.code===model.code)),...incoming.models.map(model=>{const previous=current.models.find(m=>m.code===model.code);return {...model,variants:[...(previous?.variants.filter(sku=>!model.variants.some(s=>s.code===sku.code))??[]),...model.variants]};})];
    if(!managedProductSchema.safeParse(incoming).success)plan.errors.push({row:request.rows.findIndex(row=>row.productCode===product.code)+2,message:'Conflicto con modelos, variantes, tallas o imágenes existentes.'});
   }
   for(const model of product.models){const existing=await tx.productModel.findUnique({where:{sku:model.code},select:{productId:true}});if(existing&&existing.productId!==old?.id)plan.errors.push({row:request.rows.findIndex(r=>r.modelCode===model.code)+2,message:'Código de modelo ya usado en otro producto.'});
    for(const sku of model.variants){const existing=await tx.productSku.findUnique({where:{code:sku.code},include:{model:{select:{sku:true,productId:true}}}});if(existing&&(existing.model.sku!==model.code||existing.model.productId!==old?.id))plan.errors.push({row:request.rows.findIndex(r=>r.sku===sku.code)+2,message:'SKU ya usado en otro modelo.'});if(existing&&(existing.size!==sku.size||existing.color!==sku.color)&&await tx.inventoryMovement.count({where:{skuId:existing.id}}))plan.errors.push({row:request.rows.findIndex(r=>r.sku===sku.code)+2,message:'Un SKU con movimientos conserva talla y color.'});}
   }
  }
  for(const line of plan.inventory){const existing=await tx.productSku.findUnique({where:{code:line.sku},select:{quantity:true}});if(line.mode==='increment'&&existing?.quantity==null)plan.errors.push({row:request.rows.findIndex(row=>row.sku===line.sku)+2,message:'Captura el conteo inicial antes de incrementar.'});if(line.mode==='increment'&&existing?.quantity!==undefined&&existing.quantity!==null&&existing.quantity+line.quantity>1_000_000)plan.errors.push({row:request.rows.findIndex(row=>row.sku===line.sku)+2,message:'El incremento excede el saldo máximo.'});}
  return plan;
 }
 const grouping=createProductGrouping(db,secret);
 return {
  groupPreview:grouping.preview,groupApply:grouping.apply,
  async list(query:{page:number;q?:string;category?:string;subcategory?:string;compatibleWith?:string;compatibleOnly?:boolean}){
   const where:Prisma.ProductWhereInput={groupedIntoId:null,...(query.q?{OR:[{searchText:{contains:query.q,mode:'insensitive'}},{name:{contains:query.q,mode:'insensitive'}},{code:{contains:query.q,mode:'insensitive'}}]}:{}),...(query.category?{category:query.category}:{}),...(query.subcategory?{subcategory:query.subcategory}:{})};
   const target=query.compatibleWith?await db.product.findUnique({where:{id:query.compatibleWith}}):null;
   if(query.compatibleWith&&(!target||target.groupedIntoId))throw new InventoryError(404,'El producto de destino no está disponible.');
   if(target){where.id={not:target.id};if(query.compatibleOnly)where.AND=[{category:target.category,subcategory:target.subcategory,universe:target.universe,price:target.price,originalPrice:target.originalPrice,isOnSale:target.isOnSale,stock:0,groupedSources:{none:{}},models:{some:{},none:{quantity:{not:0}}}}];}
   const [items,total]=await Promise.all([db.product.findMany({where,skip:(query.page-1)*20,take:20,orderBy:{id:'asc'},select:{id:true,code:true,name:true,status:true,category:true,subcategory:true,universe:true,originalPrice:true,isOnSale:true,stock:true,groupedIntoId:true,price:true,revision:true,imageUrl:true,models:{where:{active:true},take:1,orderBy:{createdAt:'asc'},select:{image:true}},_count:{select:{models:true,groupedSources:true}}}}),db.product.count({where})]);
   const candidate=(row:typeof items[number]|NonNullable<typeof target>)=>({...row,price:Number(row.price),originalPrice:row.originalPrice===null?null:Number(row.originalPrice)});
   return {items:items.map(({_count,imageUrl,models,...item})=>({id:item.id,code:item.code,name:item.name,status:item.status,category:item.category,subcategory:item.subcategory,universe:item.universe,price:Number(item.price),originalPrice:item.originalPrice===null?undefined:Number(item.originalPrice),isOnSale:item.isOnSale,groupedIntoId:item.groupedIntoId??undefined,revision:item.revision,image:imageUrl&&imageUrl!==productPlaceholder?imageUrl:models[0]?.image??productPlaceholder,designCount:_count.models,...(target?{compatibility:[...groupingCompatibility(candidate(target),candidate({...item,imageUrl,models,_count})),...(_count.groupedSources?['Es una familia con productos vinculados.']:[]),...(!_count.models?['No tiene diseños.']:[])]}:{})})),total,page:query.page};
  },
  async destination(id:string){const seen=new Set<string>();for(let hop=0;hop<10;hop++){if(seen.has(id))throw new InventoryError(409,'Relación de familia inválida.');seen.add(id);const product=await db.product.findUnique({where:{id},select:{id:true,groupedIntoId:true}});if(!product)throw new InventoryError(404,'Producto no encontrado.');if(!product.groupedIntoId)return {id:product.id};id=product.groupedIntoId;}throw new InventoryError(409,'Revisa la relación de familia antes de editar.');},
  get:(id:string)=>load(db,id),
  async save(actorId:string,value:unknown){const input=managedProductSchema.parse(value);if(input.id&&input.revision===undefined)throw new InventoryError(400,'La edición requiere la revisión actual del producto.');return db.$transaction(async tx=>{await lock(tx,actorId);if(!input.id&&await tx.product.findUnique({where:{code:input.code}}))throw new InventoryError(409,'El código ya existe; abre el producto para editarlo.');const result=await save(tx,input);return load(tx,result.id);},{timeout:15000});},
  async duplicate(actorId:string,id:string){return db.$transaction(async tx=>{await lock(tx,actorId);const source=await load(tx,id);delete source.id;delete source.revision;source.code='COPY-'+randomUUID();source.status='draft';source.product.name+=' (copia)';for(const model of source.models){delete model.id;model.code='MP-'+randomUUID();for(const variant of model.variants){delete variant.id;variant.code='MP-'+randomUUID();}}const result=await save(tx,source);return load(tx,result.id);},{timeout:15000});},
  async bulk(actorId:string,value:unknown){const input=bulkChangeSchema.parse(value);return db.$transaction(async tx=>{await lock(tx,actorId);for(const item of [...input.items].sort((a,b)=>a.id.localeCompare(b.id))){const current=await load(tx,item.id);current.revision=item.revision;if(input.status)current.status=input.status;if(input.category){current.product.category=input.category;current.product.subcategory=null;}const parsed=managedProductSchema.safeParse(current);if(!parsed.success)throw new InventoryError(400,'Una categoría no admite las variantes existentes.');await save(tx,parsed.data);}return {updated:input.items.length};},{timeout:15000});},
  async preview(value:unknown){const request=importRequestSchema.parse(value);const plan=await inspect(db,request);const state=await snapshot(db,request);return {report:{...plan.designStats,valid:!plan.errors.length,rows:plan.rows,products:plan.products.length,errors:plan.errors} satisfies ImportReport,token:state+'.'+signature(request,state)};},
  async apply(actorId:string,value:unknown,token:string){const request=importRequestSchema.parse(value);const fingerprint=hash({...(request.parentId?{parentId:request.parentId}:{}),rows:request.rows,images:request.images});
   return db.$transaction(async tx=>{
    await lock(tx,actorId);const prior=await tx.catalogImport.findUnique({where:{id:request.key}});if(prior){if(prior.fingerprint!==fingerprint)throw new InventoryError(409,'La clave ya corresponde a otra importación.');return prior.summary as unknown as ImportReport;}
    const repeated=await tx.catalogImport.findUnique({where:{fingerprint}});if(repeated)return {...repeated.summary as unknown as ImportReport,skipped:request.rows.length};
    const state=await snapshot(tx,request);const expected=state+'.'+signature(request,state);const a=Buffer.from(token),b=Buffer.from(expected);
    if(a.length!==b.length||!timingSafeEqual(a,b))throw new InventoryError(409,'La simulación cambió o caducó por cambios en el catálogo. Simula de nuevo.');
    const plan=await inspect(tx,request);if(plan.errors.length)throw new InventoryError(400,'Corrige todas las filas antes de importar.');
    let created=0,updated=0;
    for(const product of [...plan.products].sort((a,b)=>a.code.localeCompare(b.code))){const result=await save(tx,product,true);if(result.created)created++;else updated++;}
    for(const [i,line] of plan.inventory.entries()){
     const sku=await tx.productSku.findUniqueOrThrow({where:{code:line.sku}});await tx.$queryRaw`SELECT "id" FROM "ProductSku" WHERE "id"=${sku.id} FOR UPDATE`;
     const current=await tx.productSku.findUniqueOrThrow({where:{id:sku.id}});
     const type=current.quantity===null?'COUNT':line.mode==='increment'?'RECEIPT':'ADJUSTMENT';
     if(line.mode==='increment'&&current.quantity===null)throw new InventoryError(409,'Captura un conteo inicial antes de incrementar.');
     if(type==='RECEIPT'&&line.quantity===0)continue;
     const after=nextQuantity(current.quantity,current.version,{key:request.key,type,quantity:line.quantity,reason:line.reason,expectedVersion:current.version});
     if(after===current.quantity)continue;
     await tx.productSku.update({where:{id:sku.id},data:{quantity:after,version:{increment:1}}});
     const key=createHash('sha256').update(request.key+':'+i).digest('hex');
     await tx.inventoryMovement.create({data:{id:randomUUID(),key:'import-'+key,fingerprint:hash(line),skuId:sku.id,modelId:sku.modelId,actorId,type,quantity:line.quantity,before:current.quantity,after,delta:after-(current.quantity??0),reason:line.reason}});
    }
    // Imported initial counts are written in this same transaction before enforcing readiness.
    if(process.env.INVENTORY_MODE==='enforce'){
     const codes=plan.products.filter(product=>product.status==='active').map(product=>product.code);
     if(codes.length&&await tx.productModel.count({where:{active:true,product:{OR:[{code:{in:codes}},{id:{in:codes}}]},OR:[{skus:{none:{active:true}}},{skus:{some:{active:true,quantity:null}}}]}}))throw new InventoryError(409,'Captura el inventario antes de activar el producto.');
    }
    const report:ImportReport={...plan.designStats,id:request.key,valid:true,rows:plan.rows,products:plan.products.length,created,updated,errors:[]};
    await tx.catalogImport.create({data:{id:request.key,actorId,fingerprint,summary:report as unknown as Prisma.InputJsonValue}});return report;
   },{timeout:30000,maxWait:5000});
  },
  history:(page:number)=>db.catalogImport.findMany({orderBy:[{createdAt:'desc'},{id:'desc'}],skip:(page-1)*20,take:20,select:{id:true,summary:true,createdAt:true}}),
 };
}
export type CatalogManagement=ReturnType<typeof createCatalogManagement>;
