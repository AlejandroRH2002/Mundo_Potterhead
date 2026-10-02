import { useRef, useState, type FormEvent } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { categories, universes, taxonomy, categoryLabels, universeLabels } from '../../../../shared/catalogTaxonomy.ts';
import type { CatalogQuery, Facets } from '../../../../shared/catalogQuery.ts';
type Props = { query: CatalogQuery; facets?: Facets; change: (patch: Record<string, string | undefined>) => void; reset: () => void };
function Fields({ query, facets, change, reset }: Props) {
 const submit = (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault(); const values = new FormData(event.currentTarget);
  change({ q: String(values.get('q') ?? ''), minPrice: String(values.get('minPrice') ?? ''), maxPrice: String(values.get('maxPrice') ?? '') });
 };
 const count = (field: keyof Facets, slug: string) => facets?.[field][slug] ?? 0;
 return <form key={`${query.q}-${query.minPrice}-${query.maxPrice}`} onSubmit={submit} className="catalog-filter-fields grid gap-4">
  <label>Universo<select className="shop-input" value={query.universe ?? ''} onChange={event => change({ universe: event.target.value })}><option value="">Todos los universos</option>{universes.map(slug => <option key={slug} value={slug}>{universeLabels[slug]} ({count('universe',slug)})</option>)}</select></label>
  <label>Categoría<select className="shop-input" value={query.category ?? ''} onChange={event => change({ category: event.target.value })}><option value="">Todas las categorías</option>{categories.map(slug => <option key={slug} value={slug}>{categoryLabels[slug]} ({count('category',slug)})</option>)}</select></label>
  <label>Subcategoría<select className="shop-input" disabled={!query.category} value={query.subcategory ?? ''} onChange={event => change({ subcategory: event.target.value })}><option value="">Todas las subcategorías</option>{query.category && taxonomy[query.category].map(item => <option key={item.slug} value={item.slug}>{item.label} ({count('subcategory',item.slug)})</option>)}</select></label>
  <label>Buscar por nombre o descripción<input className="shop-input" name="q" type="search" maxLength={150} defaultValue={query.q ?? ''} /></label>
  <label>Precio mínimo (MXN)<input className="shop-input" name="minPrice" type="number" min="0" max="1000000" step="0.01" defaultValue={query.minPrice ?? ''} /></label>
  <label>Precio máximo (MXN)<input className="shop-input" name="maxPrice" type="number" min="0" max="1000000" step="0.01" defaultValue={query.maxPrice ?? ''} /></label>
  <label className="flex gap-2"><input type="checkbox" checked={query.onSale === true} onChange={event => change({ onSale: event.target.checked ? 'true' : undefined })} />Solo ofertas</label>
  <label>Ordenar<select className="shop-input" value={query.sort} onChange={event => change({ sort: event.target.value })}><option value="novedad">Novedad</option><option value="precio-asc">Precio: menor a mayor</option><option value="precio-desc">Precio: mayor a menor</option><option value="descuento">Mayor descuento</option></select></label>
  <button className="shop-button" type="submit">Aplicar búsqueda y precios</button><button className="shop-link" type="button" onClick={reset}>Limpiar filtros</button>
 </form>;
}
export function CatalogFilters(props: Props) {
 const reduce = useReducedMotion();
 const dialog = useRef<HTMLDialogElement>(null); const trigger = useRef<HTMLButtonElement>(null); const [open, setOpen] = useState(false);
 const close = () => { dialog.current?.close(); };
 const chips: { key: string; label: string }[] = [];
 const { query } = props;
 if (query.universe) chips.push({ key: 'universe', label: universeLabels[query.universe] });
 if (query.category) chips.push({ key: 'category', label: categoryLabels[query.category] });
 if (query.subcategory && query.category) chips.push({ key: 'subcategory', label: taxonomy[query.category].find(item=>item.slug===query.subcategory)?.label ?? query.subcategory });
 if (query.onSale !== undefined) chips.push({ key: 'onSale', label: query.onSale ? 'Solo ofertas' : 'Sin ofertas' });
 if (query.q) chips.push({ key: 'q', label: `Búsqueda: ${query.q}` });
 if (query.minPrice !== undefined) chips.push({ key: 'minPrice', label: `Desde $${query.minPrice}` });
 if (query.maxPrice !== undefined) chips.push({ key: 'maxPrice', label: `Hasta $${query.maxPrice}` });
 return <>
  <div aria-label="Filtros activos" className="filter-chips">{chips.map(chip=><button type="button" className="shop-link" key={chip.key} aria-label={`Quitar filtro: ${chip.label}`} onClick={()=>props.change({[chip.key]:undefined})}>{chip.label} ×</button>)}</div>
  <details className="hidden md:block catalog-filter-bar"><summary>Filtros y orden · ajusta tu selección</summary><Fields {...props}/></details>
  <button ref={trigger} type="button" className="shop-button md:hidden mb-4" aria-expanded={open} aria-controls="catalog-filter-dialog" onClick={()=>{dialog.current?.showModal();setOpen(true);}}>Filtros y orden</button>
  {/* Native modal dialog traps focus and makes the surrounding page inert. */}
  <dialog ref={dialog} id="catalog-filter-dialog" aria-labelledby="catalog-filter-title" className="catalog-filter-drawer m-0 ml-auto h-svh max-h-none w-[min(90vw,24rem)] bg-slate-950 text-white p-5 backdrop:bg-black/70" onCancel={event=>{event.preventDefault();close();}} onClose={()=>{setOpen(false);trigger.current?.focus();}} onKeyDown={event=>{
   if(event.key==='Escape'){event.preventDefault();close();}
   if(event.key==='Tab'){
    const elements=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')).filter(element=>element.getClientRects().length>0);
    const first=elements[0],last=elements[elements.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
   }
  }}>
   <m.div initial={false} animate={{ x: open ? 0 : 64, opacity: open ? 1 : 0 }} transition={reduce ? {duration:0.14} : { type:'spring', stiffness:300, damping:32 }}><h2 id="catalog-filter-title" className="text-xl mb-3">Filtrar catálogo</h2><button type="button" className="shop-link mb-4" onClick={close}>Cerrar filtros</button><Fields {...props}/></m.div>
  </dialog>
 </>;
}
