import { m, useReducedMotion } from 'framer-motion';
import { BrandMark } from '@/shared/components/BrandMark';
import { buttonClasses } from '@/shared/lib/buttonStyles';
import { trustPoints } from '@/features/marketing/data/storefrontCopy';
import { Link } from 'react-router-dom';
import { categories, categoryLabels } from '../../../../shared/catalogTaxonomy.ts';
const paths = { clothing: 'M6 3L2 7l3 3 2-2v13h10V8l2 2 3-3-4-4-4 2h-4Z', accessories: 'M12 3l8 7-8 11-8-11Z M4 10h16M8 4l4 6 4-6', footwear: 'M4 5h6v8l9 3 2 5H3V11Z', toys: 'M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z', bags: 'M5 8h14l2 13H3ZM8 8V6a4 4 0 018 0v2' };
export function StoreHero() {
 const bannerSources = __HAS_BANNER_2X__ ? '/brand/banner.jpg 1280w, /brand/banner@2x.jpg 2560w' : '/brand/banner.jpg 1280w';
 const reduce = useReducedMotion();
 const entrance = (delay: number) => ({ initial: { opacity: 0, y: reduce ? 0 : 24 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduce ? 0.14 : 0.65, delay: reduce ? 0 : delay } });
 return <>
  <section className="store-hero photo-hero" aria-labelledby="store-hero-title">
   <picture className="hero-art"><source media="(max-width: 390px)" srcSet={bannerSources} sizes="100vw"/><img src="/brand/banner.jpg" srcSet={bannerSources} sizes="(min-width: 1280px) 1280px, 100vw" alt="" width={1280} height={720} fetchPriority="high" decoding="async"/></picture>
   <div className="hero-shade" aria-hidden="true"/>
   <div className="hero-copy"><m.h1 id="store-hero-title" className="hero-title" {...entrance(0.1)}>Mundo Potterhead<span>y otros universos</span></m.h1><m.p className="hero-note" {...entrance(0.22)}>Elige tus favoritos y cotiza por WhatsApp. Sin cobros en el sitio.</m.p><m.div className="hero-actions" {...entrance(0.38)}><Link className={buttonClasses()} to="/#catalogo">Ver catálogo <span aria-hidden="true">↗</span></Link><Link className={buttonClasses('secondary')} to="/?offers=1#catalogo">Ofertas</Link></m.div></div>
   <m.div className="hero-brand" {...entrance(0.5)}><BrandMark/></m.div><span className="hero-glint" aria-hidden="true"/>
  </section>
  <ul className="trust-strip" aria-label="Cómo funciona la cotización">{trustPoints.map(point=><li key={point.text}><span aria-hidden="true">{point.icon}</span>{point.text}</li>)}</ul>
  <section className="category-section" aria-labelledby="category-title"><div className="section-heading"><p className="eyebrow">Tu próxima pieza favorita</p><h2 id="category-title">Explora por categoría</h2></div><div className="category-grid">{categories.map((category,index)=><m.div key={category} initial={{opacity:0,y:reduce?0:24}} whileInView={{opacity:1,y:0}} viewport={{once:true,amount:0.2}} transition={{duration:reduce?0.14:0.45,delay:reduce?0:index*0.08}}><Link key={category} to={`/?category=${category}#catalogo`} className="category-tile"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true"><path d={paths[category]}/></svg><span>{categoryLabels[category]}</span><span aria-hidden="true">↗</span></Link></m.div>)}</div></section>
 </>;
}
