import { Link } from 'react-router-dom';
import { useProductEditor } from '../hooks/useProductEditor';
import { categories, universes } from '@/features/catalog/services/productValidation';
export function ProductEditor({ editing = false }: { editing?: boolean }) {
  const editor = useProductEditor(editing);
  return <section className="shop-page"><Link className="shop-link" to="/admin">← Volver al panel</Link>
    <h1 className="shop-title">{editing ? 'Editar producto' : 'Nuevo producto'}</h1>
    {editor.error && <p role="alert" className="shop-error">{editor.error}</p>}
    {editor.loading ? <p role="status">Cargando producto…</p> : <form aria-busy={editor.saving || editor.uploading} className="shop-panel grid gap-5 md:grid-cols-2" onSubmit={event => { event.preventDefault(); void editor.save(); }}>
      <label>Nombre<input className="shop-input" name="name" required maxLength={150} value={editor.draft.name} onChange={editor.change} /></label>
      <label>Precio (MXN)<input className="shop-input" name="price" type="number" min="0.01" max="1000000" step="0.01" required value={editor.draft.price} onChange={editor.change} /></label>
      <label className="md:col-span-2">Descripción<textarea className="shop-input" name="description" required maxLength={5000} rows={4} value={editor.draft.description} onChange={editor.change} /></label>
      <label>Categoría<select className="shop-input" name="category" value={editor.draft.category} onChange={editor.change}>{categories.map(category => <option key={category}>{category}</option>)}</select></label>
      <label>Universo<select className="shop-input" name="universe" value={editor.draft.universe} onChange={editor.change}>{universes.map(universe => <option key={universe}>{universe}</option>)}</select></label>
      <label>Precio anterior (opcional)<input className="shop-input" name="originalPrice" type="number" min="0.01" max="1000000" step="0.01" value={editor.draft.originalPrice ?? ''} onChange={editor.change} /></label>
      <label className="flex items-center gap-3"><input type="checkbox" name="isOnSale" checked={editor.draft.isOnSale ?? false} onChange={editor.change} /> Activar descuento</label>
      <label>Ruta o URL HTTPS de imagen<input className="shop-input" name="image" required value={editor.draft.image} onChange={editor.change} /></label>
      <label>Subir imagen<input className="shop-input" type="file" disabled={editor.uploading || editor.saving} accept="image/png,image/jpeg,image/webp" onChange={event => void editor.upload(event.target.files?.[0])} /></label>
      <img src={editor.draft.image} alt="Vista previa del producto" className="h-40 w-40 rounded object-cover" />
      <div className="self-end"><button className="shop-button" disabled={editor.saving || editor.uploading || !editor.ready}>{editor.uploading ? 'Cargando imagen…' : editor.saving ? 'Guardando…' : 'Guardar producto'}</button></div>
    </form>}
  </section>;
}
