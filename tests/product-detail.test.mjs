import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createTestViteServer} from './fixtures/viteServer.mjs';
import {detailFixture,relatedFixtures} from './fixtures/productDetail.mjs';
const vite=await createTestViteServer();after(()=>vite.close());
const {resolveProductDetail,commercialProductTitle}=await vite.ssrLoadModule('/src/features/catalog/services/productDetailSelection.ts');
test('one design selects its only SKU and multiple designs wait for an explicit choice',()=>{
 const product=detailFixture();assert.equal(resolveProductDetail(product).requiresModel,true);const single={...product,models:[product.models[1]]};const selected=resolveProductDetail(single);assert.equal(selected.selectedSku.id,'sku-b-one');assert.equal(selected.requiresModel,false);assert.equal(selected.selectedImage,'/test-media/b.svg');assert.equal(commercialProductTitle(product.name,'General'),product.name);assert.equal(commercialProductTitle(product.name,product.name),product.name);
});
test('design, size, gallery and commercial title resolve together without mutating persisted data',()=>{
 const product=detailFixture(),before=structuredClone(product);const first=resolveProductDetail(product,{model:{productId:product.id,id:'model-a'},sku:{modelId:'model-a',id:'sku-a-l'},image:{id:product.id,image:'/test-media/a-back.svg'}});assert.equal(first.title,'Playera temática — Gryffindor');assert.equal(first.selectedSku.id,'sku-a-l');assert.equal(first.selectedImage,'/test-media/a-back.svg');const next=resolveProductDetail(product,{model:{productId:product.id,id:'model-b'},sku:{modelId:'model-a',id:'sku-a-l'},image:{id:product.id,image:'/test-media/a-back.svg'}});assert.equal(next.selectedSku.id,'sku-b-one');assert.equal(next.selectedImage,'/test-media/b.svg');assert.match(next.title,/Reliquias/);assert.deepEqual(product,before);
});
test('legacy links and images remain valid; enforcement still rejects exhausted selections',()=>{
 const product=detailFixture();assert.equal(resolveProductDetail({...product,id:'another'},{model:{productId:product.id,id:'model-a'}}).selectedModel,undefined);const legacy={...product,models:undefined};assert.equal(resolveProductDetail(legacy).requiresModel,false);const exhausted=structuredClone(product);exhausted.inventoryMode='enforce';exhausted.models[0].skus[0].quantity=0;assert.equal(resolveProductDetail(exhausted,{model:{productId:product.id,id:'model-a'},sku:{modelId:'model-a',id:'sku-a-m'}}).requiresModel,true);const imageOnly=structuredClone(product);imageOnly.models=[{...product.models[1],images:[]}];assert.equal(resolveProductDetail(imageOnly).selectedImage,'/test-media/b.svg');
});
test('design choices expose full accessible names, selected state, thumbnails and own placeholder',async()=>{
 const {DesignPicker}=await vite.ssrLoadModule('/src/features/catalog/components/DesignPicker.tsx');const product=detailFixture();const html=renderToStaticMarkup(createElement(DesignPicker,{product,models:product.models,selectedId:'model-a',onSelect:()=>{}}));assert.equal((html.match(/class="design-choice"/g)??[]).length,3);assert.match(html,/aria-pressed="true"/);assert.ok(html.includes('aria-label="Elegir diseño '+product.models[1].name+'"'));assert.match(html,/a-thumb.svg/);assert.match(html,/product-placeholder.svg/);
});
test('related selection handles zero, one, two and more results without returning the current product',async()=>{const {selectRelatedProducts}=await vite.ssrLoadModule('/src/features/catalog/services/productDetailSelection.ts');for(const count of [0,1,2,4,8])assert.equal(selectRelatedProducts([detailFixture(),...relatedFixtures(count)],'detail-fixture').length,Math.min(count,4));});
test('gallery is controlled and uses optimized thumbnails without altering the selected full image',async()=>{
 const {ProductGallery}=await vite.ssrLoadModule('/src/features/catalog/components/ProductGallery.tsx');const product=detailFixture();const view=resolveProductDetail(product,{model:{productId:product.id,id:'model-a'}});const html=renderToStaticMarkup(createElement(ProductGallery,{product:view.galleryProduct,selectedImage:view.selectedImage,onSelect:()=>{}}));assert.ok(html.includes('src="/test-media/a-thumb.svg"'));assert.ok(html.includes('src="/test-media/a.svg"'));assert.match(html,/aria-pressed="true"/);
});
