import { sizeLabel } from '../../../../shared/sizes';
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
  const [skuSelection,setSkuSelection]=useState<{modelId:string;id:string}>();
  const [modelSelection,setModelSelection]=useState<{productId:string;id:string}>();
  const [selection, setSelection] = useState<{ id: string; image: string } | null>(null);
  usePageMetadata({ title: detail.product?.name ?? 'Producto', description: detail.product?.description, image: detail.product?.image, noindex: !detail.product || !!detail.error });
  if (detail.loading) return <section className="shop-page" role="status">Cargando producto…</section>;
  if (detail.error) return <section className="shop-page shop-error" role="alert">{detail.error}</section>;
  if (!detail.product) return <section className="shop-page"><h1 className="shop-title">Producto no encontrado</h1><Link className="shop-link" to="/">Volver al catálogo</Link></section>;
  const product = detail.product;
  const models=product.models?.filter(model=>model.active)??[];
  const selectedModel=models.find(model=>modelSelection?.productId===product.id&&model.id===modelSelection.id)??(models.length===1?models[0]:undefined);
  const skus=selectedModel?.skus??(selectedModel?[{id:selectedModel.id,code:selectedModel.sku,size:'one',quantity:selectedModel.quantity,version:selectedModel.version}]:[]);
  const selectedSku=skus.find(sku=>skuSelection?.modelId===selectedModel?.id&&sku.id===skuSelection?.id)??(skus.length===1?skus[0]:undefined);
  const requiresModel=product.models!==undefined&&(!selectedModel||!selectedSku||product.inventoryMode==='enforce'&&(selectedSku.quantity===null||selectedSku.quantity===0));
  const selectedImage = selection?.id === product.id ? selection.image : product.image;
  const referenceImage = selectedImage.startsWith('data:') ? '/api/products/' + encodeURIComponent(product.id) + '/image' : selectedImage;
  return <section className="shop-page product-detail-page">
    <Breadcrumbs items={[{label:'Inicio',to:'/'},{label:'Catálogo',to:'/#catalogo'},{label:product.name}]}/><Link to="/#catalogo" className="shop-link">← Volver al catálogo</Link>
    <article className="shop-panel grid gap-8 md:grid-cols-2">
      <ProductGallery key={product.id} product={product} selectedImage={selectedImage} onSelect={image => setSelection({ id: product.id, image })}/>
      <div className="product-detail-info">{product.subcategory && <span className="eyebrow">{taxonomy[product.category].find(item=>item.slug===product.subcategory)?.label}</span>}<h1 className="shop-title">{product.name}</h1><p className="whitespace-pre-line">{product.description}</p>
        <p className="product-detail-price text-3xl font-bold my-5">{money(product.price)}</p>
        {product.isOnSale && product.originalPrice && <p className="line-through mb-4">{money(product.originalPrice)}</p>}
        {product.models && <fieldset><legend>Diseño</legend><div className="model-picker">{models.map(model=><button type="button" className="button-outline" key={model.id} aria-pressed={selectedModel?.id===model.id} disabled={product.inventoryMode==='enforce'&&!!model.skus&&!model.skus.some(sku=>(sku.quantity??0)>0)} onClick={()=>{setModelSelection({productId:product.id,id:model.id});setSkuSelection(undefined);setSelection({id:product.id,image:model.image||product.image});}}><img src={model.thumbnail||model.image||product.thumbnail||product.image} alt="" width={64} height={64} loading="lazy" decoding="async"/>{model.name}</button>)}</div></fieldset>}
        {selectedModel && <label>Talla<select className="shop-input" value={selectedSku?.id??''} onChange={event=>setSkuSelection({modelId:selectedModel.id,id:event.target.value})}><option value="" disabled>Selecciona una talla</option>{skus.map(sku=><option key={sku.id} value={sku.id} disabled={product.inventoryMode==='enforce'&&(sku.quantity===null||sku.quantity===0)}>{sizeLabel(sku.size)}{product.inventoryMode==='enforce'?` · ${sku.quantity??0} piezas`:''}</option>)}</select></label>}
        {product.inventoryMode==='enforce'&&selectedSku?.quantity!=null&&selectedSku.quantity>0&&selectedSku.quantity<=(product.lowStockThreshold??10)&&<p role="status">Últimas {selectedSku.quantity} piezas</p>}
        <p className="my-4">Se incluirá la imagen elegida en tu cotización. Disponibilidad por confirmar. Te ayudaremos a coordinar tu selección por WhatsApp.</p>
        <div className="product-detail-actions"><Button disabled={requiresModel} onClick={() => cart.add(product.id, referenceImage, selectedSku?.id)}>Añadir a mi cotización</Button>
        <Link className="shop-link ml-6" to="/cart">Ver carrito</Link></div>
        <p role="status" className="mt-4">{cart.message}</p>
      </div>
    </article>
    <div className="mobile-product-cta"><span>{money(product.price)}<small>Disponibilidad a confirmar</small></span><Button size="sm" disabled={requiresModel} onClick={()=>cart.add(product.id, referenceImage, selectedModel?.id)}>Añadir a mi cotización</Button></div>
    <Suspense fallback={<p role="status">Buscando piezas relacionadas…</p>}><RelatedProducts key={product.id} product={product}/></Suspense>
  </section>;
}
