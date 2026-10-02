import { useLayoutEffect, useRef } from 'react';
import { useReducedMotion } from 'framer-motion';
// FLIP transforms keep layout animation small without loading domMax.
export function useGridLayout(ids: string) {
 const grid = useRef<HTMLDivElement>(null);
 const previous = useRef(new Map<string, { x: number; y: number }>());
 const reduce = useReducedMotion();
 useLayoutEffect(() => {
  const element = grid.current;
  if (!element) return;
  const running = new Map<HTMLElement, Animation>();
  const measure = () => {
   const next = new Map<string, { x: number; y: number }>();
   const origin = element.getBoundingClientRect();
   element.querySelectorAll<HTMLElement>('[data-product-id]').forEach(item => {
    running.get(item)?.cancel();
    const id = item.dataset.productId ?? '', rect = item.getBoundingClientRect();
    const position = { x: rect.left-origin.left, y: rect.top-origin.top };
    const old = previous.current.get(id); next.set(id, position);
    if (!reduce && old && (old.x !== position.x || old.y !== position.y) && typeof item.animate === 'function') {
     const animation = item.animate([{ transform: 'translate('+ (old.x-position.x) +'px, '+ (old.y-position.y) +'px)' }, { transform: 'translate(0, 0)' }], { duration: 240, easing: 'ease-out' });
     running.set(item, animation);
    }
   });
   previous.current = next;
  };
  measure();
  // Animate final reflow when AnimatePresence removes an exiting card.
  const observer = new MutationObserver(measure); observer.observe(element, { childList: true });
  window.addEventListener('resize', measure);
  return () => { observer.disconnect(); window.removeEventListener('resize', measure); running.forEach(animation => animation.cancel()); };
 }, [ids, reduce]);
 return grid;
}
