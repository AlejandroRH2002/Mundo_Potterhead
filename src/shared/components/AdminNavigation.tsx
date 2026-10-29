import {NavLink,Outlet} from 'react-router-dom';
import {useAuth} from '@/features/auth/services/authContext';
export function AdminNavigation(){return <nav className="admin-section-navigation" aria-label="Secciones administrativas">{[['/admin/catalogo','Productos'],['/admin/inventario','Inventario'],['/admin/promociones','Promociones'],['/admin/usuarios','Usuarios'],['/profile','Mi perfil']].map(([to,label])=><NavLink key={to} to={to}>{label}</NavLink>)}</nav>;}
export function AdminLayout(){const {user}=useAuth();return <div className={user?.role==='admin'?'admin-workspace-layout':undefined}>{user?.role==='admin'&&<AdminNavigation/>}<Outlet/></div>;}
