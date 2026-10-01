import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authService } from './authService';
import type { UserSession } from '@/types/auth';
import { AuthContext } from './authContext';
import { SESSION_INVALID } from '@/shared/lib/httpClient';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: UserSession | null; isLoading: boolean }>({ user: null, isLoading: true });
  const generation = useRef(0);
  const transition = useRef(false);
  const invalidate = useCallback(() => {
    generation.current += 1;
    setState({ user: null, isLoading: false });
  }, []);
  const checkSession = useCallback(async (blocking: boolean) => {
    if (transition.current) return null;
    const current = ++generation.current;
    if (blocking) setState({ user: null, isLoading: true });
    try {
      const session = await authService.getSession();
      if (current !== generation.current) return null;
      setState(previous => {
        if (!previous.isLoading && JSON.stringify(previous.user) === JSON.stringify(session.user)) return previous;
        return { user: session.user, isLoading: false };
      });
      return session.user;
    } catch {
      if (current === generation.current) setState({ user: null, isLoading: false });
      return null;
    }
  }, []);
  const refresh = useCallback(() => checkSession(true), [checkSession]);
  useEffect(() => {
    void refresh();
    const onFocus = () => { void checkSession(false); };
    window.addEventListener('focus', onFocus);
    window.addEventListener(SESSION_INVALID, invalidate);
    // No background heartbeat: an idle tab must not keep its session alive.
    return () => {
      generation.current += 1;

      window.removeEventListener('focus', onFocus);
      window.removeEventListener(SESSION_INVALID, invalidate);
    };
  }, [refresh, checkSession, invalidate]);
  const login = useCallback(async (email: string, password: string) => {
    const current = ++generation.current;
    transition.current = true;
    try {
      const session = await authService.login(email, password);
      if (current === generation.current) setState({ user: session.user, isLoading: false });
    } finally { transition.current = false; }
  }, []);
  const logout = useCallback(async () => {
    transition.current = true;
    invalidate();
    try { await authService.logout(); }
    finally { transition.current = false; }
  }, [invalidate]);
  const value = useMemo(() => ({ ...state, login, logout, refresh }), [state, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
