import { useState } from 'react';
import { Button } from '@/shared/components/Button';
export function ContactMap(){
 const [loaded,setLoaded]=useState(false);const query=import.meta.env.VITE_MAP_QUERY?.trim();if(!query)return null;
 const link='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(query);
 let embed='https://www.google.com/maps?output=embed&q='+encodeURIComponent(query);
 try{const url=new URL(import.meta.env.VITE_MAP_EMBED_URL||'');if(url.origin==='https://www.google.com'&&url.pathname.startsWith('/maps/embed')&&!url.username&&!url.password)embed=url.href;}catch{/* Fall back to the configured address. */}
 return <section className="contact-map"><h2>Ubicación</h2><p>{query}</p>{loaded?<iframe src={embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" title={'Mapa: '+query}/>:<div className="map-preview"><span aria-hidden="true">⌖</span><Button onClick={()=>setLoaded(true)}>Ver mapa</Button></div>}<a className="shop-link" href={link} target="_blank" rel="noopener noreferrer">Abrir en Google Maps</a></section>;
}
