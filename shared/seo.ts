export const siteTitle = 'Mundo Potterhead';
export const siteDescription = 'Explora productos de Harry Potter y otros universos. Prepara tu cotización y confirma disponibilidad y entrega por WhatsApp.';
export const publicRoutes = {
  '/': { title: siteTitle, description: siteDescription },
  '/otros-universos': { title: 'Otros universos', description: 'Descubre accesorios y regalos de otros universos y solicita una cotización por WhatsApp.' },
  '/contact': { title: 'Contacto', description: 'Consulta nuestros canales de contacto para confirmar tu cotización y entrega.' },
  '/privacy': { title: 'Aviso de privacidad', description: 'Conoce cómo se tratan tu cuenta, sesión, preferencias locales y solicitudes por WhatsApp.' },
  '/terms': { title: 'Términos de la cotización', description: 'Consulta las condiciones del catálogo y las cotizaciones por WhatsApp, sin cobros en el sitio.' },
} as const;
export function siteOrigin(value: string | undefined): string | undefined {
  if (!value?.trim()) return undefined;
  const url = new URL(value.trim());
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') throw new Error('VITE_SITE_URL must be a public HTTPS origin.');
  return url.origin;
}
export function routeMetadata(path: string) {
  const entry = publicRoutes[path as keyof typeof publicRoutes];
  if (entry) return { ...entry, noindex: false };
  const title = path === '/cart' ? 'Mi cotización' : path === '/login' ? 'Iniciar sesión' : path === '/profile' ? 'Mi perfil' : path.startsWith('/admin') || path.startsWith('/products/') ? 'Administración' : 'Página no encontrada';
  return { title, description: 'Mundo Potterhead: catálogo y cotizaciones por WhatsApp.', noindex: true };
}
const xml = (value: string) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
export function discoveryFiles(origin: string | undefined) {
  return {
    robots: origin ? 'User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /products/\nDisallow: /profile\nDisallow: /login\nDisallow: /cart\nSitemap: ' + origin + '/sitemap.xml\n' : 'User-agent: *\nDisallow: /\n',
    sitemap: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + (origin ? Object.keys(publicRoutes).map(path => '<url><loc>' + xml(origin + path) + '</loc></url>').join('') : '') + '</urlset>\n',
  };
}
