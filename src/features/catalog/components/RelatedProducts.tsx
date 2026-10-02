import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '@/types/product';
import { ProductCard } from '@/shared/components/ProductCard';
import { productService } from '../services/productService';
import { parseCatalogQuery } from '../../../../shared/catalogQuery.ts';
export function RelatedProducts({ product }: { product: Product }) {
 const [state,setState]=useState<{items:Product[];loading:boolean;failed:boolean}>({items:[],loading:true,failed:false});
 useEffect(()=>{
  const controller=new AbortController();setState({items:[],loading:true,failed:false});
  const query=parseCatalogQuery(new URLSearchParams({universe:product.universe,category:product.category,pageSize:'5'}));
  void productService.search(query,controller.signal).then(page=>{if(!controller.signal.aborted)setState({items:page.items.filter(item=>item.id!==product.id).slice(0,4),loading:false,failed:false});}).catch(()=>{if(!controller.signal.aborted)setState({items:[],loading:false,failed:true});});
  return()=>controller.abort();
 },[product.id,product.category,product.universe]);
 return <section className="related-products" aria-labelledby="related-title"><h2 id="related-title" className="shop-title">Productos relacionados</h2>{state.loading?<p role="status">Buscando piezas relacionadas…</p>:state.items.length?<div className="product-grid">{state.items.map((item,index)=><ProductCard key={item.id} product={item} index={index}/>)}</div>:<p>{state.failed?'No pudimos cargar otras piezas.':'Explora más piezas de nuestros universos.'} <Link className="shop-link" to={`/?universe=${product.universe}&category=${product.category}#catalogo`}>Ver catálogo</Link></p>}</section>;
}
