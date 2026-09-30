import { useEffect, useState } from 'react';
import { useAuth } from '../services/authContext';
import { authService } from '../services/authService';
import { errorMessage } from '@/shared/lib/money';
export function useProfile() {
  const auth = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { setName(auth.user?.name ?? ''); setEmail(auth.user?.email ?? ''); }, [auth.user]);
  const save = async () => {
    setSaving(true); setMessage('');
    try { await authService.updateProfile({ name, email }); await auth.refresh(); setMessage('Perfil actualizado.'); }
    catch (cause: unknown) { setMessage(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  return { name, setName, email, setEmail, message, saving, save, user: auth.user };
}
