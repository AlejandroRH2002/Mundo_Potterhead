import { safeInternalPath } from '@/shared/lib/safeInternalPath';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../services/authContext';
import { errorMessage } from '@/shared/lib/money';
export function useLogin() {
  const auth = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signIn = async () => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      await auth.login(email, password);
      const state: unknown = location.state;
      let target = '/';
      if (state && typeof state === 'object' && 'from' in state) {
        const from = state.from;
        if (from && typeof from === 'object' && 'pathname' in from && typeof from.pathname === 'string') {
          target = from.pathname;
          if ('search' in from && typeof from.search === 'string' && from.search.startsWith('?')) target += from.search;
        }
      }
      navigate(safeInternalPath(target), { replace: true });
    } catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setPassword(''); setBusy(false); }
  };
  return { email, setEmail, password, setPassword, error, busy, signIn };
}
