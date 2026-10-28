import { SafeImage } from '@/shared/components/SafeImage';
import type { Product } from '@/types/product';
import { productPlaceholder } from '../../../../shared/productSchema';
import { useRef, useState, useEffect } from 'react';
import { Button } from '@/shared/components/Button';

interface Props {
  product: Product;
  models: NonNullable<Product['models']>;
  selectedId?: string;
  onSelect: (id: string) => void;
}

export function DesignPicker({ product, models, selectedId, onSelect }: Props) {
  const strip = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({before:false, after:false});
  useEffect(() => {
    const node=strip.current;if(!node)return;
    const update=()=>setEdges({before:node.scrollLeft>2,after:node.scrollLeft+node.clientWidth<node.scrollWidth-2});
    update();const observer=new ResizeObserver(update);observer.observe(node);node.addEventListener('scroll',update,{passive:true});
    return()=>{observer.disconnect();node.removeEventListener('scroll',update);};
  },[models.length]);
  useEffect(()=>{
    const node=strip.current,selected=node?.querySelector<HTMLButtonElement>('[aria-pressed=true]');if(!node||!selected)return;
    const area=node.getBoundingClientRect(),choice=selected.getBoundingClientRect();
    if(choice.left<area.left)node.scrollLeft+=choice.left-area.left;
    else if(choice.right>area.right)node.scrollLeft+=choice.right-area.right;
  },[selectedId]);
  const move=(direction:number)=>{const node=strip.current;if(node)node.scrollBy({left:direction*node.clientWidth*.8,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
  return (
    <fieldset className="design-selector">
      <legend>Elige tu diseño</legend>
      <div className="design-strip-tools"><span>{models.length} diseños · Desliza para explorar</span><div><Button type="button" size="sm" variant="secondary" aria-label="Diseños anteriores" disabled={!edges.before} onClick={()=>move(-1)}>←</Button><Button type="button" size="sm" variant="secondary" aria-label="Más diseños" disabled={!edges.after} onClick={()=>move(1)}>→</Button></div></div>
      <div className="design-picker" ref={strip} aria-label="Diseños disponibles" onKeyDown={event=>{
        if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
        const buttons=Array.from(strip.current?.querySelectorAll<HTMLButtonElement>('.design-choice:not(:disabled)')??[]);
        const current=buttons.indexOf(document.activeElement as HTMLButtonElement);if(current<0)return;event.preventDefault();
        const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,current+(event.key==='ArrowRight'?1:-1)));
        buttons[next]?.focus({preventScroll:true});buttons[next]?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});
      }}>
        {models.map(model => {
          const image = model.image || model.images?.[0];
          const thumbnail = model.thumbnail || (image ? product.imageThumbnails?.[image] ?? image : productPlaceholder);
          const unavailable = product.inventoryMode === 'enforce' && !!model.skus && !model.skus.some(sku => (sku.quantity ?? 0) > 0);
          return (
            <button
              type="button"
              className="design-choice"
              key={model.id}
              aria-label={'Elegir diseño ' + model.name}
              aria-pressed={selectedId === model.id}
              title={model.name + (unavailable ? ' · No disponible para seleccionar' : '')}
              disabled={unavailable}
              onClick={() => onSelect(model.id)}
            >
              <span className="design-choice-photo">
                <SafeImage src={thumbnail} alt="" width={160} height={160} loading="lazy" decoding="async" />
                {selectedId === model.id && <span className="design-choice-check" aria-hidden="true">✓</span>}
              </span>
              <span className="design-choice-name">{model.name}</span>
              {unavailable && <span className="design-choice-state">No disponible</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
