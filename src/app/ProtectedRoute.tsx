import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/services/authContext';
import type { UserRole } from '@/types/auth';
import type {UserSession} from '@/types/auth';
import {ReauthenticationDialog} from '@/features/auth/components/ReauthenticationDialog';

export function ProtectedRoute({ role }: { role?: UserRole }) {
  const { user, isLoading, refresh,expiredUser,validationError } = useAuth();
  const location = useLocation();
  const routeKey=location.key+'|'+location.pathname+'|'+location.search;
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const known=useRef<UserSession>(),knownRoute=useRef<string>();
  if(user&&!isLoading&&checkedKey===routeKey&&(!role||user.role===role)){known.current=user;knownRoute.current=routeKey;}
  // Retain only the already authorized screen, never a new protected destination.
  const retain=role==='admin'&&!user&&knownRoute.current===routeKey&&expiredUser?.id===known.current?.id&&known.current?.role==='admin';
  // Revalidate each protected navigation before mounting any internal view.
  useEffect(() => {
    let active = true;
    void refresh().finally(() => { if (active) setCheckedKey(routeKey); });
    return () => { active = false; };
  }, [routeKey, refresh]);

  if (checkedKey !== routeKey || isLoading&&!retain) return <div className="p-8 text-center text-white" role="status">Verificando sesión…</div>;
  if(validationError)return <div role="alert" className="shop-panel"><p>{validationError}</p><button type="button" className="button-outline button-size-md" onClick={()=>void refresh()}>Volver a comprobar sesión</button></div>;
  if (!user&&!retain) return <Navigate to="/login" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  if (role && user && user.role !== role) return <Navigate to="/" replace />;
  return <div className="protected-workspace"><div key={user?.id??known.current?.id} ref={node=>{if(node)node.inert=!!retain;}} aria-hidden={retain||undefined}><Outlet /></div>{retain&&known.current&&<ReauthenticationDialog account={known.current}/>}</div>;
}
