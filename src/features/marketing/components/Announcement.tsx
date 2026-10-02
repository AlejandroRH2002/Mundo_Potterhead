import { useState } from 'react';
import { announcementText } from '../data/storefrontCopy';
import { Button } from '@/shared/components/Button';
export function Announcement() {
 const [open,setOpen]=useState(true);
 return open ? <aside className="announcement" aria-label="Información de cotizaciones"><p>{announcementText}</p><Button variant="tertiary" size="icon" aria-label="Cerrar anuncio" onClick={()=>setOpen(false)}>×</Button></aside> : null;
}
