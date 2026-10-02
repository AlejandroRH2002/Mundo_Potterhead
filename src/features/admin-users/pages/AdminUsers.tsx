import { InitialPassword } from '../components/InitialPassword';
import { adminLabels } from '../../../../shared/adminLabels';
import { Link } from 'react-router-dom';
import { useAdminUsers } from '../hooks/useAdminUsers';
export function AdminUsers() {
  const users = useAdminUsers();
  return <section className="shop-page admin-page">
    <Link className="shop-link" to="/admin">{adminLabels.products}</Link>
    <h1 className="shop-title">{adminLabels.usersTitle}</h1>
    {users.error && <div role="alert" className="shop-error">{users.error} <button className="shop-link" disabled={users.busy || users.loading} onClick={users.retry}>Reintentar listado</button></div>}
    <p role="status">{users.message}</p>
    {!users.formOpen && <button className="shop-button" onClick={users.openForm}>Crear usuario</button>}
    {users.formOpen && <form className="shop-panel space-y-4" onSubmit={event => { event.preventDefault(); void users.create(); }}>
      <h2 className="text-xl font-bold">Crear usuario</h2>
      <p id="account-delivery-note">El correo es el identificador de acceso: no se verifica ni se envían correos. Entrega la contraseña a la persona por un canal seguro.</p>
      <fieldset disabled={users.busy} aria-describedby="account-delivery-note" className="grid gap-4 md:grid-cols-2">
        <legend className="sr-only">Datos de la nueva cuenta</legend>
        <label>Nombre<input className="shop-input" required maxLength={150} value={users.draft.name} onChange={event => users.setDraft({ ...users.draft, name: event.target.value })} /></label>
        <label>Correo<input className="shop-input" required type="email" maxLength={254} autoComplete="off" value={users.draft.email} onChange={event => users.setDraft({ ...users.draft, email: event.target.value })} /></label>
        <InitialPassword value={users.draft.password} onChange={password => users.setDraft({ ...users.draft, password })} />
        <label>Rol<select className="shop-input" value={users.draft.role} onChange={event => users.setDraft({ ...users.draft, role: event.target.value === 'admin' ? 'admin' : 'user' })}><option value="user">Cliente</option><option value="admin">Administrador</option></select></label>
        <div className="admin-actions md:col-span-2"><button className="shop-button" type="submit">{users.busy ? 'Guardando…' : 'Crear usuario'}</button><button className="shop-link" type="button" onClick={users.closeForm}>Cancelar y limpiar</button></div>
      </fieldset>
    </form>}
    {users.loading ? <p role="status">Cargando usuarios…</p> : !users.error && <>
      {!users.data.users.length ? <p>No hay usuarios en esta página.</p> : <div className="admin-table-scroll overflow-x-auto">
        <table className="admin-table"><caption className="sr-only">Usuarios y permisos</caption>
          <thead><tr>{['Nombre', 'Correo', 'Rol', 'Estado', 'Acciones'].map(label => <th className="p-3" scope="col" key={label}>{label}</th>)}</tr></thead>
          <tbody>{users.data.users.map(user => <tr key={user.id} className="border-t border-white/30">
            <th scope="row" className="p-3"><span className="line-clamp-2 break-words">{user.name || 'Sin nombre'}{user.id === users.ownId && ' (tu cuenta)'}</span></th><td className="p-3">{user.email}</td><td className="p-3"><span className="admin-chip">{user.role === 'admin' ? 'Administrador' : 'Cliente'}</span></td><td className="p-3"><span className="admin-chip">{user.isActive ? 'Activo' : 'Inactivo'}</span></td>
            <td className="p-3"><div className="admin-actions">
              <button className="shop-link disabled:opacity-50" disabled={users.busy || user.id === users.ownId} aria-label={(user.isActive ? 'Desactivar ' : 'Activar ') + (user.name || user.email)} onClick={() => void users.change(user, { isActive: !user.isActive })}>{user.isActive ? 'Desactivar' : 'Activar'}</button>
              <button className="shop-link disabled:opacity-50" disabled={users.busy || user.id === users.ownId} aria-label={'Cambiar rol de ' + (user.name || user.email)} onClick={() => void users.change(user, { role: user.role === 'admin' ? 'user' : 'admin' })}>Cambiar a {user.role === 'admin' ? 'Cliente' : 'Administrador'}</button>
            </div></td>
          </tr>)}</tbody>
        </table>
      </div>}
      <nav aria-label="Páginas de usuarios" className="admin-actions my-5">
        <button className="shop-button" disabled={users.busy || users.page <= 1} onClick={() => users.setPage(users.page - 1)}>Anterior</button>
        <span>Página {users.page} · {users.data.total} usuarios</span>
        <button className="shop-button" disabled={users.busy || users.page * users.data.pageSize >= users.data.total} onClick={() => users.setPage(users.page + 1)}>Siguiente</button>
      </nav>
    </>}
  </section>;
}
