import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import '../styles/figma.css';
export function StorefrontShell({ children }: { children: ReactNode }) {
 const { pathname } = useLocation();
 const routePath = pathname.replace(/\/+$/, '') || '/';
 const designed = ['/', '/otros-universos', '/contact', '/login', '/cart', '/profile', '/privacy', '/terms', '/admin', '/products/new', '/products/edit'].includes(routePath) || routePath.startsWith('/product/') || routePath.startsWith('/admin/') || routePath.startsWith('/products/edit/');
 return <div className={'flex min-h-screen flex-col' + (designed ? ' figma-storefront' : '')}>{children}</div>;
}
