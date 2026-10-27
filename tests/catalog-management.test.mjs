import test, {after} from 'node:test';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createTestViteServer} from './fixtures/viteServer.mjs';
import assert from 'node:assert/strict';
import {zipSync,unzipSync,strToU8,strFromU8} from 'fflate';
import {managedProductSchema,planImport} from '../shared/catalogManagement.ts';
import {parseCsv,recordsFromRows,csvFile,workbookFile,parseWorkbook,safeArchive,templateRow} from '../shared/catalogFiles.ts';
import {removeVariant,addVariant,duplicateModel} from '../src/features/admin-catalog/services/editorActions.ts';

const row={...templateRow,images:'https://images.test.invalid/a.webp'};
const vite=await createTestViteServer();after(()=>vite.close());
test('editor sections render separate controls instead of mixing data, variants and galleries',async()=>{
 const {CatalogEditor}=await vite.ssrLoadModule('/src/features/admin-catalog/components/CatalogEditor.tsx');
 const value=planImport([row]).products[0];const props={value,onChange:()=>{},onSave:()=>{},onClose:()=>{},onUploadState:()=>{},busy:false,dirty:true};
 const models=renderToStaticMarkup(createElement(CatalogEditor,{...props,section:'models'}));assert.match(models,/Datos del producto/);assert.doesNotMatch(models,/Quitar variante|Galería del producto/);
 const variants=renderToStaticMarkup(createElement(CatalogEditor,{...props,section:'variants'}));assert.match(variants,/Quitar variante/);assert.match(variants,/Precio compartido/);assert.doesNotMatch(variants,/type="file"|Datos del producto/);
 const images=renderToStaticMarkup(createElement(CatalogEditor,{...props,section:'images'}));assert.match(images,/type="file"/);assert.doesNotMatch(images,/Quitar variante|Datos del producto/);
});
test('editor removes unsaved variants immediately and stages saved removals without mutating the source',()=>{
 const original=planImport([row]).products[0];const empty=removeVariant(original,0,0);assert.equal(empty.models[0].variants.length,0);assert.equal(original.models[0].variants.length,1);assert.equal(empty.removedVariantIds,undefined);assert.equal(managedProductSchema.safeParse(empty).success,true);
 original.models[0].variants[0].id='existing-sku';const pending=removeVariant(original,0,0);assert.deepEqual(pending.removedVariantIds,['existing-sku']);assert.equal(pending.models[0].variants.length,0);
 assert.equal(managedProductSchema.safeParse({...original,removedVariantIds:['existing-sku']}).success,false);
});
test('editor creates independent SKU codes and copies models without saved identities',()=>{
 const original=planImport([row]).products[0];original.models[0].id='saved-model';original.models[0].variants[0].id='saved-sku';
 const added=addVariant(original,0);assert.equal(added.models[0].variants.length,2);assert.notEqual(added.models[0].variants[1].code,original.models[0].variants[0].code);
 const copy=duplicateModel(original,0).models[1];assert.equal(copy.id,undefined);assert.equal(copy.variants[0].id,undefined);assert.notEqual(copy.code,original.models[0].code);assert.notEqual(copy.variants[0].code,original.models[0].variants[0].code);assert.equal(copy.active,false);assert.deepEqual(copy.images,original.models[0].images);
});
test('CSV and XLSX templates round-trip values, multiline descriptions and colors',()=>{
 const data=[{...row,description:'Tela, suave\nTexto "citado" & <seguro>'}];
 assert.deepEqual(recordsFromRows(parseCsv(csvFile(data))),data);
 assert.deepEqual(parseWorkbook(workbookFile(data)),data);
 assert.equal(planImport(data).errors.length,0);
});
test('imports group product > models > size/color variants and report duplicate SKU per row',()=>{
 const rows=[row,{...row,sku:'GRY-A-M-RED',color:'Rojo'},{...row,modelCode:'GRY-B',modelName:'Diseño B',sku:'GRY-B-L',size:'l'}];
 const plan=planImport(rows);assert.equal(plan.errors.length,0);assert.equal(plan.products.length,1);assert.equal(plan.products[0].models.length,2);assert.equal(plan.products[0].models[0].variants.length,2);
 const duplicate=planImport([row,row]);assert.equal(duplicate.errors[0].row,3);
 const collision=planImport([row,{...row,sku:'OTHER',color:row.color.toUpperCase()}]);assert.ok(collision.errors.length);
});
test('invalid category size, unknown columns, image references and ambiguous stock modes are rejected',()=>{
 for(const invalid of [{size:'22'},{unexpected:'x'},{images:'javascript:alert(1)'},{images:'missing.jpg'},{quantity:'2'},{quantity:'-1',inventoryMode:'replace',reason:'Conteo'},{quantity:'3',inventoryMode:'increment',reason:'x'}])assert.ok(planImport([{...row,...invalid}]).errors.length);
 assert.equal(planImport([{...row,images:'local.jpg'}],{'local.jpg':'https://images.test.invalid/a.webp'}).errors.length,0);
});
test('schema rejects duplicate model/size/color and unknown fields; gallery budget is product-wide',()=>{
 const value=planImport([row]).products[0];assert.equal(managedProductSchema.safeParse({...value,unknown:true}).success,false);
 const model=value.models[0];assert.equal(managedProductSchema.safeParse({...value,models:[{...model,variants:[model.variants[0],{...model.variants[0],code:'OTHER'}]}]}).success,false);
 assert.equal(managedProductSchema.safeParse({...value,models:[{...model,images:Array.from({length:9},(_,i)=>'https://images.test.invalid/'+i)}]}).success,false);
});
test('CSV malformed quoting, repeated headers, formula injection and row limits',()=>{
 assert.throws(()=>parseCsv('a,b\n"unfinished'));
 assert.throws(()=>recordsFromRows(parseCsv('sku,sku\na,a')));
 assert.match(csvFile([{...row,name:'=HYPERLINK("bad")'}]),/"'=HYPERLINK/);
 assert.throws(()=>recordsFromRows([Object.keys(row),...Array.from({length:201},()=>Object.values(row))]));
});
test('ZIP paths, expanded size, XML entities, macros and workbook formulas are refused',()=>{
 assert.throws(()=>safeArchive(zipSync({'../escape.jpg':new Uint8Array([1])})));
 assert.throws(()=>safeArchive(zipSync({'huge.xml':new Uint8Array(31*1024*1024)})));
 const archive=zipSync({'xl/workbook.xml':strToU8('<!DOCTYPE evil><workbook/>')});assert.throws(()=>parseWorkbook(archive));
 const macro=zipSync({'xl/vbaProject.bin':new Uint8Array([1])});assert.throws(()=>parseWorkbook(macro));
 const formula=unzipSync(workbookFile([row]));formula['xl/worksheets/sheet1.xml']=strToU8(strFromU8(formula['xl/worksheets/sheet1.xml']).replace('<is>','<f>1+1</f><is>'));assert.throws(()=>parseWorkbook(zipSync(formula)),/fórmulas/);
});

test('inventory renders one row per SKU, explicit stock/count columns and disabled unchanged saves',async()=>{
 const {InventoryMatrix}=await vite.ssrLoadModule('/src/features/inventory/components/InventoryMatrix.tsx');
 const rows=[{id:'a',modelId:'m',productName:'Chamarra',name:'Diseño A',sku:'A-M',size:'m',color:'Rojo',quantity:0,version:1,active:true},{id:'b',modelId:'m',productName:'Chamarra',name:'Diseño A',sku:'A-L',size:'l',quantity:null,version:0,active:false}];
 let saves=0;const html=renderToStaticMarkup(createElement(InventoryMatrix,{rows,busy:false,showCodes:true,save:async()=>{saves++;return true;}}));
 assert.equal((html.match(/<tr/g)||[]).length,4);assert.match(html,/Existencias actuales/);assert.match(html,/Nueva cantidad/);assert.match(html,/Agotado/);assert.match(html,/Pendiente de conteo/);assert.match(html,/desactivada/);
 assert.equal((html.match(/disabled=""/g)||[]).length,2);assert.equal(saves,0);assert.match(html,/data-label="SKU"/);assert.equal((html.match(/id="count-(?:a|b)"/g)||[]).length,2);
});

test('image ZIP preflight rejects ambiguous names, empty images and unsafe files before upload',async()=>{
 const {imageArchive}=await import('../shared/catalogFiles.ts');
 const bytes=new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0]);
 assert.deepEqual(Object.keys(imageArchive(zipSync({'models/a.png':bytes,'models/b.png':bytes}))),['models/a.png','models/b.png']);
 for(const entries of [{'a/x.png':bytes,'b/x.png':bytes},{'a.png':bytes,'payload.html':bytes},{'a.png':new Uint8Array()},{'../a.png':bytes},{}])assert.throws(()=>imageArchive(zipSync(entries)));
});

