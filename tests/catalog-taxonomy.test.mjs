import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productDraftSchema } from '../shared/productSchema.ts';
import { taxonomy, inferSubcategory, belongsToCategory } from '../shared/catalogTaxonomy.ts';
import { backfillSubcategories } from '../server/catalog/backfill.ts';
const draft = { name: 'Suéter Gryffindor', description: 'Tejido', price: 100, image: '/images/product-placeholder.svg', category: 'clothing', subcategory: 'sueteres', universe: 'harry-potter' };
test('controlled taxonomy membership, nullable legacy data and inference', () => {
 assert.ok(productDraftSchema.safeParse(draft).success);
 assert.ok(productDraftSchema.safeParse({...draft,subcategory:null}).success);
 assert.ok(!productDraftSchema.safeParse({...draft,subcategory:'varitas'}).success);
 assert.ok(!productDraftSchema.safeParse({...draft,subcategory:'inventado'}).success);
 for (const [category, entries] of Object.entries(taxonomy)) { assert.equal(new Set(entries.map(e=>e.slug)).size,entries.length); for (const entry of entries) assert.ok(belongsToCategory(category,entry.slug)); }
 assert.equal(inferSubcategory('clothing','SUÉTER cálido'),'sueteres');
 assert.equal(inferSubcategory('clothing','Kimono Shinobu'),'disfraces-kimonos');
 assert.equal(inferSubcategory('toys','Sin identificar'),null);
});
test('all sixteen seed product names can be classified without loading image data', () => {
 const names = {
  accessories: ['Collar Giratiempo Hermione','Bufanda Gryffindor Deluxe','Varita Mágica Personalizada','Cáliz de Fuego Réplica','Katana de Tanjiro','Set de Pins Hashira','Máscara de Akaza'],
  clothing: ['Túnica Gryffindor Deluxe','Haori de Giyu Tomioka','Kimono Shinobu Kocho'],
  footwear: ['Zapatos Quidditch Pro'], toys: ['Peluche Hedwig Deluxe','Figura Nezuko Premium','Estatuilla Muzan Kibutsuji'], bags: ['Mochila Hogwarts Premium','Bolso Cazador de Demonios'],
 };
 let classified=0;for(const [category,products] of Object.entries(names))for(const name of products){assert.ok(inferSubcategory(category,name),name);classified++;}assert.equal(classified,16);
});
test('backfill defaults to dry-run, batches, skips classified rows and is idempotent', async () => {
 const rows=Array.from({length:205},(_,index)=>({id:String(index).padStart(4,'0'),name:'Suéter',description:'',category:'clothing',subcategory:null}));
 rows[0].subcategory='otros';rows[1].name='Desconocido';
 let calls=0,writes=0;const store={page:async(cursor,size)=>{calls++;assert.equal(size,100);return rows.filter(row=>row.id>cursor).slice(0,size);},assign:async(id,subcategory)=>{const row=rows.find(row=>row.id===id);if(row.subcategory!==null)return 0;row.subcategory=subcategory;writes++;return 1;}};
 const unknown=[];const dry=await backfillSubcategories(store,undefined,product=>unknown.push(product));assert.equal(dry.classified,203);assert.equal(dry.unclassified,1);assert.equal(writes,0);assert.equal(calls,4);assert.deepEqual(Object.keys(unknown[0]),['id','name']);
 const applied=await backfillSubcategories(store,true);assert.equal(applied.written,203);const again=await backfillSubcategories(store,true);assert.equal(again.written,0);assert.equal(writes,203);
});


test('expanded merchandise categories preserve legacy identifiers and validate every controlled subcategory',async()=>{
 const {categories,categoryLabels}=await import('../shared/catalogTaxonomy.ts');const {validSize}=await import('../shared/sizes.ts');const {parseCatalogQuery,filterCatalog}=await import('../shared/catalogQuery.ts');
 assert.equal(categories.length,11);assert.equal(new Set(categories).size,11);
 for(const category of categories){assert.ok(categoryLabels[category]);assert.ok(taxonomy[category].some(item=>item.slug==='otros'));assert.ok(validSize(category,'one'));for(const entry of taxonomy[category])assert.equal(productDraftSchema.safeParse({...draft,category,subcategory:entry.slug}).success,true);const query=parseCatalogQuery(new URLSearchParams({category,subcategory:'otros'}));assert.equal(filterCatalog([{...draft,id:category,category,subcategory:'otros'}],query).total,1);assert.equal(productDraftSchema.safeParse({...draft,category,subcategory:'not-a-subcategory'}).success,false);}
 for(const [category,subcategory] of [['accessories','joyeria'],['accessories','varitas'],['accessories','tazas-termos'],['accessories','papeleria'],['clothing','chamarras-capas'],['clothing','disfraces-kimonos'],['bags','bolsos-cangureras'],['toys','coleccionables']])assert.equal(productDraftSchema.safeParse({...draft,category,subcategory}).success,true);
 assert.equal(productDraftSchema.safeParse({...draft,category:'home',subcategory:'anillos'}).success,false);assert.equal(validSize('home','m'),false);
});
