import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { authService } from './authService';
import type { UserSession } from '@/types/auth';
import { AuthContext } from './authContext';
import { SESSION_INVALID,advanceSessionEpoch } from '@/shared/lib/httpClient';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: UserSession | null; expiredUser:UserSession|null; validationError?:string; isLoading: boolean }>({ user: null, expiredUser:null,isLoading: true });
  const generation = useRef(0);
  const transition = useRef(false);
  const invalidate = useCallback(() => {
    if(transition.current)return;
    generation.current += 1;
    setState(previous=>({user:null,expiredUser:previous.user?.role==='admin'?previous.user:previous.expiredUser,isLoading:false}));
  }, []);
  const checkSession = useCallback(async (blocking: boolean) => {
    if (transition.current) return null;
    const current = ++generation.current;
    if (blocking) setState(previous=>({...previous,isLoading:true}));
    try {
      const session = await authService.getSession();
      if (current !== generation.current) return null;
      setState(previous => {
        if (!previous.isLoading&&!previous.validationError && JSON.stringify(previous.user) === JSON.stringify(session.user)) return previous;
        return {user:session.user,expiredUser:session.user?null:previous.user?.role==='admin'?previous.user:previous.expiredUser,isLoading:false};
      });
      return session.user;
    } catch {
      if(current===generation.current)setState(previous=>({...previous,isLoading:false,...(blocking?{validationError:'No se pudo comprobar la sesión. Verifica tu conexión e inténtalo de nuevo.'}:{})}));
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
    advanceSessionEpoch();transition.current = true;
    try {
      const session = await authService.login(email, password);
      if (current === generation.current){advanceSessionEpoch();setState({user:session.user,expiredUser:null,isLoading:false});}
    } finally { transition.current = false; }
  }, []);
  const logout = useCallback(async () => {
    transition.current = true;
    advanceSessionEpoch();generation.current+=1;setState({user:null,expiredUser:null,isLoading:false});
    try { await authService.logout(); }
    finally { transition.current = false; }
  }, []);
  useEffect(()=>{
    if(state.user?.role!=='admin')return;
    let lastSent=-Infinity;
    const activity=(event:Event)=>{if(!event.isTrusted||document.visibilityState!=='visible'||transition.current||performance.now()-lastSent<60_000)return;lastSent=performance.now();void authService.activity().catch(()=>{});};
    window.addEventListener('pointerdown',activity,{passive:true});window.addEventListener('keydown',activity);
    return()=>{window.removeEventListener('pointerdown',activity);window.removeEventListener('keydown',activity);};
  },[state.user?.id,state.user?.role]);
  const value = useMemo(() => ({ ...state, login, logout, refresh }), [state, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
