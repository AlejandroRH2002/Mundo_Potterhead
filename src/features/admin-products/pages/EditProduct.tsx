import {Navigate,useParams} from 'react-router-dom';
import {safeInternalPath} from '@/shared/lib/safeInternalPath';
export function EditProduct(){const {id}=useParams();return <Navigate to={id?safeInternalPath('/admin/catalogo/'+encodeURIComponent(id)+'?view=edit'):'/admin/catalogo'} replace/>;}
