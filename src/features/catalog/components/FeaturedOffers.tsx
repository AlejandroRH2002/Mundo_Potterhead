import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { productService } from '../services/productService';
import { ProductCard } from '@/shared/components/ProductCard';
import type { Product } from '@/types/product';
import { parseCatalogQuery } from '../../../../shared/catalogQuery.ts';
export function FeaturedOffers(){
 const [items,setItems]=useState<Product[]>([]);const strip=useRef<HTMLDivElement>(null);
 useEffect(()=>{const c=new AbortController();void productService.search(parseCatalogQuery(new URLSearchParams('onSale=true&pageSize=8&sort=descuento')),c.signal).then(p=>{if(!c.signal.aborted)setItems(p.items);}).catch(()=>{});return()=>c.abort();},[]);
 if(!items.length)return null;
 return <section className="featured-offers" aria-labelledby="featured-title"><div className="section-heading"><h2 id="featured-title">Ofertas destacadas</h2><Link className="shop-link" to="/?onSale=true#catalogo">Ver todas las ofertas</Link><div className="offer-arrows">{[-1,1].map(direction=><button key={direction} type="button" className="button-outline" aria-label={direction<0?'Ofertas anteriores':'Más ofertas'} onClick={()=>strip.current?.scrollBy({left:direction*strip.current.clientWidth,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}>{direction<0?'←':'→'}</button>)}</div></div><div ref={strip} className="offers-scroll">{items.map(product=><ProductCard key={product.id} product={product}/>)}</div></section>;
}
