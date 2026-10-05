import { Link } from 'react-router-dom';
import { figmaAssets } from '@/features/marketing/data/figmaAssets';
import { ResponsiveArtwork } from '@/features/marketing/components/ResponsiveArtwork';
import { Subscription } from '@/features/marketing/components/Subscription';
import { buttonClasses } from '@/shared/lib/buttonStyles';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ProductSelection } from '../components/ProductSelection';
import { useCatalog } from '../hooks/useCatalog';
const desktop=figmaAssets.worldsDesktop,mobile=figmaAssets.worldsMobile;
const worlds=[{title:'Star Wars',note:'Galaxias lejanas',desktop:desktop.imgImagen2,mobile:mobile.imgImagen2,q:'Star Wars'},{title:'Marvel',note:'Héroes cotidianos',desktop:desktop.imgImagen3,mobile:mobile.imgImagen3,q:'Marvel'},{title:'El Señor de los Anillos',note:'Leyendas de la Tierra Media',desktop:desktop.imgImagen4,mobile:mobile.imgImagen4,q:'El Señor de los Anillos'},{title:'Anime',note:'Historias sin límites',desktop:desktop.imgImagen5,mobile:mobile.imgImagen5,q:'Anime'},{title:'Gaming',note:'Pulsa start',desktop:desktop.imgImagen6,mobile:mobile.imgImagen6,q:'Gaming'}];
export function WorldsLanding(){
 const catalog=useCatalog('otros-universos');
 return <><section className="figma-hero figma-world-hero"><ResponsiveArtwork desktop={desktop.imgImagen} mobile={mobile.imgImagen} priority/><div className="figma-hero-overlay"/><div className="figma-hero-content"><Breadcrumbs items={[{label:'Inicio',to:'/'},{label:'Otros universos'}]}/><h1>Hay más mundos ahí fuera.</h1><p>Cruza nuevos portales y encuentra otra historia que también sea parte de ti.</p><Link className={buttonClasses()} to="#universos">Explorar colecciones</Link></div></section><div className="figma-container figma-sections">
 <section className="figma-story figma-harry-story"><ResponsiveArtwork desktop={desktop.imgImagen1} mobile={mobile.imgImagen1}/><div><p className="eyebrow">Nuestro corazón mágico</p><h2>El mundo de Harry Potter</h2><p>Casas, criaturas y reliquias para descubrir una nueva pieza de tu historia.</p><Link className={buttonClasses()} to="/?universe=harry-potter#catalogo">Entrar en la colección</Link></div></section>
 <section id="universos"><header className="section-heading"><p className="eyebrow">Otras historias, la misma pasión</p><h2>Explora por universo</h2></header><div className="figma-world-grid">{worlds.map(world=><Link key={world.title} className="figma-collection" to={'/otros-universos?universe=otros-universos&q='+encodeURIComponent(world.q)+'#catalogo'}><ResponsiveArtwork desktop={world.desktop} mobile={world.mobile}/><div><p>{world.note}</p><h3>{world.title}</h3></div></Link>)}</div></section>
 <ProductSelection items={catalog.items.slice(0,4)} loading={catalog.loading} error={catalog.error} title="Favoritos de otros universos" eyebrow="Cruza el portal"/><Subscription/>
 </div></>;
}
