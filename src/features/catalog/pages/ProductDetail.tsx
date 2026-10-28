import {DesignPicker} from '../components/DesignPicker';
import {resolveProductDetail} from '../services/productDetailSelection';
import { sizeLabel } from '../../../../shared/sizes';
import { lazy, Suspense, useState, useEffect } from 'react';
import { Button } from '@/shared/components/Button';
import { Breadcrumbs } from '@/shared/components/Breadcrumbs';
import { ProductGallery } from '../components/ProductGallery';
import {safeInternalPath} from '@/shared/lib/safeInternalPath';
import { Link,useNavigate,useSearchParams } from 'react-router-dom';
import { useProductDetail } from '../hooks/useCatalog';
import { useAddToCart } from '@/features/cart/hooks/useCart';
import { money } from '@/shared/lib/money';
import { usePageMetadata } from '@/shared/lib/usePageMetadata';
import { taxonomy } from '../../../../shared/catalogTaxonomy.ts';
const RelatedProducts=lazy(()=>import('../components/RelatedProducts').then(module=>({default:module.RelatedProducts})));
export function ProductDetail() {
  const detail = useProductDetail();
  const navigate=useNavigate();const [params]=useSearchParams();
  const preferredDesign=params.get('design')??detail.product?.resolvedFrom?.modelId;
  const cart = useAddToCart();
  const [skuSelection,setSkuSelection]=useState<{modelId:string;id:string}>();
  const [modelSelection,setModelSelection]=useState<{productId:string;id:string;initialDesign?:string}>();
  const [selection, setSelection] = useState<{ id: string; image: string } | null>(null);
  const resolved=detail.product?resolveProductDetail(detail.product,{model:modelSelection?.initialDesign===preferredDesign?modelSelection:preferredDesign?{productId:detail.product.id,id:preferredDesign}:undefined,sku:skuSelection,image:selection}):undefined;
  useEffect(()=>{const product=detail.product;if(!product?.resolvedFrom)return;const next=new URLSearchParams(params);if(product.resolvedFrom.modelId)next.set('design',product.resolvedFrom.modelId);else next.delete('design');navigate(safeInternalPath('/product/'+encodeURIComponent(product.id)+(next.size?'?'+next.toString():'')),{replace:true});},[detail.product,params,navigate]);
  usePageMetadata({ title: resolved?.title ?? detail.product?.name ?? 'Producto', description: detail.product?.description, image: resolved?.selectedImage ?? detail.product?.image, noindex: !detail.product || !!detail.error });
  if (detail.loading) return <section className="shop-page" role="status">Cargando producto…</section>;
  if (detail.error) return <section className="shop-page shop-error" role="alert"><h1 className="shop-title">No pudimos cargar el producto</h1><p>{detail.error}</p><Link className="button-outline button-size-md" to="/#catalogo">Volver al catálogo</Link></section>;
  if (!detail.product) return <section className="shop-page"><h1 className="shop-title">{detail.unavailable?'Producto no disponible':'Producto no encontrado'}</h1><p>{detail.unavailable?'Este producto no está disponible para consulta pública.':'El producto no existe o no está publicado.'}</p><Link className="button-outline button-size-md" to="/#catalogo">Volver al catálogo</Link></section>;
  const product = detail.product;
  const {models,selectedModel,skus,selectedSku,requiresModel,galleryProduct,selectedImage,title}=resolved!;
  const referenceImage=selectedImage;
  return <section className="shop-page product-detail-page">
    <Breadcrumbs items={[{label:'Inicio',to:'/'},{label:'Catálogo',to:'/#catalogo'},{label:product.name}]}/><Link to="/#catalogo" className="shop-link">← Volver al catálogo</Link>
    <article className="shop-panel grid gap-8 md:grid-cols-2">
      <ProductGallery key={product.id} product={galleryProduct} selectedImage={selectedImage} onSelect={image => setSelection({ id: product.id, image })}/>
      <div className="product-detail-info">{product.subcategory && <span className="eyebrow">{taxonomy[product.category].find(item=>item.slug===product.subcategory)?.label}</span>}<p className="product-parent-name">Producto: {product.name}</p><h1 className="shop-title">{title}</h1><p className="product-design-summary" role="status" aria-live="polite">{selectedModel?'Diseño seleccionado: '+selectedModel.name:models.length?'Elige un diseño para preparar tu cotización.':''}</p><p className="whitespace-pre-line">{product.description}</p>
        <p className="product-detail-price text-3xl font-bold my-5">{money(product.price)}</p>
        {product.isOnSale && product.originalPrice && <p className="line-through mb-4">{money(product.originalPrice)}</p>}
        {product.models&&<DesignPicker product={product} models={models} selectedId={selectedModel?.id} onSelect={id=>{setModelSelection({productId:product.id,id,initialDesign:preferredDesign});setSkuSelection(undefined);setSelection(null);}}/>}
        {selectedModel && <label>Talla y color<select className="shop-input" value={selectedSku?.id??''} onChange={event=>{setSkuSelection({modelId:selectedModel.id,id:event.target.value});setSelection(null);}}><option value="" disabled>Selecciona talla y color</option>{skus.map(sku=><option key={sku.id} value={sku.id} disabled={product.inventoryMode==='enforce'&&(sku.quantity===null||sku.quantity===0)}>{sizeLabel(sku.size)}{'color' in sku&&sku.color?' · '+sku.color:''}{product.inventoryMode==='enforce'?` · ${sku.quantity??0} piezas`:''}</option>)}</select></label>}
        {product.inventoryMode==='enforce'&&selectedSku?.quantity!=null&&selectedSku.quantity>0&&selectedSku.quantity<=(product.lowStockThreshold??10)&&<p role="status">Últimas {selectedSku.quantity} piezas</p>}
        <p className="my-4">Se incluirá la imagen elegida en tu cotización. Disponibilidad por confirmar. Te ayudaremos a coordinar tu selección por WhatsApp.</p>
        <div className="product-detail-actions"><Button disabled={requiresModel} onClick={() => cart.add(product.id, referenceImage, selectedSku?.id)}>Añadir a mi cotización</Button>
        <Link className="shop-link ml-6" to="/cart">Ver carrito</Link></div>
        <p role="status" className="mt-4">{cart.message}</p>
      </div>
    </article>
    <div className="mobile-product-cta"><span>{money(product.price)}<small>Disponibilidad a confirmar</small></span><Button size="sm" disabled={requiresModel} onClick={()=>cart.add(product.id, referenceImage, selectedSku?.id)}>Añadir a mi cotización</Button></div>
    <Suspense fallback={<p role="status">Buscando piezas relacionadas…</p>}><RelatedProducts key={product.id} product={product}/></Suspense>
  </section>;
}
