export function startupDiagnostic(error:unknown):{code:string;reason:string} {
 const entry=error&&typeof error==='object'?error:{};
 const value='code' in entry?entry.code:'errorCode' in entry?entry.errorCode:undefined;
 const code=typeof value==='string'?value:'';
 if(code==='P1000')return {code:'DATABASE_AUTHENTICATION_FAILED',reason:'Revisa credenciales locales y el usuario creado al inicializar el volumen; no borres el volumen.'};
 if(code==='P1001'||code==='ECONNREFUSED')return {code:'DATABASE_UNREACHABLE',reason:'Revisa Docker y el puerto publicado en Windows; un contenedor saludable no confirma accesibilidad desde el host.'};
 if(['P1002','P2024'].includes(code))return {code:'DATABASE_CONNECTION_TIMEOUT',reason:'Comprueba conectividad, disponibilidad y límite de conexiones.'};
 if(['P2021','P2022'].includes(code))return {code:'DATABASE_SCHEMA_OUTDATED',reason:'Faltan tablas o columnas. Revisa migraciones pendientes en el destino autorizado, sin reset.'};
 if(code==='P1010')return {code:'DATABASE_PERMISSION_DENIED',reason:'Revisa los permisos del usuario de base de datos.'};
 if(code==='EADDRINUSE')return {code:'API_PORT_IN_USE',reason:'El puerto de la API ya está ocupado.'};
 if(code==='EACCES')return {code:'API_PORT_FORBIDDEN',reason:'El sistema operativo impide utilizar ese puerto.'};
 return {code:'STARTUP_FAILED_CHECK_ENV_AND_DATABASE',reason:'Ejecuta pnpm dev:check para un diagnóstico local sin mostrar secretos.'};
}
