import { requestJson } from '@/shared/lib/httpClient';
import type { InventoryPage, MovementInput, MovementPage, MovementResult, InventoryRow } from '../../../../shared/inventory.ts';
export const inventoryService = {
  list: (params: URLSearchParams, signal?: AbortSignal) => requestJson<InventoryPage>('/admin/inventory?' + params, { signal }),
  history: (id: string, page: number) => requestJson<MovementPage>(`/admin/inventory/${encodeURIComponent(id)}/movements?page=${page}`),
  move: (id: string, input: MovementInput) => requestJson<MovementResult>(`/admin/inventory/${encodeURIComponent(id)}/movements`, { method: 'POST', body: JSON.stringify(input) }),
  model: (productId: string, name: string, image: string, active: boolean, id?: string) => requestJson<InventoryRow>(`/admin/inventory/models/${encodeURIComponent(productId)}${id ? '/' + encodeURIComponent(id) : ''}`, { method: id ? 'PATCH' : 'POST', body: JSON.stringify({ name, image, active }) }),
  archive: (productId: string, archived: boolean) => requestJson<void>(`/admin/inventory/archive/${encodeURIComponent(productId)}`, { method: 'PATCH', body: JSON.stringify({ archived }) }),
};
