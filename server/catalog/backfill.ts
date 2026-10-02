import { inferSubcategory } from '../../shared/catalogTaxonomy.ts';
export interface BackfillRow { id: string; name: string; description: string | null; category: string; subcategory: string | null }
export interface BackfillStore {
 page(cursor: string, size: number): Promise<BackfillRow[]>;
 assign(id: string, subcategory: string): Promise<number>;
}
export async function backfillSubcategories(store: BackfillStore, apply = false, unclassifiedProduct: (product: Pick<BackfillRow, 'id' | 'name'>) => void = () => {}) {
 let cursor = '', scanned = 0, classified = 0, unclassified = 0, written = 0;
 while (true) {
  const rows = await store.page(cursor, 100);
  if (!rows.length) break;
  for (const row of rows) {
   scanned++; if (row.subcategory != null) continue;
   const subcategory = inferSubcategory(row.category, row.name, row.description ?? '');
   if (!subcategory) { unclassified++; unclassifiedProduct({ id: row.id, name: row.name }); continue; }
   classified++; if (apply) written += await store.assign(row.id, subcategory);
  }
  cursor = rows[rows.length - 1].id;
 }
 return { mode: apply ? 'apply' : 'dry-run', scanned, classified, unclassified, written };
}
