import { PrismaClient } from '@prisma/client';
import { databaseUrl } from '../database.ts';
const args = process.argv.slice(2).filter(arg=>arg!=='--');
if (args.some(arg => !['--apply', '--dry-run'].includes(arg)) || args.includes('--apply') && args.includes('--dry-run')) throw new Error('Usa --dry-run (predeterminado) o --apply.');
const apply = args.includes('--apply');
if(apply && process.env.INVENTORY_MODE==='enforce')throw new Error('Vuelve a capture antes de preparar modelos pendientes.');
const db = new PrismaClient({ datasources: { db: { url: databaseUrl(process.env) } } });
let scanned = 0, pending = 0, cursor: string | undefined;
try {
  while (true) {
    const rows = await db.product.findMany({ orderBy: { id: 'asc' }, take: 100, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), select: { id: true, models: { select: { id: true }, take: 1 } } });
    if (!rows.length) break;
    for (const row of rows) {
      scanned++;
      if (row.models.length) continue;
      pending++;
      if (apply) await db.$transaction(async tx => {
        await tx.$queryRaw`SELECT "id" FROM "Product" WHERE "id"=${row.id} FOR UPDATE`;
        if (await tx.productModel.count({ where: { productId: row.id } })) return;
        await tx.productModel.upsert({ where: { id: 'default-' + row.id }, update: {}, create: { id: 'default-' + row.id, productId: row.id, sku: 'MP-' + row.id, name: 'General', skus:{create:{id:'default-'+row.id,code:'MP-'+row.id,size:'one',quantity:null}} } });
      });
    }
    cursor = rows[rows.length - 1].id;
  }
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', scanned, missingModels: pending }));
} finally { await db.$disconnect(); }
