import { BrandMark } from './BrandMark';
import { Link } from 'react-router-dom';
export function Footer() {
 const name = import.meta.env.VITE_LEGAL_NAME?.trim();
 const email = import.meta.env.VITE_LEGAL_EMAIL?.trim();
 const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 const phone = import.meta.env.VITE_WHATSAPP_NUMBER ?? '';
 const validPhone = /^[1-9]\d{7,14}$/.test(phone);
 return <footer className="site-footer"><div className="footer-inner"><div className="footer-grid">
  <div><div className="footer-brand"><BrandMark/><h2>Mundo Potterhead</h2></div><p>Para quienes encuentran magia en los pequeños detalles. Tu selección, tu historia.</p><p className="mt-4">Catálogo y cotizaciones por WhatsApp. Sin cobros en el sitio.</p></div>
  <div><h3>Descubre</h3><ul><li><Link to="/#catalogo">Catálogo</Link></li><li><Link to="/?offers=1#catalogo">Ofertas</Link></li><li><Link to="/otros-universos">Otros universos</Link></li><li>{validPhone ? <a href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">Escríbenos por WhatsApp ↗</a> : <Link to="/contact">Contacto</Link>}</li></ul></div>
  <div><h3>Información</h3><ul><li><Link to="/privacy">Aviso de privacidad</Link></li><li><Link to="/terms">Términos de la cotización</Link></li><li><Link to="/contact">Ayuda y contacto</Link></li></ul>
   {/* REVISAR CON ASESOR LEGAL */}
   <p className="mt-4">Responsable: {name || 'Pendiente de configurar antes de publicar.'}</p><p>{validEmail ? <a href={'mailto:'+email}>{email}</a> : 'Contacto legal pendiente de configurar.'}</p>
  </div></div><div className="footer-bottom"><p>© {new Date().getFullYear()} Mundo Potterhead</p><p>La disponibilidad y el envío se confirman antes de aceptar la cotización.</p></div></div></footer>;
}
