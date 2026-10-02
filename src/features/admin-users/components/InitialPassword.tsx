import { useState } from 'react';
import { generatePassword } from '../services/generatePassword';
export function InitialPassword({ value, onChange }: { value: string; onChange: (value: string) => void }) {
 const [visible, setVisible] = useState(false);
 const [notice, setNotice] = useState('');
 const update = (password: string) => { setNotice(''); onChange(password); };
 const copy = async () => {
  const current = value;
  try { await navigator.clipboard.writeText(current); setNotice('Copiado'); }
  catch { setNotice('No se pudo copiar. Selecciona la contraseña y cópiala manualmente.'); }
 };
 return <div className="min-w-0">
  <label htmlFor="initial-password">Contraseña inicial (mínimo 20 caracteres)</label>
  <input id="initial-password" className="shop-input" required type={visible ? 'text' : 'password'} minLength={20} maxLength={256} autoComplete="new-password" value={value} onChange={event => update(event.target.value)} />
  <div className="admin-actions mt-2">
   <button className="shop-link" type="button" onClick={() => update(generatePassword())}>Generar contraseña segura</button>
   <button className="shop-link" type="button" aria-controls="initial-password" aria-pressed={visible} onClick={() => setVisible(current => !current)}>{visible ? 'Ocultar' : 'Mostrar'}</button>
   <button className="shop-link" type="button" disabled={!value} onClick={() => void copy()}>Copiar</button>
  </div>
  <p role="status" aria-live="polite">{notice}</p>
 </div>;
}
