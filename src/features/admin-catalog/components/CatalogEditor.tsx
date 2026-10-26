import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/shared/components/Button';
import { taxonomy, categories, universes, categoryLabels, universeLabels } from '../../../../shared/catalogTaxonomy';
import { sizeTaxonomy } from '../../../../shared/sizes';
import { catalogStates, catalogStateLabels, type ManagedProduct } from '../../../../shared/catalogManagement';
import { GalleryEditor } from './GalleryEditor';
type Model=ManagedProduct['models'][number];
export function CatalogEditor({value,onChange,onSave,onClose,busy}:{value:ManagedProduct;onChange:(value:ManagedProduct)=>void;onSave:()=>void;onClose:()=>void;busy:boolean}){
 const [uploading,setUploading]=useState(false);
 const patch=(product:Partial<ManagedProduct['product']>)=>onChange({...value,product:{...value.product,...product}});
 const model=(index:number,next:Model)=>onChange({...value,models:value.models.map((item,i)=>i===index?next:item)});
 const gallery=[value.product.image,...(value.product.images??[])].filter((v):v is string=>!!v);
 const category=categories.find(item=>item===value.product.category)??'clothing';
 return <form className="shop-panel catalog-editor" onSubmit={event=>{event.preventDefault();onSave();}}><fieldset disabled={busy||uploading} className="min-w-0"><legend className="text-2xl font-bold">{value.id?'Editar producto y modelos':'Nuevo borrador'}</legend>
  <div className="catalog-form-grid"><label>Código del producto<input className="shop-input" required value={value.code} disabled={!!value.id} onChange={event=>onChange({...value,code:event.target.value})}/></label><label>Estado<select className="shop-input" value={value.status} onChange={event=>onChange({...value,status:event.target.value as ManagedProduct['status']})}>{catalogStates.map(state=><option key={state} value={state}>{catalogStateLabels[state]}</option>)}</select></label>
  <label>Nombre<input className="shop-input" required maxLength={150} value={value.product.name} onChange={event=>patch({name:event.target.value})}/></label><label>Precio (MXN)<input className="shop-input" required type="number" min="0.01" max="1000000" step="0.01" value={value.product.price||''} onChange={event=>patch({price:Number(event.target.value)})}/></label>
  <label>Categoría<select className="shop-input" value={category} onChange={event=>patch({category:event.target.value,subcategory:null})}>{categories.map(category=><option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label><label>Subcategoría<select className="shop-input" value={value.product.subcategory??''} onChange={event=>patch({subcategory:event.target.value||null})}><option value="">Sin subcategoría</option>{taxonomy[category].map(item=><option key={item.slug} value={item.slug}>{item.label}</option>)}</select></label><label>Universo<select className="shop-input" value={value.product.universe} onChange={event=>patch({universe:event.target.value})}>{universes.map(value=><option key={value} value={value}>{universeLabels[value]}</option>)}</select></label>
  </div><label>Descripción<textarea className="shop-input" required maxLength={5000} value={value.product.description} onChange={event=>patch({description:event.target.value})}/></label>
  <GalleryEditor label="Galería general" images={gallery} onBusyChange={setUploading} onChange={images=>patch({image:images[0],images:images.slice(1)})}/>
  <p>Quitar una talla/color la desactiva; no borra el SKU ni sus movimientos. Usa Inventario para cambiar cantidades.</p>
  {value.id&&<Link className="shop-button inline-block" to={'/admin/inventario?productId='+encodeURIComponent(value.id)}>Abrir existencias e historial</Link>}
  {value.models.map((item,index)=><fieldset className="catalog-model" key={item.id??index}><legend>Modelo {index+1}</legend><div className="catalog-form-grid"><label>Código de modelo<input className="shop-input" required disabled={!!item.id} value={item.code} onChange={event=>model(index,{...item,code:event.target.value})}/></label><label>Nombre del diseño<input className="shop-input" required maxLength={100} value={item.name} onChange={event=>model(index,{...item,name:event.target.value})}/></label></div>
   <label><input type="checkbox" checked={item.active} onChange={event=>model(index,{...item,active:event.target.checked})}/> Modelo activo</label>
   <GalleryEditor label="Imágenes del modelo" images={item.images} onBusyChange={setUploading} onChange={images=>model(index,{...item,images})}/>
   {item.variants.map((sku,at)=><div className="catalog-variant" key={sku.id??at}><div className="catalog-form-grid"><label>SKU<input className="shop-input" required disabled={!!sku.id} value={sku.code} onChange={event=>model(index,{...item,variants:item.variants.map((v,i)=>i===at?{...v,code:event.target.value}:v)})}/></label><label>Talla<select className="shop-input" value={sku.size} onChange={event=>model(index,{...item,variants:item.variants.map((v,i)=>i===at?{...v,size:event.target.value}:v)})}>{sizeTaxonomy[category].map(size=><option key={size.slug} value={size.slug}>{size.label}</option>)}</select></label><label>Color<input className="shop-input" maxLength={60} value={sku.color} placeholder="Sin color específico" onChange={event=>model(index,{...item,variants:item.variants.map((v,i)=>i===at?{...v,color:event.target.value}:v)})}/></label></div>
    <label><input type="checkbox" checked={sku.active} onChange={event=>model(index,{...item,variants:item.variants.map((v,i)=>i===at?{...v,active:event.target.checked}:v)})}/> Variante activa</label>
    <GalleryEditor label="Imágenes específicas de esta variante (opcional)" images={sku.images} onBusyChange={setUploading} onChange={images=>model(index,{...item,variants:item.variants.map((v,i)=>i===at?{...v,images}:v)})}/>
   </div>)}<Button type="button" variant="secondary" onClick={()=>{const id=crypto.randomUUID();model(index,{...item,variants:[...item.variants,{code:'S-'+id,size:'one',color:'',active:true,images:[]}]});}}>Añadir talla / color</Button>
  </fieldset>)}
  <div className="admin-actions"><Button type="button" variant="secondary" onClick={()=>{const id=crypto.randomUUID();onChange({...value,models:[...value.models,{code:'M-'+id,name:'Nuevo diseño',active:true,images:[],variants:[{code:'S-'+id,size:'one',color:'',images:[],active:true}]}]});}}>Añadir modelo</Button><Button type="submit" loading={busy}>Guardar producto</Button><Button type="button" variant="secondary" onClick={onClose}>Cerrar editor</Button></div>
 </fieldset></form>;
}
