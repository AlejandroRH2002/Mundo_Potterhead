import {BrowserRouter} from 'react-router-dom';
import {Promotions} from '/src/features/promotions/pages/Promotions';
// Browser-only fixture: real components, simulated HTTP and storage.
import {StrictMode,useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {CatalogEditor} from '/src/features/admin-catalog/components/CatalogEditor';
import {ProductWizard} from '/src/features/admin-catalog/components/ProductWizard';
import type {ManagedProduct} from '/shared/catalogManagement';
import '/src/index.css';
export function EditorFixture(){
 const [value,setValue]=useState<ManagedProduct>(),[persisted,setPersisted]=useState<ManagedProduct>(),[baseline,setBaseline]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void fetch('/api/qa-editor').then(response=>response.json()).then(data=>{setValue(data);setPersisted(data.id?data:undefined);setBaseline(JSON.stringify(data));});},[]);
 if(!value)return <p>Cargando editor de prueba</p>;
 const save=async(next:ManagedProduct)=>{setBusy(true);try{const response=await fetch('/api/qa-editor',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(next)});if(!response.ok)throw Error('Guardado de prueba rechazado');const saved=await response.json();setValue(saved);setPersisted(saved);setBaseline(JSON.stringify(saved));return saved;}finally{setBusy(false);}};
 const common={value,persisted,onChange:setValue,onUploadState:()=>{},onCancel:()=>{},busy,dirty:baseline!==JSON.stringify(value)};
 return <div data-qa-product-id={value.id??''}>{location.search.includes('wizard')?<ProductWizard {...common} onSave={save}/>:<CatalogEditor {...common} onClose={()=>{}} section="images" onSaveValue={save} onSave={()=>void save(value)}/>}</div>;
}
createRoot(document.getElementById('root')!).render(<StrictMode>{location.search.includes('promotions')?<BrowserRouter><Promotions/></BrowserRouter>:<EditorFixture/>}</StrictMode>);
