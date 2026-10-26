import {validSize} from '../../shared/sizes.ts';
import {createHash} from 'node:crypto';
import {z} from 'zod';
import {managedProductSchema,type ManagedProduct,type ImportRecord,type ImportPlan} from '../../shared/catalogManagement.ts';
const rowSchema=z.object({modelCode:z.string().trim().min(1).max(100).regex(/^[A-Za-z0-9][A-Za-z0-9._-]*$/),modelName:z.string().trim().min(1).max(100),sku:z.string().trim().default(''),size:z.string().trim().default('one'),color:z.string().trim().max(60).default(''),quantity:z.string().trim().default('')}).strict();
export function planDesignImport(parent:ManagedProduct,rows:ImportRecord[]):ImportPlan{
 const product=structuredClone(parent),errors:ImportPlan['errors']=[],inventory:ImportPlan['inventory']=[],seen=new Set<string>();
 const originalModels=new Set(parent.models.map(m=>m.code)),originalSkus=new Set(parent.models.flatMap(m=>m.variants.map(s=>s.code))),models=new Set<string>(),skus=new Set<string>();
 const fail=(index:number,message:string)=>errors.push({row:index+2,message});
 for(const [index,raw] of rows.entries()){
  const parsed=rowSchema.safeParse(raw);if(!parsed.success){fail(index,parsed.error.issues.map(issue=>issue.message).join(' '));continue;}
  const row=parsed.data,size=row.size||'one',color=row.color;
  if(!validSize(parent.product.category,size)){fail(index,'La talla no pertenece a la categoría del producto padre.');continue;}
  let model=product.models.find(m=>m.code===row.modelCode);
  if(model&&model.name!==row.modelName){fail(index,'El modelo existente tiene otro nombre. Edítalo desde Modelos para renombrarlo.');continue;}
  const combination=model?.variants.find(s=>s.size===size&&s.color.toLocaleLowerCase('es')===color.toLocaleLowerCase('es'));
  const code=row.sku||combination?.code||row.modelCode.slice(0,50)+'-'+size+'-'+createHash('sha256').update(JSON.stringify([row.modelCode,size,color.toLocaleLowerCase('es')])).digest('hex').slice(0,20);
  if(seen.has(code)){fail(index,'SKU repetido en el archivo.');continue;}seen.add(code);
  const existing=product.models.flatMap(m=>m.variants.map(s=>({model:m,sku:s}))).find(v=>v.sku.code===code);
  if(existing&&(existing.model.code!==row.modelCode||existing.sku.size!==size||existing.sku.color.toLocaleLowerCase('es')!==color.toLocaleLowerCase('es'))){fail(index,'El SKU existente identifica otra variante.');continue;}
  if(combination&&combination.code!==code){fail(index,'La combinación talla/color ya tiene otro SKU.');continue;}
  if(!model){model={code:row.modelCode,name:row.modelName,active:false,images:[],variants:[]};product.models.push(model);}
  if(!existing)model.variants.push({code,size,color,active:true,images:[]});
  models.add(row.modelCode);skus.add(code);
  if(row.quantity){if(!/^\d+$/.test(row.quantity)||Number(row.quantity)>1_000_000){fail(index,'Cantidad: indica un entero entre 0 y 1 000 000.');continue;}inventory.push({sku:code,quantity:Number(row.quantity),mode:'replace',reason:'Conteo de importación de diseños'});}
 }
 const validation=managedProductSchema.safeParse(product);if(!validation.success)for(const issue of validation.error.issues.slice(0,5))errors.push({row:2,message:issue.message});
 return {products:[product],inventory,errors,rows:rows.length,designStats:{newModels:[...models].filter(code=>!originalModels.has(code)).length,existingModels:[...models].filter(code=>originalModels.has(code)).length,newSkus:[...skus].filter(code=>!originalSkus.has(code)).length,existingSkus:[...skus].filter(code=>originalSkus.has(code)).length}};
}
