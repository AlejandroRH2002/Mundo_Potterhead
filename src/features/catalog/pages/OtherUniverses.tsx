import { useLocation } from 'react-router-dom';
import { CatalogPage } from '../components/CatalogPage';
import { WorldsLanding } from './WorldsLanding';
export function OtherUniverses() { const location=useLocation();return location.search || location.hash==='#catalogo' ? <CatalogPage universe="otros-universos" title="Otros universos"/> : <WorldsLanding/>; }
