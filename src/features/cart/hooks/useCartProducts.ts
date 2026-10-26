import { useEffect, useState } from 'react';
import type { Product } from '@/types/product';
import { productService } from '@/features/catalog/services/productService';
import { ApiError } from '@/shared/lib/httpClient';
import { errorMessage } from '@/shared/lib/money';
export async function loadCartProducts(ids:string[],signal?:AbortSignal):Promise<Product[]> {
 const unique=[...new Set(ids)],products:Product[]=[];
 for(let index=0;index<unique.length;index+=4){const batch=await Promise.all(unique.slice(index,index+4).map(async id=>{try{return await productService.getById(id,signal);}catch(error){if(error instanceof ApiError&&error.status===404)return null;throw error;}}));products.push(...batch.filter((product):product is Product=>product!==null));}return products;
}
export function useCartProducts(ids:string[]) {
 const key=JSON.stringify([...new Set(ids)].sort());const [products,setProducts]=useState<Product[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
 useEffect(()=>productService.subscribe(()=>setRevision(value=>value+1)),[]);
 useEffect(()=>{const controller=new AbortController();setLoading(true);void loadCartProducts(JSON.parse(key) as string[],controller.signal).then(value=>{if(!controller.signal.aborted){setProducts(value);setError('');}}).catch(cause=>{if(!controller.signal.aborted)setError(errorMessage(cause));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[key,revision]);
 return {products,setProducts,loading,error};
}
