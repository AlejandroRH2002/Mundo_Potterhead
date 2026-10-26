import { unzipSync, zipSync, strFromU8, strToU8 } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { importColumns, type ImportRecord } from './catalogManagement.ts';

export const templateRow:ImportRecord={productCode:'CHA-GRY',name:'Chamarra universitaria',description:'Describe materiales y diseño.',price:'780',category:'clothing',subcategory:'chamarras-capas',universe:'harry-potter',status:'draft',modelCode:'GRY-A',modelName:'Diseño A',sku:'GRY-A-M',size:'m',color:'Burdeos',images:'modelo-a.jpg',quantity:'',inventoryMode:'',reason:''};
const limits={compressed:15*1024*1024,expanded:30*1024*1024,entries:200,rows:201};
export function safeArchive(bytes:Uint8Array):Record<string,Uint8Array>{
 if(bytes.length>limits.compressed)throw new Error('El archivo supera 15 MB.');
 let total=0,count=0;const names=new Set<string>();
 return unzipSync(bytes,{filter:file=>{
  if(++count>limits.entries||!Number.isSafeInteger(file.originalSize)||(total+=file.originalSize)>limits.expanded||file.name.includes('\\')||file.name.split('/').includes('..')||file.name.startsWith('/')||file.name.includes(':'))throw new Error('ZIP inválido o demasiado grande.');
  if(names.has(file.name))throw new Error('Nombre repetido en el ZIP.');names.add(file.name);
  return !file.name.endsWith('/');
 }});
}
// Validate the entire image archive before any upload, including short-name aliases.
export function imageArchive(bytes:Uint8Array):Record<string,Uint8Array>{
 const entries=safeArchive(bytes),aliases=new Set<string>();
 if(!Object.keys(entries).length)throw new Error('El ZIP no contiene imágenes.');
 for(const name of Object.keys(entries)){
  if(!/\.(png|jpe?g|webp)$/i.test(name))throw new Error('El ZIP solo puede contener imágenes PNG, JPEG o WebP.');
  const parts=name.split('/'),basename=parts[parts.length-1];
  if(aliases.has(basename))throw new Error('Nombre de imagen ambiguo en el ZIP: '+basename);
  aliases.add(basename);
  if(!entries[name].length)throw new Error('El ZIP contiene una imagen vacía.');
 }
 return entries;
}
export function parseCsv(text:string):string[][]{
 if(text.length>2_000_000)throw new Error('CSV demasiado grande.');
 const rows:string[][]=[];let row:string[]=[],cell='',quoted=false,closed=false;
 text=text.replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
 for(let i=0;i<text.length;i++){
  const char=text[i];
  if(quoted){if(char==='"'){if(text[i+1]==='"'){cell+='"';i++;}else{quoted=false;closed=true;}}else cell+=char;}
  else if(char==='"'&&!cell&&!closed)quoted=true;
  else if(char===','||char==='\n'){row.push(cell);cell='';closed=false;if(char==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}
  else {if(closed||char==='"')throw new Error('Comillas CSV inválidas.');cell+=char;}
  if(cell.length>10000||row.length>importColumns.length||rows.length>limits.rows)throw new Error('Límite de filas, columnas o celda excedido.');
 }
 if(quoted)throw new Error('CSV con comillas sin cerrar.');row.push(cell);if(row.some(Boolean))rows.push(row);return rows;
}
export function recordsFromRows(rows:string[][]):ImportRecord[]{
 const headers=rows[0]?.map(value=>value.trim());
 if(!headers?.length||headers.length>importColumns.length||new Set(headers).size!==headers.length||headers.some(key=>!importColumns.includes(key as typeof importColumns[number])))throw new Error('Columnas desconocidas o duplicadas. Usa la plantilla.');
 for(const key of ['productCode','name','description','price','category','universe','modelCode','modelName','sku'])if(!headers.includes(key))throw new Error('Falta columna '+key);
 if(rows.length<2||rows.length>limits.rows)throw new Error('Importa de 1 a 200 filas por lote.');
 return rows.slice(1).map((row,index)=>{if(row.length>headers.length)throw new Error('Sobran columnas en fila '+(index+2));return Object.fromEntries(headers.map((key,i)=>[key,row[i]??'']));});
}
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const list=(v:unknown):unknown[]=>v===undefined?[]:Array.isArray(v)?v:[v];
const content=(v:unknown):string=>typeof v==='string'||typeof v==='number'?String(v):String(object(v)['#text']??'');
function xml(bytes:Uint8Array|undefined):Record<string,unknown>{
 if(!bytes)throw new Error('XLSX incompleto.');const text=strFromU8(bytes);
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw new Error('Declaraciones XML no permitidas.');
 return object(new XMLParser({ignoreAttributes:false,parseTagValue:false,processEntities:false}).parse(text));
}
const unescapeXml=(v:string)=>v.replace(/&(amp|lt|gt|quot|apos);/g,(_,name:string)=>({amp:'&',lt:'<',gt:'>',quot:'"',apos:"'"}[name]??''));
export function parseWorkbook(bytes:Uint8Array):ImportRecord[]{
 const entries=safeArchive(bytes);
 if(Object.keys(entries).some(name=>/vbaProject|externalLinks/i.test(name)))throw new Error('No se admiten macros ni referencias externas.');
 const workbook=object(xml(entries['xl/workbook.xml']).workbook);
 const sheet=object(list(object(workbook.sheets).sheet)[0]);
 const relations=list(object(xml(entries['xl/_rels/workbook.xml.rels']).Relationships).Relationship).map(object);
 const relation=relations.find(r=>r['@_Id']===sheet['@_r:id']);
 const target=String(relation?.['@_Target']??'').replace(/^\//,'');
 const path=target.startsWith('xl/')?target:'xl/'+target;
 if(!relation||relation['@_TargetMode']==='External'||path.split('/').includes('..'))throw new Error('Hoja XLSX inválida.');
 const strings=entries['xl/sharedStrings.xml']?list(object(xml(entries['xl/sharedStrings.xml']).sst).si).map(v=>{const si=object(v);return unescapeXml(si.t!==undefined?content(si.t):list(si.r).map(run=>content(object(run).t)).join(''));}):[];
 const sheetRows=list(object(object(xml(entries[path]).worksheet).sheetData).row);
 if(sheetRows.length>limits.rows)throw new Error('Máximo 200 filas de datos.');
 const rows=sheetRows.map(value=>{
  const row:string[]=[];
  for(const cellValue of list(object(value).c)){
   const cell=object(cellValue);if('f' in cell)throw new Error('No se admiten fórmulas; pega los valores.');
   const ref=String(cell['@_r']??'');const col=/^([A-Z]+)[1-9]\d*$/.exec(ref)?.[1];if(!col)throw new Error('Celda XLSX inválida.');
   let index=0;for(const letter of col)index=index*26+letter.charCodeAt(0)-64;index--;
   if(index>=importColumns.length)throw new Error('Demasiadas columnas.');
   let text=content(cell.v);if(cell['@_t']==='s'){const at=Number(text);if(!Number.isInteger(at)||at<0||at>=strings.length)throw new Error('Cadena XLSX inválida.');text=strings[at];}
   else if(cell['@_t']==='inlineStr'){const inline=object(cell.is);text=inline.t!==undefined?content(inline.t):list(inline.r).map(run=>content(object(run).t)).join('');}
   if(text.length>10000)throw new Error('Celda demasiado larga.');row[index]=unescapeXml(text);
  }
  return Array.from({length:row.length},(_,i)=>row[i]??'');
 });
 return recordsFromRows(rows);
}
const escapeXml=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
export function csvFile(rows:ImportRecord[]):string{return [importColumns.join(','),...rows.map(row=>importColumns.map(key=>'"'+( /^[=+@\-\t\r]/.test(row[key]??'')?"'":'')+(row[key]??'').replace(/"/g,'""')+'"').join(','))].join('\n');}
export function workbookFile(rows:ImportRecord[]):Uint8Array{
 const values=[importColumns.map(String),...rows.map(row=>importColumns.map(key=>row[key]??''))];
 const sheet='<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'+values.map((row,i)=>`<row r="${i+1}">`+row.map((value,j)=>`<c r="${String.fromCharCode(65+j)}${i+1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`).join('')+'</row>').join('')+'</sheetData></worksheet>';
 return zipSync(Object.fromEntries(Object.entries({
  '[Content_Types].xml':'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  '_rels/.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  'xl/workbook.xml':'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Catalogo" sheetId="1" r:id="rId1"/></sheets></workbook>',
  'xl/_rels/workbook.xml.rels':'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  'xl/worksheets/sheet1.xml':sheet,
 }).map(([key,value])=>[key,strToU8(value)])));
}
