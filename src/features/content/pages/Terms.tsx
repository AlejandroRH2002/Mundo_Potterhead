import { Link } from 'react-router-dom';
import { LegalContact } from '../components/LegalContact';

// REVISAR CON ASESOR LEGAL
export function Terms() {
  return <section className="shop-page legal-page space-y-5">
    <h1 className="shop-title">Términos de la cotización</h1>
    <LegalContact />
    <h2 className="text-xl font-bold">Catálogo y carrito</h2>
    <p>El sitio muestra un catálogo y permite preparar una cotización. Añadir productos al carrito o abrir WhatsApp no constituye una compra ni reserva existencias. No se realizan cobros en este sitio.</p>
    <h2 className="text-xl font-bold">Confirmación por WhatsApp</h2>
    <p>Los importes se muestran en pesos mexicanos (MXN). Antes de abrir WhatsApp, el carrito consulta los precios del catálogo; si cambian, debes revisar el total y volver a enviar. El envío no está incluido.</p>
    <p>El precio final, las ofertas aplicables, la disponibilidad y el costo y condiciones de entrega se confirman directamente por WhatsApp. Puedes aceptar o rechazar la cotización antes de acordar la operación fuera del sitio.</p>
    <p>Las imágenes son referencias del catálogo. Confirma características y cualquier condición de cambios o devoluciones con el responsable antes de aceptar la cotización.</p>
    <h2 className="text-xl font-bold">Datos y contacto</h2>
    <p>Envía únicamente la información necesaria para coordinar tu solicitud. La conversación de WhatsApp se realiza fuera de este sitio.</p>
    <Link className="shop-link" to="/privacy">Consultar el aviso de privacidad</Link>
  </section>;
}
