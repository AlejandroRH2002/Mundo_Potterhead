import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/services/authContext';
import type { UserRole } from '@/types/auth';

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { user, isLoading, refresh } = useAuth();
  const location = useLocation();
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  // Revalidate each protected navigation before mounting any internal view.
  useEffect(() => {
    let active = true;
    void refresh().finally(() => { if (active) setCheckedKey(location.key); });
    return () => { active = false; };
  }, [location.key, refresh]);

  if (checkedKey !== location.key || isLoading) return <div className="p-8 text-center text-white" role="status">Verificando sesión…</div>;
  if (!user) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
