import { Link } from 'react-router-dom';
import { categories, categoryLabels } from '../../../../shared/catalogTaxonomy.ts';
const paths = { clothing: 'M6 3L2 7l3 3 2-2v13h10V8l2 2 3-3-4-4-4 2h-4Z', accessories: 'M12 3l8 7-8 11-8-11Z M4 10h16M8 4l4 6 4-6', footwear: 'M4 5h6v8l9 3 2 5H3V11Z', toys: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z', bags: 'M5 8h14l2 13H3ZM8 8V6a4 4 0 018 0v2' };
export function StoreHero() {
 return <>
  <section className="store-hero" aria-labelledby="store-hero-title">
   <div className="hero-copy"><p className="eyebrow">Objetos para historias extraordinarias</p><h1 id="store-hero-title">Mundo<br/><span>Potterhead</span></h1><p className="hero-description">Encuentra ese detalle que hace tu mundo un poco más mágico.</p><p className="hero-note">Explora, elige y cotiza por WhatsApp. Sin cobros en el sitio.</p><div className="hero-actions"><a className="shop-button" href="#catalogo">Ver catálogo <span aria-hidden="true">↗</span></a><Link className="button-outline" to="/?offers=1#catalogo">Ofertas</Link></div></div>
   <picture className="hero-art"><source media="(max-width: 767px)" srcSet="/brand/hero-ornament-mobile.svg" width="640" height="360"/><img src="/brand/hero-ornament.svg" alt="" width="1080" height="640" fetchPriority="high" decoding="async"/></picture>
  </section>
  <section className="category-section" aria-labelledby="category-title"><div className="section-heading"><p className="eyebrow">Tu próxima pieza favorita</p><h2 id="category-title">Explora por categoría</h2></div><div className="category-grid">{categories.map(category=><Link key={category} to={`/?category=${category}#catalogo`} className="category-tile"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d={paths[category]}/></svg><span>{categoryLabels[category]}</span><span aria-hidden="true">↗</span></Link>)}</div></section>
 </>;
}
