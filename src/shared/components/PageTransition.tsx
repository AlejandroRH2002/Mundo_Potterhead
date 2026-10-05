import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';

/** A short dissolve of the actual page, independent of viewport size. */
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey?: string }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className="page-transition" data-route-key={routeKey}>{children}</div>;

  return <m.div
    className="page-transition"
    data-route-key={routeKey}
    initial={{ opacity: 0, y: 16, filter: 'blur(4px)' }}
    animate={{ opacity: 1, y: 0, filter: 'none', transition: { duration: 0.44, ease: [0.22, 1, 0.36, 1] } }}
    exit={{ opacity: 0, y: -8, filter: 'blur(3px)', transition: { duration: 0.18, ease: [0.4, 0, 1, 1] } }}
  >
    {children}
  </m.div>;
}
