import { Link } from 'react-router-dom';
import mpLogo from '@/shared/assets/images/MPLogo.jpg';
import { useNavigation } from '@/app/useNavigation';
export function Navbar() {
  const nav = useNavigation();
  return <nav className="sticky top-0 z-50 bg-red-950 text-white shadow-lg">
    <div className="mx-auto max-w-7xl px-4 min-h-20 flex items-center justify-between gap-4 flex-wrap py-3">
      <Link to="/" className="flex items-center gap-3"><img src={mpLogo} alt="" className="w-11 h-11 rounded-full" /><span className="font-cinzel text-amber-300 font-bold">Mundo Potterhead</span></Link>
      <button className="md:hidden shop-link" aria-expanded={nav.open} aria-controls="navigation-links" onClick={nav.toggle}>Menú</button>
      <div id="navigation-links" className={`${nav.open ? 'flex' : 'hidden'} md:flex flex-wrap items-center gap-5`}>
        <Link to="/">Tienda</Link><Link to="/otros-universos">Otros universos</Link><Link to="/contact">Contacto</Link>
        <Link className="shop-link" to="/cart" aria-label={`Carrito, ${nav.count} productos`}>Carrito ({nav.count})</Link>
        {nav.user?.role === 'admin' && <Link to="/admin">Administrar</Link>}
        {nav.user ? <><Link to="/profile">{nav.user.name}</Link><button disabled={nav.busy} onClick={() => void nav.logout()}>Cerrar sesión</button></> : <Link to="/login">Ingresar</Link>}
      </div>
      {nav.error && <p role="alert">{nav.error}</p>}
    </div>
  </nav>;
}
