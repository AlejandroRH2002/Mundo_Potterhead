import type {GroupingRequest,GroupingReport} from '../../../../shared/productGrouping';
import { requestJson } from '@/shared/lib/httpClient';
import { thumbnailForImage } from '@/features/admin-products/services/mediaService';
import type { ManagedProduct, ImportRecord, ImportReport } from '../../../../shared/catalogManagement';
export interface CatalogRow {image?:string;designCount?:number;id:string;code:string|null;name:string;status:ManagedProduct['status'];category:string;price:number;revision:number}
export interface ImportInput {parentId?:string;key:string;rows:ImportRecord[];images:Record<string,string>}
const base='/admin/catalog';
export const catalogService={
 groupPreview:(request:GroupingRequest)=>requestJson<{report:GroupingReport;token:string}>(base+'/group/preview',{method:'POST',body:JSON.stringify(request),signal:AbortSignal.timeout(45000)}),
 groupApply:(request:GroupingRequest,token:string)=>requestJson<GroupingReport>(base+'/group/apply',{method:'POST',body:JSON.stringify({request,token,confirmed:true}),signal:AbortSignal.timeout(45000)}),
 list:(params:URLSearchParams)=>requestJson<{items:CatalogRow[];total:number;page:number}>(base+'?'+params),
 get:(id:string)=>requestJson<ManagedProduct>(base+'/'+encodeURIComponent(id)),
 save:(value:ManagedProduct)=>{const images=[value.product.image,...(value.product.images??[]),...value.models.flatMap(model=>[...model.images,...model.variants.flatMap(sku=>sku.images)])].filter((v):v is string=>!!v);const thumbs=Object.fromEntries(images.flatMap(image=>{const thumb=thumbnailForImage(image)??value.product.imageThumbnails?.[image];return thumb&&!thumb.startsWith('data:')?[[image,thumb]]:[];}));return requestJson<ManagedProduct>(base,{method:'POST',body:JSON.stringify({...value,product:{...value.product,imageThumbnails:thumbs}}),signal:AbortSignal.timeout(30000)});},
 duplicate:(id:string)=>requestJson<ManagedProduct>(base+'/'+encodeURIComponent(id)+'/duplicate',{method:'POST'}),
 bulk:(items:{id:string;revision:number}[],changes:{status?:ManagedProduct['status'];category?:string})=>requestJson(base+'/bulk',{method:'PATCH',body:JSON.stringify({items,...changes})}),
 preview:(request:ImportInput)=>requestJson<{report:ImportReport;token:string}>(base+'/preview',{method:'POST',body:JSON.stringify(request),signal:AbortSignal.timeout(45000)}),
 apply:(request:ImportInput,token:string)=>requestJson<ImportReport>(base+'/import',{method:'POST',body:JSON.stringify({request,token}),signal:AbortSignal.timeout(45000)}),
 history:(page:number)=>requestJson<{id:string;createdAt:string;summary:ImportReport}[]>(base+'/history?page='+page),
};
