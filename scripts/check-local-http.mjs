import { randomBytes } from 'node:crypto';
const port=Number(process.env.API_PORT || 3001);
if(!Number.isInteger(port)||port<1||port>65535)throw new Error('API_PORT inválido.');
const base=`http://127.0.0.1:${port}`,origin=process.env.APP_ORIGIN||'http://localhost:5173';
let cookie='',created='',deactivated=false,failures=0;
const report=(name,ok,status)=>{console.log(`${name}: ${ok?'OK':'FALLO'}${status?` (HTTP ${status})`:''}`);if(!ok)failures++;};
async function request(path,method='GET',body,session=cookie){return fetch(base+path,{method,headers:{Origin:origin,'X-Requested-With':'MundoPotterhead','Content-Type':'application/json',...(session?{Cookie:session}:{})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});}
const cookies=response=>response.headers.getSetCookie().map(value=>value.split(';')[0]).join('; ');
try {
 const ready=await request('/health/ready');report('readiness',ready.status===200,ready.status);
 const list=await request('/api/products?universe=harry-potter&category=clothing&minPrice=0&sort=precio-asc&pageSize=2');
 const catalog=await list.json().catch(()=>null);report('catálogo filtrado',list.status===200&&Array.isArray(catalog?.items)&&catalog.items.every(item=>item.universe==='harry-potter'&&item.category==='clothing'&&!item.image.startsWith('data:')),list.status);
 const anonymous=await request('/api/admin/users','GET',undefined,'');report('admin sin sesión',anonymous.status===401,anonymous.status);
 const email=process.env.ADMIN_BOOTSTRAP_EMAIL,password=process.env.ADMIN_BOOTSTRAP_PASSWORD;
 if(!email||!password){console.log('Faltan ADMIN_BOOTSTRAP_EMAIL o ADMIN_BOOTSTRAP_PASSWORD; sin mostrar valores.');failures++;}
 else {
  const login=await request('/api/auth/login','POST',{email,password},'');report('login administrador',login.status===200,login.status);
  if(login.status===200){
   cookie=cookies(login);
   const admin=await request('/api/admin/users?pageSize=1');report('admin con sesión',admin.status===200,admin.status);
   const testPassword=randomBytes(32).toString('hex'),testEmail=`http-check-${randomBytes(8).toString('hex')}@example.invalid`;
   const create=await request('/api/admin/users','POST',{name:'Prueba HTTP temporal',email:testEmail,password:testPassword,role:'user'});
   const user=await create.json().catch(()=>null);created=typeof user?.id==='string'?user.id:'';report('alta temporal',create.status===201&&Boolean(created),create.status);
   if(created){
    const customer=await request('/api/auth/login','POST',{email:testEmail,password:testPassword},'');const customerCookie=cookies(customer);
    report('login cliente temporal',customer.status===200,customer.status);
    const denied=await request('/api/admin/users','GET',undefined,customerCookie);report('admin denegado al cliente',denied.status===403,denied.status);
    const disable=await request('/api/admin/users/'+encodeURIComponent(created),'PATCH',{isActive:false});const result=await disable.json().catch(()=>null);deactivated=disable.status===200&&result?.isActive===false;report('desactivación temporal',deactivated,disable.status);
    const session=await request('/api/auth/session','GET',undefined,customerCookie);const revoked=await session.json().catch(()=>null);report('sesión temporal revocada',session.status===200&&revoked?.user===null,session.status);
    const inactive=await request('/api/auth/login','POST',{email:testEmail,password:testPassword},'');report('login desactivado rechazado',inactive.status===401,inactive.status);
   }
  } else console.log('Alta/desactivación/logout pendientes: no se estableció sesión admin.');
 }
} catch { console.log('Petición local fallida o timeout; revisa la API. No se imprimen credenciales ni respuestas privadas.');failures++; }
finally {
 if(created&&!deactivated&&cookie){try{const response=await request('/api/admin/users/'+encodeURIComponent(created),'PATCH',{isActive:false});deactivated=response.status===200;report('limpieza temporal',deactivated,response.status);}catch{report('limpieza temporal pendiente',false);}}
 if(cookie){try{const logout=await request('/api/auth/logout','POST',{});report('logout',logout.status===204,logout.status);const session=await request('/api/auth/session');const body=await session.json().catch(()=>null);report('logout revocado',body?.user===null,session.status);}catch{report('logout pendiente',false);}}
 if(failures)process.exitCode=1;
}
