import { validMapEmbedUrl } from './mapUrl';
const configuredEmbed = import.meta.env.VITE_MAP_EMBED_URL?.trim();
const validEmbed = validMapEmbedUrl(configuredEmbed);
if (configuredEmbed && !validEmbed && import.meta.env.DEV) console.warn('VITE_MAP_EMBED_URL inválida: se requiere HTTPS en www.google.com con ruta /maps/embed.');
export function ContactMap() {
 const query = import.meta.env.VITE_MAP_QUERY?.trim();
 const embed = validEmbed || (query ? 'https://www.google.com/maps?q=' + encodeURIComponent(query) + '&output=embed' : null);
 if (!embed) return <p className="text-gray-600">Consulta la ubicación por WhatsApp.</p>;
 const link = query ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(query) : validEmbed!;
 return <section className="contact-map">
  <h2>Ubicación</h2>
  <div className="contact-map-frame"><iframe src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={query ? 'Mapa de ubicación: ' + query : 'Mapa de ubicación del negocio'} allowFullScreen={false} /></div>
  <a className="shop-link" href={link} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a>
  {query && <p>{query}</p>}
 </section>;
}
