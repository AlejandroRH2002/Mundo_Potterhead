export const imagePlaceholder='/images/product-placeholder.svg';
export interface ImageSourcePolicy {origin:string;allowedOrigins?:readonly string[]}
const invalid=/[\\<>"'`]/u;
const unsafe=(value:string)=>invalid.test(value)||Array.from(value).some(char=>char.charCodeAt(0)<32||char.charCodeAt(0)===127);
/** Parse, allowlist and reconstruct a URL. Never return the original DOM string. */
export function allowedImageSource(value:unknown,policy:ImageSourcePolicy):string|undefined{
 if(typeof value!=='string'||!value||value.length>8192||/\s/u.test(value)||unsafe(value))return;
 let decoded=value;
 try{for(let i=0;i<6;i++){if(unsafe(decoded))return;const next=decodeURIComponent(decoded);if(next===decoded)break;decoded=next;if(i===5)return;}}catch{return;}
 if(unsafe(decoded)||decoded.startsWith('//')||/^(?:data|blob|javascript|vbscript|file):/i.test(decoded))return;
 const relative=value.startsWith('/')&&!value.startsWith('//');
 if(!relative&&!/^https:\/\//i.test(value))return;
 try{
  const base=new URL(policy.origin),url=new URL(value,base.origin);
  if(url.username||url.password||url.hash||(!relative&&url.protocol!=='https:'))return;
  const origins=[base.origin,...(policy.allowedOrigins??[])];
  const trustedOrigin=origins.find(origin=>origin===url.origin);
  if(!trustedOrigin)return;
  // Encode each component, not the assembled URL; keeps existing % escapes stable.
  const path=url.pathname.split('/').map(part=>encodeURIComponent(decodeURIComponent(part))).join('/');
  const query=[...url.searchParams].map(([key,item])=>encodeURIComponent(key)+'='+encodeURIComponent(item)).join('&');
  return (relative?'':trustedOrigin)+path+(query?'?'+query:'');
 }catch{return;}
}
export function imageOrigins(value:string|undefined):string[]{
 if(!value)return [];
 return value.split(',').map(part=>{const url=new URL(part.trim());if(url.protocol!=='https:'||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw new Error('VITE_IMAGE_ORIGINS requiere orígenes HTTPS exactos, sin rutas ni credenciales.');return url.origin;});
}
