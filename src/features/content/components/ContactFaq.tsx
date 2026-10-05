import { useEffect, useState } from 'react';
import { contactFaq } from '../data/contactFaq';
export function ContactFaq() {
 const [desktop,setDesktop]=useState(()=>typeof window!=='undefined'&&window.matchMedia('(min-width: 768px)').matches);
 useEffect(()=>{const media=window.matchMedia('(min-width: 768px)');const update=()=>setDesktop(media.matches);media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
 return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{contactFaq.map((item,index)=><details className="figma-paper" key={item.question} open={desktop||index===0}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</div>;
}