test('simplified design CSV/XLSX templates round-trip without parent properties or required SKU',async()=>{
 const {designColumns}=await import('../shared/catalogManagement.ts');
 const rows=[{modelCode:'DESIGN-A',modelName:'Diseño A',sku:'',size:'one',color:'',quantity:''}];
 assert.deepEqual(recordsFromRows(parseCsv(csvFile(rows,designColumns)),'designs'),rows);
 assert.deepEqual(parseWorkbook(workbookFile(rows,designColumns),'designs'),rows);
 assert.throws(()=>recordsFromRows([['modelCode','modelName','price'],['A','A','1']],'designs'));
});
test('design planning inherits parent, generates stable SKU and rejects conflicting existing identities',async()=>{
 const {planDesignImport}=await import('../server/lib/designImport.ts');const parent=planImport([row]).products[0];
 const design={modelCode:'DESIGN-A',modelName:'Diseño nuevo',size:'m',color:'Azul'};
 const plan=planDesignImport(parent,[design,{...design,size:'l'}]);assert.equal(plan.errors.length,0);assert.deepEqual(plan.products[0].product,parent.product);assert.equal(plan.products[0].models[1].active,false);assert.equal(plan.products[0].models[1].images.length,0);
 const first=plan.products[0].models[1].variants[0].code;assert.equal(planDesignImport(parent,[design]).products[0].models[1].variants[0].code,first);
 assert.ok(planDesignImport(parent,[design,design]).errors.length);assert.ok(planDesignImport(parent,[{...design,size:'22'}]).errors.length);assert.ok(planDesignImport(parent,[{...design,price:'1'}]).errors.length);
 const saved=plan.products[0];assert.ok(planDesignImport(saved,[{...design,modelName:'Unexpected rename'}]).errors.length);assert.equal(planDesignImport(saved,[design]).designStats.existingSkus,1);
});
test('model photo administration shows own placeholders and paginated upload actions',async()=>{
 const {ModelPhotos}=await vite.ssrLoadModule('/src/features/admin-catalog/components/ModelPhotos.tsx');const value=planImport([row]).products[0];value.models[0].images=[];
 const html=renderToStaticMarkup(createElement(ModelPhotos,{value,onChange:()=>{},onBusy:()=>{},onSelect:()=>{}}));assert.match(html,/Pendiente de fotografía/);assert.match(html,/Sin imagen/);assert.match(html,/Agregar imagen/);assert.match(html,/product-placeholder.svg/);assert.doesNotMatch(html,/Publicar diseño al guardar/);
});

