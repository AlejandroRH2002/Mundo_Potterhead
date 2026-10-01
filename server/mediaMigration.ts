import { createHash } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { imageMime, type MediaStorage } from './media.ts';
export async function migrateBase64(db: PrismaClient, storage: MediaStorage | undefined, options: { apply: boolean; batchSize: number }) {
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1 || options.batchSize > 100) throw new Error('Batch size must be 1–100.');
  if (options.apply && !storage) throw new Error('MEDIA_STORAGE=s3 is required to apply.');
  const result = { scanned: 0, migrated: 0, invalid: 0, failed: 0, conflicts: 0, batches: 0 };
  let cursor: string | undefined;
  while (true) {
    const rows = await db.product.findMany({ where: { imageUrl: { startsWith: 'data:image/' }, ...(cursor ? { id: { gt: cursor } } : {}) },
      select: { id: true, imageUrl: true }, orderBy: { id: 'asc' }, take: options.batchSize });
    if (!rows.length) break;
    result.batches++;
    for (const row of rows) {
      cursor = row.id; result.scanned++;
      let bytes: Buffer; let key: string;
      try {
        if (!row.imageUrl || row.imageUrl.length > 14_000_000) throw new Error('Invalid image.');
        const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(row.imageUrl);
        if (!match) throw new Error('Invalid image.');
        bytes = Buffer.from(match[2], 'base64');
        if (bytes.toString('base64') !== match[2] || bytes.length > 10 * 1024 * 1024 || imageMime(bytes) !== match[1]) throw new Error('Invalid image.');
        const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' }[imageMime(bytes)];
        key = 'products/migrated-' + createHash('sha256').update(row.id).update('\0').update(bytes).digest('hex') + '.' + ext;
      } catch { result.invalid++; continue; }
      if (!options.apply) continue;
      try {
        const url = await storage!.putVerified(bytes, key);
        const changed = await db.product.updateMany({ where: { id: row.id, imageUrl: row.imageUrl }, data: { imageUrl: url } });
        if (changed.count) result.migrated++; else result.conflicts++;
      } catch { result.failed++; }
    }
  }
  return result;
}
