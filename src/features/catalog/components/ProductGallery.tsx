import {SafeImage} from '@/shared/components/SafeImage';
import type { Product } from '@/types/product';
import { productImages } from '@/shared/lib/productMedia';
export function ProductGallery({ product, onSelect, selectedImage }: { product: Product; selectedImage: string; onSelect: (image: string) => void }) {
 const images=productImages(product);const current=images.includes(selectedImage)?selectedImage:images[0];
 return <div className="product-gallery"><SafeImage loading="eager" fetchPriority="high" decoding="async" width={1200} height={1200} className="w-full aspect-square rounded-lg object-contain" src={current} alt={product.name}/><div className="gallery-thumbnails" aria-label="Imágenes del producto">{images.map((image,index)=><button type="button" key={image} aria-label={`Ver imagen ${index+1} de ${product.name}`} aria-pressed={current===image} onClick={()=>onSelect(image)}><SafeImage src={product.imageThumbnails?.[image]??image} alt="" loading="lazy" decoding="async" width={64} height={64}/></button>)}</div><p className="text-sm mt-3">Imagen de referencia. Confirma los detalles al cotizar.</p></div>;
}
