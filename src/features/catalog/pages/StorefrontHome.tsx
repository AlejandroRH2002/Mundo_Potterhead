import { Link } from 'react-router-dom';
import { figmaAssets } from '@/features/marketing/data/figmaAssets';
import { ResponsiveArtwork } from '@/features/marketing/components/ResponsiveArtwork';
import { FigmaIcon } from '@/features/marketing/components/FigmaIcon';
import { Subscription } from '@/features/marketing/components/Subscription';
import { buttonClasses } from '@/shared/lib/buttonStyles';
import { ProductSelection } from '../components/ProductSelection';
import { useCatalog } from '../hooks/useCatalog';
const desktop = figmaAssets.homeDesktop, mobile = figmaAssets.homeMobile;
const collections = [
 { title: 'Harry Potter', note: 'Castillos, varitas y reliquias', desktop: desktop.imgImagen, mobile: mobile.imgImagen, to: '/?universe=harry-potter#catalogo', className: '' },
 { title: 'Ropa y accesorios', note: 'Lleva tu historia', desktop: desktop.imgImagen1, mobile: mobile.imgImagen1, to: '/?category=clothing#catalogo', className: '' },
 { title: 'Hogar mágico', note: 'Detalles para tus espacios', desktop: desktop.imgImagen2, mobile: desktop.imgImagen2, to: '/?category=accessories#catalogo', className: 'figma-desktop-collection' },
 { title: 'Coleccionables', note: 'Piezas para descubrir', desktop: desktop.imgImagen3, mobile: desktop.imgImagen3, to: '/?category=toys#catalogo', className: 'figma-desktop-collection' },
 { title: 'Otros universos', note: 'Más mundos por descubrir', desktop: mobile.imgImagen2, mobile: mobile.imgImagen2, to: '/otros-universos', className: 'figma-mobile-collection' },
];
export function StorefrontHome() {
 const catalog = useCatalog('harry-potter');
 return <>
  <section className="figma-hero" aria-labelledby="welcome-title"><ResponsiveArtwork desktop={desktop.imgEscena} mobile={mobile.imgEscena} priority/><div className="figma-hero-overlay"/><div className="figma-hero-content"><p className="figma-insignia">Objetos para historias extraordinarias</p><h1 id="welcome-title">Tu próximo objeto favorito te está esperando.</h1><p>Regalos y coleccionables para quienes saben que la magia vive fuera de los libros.</p><div className="hero-actions"><Link className={buttonClasses()} to="/#catalogo">Explorar productos <FigmaIcon src={desktop.imgArrowRight}/></Link><Link className={buttonClasses('secondary')} to="/?sort=novedad#catalogo">Ver novedades</Link></div></div></section>
  <div className="figma-container figma-sections">
   <ul className="figma-trust" aria-label="Cómo funciona la cotización">{[{icon:desktop.imgTruck,title:'Envíos a confirmar',note:'Coordina la entrega por WhatsApp'},{icon:desktop.imgShieldCheck,title:'Cotización sin cobros',note:'Sin pagos dentro del sitio'},{icon:desktop.imgSparkles,title:'Catálogo por universos',note:'Encuentra tus historias favoritas'},{icon:desktop.imgGift,title:'Ideas para regalar',note:'Consulta disponibilidad'}].map(item=><li key={item.title}><span><FigmaIcon src={item.icon}/></span><div><strong>{item.title}</strong><p>{item.note}</p></div></li>)}</ul>
   <section><header className="section-heading"><p className="eyebrow">Encuentra tu camino</p><h2>Elige una puerta de entrada</h2><p>Colecciones para descubrir y volver a sentir tus historias favoritas.</p></header><div className="figma-collections">{collections.map(item=><Link key={item.title} to={item.to} className={'figma-collection '+item.className}><ResponsiveArtwork desktop={item.desktop} mobile={item.mobile}/><div><h3>{item.title}</h3><p>{item.note}</p></div></Link>)}</div></section>
   <ProductSelection items={catalog.items.slice(0,4)} loading={catalog.loading} error={catalog.error} title="Piezas para tu próxima historia" eyebrow="Descubre el catálogo"/>
   <section className="figma-story"><ResponsiveArtwork desktop={desktop.imgImagen4} mobile={mobile.imgImagen3}/><div><p className="eyebrow">Hecho para emocionar</p><h2>Cada cotización empieza una pequeña historia.</h2><p>Elige tus favoritos y conversa con nosotros para confirmar precios, disponibilidad y entrega.</p><Link className={buttonClasses()} to="/contact">Conoce cómo podemos ayudarte</Link></div></section>
   <ProductSelection items={catalog.items.slice(-4)} loading={catalog.loading} error={catalog.error} title="Nuevas piezas, nuevos portales" eyebrow="Recién llegados"/>
   <Subscription/>
  </div>
 </>;
}
