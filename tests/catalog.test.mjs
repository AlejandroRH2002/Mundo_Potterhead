import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCatalogQuery, parseCatalogUrl, serializeCatalogQuery, filterCatalog } from '../shared/catalogQuery.ts';
import { catalogWhere, catalogOrder } from '../server/repositories/catalog.ts';
import { createApi } from '../server/http/app.ts';
import { createAuth } from './fixtures/memoryAuth.ts';
import { createProductRepository } from './fixtures/memoryProducts.ts';
const draft = { name: 'Suéter Gryffindor', description: 'Tejido', price: 100, image: '/images/product-placeholder.svg', category: 'clothing', subcategory: 'sueteres', universe: 'harry-potter' };
test('URL round trip, legacy offers, dependent filters and invalid input', () => {
 const query=parseCatalogQuery(new URLSearchParams('universe=harry-potter&category=clothing&subcategory=sueteres&onSale=true&minPrice=10&maxPrice=200&q=magia&sort=precio-desc&page=2&pageSize=12'));
 assert.deepEqual(parseCatalogQuery(serializeCatalogQuery(query)),query);
 const offers=parseCatalogUrl(new URLSearchParams('offers=1'),'harry-potter');assert.equal(offers.onSale,true);assert.equal(offers.universe,undefined);
 assert.equal(parseCatalogUrl(new URLSearchParams('universe=all&category=clothing'),'harry-potter').universe,undefined);
 for (const value of ['subcategory=sueteres','category=toys&subcategory=sueteres','minPrice=20&maxPrice=10','onSale=1','page=0','pageSize=101','q=a&q=b','unknown=x','minPrice=NaN','sort=random']) assert.throws(()=>parseCatalogQuery(new URLSearchParams(value)),value);
 assert.equal(parseCatalogUrl(new URLSearchParams('category=invalid'),'harry-potter').category,undefined);
});
test('parameterized SQL applies filters without interpolating user input', () => {
 const query=parseCatalogQuery(new URLSearchParams("category=clothing&subcategory=sueteres&q=%25_%27&onSale=true&minPrice=1&maxPrice=200"));
 const sql=catalogWhere(query);assert.ok(!sql.text.includes(query.q));assert.ok(sql.values.includes('sueteres'));assert.ok(sql.values.includes(true));
 assert.match(catalogOrder({...query,sort:'descuento'}).text,/originalPrice/);
 assert.ok(!catalogWhere(query,['category','subcategory']).values.includes('sueteres'));
});
test('listing API validates, filters, sorts, paginates and returns cascading facets without inline images', async () => {
 const repository=createProductRepository([]);
 repository.create({...draft,name:'Uno',price:100,originalPrice:200,isOnSale:true});
 repository.create({...draft,name:'Dos',price:200});
 repository.create({...draft,name:'Sudadera',subcategory:'sudaderas',price:50});
 repository.create({...draft,name:'Otro universo',universe:'otros-universos',price:150});
 const auth=await createAuth([]);const api=createApi({auth,products:repository,origin:'http://localhost:5173',logger:()=>{}});
 await new Promise(resolve=>api.listen(0,'127.0.0.1',resolve));const base='http://127.0.0.1:'+api.address().port+'/api/products';
 try {
  const response=await fetch(base+'?universe=harry-potter&category=clothing&subcategory=sueteres&sort=precio-asc&pageSize=1');assert.equal(response.status,200);
  const page=await response.json();assert.equal(page.total,2);assert.equal(page.items[0].name,'Uno');assert.equal(page.facets.subcategory.sudaderas,1);assert.equal(page.facets.universe['otros-universos'],1);
  const second=await (await fetch(base+'?universe=harry-potter&category=clothing&subcategory=sueteres&sort=precio-asc&pageSize=1&page=2')).json();assert.equal(second.items[0].name,'Dos');
  const sale=await (await fetch(base+'?onSale=true&minPrice=80&maxPrice=120&q=uno&sort=descuento')).json();assert.equal(sale.total,1);
  for(const query of ['category=toys&subcategory=sueteres','page=0','unknown=x'])assert.equal((await fetch(base+'?'+query)).status,400);
  assert.equal(filterCatalog(repository.list(),parseCatalogQuery(new URLSearchParams('q=nada'))).total,0);
 } finally {await new Promise(resolve=>api.close(resolve));}
});

test('catalog without query never selects a universe, including invalid bookmarks',()=>{assert.equal(parseCatalogUrl(new URLSearchParams(),'harry-potter').universe,undefined);assert.equal(parseCatalogUrl(new URLSearchParams('category=invalid'),'harry-potter').universe,undefined);});

test('concurrent database listings serialize consumers and aggregate facets once',async()=>{
 const {createDatabaseProducts}=await import('../server/repositories/products.ts');let active=0,max=0,facets=0;
 const db={$queryRaw:async sql=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,4));active--;if(sql.text.includes('UNION ALL')){facets++;return [{field:'category',value:'clothing',count:1n}];}return [{items:[{...draft,id:'fixture',imageUrl:draft.image,originalPrice:null,isOnSale:false}],total:1n}];}};
 const repository=createDatabaseProducts(db);const q=parseCatalogQuery(new URLSearchParams());const pages=await Promise.all(Array.from({length:6},()=>repository.search(q)));
 assert.equal(pages.length,6);assert.equal(max,1);assert.equal(facets,1);assert.equal(pages[0].facets.category.clothing,1);
});
