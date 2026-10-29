export function publicationFailure(error:unknown):string{
 const status=error&&typeof error==='object'&&'status' in error&&typeof error.status==='number'?error.status:undefined;
 const detail=error instanceof Error?error.message:'No se recibió una confirmación válida.';
 if(status===401)return 'Tu sesión ha expirado. Inicia sesión nuevamente para continuar. Conservamos el formulario; después comprueba el estado guardado antes de reintentar.';
 if(status===403)return 'La solicitud no está autorizada (HTTP 403). '+detail;
 if(status===409)return 'El producto cambió o hay un conflicto (HTTP 409). '+detail;
 if(status&&status>=500)return 'El servicio no pudo confirmar el guardado (HTTP '+status+'). '+detail+' Comprueba el estado antes de reintentar.';
 if(error instanceof Error&&['TypeError','TimeoutError','AbortError','SyntaxError'].includes(error.name))return 'No hubo respuesta del servicio o se agotó el tiempo. No podemos confirmar si se guardó; comprueba el estado antes de reintentar.';
 return status?'No se pudo guardar (HTTP '+status+'). '+detail:detail;
}
