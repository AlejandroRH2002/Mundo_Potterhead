export function detailFixture(){
 const option=(id,size,quantity=3)=>({id,code:'SKU-'+id,size,quantity,version:1,active:true,color:size==='l'?'Vino':''});
 return {id:'detail-fixture',name:'Playera temática',description:'Producto de prueba: características compartidas.',price:500,image:'/test-media/parent.svg',category:'clothing',subcategory:'playeras',universe:'harry-potter',inventoryMode:'capture',imageThumbnails:{'/test-media/a.svg':'/test-media/a-thumb.svg'},models:[
 {id:'model-a',sku:'DESIGN-A',name:'Gryffindor',image:'/test-media/a.svg',images:['/test-media/a.svg','/test-media/a-back.svg'],thumbnail:'/test-media/a-thumb.svg',active:true,quantity:null,version:1,skus:[option('sku-a-m','m'),option('sku-a-l','l')]},
 {id:'model-b',sku:'DESIGN-B',name:'Reliquias de la Muerte con un nombre comercial extraordinariamente largo que debe ocupar como máximo dos líneas',image:'/test-media/b.svg',images:['/test-media/b.svg'],active:true,quantity:null,version:1,skus:[option('sku-b-one','one')]},
 {id:'model-c',sku:'DESIGN-C',name:'Sin fotografía',image:null,images:[],active:true,quantity:null,version:0,skus:[option('sku-c-one','one',null)]},
 ]};
}
export function relatedFixtures(count){return Array.from({length:count},(_,index)=>({id:'related-'+index,name:'Producto relacionado '+index,description:'Descripción de prueba.',price:100+index,image:'/test-media/tiny.svg',thumbnail:'/test-media/tiny.svg',category:'bags',universe:'harry-potter',modelCount:1}));}
