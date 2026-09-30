import { useEffect, useState, type ChangeEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { productService, type ProductDraft } from '@/features/catalog/services/productService';
import { uploadProductImage } from '../services/mediaService';
import { errorMessage } from '@/shared/lib/money';
const empty: ProductDraft = { name: '', description: '', price: 0, image: '/images/product-placeholder.svg', category: 'accessories', universe: 'harry-potter', isOnSale: false };
export function useProductEditor(editing: boolean) {
  const params = useParams<{ id: string }>();
  const [search] = useSearchParams();
  const id = params.id ?? search.get('id') ?? undefined;
  const navigate = useNavigate();
  const [draft, setDraft] = useState<ProductDraft>(empty);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
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
        if (active) { setDraft(product); setReady(true); }
      } catch (cause: unknown) { if (active) setError(errorMessage(cause)); }
      finally { if (active) setLoading(false); }
    };
    void load();
    return () => { active = false; };
  }, [editing, id]);
  const change = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    if (name === 'isOnSale') setDraft(current => ({ ...current, isOnSale: (event.target as HTMLInputElement).checked }));
    else if (name === 'price' || name === 'originalPrice') setDraft(current => ({ ...current, [name]: value === '' && name === 'originalPrice' ? undefined : Number(value) }));
    else setDraft(current => ({ ...current, [name]: value }));
  };
  const upload = async (file?: File) => {
    if (!file) return;
    setError('');
    try {
      setUploading(true);
      const image = await uploadProductImage(file);
      setDraft(current => ({ ...current, image }));
    } catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setUploading(false); }
  };
  const save = async () => {
    if (saving || uploading || !ready) return;
    setSaving(true); setError('');
    try {
      if (editing) {
        if (!id) throw new Error('Falta el identificador del producto.');
        await productService.update(id, draft);
      } else await productService.create(draft);
      navigate('/admin');
    } catch (cause: unknown) { setError(errorMessage(cause)); }
    finally { setSaving(false); }
  };
  return { draft, loading, saving, uploading, ready, error, change, upload, save };
}
