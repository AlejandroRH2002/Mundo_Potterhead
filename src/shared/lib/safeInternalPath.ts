function accepted(value:unknown):value is string {
 if(typeof value!=='string'||!value)return false;
 let decoded=value;
 for(let depth=0;depth<12;depth++){
  if(!decoded.startsWith('/')||decoded.startsWith('//')||Array.from(decoded).some(c=>c.charCodeAt(0)===92||c.charCodeAt(0)<32||c.charCodeAt(0)===127)||/%5c|%2f%2f|(?:javascript|data|https?):/i.test(decoded))return false;
  let next:string;try{next=decodeURIComponent(decoded);}catch{return false;}
  if(next===decoded)return true;decoded=next;
 }
 return false;
}
/** Only same-origin absolute paths, including safe query/hash. Never external URLs. */
export function safeInternalPath(value:unknown,fallback='/'):string{return accepted(value)?value:accepted(fallback)?fallback:'/';}