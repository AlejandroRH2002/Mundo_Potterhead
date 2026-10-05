import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { CatalogPage } from '../components/CatalogPage';
const StorefrontHome = lazy(() => import('./StorefrontHome').then(module => ({ default: module.StorefrontHome })));
export function Home() {
 const location = useLocation();
 const browsing = !!location.search || ['#catalogo','#catalog-results'].includes(location.hash);
 return browsing ? <CatalogPage universe="harry-potter" title="Todos los productos"/> : <Suspense fallback={<p className="figma-container" role="status">Cargando escaparate…</p>}><StorefrontHome/></Suspense>;
}
