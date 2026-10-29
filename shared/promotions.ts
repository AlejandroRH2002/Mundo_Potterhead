import {z} from 'zod';
import {toCents} from './money.ts';
const amount=z.number().finite().min(.01).max(1_000_000).transform(value=>toCents(value)/100);
export const shippingRuleSchema=z.object({enabled:z.boolean(),minimum:amount,scope:z.string().trim().max(250),conditions:z.string().trim().max(1000)}).strict().superRefine((value,ctx)=>{if(value.enabled&&(!value.scope||!value.conditions))ctx.addIssue({code:'custom',message:'Indica cobertura y condiciones antes de activar envío gratis.'});});
export const generalPromotionSchema=z.object({enabled:z.boolean(),title:z.string().trim().max(120),message:z.string().trim().max(1000)}).strict().superRefine((value,ctx)=>{if(value.enabled&&(!value.title||!value.message))ctx.addIssue({code:'custom',message:'Indica título y condiciones de la promoción general.'});});
export const promotionSettingsSchema=z.object({revision:z.number().int().nonnegative(),currency:z.literal('MXN'),shipping:shippingRuleSchema,general:generalPromotionSchema}).strict();
export type PromotionSettings=z.infer<typeof promotionSettingsSchema>;
export const promotionProductQuerySchema=z.object({q:z.string().trim().max(150).default(''),page:z.coerce.number().int().min(1).max(100000).default(1),onSale:z.enum(['all','active','inactive']).default('all')}).strict();
export interface PromotionProduct{id:string;name:string;price:number;originalPrice?:number;isOnSale:boolean;revision:number;status:string;image:string}
export const initialPromotions:PromotionSettings={revision:0,currency:'MXN',shipping:{enabled:false,minimum:1500,scope:'',conditions:''},general:{enabled:false,title:'',message:''}};
export function publicPromotions(value:PromotionSettings):PromotionSettings{return {...value,general:value.general.enabled?value.general:{enabled:false,title:'',message:''},shipping:value.shipping.enabled?value.shipping:{...value.shipping,scope:'',conditions:''}};}
export const productPromotionSchema=z.object({revision:z.number().int().nonnegative(),enabled:z.boolean(),promotionalPrice:amount.optional()}).strict().superRefine((value,ctx)=>{if(value.enabled&&value.promotionalPrice===undefined||!value.enabled&&value.promotionalPrice!==undefined)ctx.addIssue({code:'custom',message:'Indica precio promocional únicamente al activar una oferta.'});});
export const shippingEligibilitySchema=z.object({enabled:z.boolean(),eligible:z.boolean(),minimum:amount,remaining:z.number().nonnegative(),currency:z.literal('MXN'),scope:z.string().max(250),conditions:z.string().max(1000)}).strict();
export type ShippingEligibility=z.infer<typeof shippingEligibilitySchema>;
export function evaluateShipping(subtotal:number,rule:PromotionSettings['shipping']):ShippingEligibility{
 const valid=shippingRuleSchema.parse(rule);if(!Number.isFinite(subtotal)||subtotal<0)throw Error('Subtotal inválido.');
 const remaining=Math.max(0,toCents(valid.minimum)-toCents(subtotal))/100;
 return {...valid,eligible:valid.enabled&&remaining===0,remaining,currency:'MXN'};
}
export function shippingMessage(offer:ShippingEligibility):string{
 if(!offer.enabled||!offer.eligible)return '';
 const minimum=new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(offer.minimum);
 return 'Promoción de envío: el subtotal de productos alcanza el mínimo de '+minimum+' MXN para solicitar envío gratis. Alcance informado: '+offer.scope+'. Condiciones: '+offer.conditions+'. Aplicación sujeta a confirmación de la tienda; la cobertura y el envío no se confirman en el sitio.';
}