test('a base product can be edited before it has any designs or stock',async()=>{
 const {CatalogEditor}=await vite.ssrLoadModule('/src/features/admin-catalog/components/CatalogEditor.tsx');const value=planImport([row]).products[0];value.models=[];assert.equal(managedProductSchema.safeParse(value).success,true);
 for(const section of ['models','variants','images']){const html=renderToStaticMarkup(createElement(CatalogEditor,{value,section,onChange:()=>{},onSave:()=>{},onClose:()=>{},onUploadState:()=>{},busy:false,dirty:true}));assert.match(html,/Este producto aún no tiene diseños/);if(section!=='images')assert.match(html,/Agregar diseño/);}
});

test('product wizard preserves parent data while staging designs and refuses to silently drop counts',async()=>{
 const {stageDesigns,publicationProblem}=await import('../src/features/admin-catalog/services/productWizard.ts');const parent=planImport([row]).products[0];parent.models=[];
 const rows=Array.from({length:30},(_,i)=>({modelCode:'WIZARD-'+i,modelName:'Diseño nuevo '+i}));const staged=stageDesigns(parent,rows);assert.equal(staged.errors.length,0);assert.equal(staged.products[0].models.length,30);assert.deepEqual(staged.products[0].product,parent.product);assert.equal(parent.models.length,0);
 assert.equal(stageDesigns(staged.products[0],rows).products[0].models.length,30);assert.throws(()=>stageDesigns(parent,[{...rows[0],quantity:'2'}]),/existencias/);assert.match(publicationProblem(staged.products[0]),/fotografía/);
 const prepared=staged.products[0];prepared.models[0].images=['https://images.test.invalid/wizard.webp'];prepared.models[0].active=true;assert.equal(publicationProblem(prepared),undefined);prepared.models[1].active=true;assert.match(publicationProblem(prepared),/sin fotografía/);
});
test('removing a new design drops it while existing designs and options are only deactivated',async()=>{
 const {singleDesign,removeDesign}=await import('../src/features/admin-catalog/services/editorActions.ts');const parent=planImport([row]).products[0];const next=singleDesign(parent,'Único');assert.equal(next.models.at(-1).variants.length,1);assert.equal(removeDesign(next,1).models.length,1);
 parent.models[0].id='saved-model';parent.models[0].variants[0].id='saved-option';const removed=removeDesign(parent,0);assert.equal(removed.models.length,1);assert.equal(removed.models[0].id,'saved-model');assert.equal(removed.models[0].active,false);assert.equal(removed.models[0].variants[0].active,false);assert.equal(parent.models[0].active,true);
});
test('wizard screens separate general information, options, photos and final confirmation',async()=>{
 const {ProductWizard}=await vite.ssrLoadModule('/src/features/admin-catalog/components/ProductWizard.tsx');const value=planImport([row]).products[0];const props={value,onChange:()=>{},onSave:async()=>{},onCancel:()=>{},onUploadState:()=>{},busy:false,dirty:true};
 const screens=[0,1,2,3].map(initialStep=>renderToStaticMarkup(createElement(ProductWizard,{...props,initialStep})));
 assert.match(screens[0],/Datos del producto/);assert.doesNotMatch(screens[0],/type="file"|Quitar variante/);assert.match(screens[1],/Sin variantes: una sola opción/);assert.match(screens[1],/Importar varios diseños/);assert.match(screens[1],/<details><summary>Datos avanzados/);assert.doesNotMatch(screens[1],/Datos del producto/);assert.match(screens[2],/Fotografías de/);assert.match(screens[3],/Guardar borrador/);assert.match(screens[3],/Publicar producto/);assert.doesNotMatch(screens[3],/type="file"/);
});

