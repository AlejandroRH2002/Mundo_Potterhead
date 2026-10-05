import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
export function PageTransition({ children, routeKey }: { children: ReactNode; routeKey?: string }) {
 const reduce = useReducedMotion();
 if (reduce) return <div className="page-transition" data-route-key={routeKey}>{children}</div>;
 return <m.div className="page-transition" data-route-key={routeKey} initial="enter" animate="visible" exit="leave">
   <m.div className="scene-curtain" aria-hidden="true" variants={{
     enter: { scaleX: 1, transformOrigin: 'right' },
     visible: { scaleX: 0, transformOrigin: 'right', transition: { delay: .04, duration: .42, ease: [.76, 0, .24, 1] } },
     leave: { scaleX: 1, transformOrigin: 'left', transition: { duration: .28, ease: [.76, 0, .24, 1] } },
   }}><span className="scene-curtain-ornament">✦</span></m.div>
   <m.div variants={{ enter: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { delay: .12, duration: .32, ease: [.22, 1, .36, 1] } }, leave: { opacity: 1 } }}>{children}</m.div>
 </m.div>;
}
