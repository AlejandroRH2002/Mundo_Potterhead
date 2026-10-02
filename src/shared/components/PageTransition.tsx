import type { ReactNode } from 'react';
import { m, useReducedMotion } from 'framer-motion';
export function PageTransition({ children }: { children: ReactNode }) {
 const reduce = useReducedMotion();
 return <m.div initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0 : 0.16 }}>{children}</m.div>;
}
