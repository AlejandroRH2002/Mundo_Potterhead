import { parseCatalogUrl, serializeCatalogQuery } from '../../../shared/catalogQuery.ts';
export function catalogSearchUrl(search:string,text:string){
 const query=parseCatalogUrl(new URLSearchParams(search));const params=serializeCatalogQuery(query);const q=text.trim();if(q)params.set('q',q);else params.delete('q');params.set('page','1');return '/?'+params.toString()+'#catalog-results';
}
