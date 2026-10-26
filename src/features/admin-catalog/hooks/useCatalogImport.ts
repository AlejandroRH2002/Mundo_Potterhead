import { useEffect, useRef, useState } from 'react';
import { errorMessage } from '@/shared/lib/money';
import { uploadProductImage } from '@/features/admin-products/services/mediaService';
import { catalogService, type ImportInput } from '../services/catalogService';
import type { ImportRecord, ImportReport } from '../../../../shared/catalogManagement';

export function download(name:string,data:BlobPart,type:string){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function useCatalogImport(onApplied?:()=>void){
 const [rows,setRows]=useState<ImportRecord[]>([]),[images,setImages]=useState<Record<string,string>>({}),[request,setRequest]=useState<ImportInput>(),[preview,setPreview]=useState<{report:ImportReport;token:string}>();
 const [report,setReport]=useState<ImportReport>(),[busy,setBusy]=useState(false),[error,setError]=useState(''),[confirmed,setConfirmed]=useState(false),[history,setHistory]=useState<{id:string;createdAt:string;summary:ImportReport}[]>([]),[page,setPage]=useState(1);
 const inFlight=useRef(false);
 const run=async(work:()=>Promise<void>)=>{if(inFlight.current)return;inFlight.current=true;setBusy(true);setError('');try{await work();}catch(error){setError(errorMessage(error));}finally{inFlight.current=false;setBusy(false);}};
 const invalidate=()=>{setRequest(undefined);setPreview(undefined);setReport(undefined);setConfirmed(false);};
 useEffect(()=>{let ignore=false;void catalogService.history(page).then(value=>{if(!ignore)setHistory(value);}).catch(error=>{if(!ignore)setError(errorMessage(error));});return()=>{ignore=true;};},[page,report]);
 return {rows,images,preview,report,busy,error,confirmed,setConfirmed,history,page,setPage,
  template:(format:'csv'|'xlsx')=>run(async()=>{const files=await import('../../../../shared/catalogFiles');const data=format==='csv'?files.csvFile([files.templateRow]):new Uint8Array(files.workbookFile([files.templateRow])).buffer;download('plantilla-catalogo.'+format,data,format==='csv'?'text/csv;charset=utf-8':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');}),
  file:(file:File)=>run(async()=>{invalidate();setRows([]);if(file.size>15*1024*1024)throw new Error('Archivo mayor de 15 MB.');const files=await import('../../../../shared/catalogFiles');if(/\.csv$/i.test(file.name))setRows(files.recordsFromRows(files.parseCsv(await file.text())));else if(/\.xlsx$/i.test(file.name))setRows(files.parseWorkbook(new Uint8Array(await file.arrayBuffer())));else throw new Error('Selecciona CSV o XLSX sin macros.');}),
  zip:(file:File)=>run(async()=>{invalidate();if(file.size>15*1024*1024)throw new Error('El ZIP supera 15 MB.');const {imageArchive}=await import('../../../../shared/catalogFiles');const entries=imageArchive(new Uint8Array(await file.arrayBuffer()));const next:Record<string,string>={};for(const [name,bytes] of Object.entries(entries)){if(!/\.(png|jpe?g|webp)$/i.test(name))throw new Error('El ZIP solo puede contener imágenes PNG, JPEG o WebP.');const parts=name.split('/');const basename=parts[parts.length-1];if(next[basename]&&next[name]!==next[basename])throw new Error('Nombre de imagen repetido: '+basename);const type=/\.png$/i.test(name)?'image/png':/\.webp$/i.test(name)?'image/webp':'image/jpeg';const url=await uploadProductImage(new File([new Uint8Array(bytes).buffer],basename,{type}));if(url.startsWith('data:'))throw new Error('La importación de imágenes requiere almacenamiento de objetos.');next[name]=url;next[basename]=url;}setImages(next);}),
  simulate:()=>run(async()=>{setConfirmed(false);setPreview(undefined);setReport(undefined);const next={key:crypto.randomUUID(),rows,images};setRequest(next);setPreview(await catalogService.preview(next));}),
  apply:()=>run(async()=>{if(!confirmed||!request||!preview?.report.valid)throw new Error('Simula y confirma antes de importar.');setReport(await catalogService.apply(request,preview.token));setConfirmed(false);onApplied?.();}),
  downloadReport:()=>{if(report)download('informe-importacion.json',JSON.stringify(report,null,2),'application/json');},
 };
}
