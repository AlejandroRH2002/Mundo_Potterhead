// REVISAR CON ASESOR LEGAL
export function LegalContact() {
  const name = import.meta.env.VITE_LEGAL_NAME?.trim();
  const email = import.meta.env.VITE_LEGAL_EMAIL?.trim();
  const validEmail = email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  return <div className="shop-panel">
    <p>Responsable: {name || 'Pendiente de configurar antes de publicar.'}</p>
    <p>Contacto: {validEmail ? <a className="shop-link" href={'mailto:' + email}>{email}</a> : 'Pendiente de configurar antes de publicar.'}</p>
  </div>;
}
