export interface ProxyEnv { API_ORIGIN?: string }
export async function proxyApi(request:Request,env:ProxyEnv,send:typeof fetch=fetch):Promise<Response>{
 const source=new URL(request.url);
 const fail=(status:number,message:string)=>Response.json({message},{status,headers:{'Cache-Control':'no-store'}});
 if(!source.pathname.startsWith('/api/'))return fail(404,'Ruta no disponible.');
 let origin:URL;
 try{origin=new URL(env.API_ORIGIN??'');if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash||origin.origin===source.origin)throw new Error();}catch{return fail(503,'API_ORIGIN requiere un origen HTTPS de API válido.');}
 const target=new URL(origin.origin);target.pathname=source.pathname;target.search=source.search;
 if(['/api/health/live','/api/health/ready'].includes(source.pathname))target.pathname=source.pathname.slice(4);
 const forward=new Request(target,request);forward.headers.delete('Host');forward.headers.set('Cache-Control','no-store');
 try{
  const upstream=await send(forward,{redirect:'manual',cache:'no-store'});
  const headers=new Headers(upstream.headers);
  const cookieHeaders=upstream.headers as Headers & {getAll?:(name:string)=>string[];getSetCookie?:()=>string[]};
  const cookies=cookieHeaders.getAll?cookieHeaders.getAll('Set-Cookie'):cookieHeaders.getSetCookie?.();
  if(cookies){headers.delete('Set-Cookie');for(const cookie of cookies)headers.append('Set-Cookie',cookie);}
  headers.set('Cache-Control','no-store');headers.set('Cloudflare-CDN-Cache-Control','no-store');headers.set('CDN-Cache-Control','no-store');headers.delete('Expires');
  return new Response(upstream.body,{status:upstream.status,statusText:upstream.statusText,headers});
 }catch{return fail(502,'La API no está disponible.');}
}
