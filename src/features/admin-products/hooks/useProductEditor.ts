import { productImages } from '@/shared/lib/productMedia';
import { productPlaceholder } from '../../../../shared/productSchema';
import { normalizePriceInput } from '../services/priceInput';
import { createImagePreview } from '../services/imagePreview';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { productService, type ProductDraft } from '@/features/catalog/services/productService';
import { uploadProductImage } from '../services/mediaService';
import { errorMessage } from '@/shared/lib/money';
const empty: ProductDraft = { name: '', description: '', price: 0, image: '', category: 'accessories', universe: 'harry-potter', isOnSale: false };
const sanitizeImageSource = (value: string) => {
  const source = value.trim();
  if (!source) return '';
  if (/\s/.test(source) || Array.from(source).some(character => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127)) return '';
  if (source.startsWith('blob:')) return source;
  if (source.startsWith('/')) return source.startsWith('//') ? '' : source;
  try {
    const url = new URL(source);
    return url.protocol === 'https:' ? url.toString() : '';
  } catch {
    return '';
  }
};
export function useProductEditor(editing: boolean) {
  const params = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const id = params.id ?? search.get('id') ?? undefined;
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProductDraft>(empty);
  const [priceInput, setPriceInput] = useState('');
  const [originalPriceInput, setOriginalPriceInput] = useState('');
  const [preview, setPreview] = useState('');
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFailure, setUploadFailure] = useState('');
  const [ready, setReady] = useState(!editing);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!editing) return;
    let active = true;
    setReady(false); setLoading(true);
    const load = async () => {
      try {
        if (!id) throw new Error('Selecciona un producto desde el panel de administración.');
        const product = await productService.getById(id);
        if (active) { setDraft(product); setPriceInput(String(product.price)); setOriginalPriceInput(product.originalPrice === undefined ? '' : String(product.originalPrice)); setReady(true); }
      } catch (cause: unknown) { if (active) setError(errorMessage(cause)); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [editing, id]);
  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'isOnSale') setDraft(current => ({ ...current, isOnSale: (event.target as HTMLInputElement).checked }));
    else if (name === 'price') setPriceInput(normalizePriceInput(value));
    else if (name === 'originalPrice') setOriginalPriceInput(normalizePriceInput(value));
    else if (name === 'category') setDraft(current => ({ ...current, category: value as ProductDraft['category'], subcategory: null }));
    else if (name === 'subcategory') setDraft(current => ({ ...current, subcategory: value || null }));
    else if (name === 'image') { setPreview(''); setUploadFailure(''); setDraft(current => ({ ...current, image: value })); }
    else if (name === 'name') setDraft(current => ({ ...current, name: value }));
    else if (name === 'description') setDraft(current => ({ ...current, description: value }));
    else if (name === 'universe') setDraft(current => ({ ...current, universe: value as ProductDraft['universe'] }));
  };
  const gallery = productImages({ ...draft, id: id ?? '' }).filter(image => image !== productPlaceholder && !!image);
  const setPrimary = (image: string) => {
    if (uploading || saving) return;
    setPreview('');
    setDraft(current => ({ ...current, image, images: productImages({ ...current, id: id ?? '' }).filter(url => url !== image && url !== productPlaceholder).slice(0, 7) }));
  };
  const removeImage = (image: string) => {
    if (uploading || saving) return;
    setPreview('');
    setDraft(current => {
      const remaining = productImages({ ...current, id: id ?? '' }).filter(url => url !== image && url !== productPlaceholder);
      const primary = current.image === image ? remaining.shift() ?? '' : current.image;
      return { ...current, image: primary, images: remaining.filter(url => url !== primary) };
    });
  };
  const upload = async (files: File[] = []) => {
    if (!files.length || uploading || saving) return;
    setError('');
    try {
      if (gallery.length + files.length > 8) throw new Error('Puedes guardar hasta 8 imágenes por producto.');
      setUploadFailure('');
      setPreview(createImagePreview(files[0]));
      setUploading(true);
      for (const file of files) {
        const image = await uploadProductImage(file);
        if (!mounted.current) return;
        setDraft(current => {
          const existing = productImages({ ...current, id: id ?? '' }).filter(url => url !== productPlaceholder && !!url);
          const all = [...new Set([...existing, image])];
          return { ...current, image: all[0], images: all.slice(1) };
        });
      }
      setPreview('');
    } catch (cause: unknown) { if (mounted.current) { const message = errorMessage(cause); setUploadFailure(message); setError(message); } }
    finally { if (mounted.current) setUploading(false); }
  };
  const save = async () => {
    if (saving || uploading || !ready) return;
    setSaving(true); setError('');
    try {
      if (uploadFailure) throw new Error(uploadFailure);
      if (!draft.subcategory) throw new Error('Selecciona una subcategoría para este producto.');
      if (!priceInput.trim()) throw new Error('Indica el precio del producto.');
      const payload: ProductDraft = { ...draft, price: Number(priceInput), originalPrice: originalPriceInput.trim() ? Number(originalPriceInput) : undefined };
      if (editing) {
        if (!id) throw new Error('Falta el identificador del producto.');
        await productService.update(id, payload);
      } else await productService.create(payload);
      navigate('/admin');
    } catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  return { gallery, setPrimary, removeImage, priceInput, originalPriceInput, preview: sanitizeImageSource(preview || draft.image), draft, loading, saving, uploading, ready, error, change, upload, save };
}
