import {selectRelatedProducts} from '../services/productDetailSelection';
import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { ProductCard } from '@/shared/components/ProductCard';
import { productService } from '../services/productService';
import { parseCatalogQuery } from '../../../../shared/catalogQuery.ts';
export function RelatedProducts({ product }: { product: Product }) {
 const [state,setState]=useState<{items:Product[];loading:boolean}>({items:[],loading:true});
 useEffect(()=>{
  const controller=new AbortController();setState({items:[],loading:true});
  const query=parseCatalogQuery(new URLSearchParams({universe:product.universe,category:product.category,pageSize:'5'}));
  void productService.search(query,controller.signal).then(page=>{if(!controller.signal.aborted)setState({items:selectRelatedProducts(page.items,product.id),loading:false});}).catch(()=>{if(!controller.signal.aborted)setState({items:[],loading:false});});
  return()=>controller.abort();
 },[product.id,product.category,product.universe]);
 return state.loading?<p role="status">Buscando piezas relacionadas…</p>:<RelatedProductList items={state.items}/>;
}
export function RelatedProductList({items}:{items:Product[]}){
 if(!items.length)return null;
 return <section className="related-products" aria-labelledby="related-title"><h2 id="related-title" className="shop-title">Productos relacionados</h2><div className="related-product-grid">{items.map((item,index)=><ProductCard key={item.id} product={item} index={index} mediaSizing="natural"/>)}</div></section>;
}
