import {requestJson} from '@/shared/lib/httpClient';
import {promotionSettingsSchema,productPromotionSchema,type PromotionSettings,type PromotionProduct} from '../../../../shared/promotions';
export const promotionService={
 public:async(signal?:AbortSignal)=>promotionSettingsSchema.parse(await requestJson('/promotions',{signal})),
 get:async()=>promotionSettingsSchema.parse(await requestJson('/admin/promotions')),
 save:async(value:PromotionSettings)=>{const parsed=promotionSettingsSchema.safeParse(value);if(!parsed.success)throw Error(parsed.error.issues.map(issue=>issue.message).join(' · '));return promotionSettingsSchema.parse(await requestJson('/admin/promotions',{method:'PUT',body:JSON.stringify(parsed.data)}));},
 products:(params:URLSearchParams)=>requestJson<{items:PromotionProduct[];total:number;page:number}>('/admin/promotions/products?'+params),
 product:(id:string)=>requestJson<PromotionProduct>('/admin/promotions/products/'+encodeURIComponent(id)),
 saveProduct:(id:string,value:{revision:number;enabled:boolean;promotionalPrice?:number})=>requestJson<{id:string;enabled:boolean;regularPrice:number;price:number;revision:number}>('/admin/promotions/products/'+encodeURIComponent(id),{method:'PATCH',body:JSON.stringify(productPromotionSchema.parse(value))}),
};
