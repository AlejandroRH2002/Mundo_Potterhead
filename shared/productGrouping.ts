import {z} from 'zod';
import {categories,belongsToCategory} from './catalogTaxonomy.ts';
export const groupingRequestSchema=z.object({key:z.string().uuid(),targetId:z.string().min(1).max(100),sourceIds:z.array(z.string().min(1).max(100)).min(1).max(20),names:z.record(z.string().max(100),z.string().trim().min(1).max(100)).default({}),acceptSharedDescription:z.boolean().default(false),publishTarget:z.boolean().default(false)}).strict().superRefine((value,ctx)=>{if(new Set(value.sourceIds).size!==value.sourceIds.length||value.sourceIds.includes(value.targetId))ctx.addIssue({code:'custom',path:['sourceIds'],message:'Selecciona productos distintos y excluye el destino.'});});
export type GroupingRequest=z.infer<typeof groupingRequestSchema>;
export interface GroupingOption {id:string;code:string;size:string;color:string;quantity:number|null;active:boolean;version:number;images:string[]}
export interface GroupingDesign {id:string;sourceId:string;sourceName:string;beforeName:string;name:string;code:string;active:boolean;images:string[];movements:number;options:GroupingOption[]}
export interface GroupingReport {id?:string;valid:boolean;target:{id:string;name:string;price:number;description:string;status:string};sources:{id:string;name:string;description:string;orders:number}[];designs:GroupingDesign[];conflicts:string[];warnings:string[];orders:number;movements:number;expiresAt?:number}
export const applyGroupingSchema=z.object({request:groupingRequestSchema,token:z.string().max(4096),confirmed:z.literal(true)}).strict();

export interface GroupingCandidate {id:string;category:string;subcategory:string|null;universe:string;price:number;originalPrice:number|null;isOnSale:boolean;groupedIntoId:string|null;stock:number}
export function groupingCompatibility(target:GroupingCandidate,source:GroupingCandidate):string[]{
 const reasons:string[]=[];
 if(source.id===target.id)reasons.push('Es el producto de destino.');
 if(source.groupedIntoId)reasons.push('Ya pertenece a una familia.');
 if(source.category!==target.category)reasons.push('Tipo de artículo diferente.');
 if(source.subcategory!==target.subcategory)reasons.push('Subcategoría diferente.');
 if(source.universe!==target.universe)reasons.push('Universo diferente.');
 if(source.price!==target.price||source.originalPrice!==target.originalPrice||source.isOnSale!==target.isOnSale)reasons.push('Precio u oferta diferentes.');
 if(source.stock!==0)reasons.push('Tiene existencias antiguas sin asignar a tallas.');
 return reasons;
}
export const adminCatalogQuerySchema=z.object({page:z.coerce.number().int().min(1).max(10000).default(1),q:z.string().max(150).optional(),category:z.enum(categories).optional(),subcategory:z.string().max(80).optional(),compatibleWith:z.string().min(1).max(100).optional(),compatibleOnly:z.enum(['true','false']).transform(value=>value==='true').optional()}).strict().superRefine((value,ctx)=>{if(value.subcategory&&(!value.category||!belongsToCategory(value.category,value.subcategory)))ctx.addIssue({code:'custom',path:['subcategory'],message:'Elige una subcategoría de esa categoría.'});if(value.compatibleOnly&&!value.compatibleWith)ctx.addIssue({code:'custom',path:['compatibleWith'],message:'Selecciona primero el destino.'});});
