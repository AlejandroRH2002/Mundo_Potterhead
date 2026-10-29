import {useEffect,useRef,useState} from 'react';
import {Button} from '@/shared/components/Button';
import {useAuth} from '../services/authContext';
import {errorMessage} from '@/shared/lib/money';
import type {UserSession} from '@/types/auth';

export function ReauthenticationDialog({account}:{account:UserSession}){
 const auth=useAuth(),dialog=useRef<HTMLDialogElement>(null),passwordInput=useRef<HTMLInputElement>(null);
 const [password,setPassword]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 useEffect(()=>{const node=dialog.current;node?.showModal();passwordInput.current?.focus();return()=>{node?.close();};},[]);
 return <dialog ref={dialog} className="session-reauth-dialog" aria-labelledby="reauth-title" aria-describedby="reauth-description" onCancel={event=>event.preventDefault()}><h2 id="reauth-title">Tu sesión ha expirado</h2><p id="reauth-description">Inicia sesión nuevamente para continuar. Conservamos este formulario en esta pestaña. No se volverá a publicar automáticamente.</p><form onSubmit={event=>{event.preventDefault();if(busy)return;setBusy(true);setError('');void auth.login(account.email,password).catch(cause=>setError(errorMessage(cause))).finally(()=>{setPassword('');setBusy(false);});}}><label>Correo de tu cuenta<input className="shop-input" autoComplete="username" type="email" readOnly value={account.email}/></label><label>Contraseña<input ref={passwordInput} className="shop-input" autoComplete="current-password" type="password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>{error&&<p className="shop-error" role="alert">{error}</p>}<div className="admin-actions"><Button loading={busy} type="submit">Iniciar sesión y conservar el formulario</Button><Button type="button" variant="secondary" disabled={busy} onClick={()=>{if(window.confirm('¿Descartar el formulario y cerrar sesión?'))void auth.logout().catch(()=>{});}}>Descartar y cerrar sesión</Button></div></form></dialog>;
}
