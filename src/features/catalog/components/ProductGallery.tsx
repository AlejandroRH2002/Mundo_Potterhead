import { useState } from 'react';
import type { Product } from '@/types/product';
import { productImages } from '@/shared/lib/productMedia';
export function ProductGallery({ product, onSelect }: { product: Product; onSelect?: (image: string) => void }) {
 const images=productImages(product);const [selected,setSelected]=useState(images[0]);
 return <div className="product-gallery"><img loading="eager" fetchPriority="high" decoding="async" width={1200} height={1200} className="w-full aspect-square rounded-lg object-contain" src={selected} alt={product.name}/><div className="gallery-thumbnails" aria-label="Imágenes del producto">{images.map((image,index)=><button type="button" key={image} aria-label={`Ver imagen ${index+1} de ${product.name}`} aria-pressed={selected===image} onClick={()=>{setSelected(image);onSelect?.(image);}}><img src={image} alt="" loading="lazy" decoding="async" width={64} height={64}/></button>)}</div><p className="text-sm mt-3">Imagen de referencia. Confirma los detalles al cotizar.</p></div>;
}
