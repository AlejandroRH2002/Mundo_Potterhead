import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey?: string }) {
 const reduce = useReducedMotion();
 return <m.div data-route-key={routeKey} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.14 : 0.25 }}>{children}</m.div>;
}
