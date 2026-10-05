import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scrollIntent } from '../src/app/scrollPolicy.ts';
import { buttonClasses } from '../src/shared/lib/buttonStyles.ts';
const page=(pathname='/',search='',hash='')=>({pathname,search,hash});
test('navigation restores POP, scrolls routes up and confirmed filters to results',()=>{
 assert.equal(scrollIntent(page(),page('/product/1'),'PUSH',false),'top');
 assert.equal(scrollIntent(page(),page('/','?category=clothing'),'PUSH',false),'results');
 assert.equal(scrollIntent(page(),page('/','?q=varita'),'PUSH',false),'results');
 assert.equal(scrollIntent(page(),page('/','?category=clothing','#catalogo'),'PUSH',false),'catalog');
 assert.equal(scrollIntent(page('/product/1'),page(),'POP',true),'restore');
 assert.equal(scrollIntent(page(),page(),'PUSH',false),'none');
});
test('shared button styles define primary, secondary, tertiary and sizes',()=>{
 assert.match(buttonClasses(),/shop-button button-size-md/);assert.match(buttonClasses('secondary','sm'),/button-outline button-size-sm/);assert.match(buttonClasses('tertiary','icon'),/button-tertiary button-size-icon/);
 const button=readFileSync('src/shared/components/Button.tsx','utf8');assert.match(button,/disabled={disabled \|\| loading}/);assert.match(button,/aria-busy/);
});
test('banner desktop is capped and optional 2x is detected without mandatory assets',()=>{
 const css=readFileSync('src/index.css','utf8'),hero=readFileSync('src/features/catalog/components/StoreHero.tsx','utf8');
 assert.match(css,/\.photo-hero { max-width: 1280px; margin-inline: auto/);assert.match(css,/height: 65svh/);assert.match(css,/object-fit: contain; object-position: center; max-width: 1280px/);assert.match(hero,/__HAS_BANNER_2X__/);assert.match(hero,/banner\.jpg 1280w/);assert.match(hero,/banner@2x\.jpg 2560w/);
});
test('gallery and card media accept only valid available extra images',async()=>{
 const {createTestViteServer}=await import('./fixtures/viteServer.mjs');const server=await createTestViteServer();
 try{const {productImages}=await server.ssrLoadModule('/src/shared/lib/productMedia.ts');const product={image:'/images/product-placeholder.svg'};assert.deepEqual(productImages(product),[product.image]);assert.deepEqual(productImages({...product,images:[product.image,'javascript:bad','https://example.invalid/second.webp']}),[product.image,'https://example.invalid/second.webp']);}finally{await server.close();}
});

test('catalog layout is fluid and contact map renders a lazy iframe directly',()=>{
 const css=readFileSync('src/index.css','utf8');assert.match(css,/catalog-layout\{display:grid;grid-template-columns:minmax\(0,1fr\)/);assert.match(css,/nav-menu-toggle\{display:none!important/);
 const map=readFileSync('src/features/content/components/ContactMap.tsx','utf8');assert.match(map,/<iframe/);assert.match(map,/loading="lazy"/);assert.match(map,/allowFullScreen={false}/);assert.doesNotMatch(map,/Ver mapa|useState/);assert.match(map,/encodeURIComponent\(query\)/);
 for(const path of ['src/features/catalog/components/CatalogFilters.tsx','src/features/catalog/components/FeaturedOffers.tsx','src/features/content/components/ContactMap.tsx'])assert.doesNotMatch(readFileSync(path,'utf8'),/\bw-\[\d+px\]|\bw-screen\b/);
});

test('identical requests share transport and cancelling one consumer keeps others alive',async()=>{
 const {createTestViteServer}=await import('./fixtures/viteServer.mjs');const server=await createTestViteServer();
 try{const {deduplicatedRequests}=await server.ssrLoadModule('/src/shared/lib/deduplicate.ts');const get=deduplicatedRequests();let calls=0,finish,transport;const load=signal=>{calls++;transport=signal;return new Promise(resolve=>{finish=resolve;});};const a=new AbortController(),b=new AbortController();const first=get('same',load,a.signal);const second=get('same',load,b.signal);await Promise.resolve();a.abort();await assert.rejects(first,{name:'AbortError'});assert.equal(calls,1);assert.equal(transport.aborted,false);finish('ok');assert.equal(await second,'ok');
 const c=new AbortController();const last=get('other',load,c.signal);await Promise.resolve();c.abort();await assert.rejects(last,{name:'AbortError'});assert.equal(transport.aborted,true);
 }finally{await server.close();}
});

test('search URL preserves filters and sort, resets page, and clears blank q',async()=>{
 const {createTestViteServer}=await import('./fixtures/viteServer.mjs');const server=await createTestViteServer();
 try{const {catalogSearchUrl}=await server.ssrLoadModule('/src/shared/lib/catalogSearchUrl.ts');const link=new URL(catalogSearchUrl('?universe=harry-potter&category=clothing&subcategory=sueteres&sort=precio-desc&page=3&onSale=true','suéter azul'),'https://example.invalid');assert.equal(link.searchParams.get('category'),'clothing');assert.equal(link.searchParams.get('subcategory'),'sueteres');assert.equal(link.searchParams.get('sort'),'precio-desc');assert.equal(link.searchParams.get('page'),'1');assert.equal(link.searchParams.get('q'),'suéter azul');assert.equal(link.searchParams.get('onSale'),'true');assert.equal(link.hash,'#catalog-results');assert.equal(new URL(catalogSearchUrl(link.search,'  '),'https://example.invalid').searchParams.has('q'),false);
 }finally{await server.close();}
 const component=readFileSync('src/shared/components/CatalogSearch.tsx','utf8');assert.match(component,/aria-label="Buscar" title="Buscar"><Search/);assert.match(component,/enterKeyHint="search" autoComplete="off"/);assert.match(component,/aria-expanded={open}/);assert.match(component,/Limpiar búsqueda/);assert.doesNotMatch(readFileSync('src/features/catalog/components/CatalogPage.tsx','utf8'),/type="search"/);
 assert.equal(scrollIntent(page('/contact'),page('/','?q=tazas','#catalog-results'),'PUSH',false),'results');
});

import { validMapEmbedUrl } from '../src/features/content/components/mapUrl.ts';
test('map embeds allow only HTTPS Google embed paths',()=>{
 for(const url of ['https://www.google.com/maps/embed?pb=example','https://www.google.com/maps/embed/v1/place?key=example']) assert.equal(validMapEmbedUrl(url),url);
 for(const url of [undefined,'','http://www.google.com/maps/embed','https://evil.com/maps/embed','https://www.google.com.evil.com/maps/embed','https://www.google.com/maps/embed-evil','https://www.google.com/maps','https://user:pass@www.google.com/maps/embed','https://www.google.com:8443/maps/embed']) assert.equal(validMapEmbedUrl(url),null);
 const app=readFileSync('src/app/App.tsx','utf8');assert.match(app,/<Route path="\/contact" element={<Contact \/>} \/>/);
});

test('collections anchors are handled and mobile search stays inside the navigation',()=>{
 assert.equal(scrollIntent(page('/otros-universos'),page('/otros-universos','','#universos'),'PUSH',false),'anchor');
 assert.equal(scrollIntent(page('/otros-universos'),page('/otros-universos','','#universos'),'POP',true),'restore');
 const css=readFileSync('src/index.css','utf8');assert.match(css,/\.site-nav \.nav-search-shell \.search-open \{ top: \.5rem/);
 assert.match(readFileSync('src/shared/components/CatalogSearch.tsx','utf8'),/aria-label="Cerrar búsqueda"/);
 const theme=readFileSync('src/features/marketing/styles/figma.css','utf8');assert.match(theme,/flex: 0 0 1\.5rem/);assert.match(theme,/white-space: nowrap; overflow-x: auto/);
});
