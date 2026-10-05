import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey?: string }) {
 const reduce = useReducedMotion();
 return <m.div className="page-transition" data-route-key={routeKey}
   initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: reduce ? 1 : 0, transition: { duration: reduce ? 0 : .1 } }}
   transition={{ duration: reduce ? 0 : .3, ease: [.22, 1, .36, 1] }}>
   {!reduce && <m.div aria-hidden="true" className="page-transition-gold" initial={{ scaleX: .05, opacity: 0 }} animate={{ scaleX: [ .05, 1, 1 ], opacity: [ 0, .85, 0 ] }} transition={{ duration: .55, times: [0, .55, 1], ease: 'easeOut' }}/>}
   {children}
 </m.div>;
}
