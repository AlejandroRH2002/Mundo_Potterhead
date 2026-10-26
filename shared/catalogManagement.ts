import { z } from 'zod';
import { productDraftSchema, productPlaceholder, validImage } from './productSchema.ts';
import { validSize } from './sizes.ts';

export const catalogStates = ['draft', 'active', 'archived'] as const;
export const catalogStateLabels={draft:'Borrador',active:'Activo',archived:'Archivado'};
const code = z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/, 'Usa letras, números, punto, guion o guion bajo.');
export const gallerySchema = z.array(z.string().max(2048).refine(value => validImage(value) && !value.startsWith('data:'), 'Usa una imagen alojada.')).max(8).refine(values => new Set(values).size === values.length, 'Hay imágenes repetidas.');
export const variantSchema = z.object({
 id: z.string().max(100).optional(), code, size: z.string().max(10).default('one'),
 color: z.string().trim().max(60).default(''), images: gallerySchema.default([]), active: z.boolean().default(true),
}).strict();
export const managedModelSchema = z.object({
 id: z.string().max(100).optional(), code, name: z.string().trim().min(1).max(100),
 active: z.boolean().default(true), images: gallerySchema.default([]), variants: z.array(variantSchema).min(1).max(100),
}).strict();
export const managedProductSchema = z.object({
 id: z.string().max(100).optional(), revision: z.number().int().nonnegative().optional(), code,
 status: z.enum(catalogStates).default('draft'),
 product: z.object({ name: z.string(), description: z.string(), price: z.number(), image: z.string().optional(), images: gallerySchema.optional(), imageThumbnails:z.record(z.string(),z.string()).optional(), category: z.string(), subcategory: z.string().nullable().optional(), universe: z.string(), originalPrice:z.number().optional(),isOnSale:z.boolean().optional() }).strict(),
 models: z.array(managedModelSchema).min(1).max(30),
}).strict().superRefine((value, ctx) => {
 const parsed = productDraftSchema.safeParse(value.product);
 if (!parsed.success) { for (const issue of parsed.error.issues) ctx.addIssue({ code:'custom',path:['product',...issue.path],message:issue.message }); return; }
 const modelCodes=new Set<string>(), names=new Set<string>(), skuCodes=new Set<string>();
 const pictures=new Set([parsed.data.image,...(parsed.data.images??[])].filter(image=>image!==productPlaceholder));
 for(const [i,model] of value.models.entries()){
  if(modelCodes.has(model.code)||names.has(model.name))ctx.addIssue({code:'custom',path:['models',i],message:'Código o nombre de modelo repetido.'});
  modelCodes.add(model.code);names.add(model.name);model.images.forEach(image=>pictures.add(image));
  const combinations=new Set<string>();
  for(const [j,variant] of model.variants.entries()){
   const combination=JSON.stringify([variant.size,variant.color.toLocaleLowerCase('es')]);
   if(!validSize(parsed.data.category,variant.size)||combinations.has(combination)||skuCodes.has(variant.code))ctx.addIssue({code:'custom',path:['models',i,'variants',j],message:'Talla inválida o SKU/combinación talla-color repetida.'});
   combinations.add(combination);skuCodes.add(variant.code);variant.images.forEach(image=>pictures.add(image));
  }
 }
 if(pictures.size>8)ctx.addIssue({code:'custom',path:['models'],message:'Máximo ocho imágenes diferentes entre producto, modelos y variantes.'});
});
export type ManagedProduct = z.infer<typeof managedProductSchema>;
export const importColumns = ['productCode','name','description','price','category','subcategory','universe','status','modelCode','modelName','sku','size','color','images','quantity','inventoryMode','reason'] as const;
export type ImportRecord = Record<string,string>;
export interface ImportIssue { row:number; message:string }
export interface ImportReport { id?:string; valid:boolean; rows:number; products:number; created?:number;updated?:number; skipped?:number; errors:ImportIssue[] }
export interface ImportPlan { products:ManagedProduct[]; inventory:{sku:string;quantity:number;mode:'replace'|'increment';reason:string}[]; errors:ImportIssue[]; rows:number }
export const importRequestSchema=z.object({key:z.string().uuid(),rows:z.array(z.record(z.string().max(50),z.string().max(10000))).min(1).max(200),images:z.record(z.string().max(200),z.string().max(2048)).default({})}).strict();
export const bulkChangeSchema=z.object({items:z.array(z.object({id:z.string().min(1).max(100),revision:z.number().int().nonnegative()}).strict()).min(1).max(50),status:z.enum(catalogStates).optional(),category:z.string().optional()}).strict().refine(v=>v.status!==undefined||v.category!==undefined,'Indica un cambio.');

