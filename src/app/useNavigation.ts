import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/services/authContext';
import { useCartCount } from '@/features/cart/hooks/useCart';
import { errorMessage } from '@/shared/lib/money';
export function useNavigation() {
  const auth = useAuth();
  const count = useCartCount();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => { setOpen(false); }, [location]);
  const logout = async () => {
    setBusy(true); setError('');
    try { await auth.logout(); navigate('/'); }
    catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setBusy(false); }
  };
  return { user: auth.user, count, open, toggle: () => setOpen(current => !current), logout, error, busy };
}
