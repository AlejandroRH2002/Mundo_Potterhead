import { useProfile } from '../hooks/useProfile';
export function Profile() {
  const profile = useProfile();
  return <section className="shop-page"><h1 className="shop-title">Mi perfil</h1>
    <p className="mb-4">Rol: {profile.user?.role === 'admin' ? 'Administrador' : 'Cliente'}</p>
    <form className="shop-panel space-y-4" onSubmit={event => { event.preventDefault(); void profile.save(); }}>
      <label className="block">Nombre<input className="shop-input" required value={profile.name} onChange={event => profile.setName(event.target.value)} /></label>
      <label className="block">Correo de acceso<input className="shop-input" type="email" readOnly value={profile.email} /></label>
      <button className="shop-button" disabled={profile.saving}>{profile.saving ? 'Guardando…' : 'Guardar perfil'}</button>
      <p role="status">{profile.message}</p>
    </form>
  </section>;
}