export function planImport(rows:ImportRecord[], images:Record<string,string>={}):ImportPlan {
 const groups=new Map<string,ManagedProduct>();const errors:ImportIssue[]=[];const inventory:ImportPlan['inventory']=[];const skus=new Set<string>();
 const fail=(row:number,message:string)=>errors.push({row:row+2,message});
 for(const [index,row] of rows.entries()){
  if(Object.keys(row).some(key=>!importColumns.includes(key as typeof importColumns[number]))) {fail(index,'Columna desconocida.');continue;}
  const price=/^\d+(?:[.,]\d{1,2})?$/.test(row.price??'')?Number(row.price.replace(',','.')):NaN;
  const gallery=(row.images??'').split('|').map(v=>v.trim()).filter(Boolean).map(v=>images[v]??v);
  const product={name:row.name,description:row.description,price,category:row.category,subcategory:row.subcategory||null,universe:row.universe,image:gallery[0],images:gallery.slice(1)};
  const candidate={code:row.productCode,status:row.status||'draft',product,models:[{code:row.modelCode,name:row.modelName,images:gallery,variants:[{code:row.sku,size:row.size||'one',color:row.color||'',images:gallery}]}]};
  const parsed=managedProductSchema.safeParse(candidate);
  if(!parsed.success){fail(index,parsed.error.issues.map(issue=>issue.message).slice(0,3).join(' '));continue;}
  if(skus.has(row.sku)){fail(index,'SKU repetido en el archivo.');continue;}skus.add(row.sku);
  const incoming=parsed.data;const current=groups.get(incoming.code);
  if(current){
   const {image:unusedImage,images:unusedImages,...base}=current.product;void unusedImage;void unusedImages;
   const {image:nextImage,images:nextImages,...next}=incoming.product;void nextImage;void nextImages;
   if(JSON.stringify(base)!==JSON.stringify(next)||current.status!==incoming.status){fail(index,'Datos del producto inconsistentes entre filas.');continue;}
   const model=current.models.find(m=>m.code===row.modelCode);
   if(model){if(model.name!==row.modelName){fail(index,'Nombre de modelo inconsistente.');continue;}model.variants.push(incoming.models[0].variants[0]);model.images=[...new Set([...model.images,...gallery])];}
   else current.models.push(incoming.models[0]);
   const all=[...new Set([current.product.image,...(current.product.images??[]),...gallery].filter((v):v is string=>!!v))];current.product.image=all[0];current.product.images=all.slice(1);
  } else groups.set(incoming.code,incoming);
  if(row.quantity){if(!/^\d+$/.test(row.quantity)||Number(row.quantity)>1_000_000||!['replace','increment'].includes(row.inventoryMode)||!row.reason||row.reason.trim().length<3||row.reason.trim().length>300){fail(index,'Cantidad, modo explícito (replace/increment) y motivo de 3 a 300 caracteres son obligatorios para inventario.');continue;}inventory.push({sku:row.sku,quantity:Number(row.quantity),mode:row.inventoryMode as 'replace'|'increment',reason:row.reason.trim()});}
 }
 for(const product of groups.values()){const parsed=managedProductSchema.safeParse(product);if(!parsed.success)errors.push({row:rows.findIndex(r=>r.productCode===product.code)+2,message:parsed.error.issues[0].message});}
 return {products:[...groups.values()],inventory,errors,rows:rows.length};
}
