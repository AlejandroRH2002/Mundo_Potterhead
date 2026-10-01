import { Link } from 'react-router-dom';
import { LegalContact } from '../components/LegalContact';

// REVISAR CON ASESOR LEGAL
export function Privacy() {
  return <section className="shop-page space-y-5">
    <h1 className="shop-title">Aviso de privacidad</h1>
    <LegalContact />
    <h2 className="text-xl font-bold">Cuenta y acceso</h2>
    <p>Para las cuentas habilitadas, el servidor guarda nombre, correo, rol y un hash de la contraseña; no guarda la contraseña en texto legible. Estos datos permiten identificarte y controlar el acceso. La contraseña se transmite al servidor al iniciar sesión o registrar una cuenta.</p>
    <p>La sesión utiliza una cookie técnica HttpOnly y un identificador protegido en el servidor. Cerrar sesión revoca el acceso. Los controles de intentos usan un identificador derivado de la dirección IP; los registros técnicos incluyen ruta, estado y duración, sin cuerpos de mensajes, contraseñas ni cookies.</p>
    <h2 className="text-xl font-bold">Preferencias de este navegador</h2>
    <p>El carrito guarda identificadores de productos y cantidades en el almacenamiento local del navegador. Puedes vaciarlo desde el carrito o borrar los datos del sitio. No se registra una compra por añadir productos.</p>
    <p>Si usas la suscripción de novedades, el correo y la fecha se guardan solo en este navegador tras tu consentimiento. Es una simulación: no se envían correos. Puedes borrar esa preferencia eliminando los datos del sitio.</p>
    <h2 className="text-xl font-bold">WhatsApp</h2>
    <p>Al pulsar enviar, se abre WhatsApp con un mensaje de productos, cantidades y total. Tú decides enviarlo. El sitio no guarda ese mensaje como pedido; su envío y la conversación posterior se gestionan fuera del sitio mediante WhatsApp/Meta, conforme a sus condiciones y privacidad.</p>
    <p>Para consultas sobre tu cuenta y los datos tratados por el responsable, utiliza el contacto indicado arriba. El almacenamiento del navegador se conserva hasta que lo elimines; las sesiones vencen o se revocan. No se promete una eliminación automática de la cuenta.</p>
    <Link className="shop-link" to="/terms">Ver términos de la cotización</Link>
  </section>;
}
