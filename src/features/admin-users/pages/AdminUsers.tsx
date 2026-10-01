import { Link } from 'react-router-dom';
import { useAdminUsers } from '../hooks/useAdminUsers';
export function AdminUsers() {
  const users = useAdminUsers();
  return <section className="shop-page">
    <Link className="shop-link" to="/admin">Volver a productos</Link>
    <h1 className="shop-title">Administración de usuarios</h1>
    {users.error && <div role="alert" className="shop-error">{users.error} <button className="shop-link" disabled={users.busy || users.loading} onClick={users.retry}>Reintentar listado</button></div>}
    <p role="status">{users.message}</p>
    <form className="shop-panel space-y-4" onSubmit={event => { event.preventDefault(); void users.create(); }}>
      <h2 className="text-xl font-bold">Crear usuario</h2>
      <fieldset disabled={users.busy} className="grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Datos de la nueva cuenta</legend>
        <label>Nombre<input className="shop-input" required maxLength={150} value={users.draft.name} onChange={event => users.setDraft({ ...users.draft, name: event.target.value })} /></label>
        <label>Correo<input className="shop-input" required type="email" maxLength={254} autoComplete="off" value={users.draft.email} onChange={event => users.setDraft({ ...users.draft, email: event.target.value })} /></label>
        <label>Contraseña inicial (mínimo 20 caracteres)<input className="shop-input" required type="password" minLength={20} maxLength={256} autoComplete="new-password" value={users.draft.password} onChange={event => users.setDraft({ ...users.draft, password: event.target.value })} /></label>
        <label>Rol<select className="shop-input" value={users.draft.role} onChange={event => users.setDraft({ ...users.draft, role: event.target.value === 'admin' ? 'admin' : 'user' })}><option value="user">Cliente</option><option value="admin">Administrador</option></select></label>
        <button className="shop-button" type="submit">{users.busy ? 'Guardando…' : 'Crear usuario'}</button>
      </fieldset>
    </form>
    {users.loading ? <p role="status">Cargando usuarios…</p> : !users.error && <>
      {!users.data.users.length ? <p>No hay usuarios en esta página.</p> : <div className="overflow-x-auto">
        <table className="w-full text-left"><caption className="sr-only">Usuarios y permisos</caption>
          <thead><tr>{['Nombre', 'Correo', 'Rol', 'Estado', 'Acciones'].map(label => <th className="p-3" scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{users.data.users.map(user => <tr key={user.id} className="border-t border-white/30">
            <th scope="row" className="p-3">{user.name || 'Sin nombre'}{user.id === users.ownId && ' (tu cuenta)'}</th><td className="p-3">{user.email}</td><td className="p-3">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</td><td className="p-3">{user.isActive ? 'Activo' : 'Inactivo'}</td>
            <td className="p-3 space-x-3">
              <button className="shop-link disabled:opacity-50" disabled={users.busy || user.id === users.ownId} aria-label={(user.isActive ? 'Desactivar ' : 'Activar ') + (user.name || user.email)} onClick={() => void users.change(user, { isActive: !user.isActive })}>{user.isActive ? 'Desactivar' : 'Activar'}</button>
              <button className="shop-link disabled:opacity-50" disabled={users.busy || user.id === users.ownId} aria-label={'Cambiar rol de ' + (user.name || user.email)} onClick={() => void users.change(user, { role: user.role === 'admin' ? 'user' : 'admin' })}>Cambiar a {user.role === 'admin' ? 'Cliente' : 'Administrador'}</button>
            </td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav aria-label="Páginas de usuarios" className="flex gap-4 my-5">
        <button className="shop-button" disabled={users.busy || users.page <= 1} onClick={() => users.setPage(users.page - 1)}>Anterior</button>
        <span>Página {users.page} · {users.data.total} usuarios</span>
        <button className="shop-button" disabled={users.busy || users.page * users.data.pageSize >= users.data.total} onClick={() => users.setPage(users.page + 1)}>Siguiente</button>
      </nav>
    </>}
  </section>;
}