test('employee inventory keeps internal codes behind advanced options',async()=>{
 const {InventoryMatrix}=await vite.ssrLoadModule('/src/features/inventory/components/InventoryMatrix.tsx');const row={id:'a',productName:'Producto',name:'Diseño',sku:'PRIVATE-CODE',size:'one',quantity:2,version:1,active:true};
 const html=renderToStaticMarkup(createElement(InventoryMatrix,{rows:[row],busy:false,save:async()=>true,showCodes:false}));assert.doesNotMatch(html,/<code>|data-label="SKU"/);assert.match(html,/Existencias por opción/);assert.match(html,/Nueva cantidad/);
});

test('inventory groups options by product and design without confusing identical names',async()=>{
 const {groupInventory}=await import('../src/features/inventory/services/inventoryPresentation.ts');const rows=[{id:'a',productId:'p1',modelId:'m1',name:'Hogwarts'},{id:'b',productId:'p1',modelId:'m1',name:'Hogwarts'},{id:'c',productId:'p2',modelId:'m2',name:'Hogwarts'}];const groups=groupInventory(rows);assert.equal(groups.length,2);assert.deepEqual(groups[0].rows.map(r=>r.id),['a','b']);assert.deepEqual(groups[1].rows.map(r=>r.id),['c']);
});
test('persisted thumbnails render after reload and missing design photos keep their own placeholder',async()=>{
 const {GalleryEditor}=await vite.ssrLoadModule('/src/features/admin-catalog/components/GalleryEditor.tsx'),{ModelPhotos}=await vite.ssrLoadModule('/src/features/admin-catalog/components/ModelPhotos.tsx');const full='https://images.test.invalid/saved-full.webp',thumb='https://images.test.invalid/saved-thumb.webp';
 const gallery=renderToStaticMarkup(createElement(GalleryEditor,{images:[full],thumbnails:{[full]:thumb},label:'Fotos',onChange:()=>{}}));assert.ok(gallery.includes('src="'+thumb+'"'));assert.ok(!gallery.includes('src="'+full+'"'));
 const value=planImport([row]).products[0];value.product.imageThumbnails={[full]:thumb};value.models=[{...value.models[0],code:'A',images:[full]},{...value.models[0],code:'B',name:'Otro diseño',images:[]}];const html=renderToStaticMarkup(createElement(ModelPhotos,{value,onChange:()=>{},onSelect:()=>{},onBusy:()=>{}}));assert.equal(html.split('src="'+thumb+'"').length-1,1);assert.match(html,/product-placeholder.svg/);
});

test('unsafe API/model/gallery sources never reach the rendered image URL',async()=>{
 const {SafeImage}=await vite.ssrLoadModule('/src/shared/components/SafeImage.tsx');
 for(const source of ['javascript:alert(1)','data:image/svg+xml,<svg onload=alert(1)>','blob:https://images.test.invalid/forged','https://evil.test/photo.png','/images/%253Csvg%253E']){const html=renderToStaticMarkup(createElement(SafeImage,{src:source,alt:'Preview'}));assert.match(html,/src="\/images\/product-placeholder.svg"/);assert.doesNotMatch(html,/onload=|javascript:|data:|blob:|evil.test/);}
 const {GalleryEditor}=await vite.ssrLoadModule('/src/features/admin-catalog/components/GalleryEditor.tsx');const html=renderToStaticMarkup(createElement(GalleryEditor,{images:['https://images.test.invalid/a.webp'],thumbnails:{'https://images.test.invalid/a.webp':'javascript:alert(1)'},label:'Gallery',onChange:()=>{}}));assert.doesNotMatch(html,/src="javascript:/);assert.match(html,/src="\/images\/product-placeholder.svg"/);
 const good=renderToStaticMarkup(createElement(SafeImage,{src:'https://images.test.invalid/products/a.webp',alt:'Preview'}));assert.match(good,/src="https:\/\/images.test.invalid\/products\/a.webp"/);
});
