import { lazy, Suspense, useState } from 'react';
import { Button } from '@/shared/components/Button';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ProductGallery } from '../components/ProductGallery';
import { Link } from 'react-router-dom';
import { useProductDetail } from '../hooks/useCatalog';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
import { usePageMetadata } from '@/shared/lib/usePageMetadata';
import { taxonomy } from '../../../../shared/catalogTaxonomy.ts';
const RelatedProducts=lazy(()=>import('../components/RelatedProducts').then(module=>({default:module.RelatedProducts})));
export function ProductDetail() {
  const detail = useProductDetail();
  const cart = useAddToCart();
  const [modelSelection,setModelSelection]=useState<{productId:string;id:string}>();
  const [selection, setSelection] = useState<{ id: string; image: string } | null>(null);
  usePageMetadata({ title: detail.product?.name ?? 'Producto', description: detail.product?.description, image: detail.product?.image, noindex: !detail.product || !!detail.error });
  if (detail.loading) return <section className="shop-page" role="status">Cargando producto…</section>;
  if (detail.error) return <section className="shop-page shop-error" role="alert">{detail.error}</section>;
  if (!detail.product) return <section className="shop-page"><h1 className="shop-title">Producto no encontrado</h1><Link className="shop-link" to="/">Volver al catálogo</Link></section>;
  const product = detail.product;
  const models=product.models?.filter(model=>model.active)??[];
  const selectedModel=models.find(model=>modelSelection?.productId===product.id&&model.id===modelSelection.id)??(models.length===1?models[0]:undefined);
  const requiresModel=product.models!==undefined&&!selectedModel;
  const selectedImage = selection?.id === product.id ? selection.image : product.image;
  const referenceImage = selectedImage.startsWith('data:') ? '/api/products/' + encodeURIComponent(product.id) + '/image' : selectedImage;
  return <section className="shop-page product-detail-page">
    <Breadcrumbs items={[{label:'Inicio',to:'/'},{label:'Catálogo',to:'/#catalogo'},{label:product.name}]}/><Link to="/#catalogo" className="shop-link">← Volver al catálogo</Link>
    <article className="shop-panel grid gap-8 md:grid-cols-2">
      <ProductGallery key={product.id} product={product} selectedImage={selectedImage} onSelect={image => setSelection({ id: product.id, image })}/>
      <div className="product-detail-info">{product.subcategory && <span className="eyebrow">{taxonomy[product.category].find(item=>item.slug===product.subcategory)?.label}</span>}<h1 className="shop-title">{product.name}</h1><p className="whitespace-pre-line">{product.description}</p>
        <p className="product-detail-price text-3xl font-bold my-5">{money(product.price)}</p>
        {product.isOnSale && product.originalPrice && <p className="line-through mb-4">{money(product.originalPrice)}</p>}
        {product.models && <label>Modelo<select className="shop-input" value={selectedModel?.id??''} onChange={event=>{const model=models.find(item=>item.id===event.target.value);setModelSelection({productId:product.id,id:event.target.value});setSelection({id:product.id,image:model?.image||product.image});}}><option value="" disabled>Elige un modelo</option>{models.map(model=><option key={model.id} value={model.id}>{model.name}{product.inventoryMode==='enforce'?` · ${model.quantity} disponibles`:' · Disponibilidad por confirmar'}</option>)}</select></label>}
        <p className="my-4">Se incluirá la imagen elegida en tu cotización. Disponibilidad por confirmar. Te ayudaremos a coordinar tu selección por WhatsApp.</p>
        <div className="product-detail-actions"><Button disabled={requiresModel} onClick={() => cart.add(product.id, referenceImage, selectedModel?.id)}>Añadir a mi cotización</Button>
        <Link className="shop-link ml-6" to="/cart">Ver carrito</Link></div>
        <p role="status" className="mt-4">{cart.message}</p>
      </div>
    </article>
    <div className="mobile-product-cta"><span>{money(product.price)}<small>Disponibilidad a confirmar</small></span><Button size="sm" disabled={requiresModel} onClick={()=>cart.add(product.id, referenceImage, selectedModel?.id)}>Añadir a mi cotización</Button></div>
    <Suspense fallback={<p role="status">Buscando piezas relacionadas…</p>}><RelatedProducts key={product.id} product={product}/></Suspense>
  </section>;
}
