import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/features/auth/services/authContext';
import { errorMessage } from '@/shared/lib/money';
import { userService } from '../services/userService';
import type { CreateUser, ChangeUser, ManagedUser, UserList } from '../../../../shared/userSchema';
const blank: CreateUser = { name: '', email: '', password: '', role: 'user' };
export function useAdminUsers() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<UserList>({ users: [], total: 0, page: 1, pageSize: 20 });
  const [draft, setDraft] = useState<CreateUser>(blank);
  const [formOpen, setFormOpen] = useState(true);
  const closeForm = () => { if (locked.current) return; setDraft(blank); setFormOpen(false); };
  const openForm = () => { setDraft(blank); setFormOpen(true); };
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const locked = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void userService.list(page, controller.signal).then(result => {
      if (!controller.signal.aborted) setData(result);
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(cause));
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [page, revision]);
  const perform = async (action: () => Promise<unknown>) => {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage('Cambio guardado.'); setRevision(value => value + 1); }
    catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { locked.current = false; setBusy(false); }
  };
  const create = async () => {
    if (!window.confirm('¿Crear esta cuenta con rol ' + (draft.role === 'admin' ? 'Administrador' : 'Cliente') + '?')) return;
    await perform(async () => { await userService.create(draft); setDraft(blank); setFormOpen(false); });
  };
  const change = async (target: ManagedUser, patch: ChangeUser) => {
    const action = patch.role ? 'cambiar su rol a ' + (patch.role === 'admin' ? 'Administrador' : 'Cliente') : patch.isActive ? 'activar su cuenta' : 'desactivar su cuenta';
    if (!window.confirm('¿Confirmas ' + action + ' para ' + (target.name || target.email) + '? Los cambios de rol o desactivación cierran sus sesiones.')) return;
    await perform(() => userService.change(target.id, patch));
  };
  return { formOpen, closeForm, openForm, data, draft, setDraft, page, setPage, loading, busy, error, message, create, change, ownId: user?.id, retry: () => setRevision(value => value + 1) };
}
