interface ObjectResult {body:ReadableStream;httpEtag:string;writeHttpMetadata:(headers:Headers)=>void}
interface MediaEnv {PRODUCT_IMAGES?:{get:(key:string)=>Promise<ObjectResult|null>}}
export async function onRequest({request,env}:{request:Request;env:MediaEnv}){
 const path=new URL(request.url).pathname;
 const fail=(status:number)=>new Response(null,{status,headers:{'Cache-Control':'no-store'}});
 if(!['GET','HEAD'].includes(request.method))return new Response(null,{status:405,headers:{Allow:'GET, HEAD','Cache-Control':'no-store'}});
 const key=path.slice('/media/'.length);
 if(!path.startsWith('/media/products/')||!/^products\/[A-Za-z0-9/_-]+\.(?:png|jpe?g|webp)$/.test(key))return fail(404);
 if(!env.PRODUCT_IMAGES)return fail(503);
 try{const object=await env.PRODUCT_IMAGES.get(key);if(!object)return fail(404);const headers=new Headers();object.writeHttpMetadata(headers);headers.set('ETag',object.httpEtag);headers.set('X-Content-Type-Options','nosniff');headers.set('Cache-Control','public, max-age=3600');return new Response(request.method==='HEAD'?null:object.body,{headers});}catch{return fail(502);}
}