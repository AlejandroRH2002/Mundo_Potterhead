import { Link } from 'react-router-dom';
import { ContactMap } from '../components/ContactMap';
import { ContactForm } from '../components/ContactForm';
import { ContactFaq } from '../components/ContactFaq';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { Subscription } from '@/features/marketing/components/Subscription';
import { FigmaIcon } from '@/features/marketing/components/FigmaIcon';
import { figmaAssets } from '@/features/marketing/data/figmaAssets';
const icons=figmaAssets.contactDesktop;
export function Contact(){
 const email=import.meta.env.VITE_LEGAL_EMAIL?.trim();const validEmail=email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
 const phone=import.meta.env.VITE_WHATSAPP_NUMBER?.trim()??'';const validPhone=/^[1-9]\d{7,14}$/.test(phone);
 return <><header className="figma-contact-heading"><div className="figma-container"><Breadcrumbs items={[{label:'Inicio',to:'/'},{label:'Contacto'}]}/><h1>Estamos al otro lado del portal.</h1><p>Cuéntanos qué necesitas. Coordinamos tu cotización y tus consultas por WhatsApp.</p></div></header>
 <div className="figma-container figma-sections"><div className="figma-contact-grid"><ContactForm/><aside className="figma-contact-sidebar"><section className="figma-contact-details"><h2>Atención al cliente</h2>{validEmail&&<p><FigmaIcon src={icons.imgMail}/><a className="contact-email" href={'mailto:'+email}><span>{email.split('@')[0]}</span><wbr/><span>@{email.split('@')[1]}</span></a></p>}<p><FigmaIcon src={icons.imgPhone}/>{validPhone?<a href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">+{phone}</a>:<span>Consulta nuestros canales de contacto.</span>}</p><p><FigmaIcon src={icons.imgMapPin}/><span>{import.meta.env.VITE_MAP_QUERY||'Consulta la ubicación por WhatsApp.'}</span></p></section><section className="figma-paper"><FigmaIcon src={icons.imgPackageSearch}/><h2>¿Dudas sobre tu cotización?</h2><p>La disponibilidad y la entrega se confirman directamente en la conversación.</p>{validPhone&&<a className="shop-link" href={'https://wa.me/'+phone} target="_blank" rel="noopener noreferrer">Consultar por WhatsApp</a>}</section><ContactMap/></aside></div>
 <section className="figma-faq"><header className="section-heading"><p className="eyebrow">Respuestas sin acertijos</p><h2>Preguntas frecuentes</h2><p>Lo esencial sobre cotizaciones, disponibilidad y entrega.</p></header><ContactFaq/></section><Subscription/>
 <p className="text-sm"><Link className="shop-link" to="/terms">Consulta los términos de la cotización</Link></p></div></>;
}
