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
