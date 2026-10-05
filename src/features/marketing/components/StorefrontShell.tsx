import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/figma.css';
export function StorefrontShell({ children }: { children: ReactNode }) {
 const { pathname } = useLocation();
 const designed = ['/', '/otros-universos', '/contact', '/login', '/cart', '/profile', '/admin', '/products/new', '/products/edit'].includes(pathname) || pathname.startsWith('/product/') || pathname.startsWith('/admin/') || pathname.startsWith('/products/edit/');
 return <div className={'flex min-h-screen flex-col' + (designed ? ' figma-storefront' : '')}>{children}</div>;
}
