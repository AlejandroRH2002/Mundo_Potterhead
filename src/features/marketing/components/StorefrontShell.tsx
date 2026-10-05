import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/figma.css';
export function StorefrontShell({ children }: { children: ReactNode }) {
 const { pathname } = useLocation();
 const designed = ['/', '/otros-universos', '/contact', '/login', '/cart'].includes(pathname) || pathname.startsWith('/product/');
 return <div className={'flex min-h-screen flex-col' + (designed ? ' figma-storefront' : '')}>{children}</div>;
}
