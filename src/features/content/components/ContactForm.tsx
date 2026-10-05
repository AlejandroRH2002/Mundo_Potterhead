import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { FigmaIcon } from '@/features/marketing/components/FigmaIcon';
import { figmaAssets } from '@/features/marketing/data/figmaAssets';
import { useContactMessage } from '../hooks/useContactMessage';
export function ContactForm(){
 const contact=useContactMessage();
 return <form className="figma-contact-form figma-paper" onSubmit={contact.send}>
 <h2>Escríbenos</h2><p>Tu mensaje se abrirá en WhatsApp. Tú decides enviarlo; no se guarda en el sitio.</p>
 <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
 <label>Nombre<input className="shop-input" name="name" required maxLength={150} autoComplete="name" placeholder="Tu nombre"/></label>
 <label>Correo de contacto<input className="shop-input" name="email" type="email" maxLength={254} autoComplete="email" placeholder="tuemail@ejemplo.com"/></label>
 <label className="md:col-span-2">Motivo de contacto<select className="shop-input" name="reason"><option>Información de productos</option><option>Mi cotización</option><option>Disponibilidad y envío</option><option>Otra consulta</option></select></label>
 <label className="md:col-span-2">Mensaje<textarea className="shop-input" name="message" required maxLength={2000} rows={5} placeholder="Cuéntanos cómo podemos ayudarte…"/></label>
 </div>
 <label className="figma-consent"><input type="checkbox" required/> He leído el <Link className="shop-link" to="/privacy">aviso de privacidad</Link>.</label>
 <Button type="submit" disabled={!contact.available}>Consultar por WhatsApp <FigmaIcon src={figmaAssets.contactDesktop.imgSend}/></Button>
 {!contact.available && <p role="status">WhatsApp pendiente de configurar.</p>}{contact.error && <p role="alert" className="shop-error">{contact.error}</p>}
 </form>;
}
