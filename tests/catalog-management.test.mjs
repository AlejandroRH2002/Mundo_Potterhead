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
 const models=renderToStaticMarkup(createElement(CatalogEditor,{...props,section:'models'}));assert.match(models,/Datos del producto/);assert.doesNotMatch(models,/Quitar variante|type="file"/);
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
