// Loaded only by the browser QA virtual module, never the production entry point.
import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CatalogEditor} from '/src/features/admin-catalog/components/CatalogEditor';
import type {ManagedProduct} from '/shared/catalogManagement';
import '/src/index.css';

export function EditorFixture(){
 const [value,setValue]=useState<ManagedProduct>(),[baseline,setBaseline]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void fetch('/api/qa-editor').then(response=>response.json()).then(data=>{setValue(data);setBaseline(JSON.stringify(data));});},[]);
 if(!value)return <p>Cargando editor de prueba</p>;
 return <CatalogEditor value={value} onChange={setValue} onUploadState={()=>{}} onClose={()=>{}} busy={busy} dirty={baseline!==JSON.stringify(value)} section="images" onSave={()=>{
  setBusy(true);void fetch('/api/qa-editor',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(value)}).then(response=>response.json()).then(data=>{setValue(data);setBaseline(JSON.stringify(data));}).finally(()=>setBusy(false));
 }}/>;
}
createRoot(document.getElementById('root')!).render(<StrictMode><EditorFixture/></StrictMode>);
