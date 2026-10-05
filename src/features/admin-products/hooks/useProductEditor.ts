import { normalizePriceInput } from '../services/priceInput';
import { createImagePreview } from '../services/imagePreview';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { productService, type ProductDraft } from '@/features/catalog/services/productService';
import { uploadProductImage } from '../services/mediaService';
import { errorMessage } from '@/shared/lib/money';
const empty: ProductDraft = { name: '', description: '', price: 0, image: '', category: 'accessories', universe: 'harry-potter', isOnSale: false };
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
  const [uploadFailed, setUploadFailed] = useState(false);
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
    else { if (name === 'image') { setPreview(''); setUploadFailed(false); } setDraft(current => ({ ...current, [name]: value })); }
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      setUploadFailed(false);
      setPreview(createImagePreview(file));
      setUploading(true);
      const image = await uploadProductImage(file);
      if (mounted.current) setDraft(current => ({ ...current, image }));
    } catch (cause: unknown) { if (mounted.current) { setUploadFailed(true); setError(errorMessage(cause)); } }
    finally { if (mounted.current) setUploading(false); }
  };
  const save = async () => {
    if (saving || uploading || !ready) return;
    setSaving(true); setError('');
    try {
      if (uploadFailed) throw new Error('La imagen no se pudo publicar. Vuelve a subirla antes de guardar.');
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
  return { priceInput, originalPriceInput, preview: preview || draft.image, draft, loading, saving, uploading, ready, error, change, upload, save };
}
