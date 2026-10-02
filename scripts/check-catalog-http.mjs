// Run: node --env-file=.env scripts/check-catalog-http.mjs. Read-only, no credentials.
const base='http://127.0.0.1:'+(process.env.API_PORT||3001);
const paths=['/api/products?pageSize=8','/api/products?category=clothing&pageSize=8','/api/products?onSale=true&sort=descuento&pageSize=8','/api/products?pageSize=8','/api/products?universe=harry-potter&pageSize=8','/health/ready'];
let failed=false;
for(let round=0;round<4;round++)await Promise.all(paths.map(async(path,index)=>{const started=performance.now();try{const response=await fetch(base+path,{signal:AbortSignal.timeout(15000)});failed ||= response.status!==200;console.log(JSON.stringify({round,index,kind:path.startsWith('/health')?'ready':'catalog',status:response.status,ms:Math.round(performance.now()-started)}));}catch{failed=true;console.log(JSON.stringify({round,index,status:'NO_RESPONSE'}));}}));
process.exitCode=failed?1:0;
