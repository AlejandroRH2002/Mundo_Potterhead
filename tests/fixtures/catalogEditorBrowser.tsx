import {AdminNavigation} from '/src/shared/components/AdminNavigation';
import {CatalogManagement} from '/src/features/admin-catalog/pages/CatalogManagement';
import {Inventory} from '/src/features/inventory/pages/Inventory';
import {AdminUsers} from '/src/features/admin-users/pages/AdminUsers';
import {Profile} from '/src/features/auth/pages/Profile';
import {AdminMenu} from '/src/shared/components/AdminMenu';
import {Promotions} from '/src/features/promotions/pages/Promotions';
// Browser-only fixture: real components, simulated HTTP and storage.
import {StrictMode,useEffect,useState} from 'react';
import {AuthProvider} from '/src/features/auth/services/AuthProvider';
import {useAuth} from '/src/features/auth/services/authContext';
import {ProtectedRoute} from '/src/app/ProtectedRoute';
import {BrowserRouter,Routes,Route} from 'react-router-dom';
import {requestJson} from '/src/shared/lib/httpClient';
import {createRoot} from 'react-dom/client';
import {CatalogEditor} from '/src/features/admin-catalog/components/CatalogEditor';
import {ProductWizard} from '/src/features/admin-catalog/components/ProductWizard';
import type {ManagedProduct} from '/shared/catalogManagement';
import '/src/index.css';
export function EditorFixture(){
 const [value,setValue]=useState<ManagedProduct>(),[persisted,setPersisted]=useState<ManagedProduct>(),[baseline,setBaseline]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{void fetch('/api/qa-editor').then(response=>response.json()).then(data=>{setValue(data);setPersisted(data.id?data:undefined);setBaseline(JSON.stringify(data));});},[]);
 if(!value)return <p>Cargando editor de prueba</p>;
 const save=async(next:ManagedProduct)=>{setBusy(true);try{const saved=await requestJson<ManagedProduct>('/qa-editor',{method:'PUT',body:JSON.stringify(next)});setValue(saved);setPersisted(saved);setBaseline(JSON.stringify(saved));return saved;}finally{setBusy(false);}};
 const common={value,persisted,onChange:setValue,onUploadState:()=>{},onCancel:()=>{},busy,dirty:baseline!==JSON.stringify(value)};
 return <div data-qa-product-id={value.id??''}>{location.search.includes('wizard')?<ProductWizard {...common} onSave={save}/>:<CatalogEditor {...common} onClose={()=>{}} section="images" onSaveValue={save} onSave={()=>void save(value)}/>}</div>;
}
export function SessionEditorFixture(){const auth=useAuth();return <><button type="button" onClick={()=>void auth.logout()}>Cerrar sesión de prueba</button><EditorFixture/></>;}
createRoot(document.getElementById('root')!).render(<StrictMode>{location.search.includes('responsive')?<AuthProvider><BrowserRouter><AdminMenu/><div className="admin-workspace-layout"><AdminNavigation/><Routes><Route path="/admin/inventario" element={<Inventory/>}/><Route path="/admin/promociones" element={<Promotions/>}/><Route path="/admin/usuarios" element={<AdminUsers/>}/><Route path="/profile" element={<Profile/>}/><Route path="*" element={<CatalogManagement/>}/></Routes></div></BrowserRouter></AuthProvider>:location.search.includes('promotions')?<BrowserRouter><AdminMenu/><Promotions/></BrowserRouter>:location.search.includes('session')?<AuthProvider><BrowserRouter><Routes><Route element={<ProtectedRoute role="admin"/>}><Route path="/qa-editor" element={<SessionEditorFixture/>}/><Route path="/qa-other" element={<p>Otra vista interna</p>}/></Route><Route path="/login" element={<p>Sesión cerrada; formulario descartado</p>}/></Routes></BrowserRouter></AuthProvider>:<EditorFixture/>}</StrictMode>);
