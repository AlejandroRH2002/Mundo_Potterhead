import { productService } from '@/features/catalog/services/productService';
import { productImages } from '@/shared/lib/productMedia';
import { useCallback, useEffect, useRef, useState } from 'react';
import { inventoryService } from '../services/inventoryService';
import { errorMessage } from '@/shared/lib/money';
import type { InventoryPage, InventoryRow, MovementInput, MovementPage } from '../../../../shared/inventory.ts';
export function useInventory(params: URLSearchParams) {
  const query = params.toString();
  const [data, setData] = useState<InventoryPage>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const [history, setHistory] = useState<MovementPage>();
  const [historyId, setHistoryId] = useState('');
  const [gallery,setGallery]=useState<string[]>([]);
  const [saved,setSaved]=useState(0);
  const inFlight = useRef(false);
  const retry = useRef<{ signature: string; key: string }>();
  useEffect(() => { const controller = new AbortController(); setLoading(true); setError(''); void inventoryService.list(new URLSearchParams(query), controller.signal).then(setData).catch(cause => { if (!controller.signal.aborted) setError(errorMessage(cause)); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [query, revision]);
  const run = useCallback(async (action: () => Promise<void>) => {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try { await action(); setRevision(value => value + 1); }
    catch (cause) { setError(errorMessage(cause)); }
    finally { inFlight.current = false; setBusy(false); }
  }, []);
  const loadHistory = (id: string, page = 1) => run(async () => { setHistory(await inventoryService.history(id, page)); setHistoryId(id); });
  return { data, error, notice, loading, busy, history, historyId, saved, gallery, run,
    loadGallery:(productId:string)=>run(async()=>{setGallery(productImages(await productService.getAdminById(productId)));}), loadHistory,
    move: (row: InventoryRow, input: Omit<MovementInput, 'key'>) => run(async () => {
      const signature = JSON.stringify([row.id, input]);
      if (retry.current?.signature !== signature) retry.current = { signature, key: crypto.randomUUID() };
      const result = await inventoryService.move(row.id, { ...input, key: retry.current.key });
      retry.current = undefined;setSaved(value=>value+1); setNotice(`Guardado: ${result.before ?? 'pendiente'} → ${result.after} unidades.`);
      const history=await inventoryService.history(row.id,1).catch(()=>undefined);setHistory(history);setHistoryId(row.id);
    }),
    saveModel: (productId: string, name: string, image: string, active: boolean, id?: string) => run(async () => { await inventoryService.model(productId, name, image, active, id); setNotice('Modelo guardado. Los modelos nuevos requieren conteo inicial; en control definitivo se crean inactivos.'); }),
    archive: (productId: string, archived: boolean) => run(async () => { await inventoryService.archive(productId, archived); setNotice(archived ? 'Producto archivado; historial conservado.' : 'Producto mostrado según disponibilidad.'); }),
  };
}
