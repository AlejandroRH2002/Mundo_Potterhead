import { useState, type FormEvent } from 'react';
export function useContactMessage() {
 const phone = import.meta.env.VITE_WHATSAPP_NUMBER?.trim() ?? '';
 const available = /^[1-9]\d{7,14}$/.test(phone);
 const [error,setError]=useState('');
 const send=(event:FormEvent<HTMLFormElement>)=>{
  event.preventDefault();setError('');
  if(!available){setError('WhatsApp no está configurado. Consulta nuestros canales de contacto.');return;}
  const data=new FormData(event.currentTarget);
  const message=['Hola, quisiera hacer una consulta en Mundo Potterhead.', 'Nombre: '+String(data.get('name')??'').trim(), 'Correo de contacto: '+String(data.get('email')??'').trim(), 'Motivo: '+String(data.get('reason')??'').trim(), '', String(data.get('message')??'').trim()].join('\n');
  window.location.assign('https://wa.me/'+phone+'?text='+encodeURIComponent(message));
 };
 return {send,error,available,phone};
}
