import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey?: string }) {
 const reduce = useReducedMotion();
 return <m.div className="page-transition" style={{ transformOrigin: 'top center' }} data-route-key={routeKey}
   initial={reduce ? false : { opacity: 0, y: 28, scale: .985 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: reduce ? 1 : 0, y: reduce ? 0 : -18, scale: reduce ? 1 : .99, transition: { duration: reduce ? 0 : .18, ease: [.4, 0, 1, 1] } }}
   transition={{ duration: reduce ? 0 : .42, ease: [.22, 1, .36, 1] }}>
   {!reduce && <m.div aria-hidden="true" className="page-transition-gold" initial={{ scaleX: .05, opacity: 0 }} animate={{ scaleX: [ .05, 1, 1 ], opacity: [ 0, .85, 0 ] }} transition={{ duration: .55, times: [0, .55, 1], ease: 'easeOut' }}/>}
   {children}
 </m.div>;
}
