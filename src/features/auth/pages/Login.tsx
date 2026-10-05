import { useLogin } from '../hooks/useLogin';
export function Login() {
  const login = useLogin();
  return <section className="shop-page login-page"><div className="shop-panel login-panel mx-auto max-w-lg">
    <p className="eyebrow">Mundo Potterhead</p><h1 className="shop-title">Accede a tu cuenta</h1>
    <p className="login-intro">Ingresa para acceder a tu cuenta.</p>
    {login.error && <p role="alert" className="shop-error">{login.error}</p>}
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void login.signIn(); }}>
      <label className="block">Correo<input className="shop-input" type="email" maxLength={254} required autoComplete="username" value={login.email} onChange={event => login.setEmail(event.target.value)} /></label>
      <label className="block">Contraseña<input className="shop-input" type="password" maxLength={256} required autoComplete="current-password" value={login.password} onChange={event => login.setPassword(event.target.value)} /></label>
      <button className="shop-button" aria-busy={login.busy} disabled={login.busy}>{login.busy ? 'Verificando…' : 'Iniciar sesión'}</button>
    </form>
  </div></section>;
}
