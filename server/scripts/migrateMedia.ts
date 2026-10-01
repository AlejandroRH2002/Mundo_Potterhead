import { PrismaClient } from '@prisma/client';
import { databaseUrl } from '../database.ts';
import { createMediaStorage } from '../media.ts';
import { migrateBase64 } from '../mediaMigration.ts';

const args = process.argv.slice(2);
if (args.some(value => !['--apply','--dry-run'].includes(value) && !/^--batch-size=\d+$/.test(value)) || (args.includes('--apply') && args.includes('--dry-run'))) {
  console.error('Usage: pnpm media:migrate-base64 [--dry-run | --apply] [--batch-size=25]'); process.exit(1);
}
const apply = args.includes('--apply');
const batchSize = Number(args.find(value => value.startsWith('--batch-size='))?.split('=')[1] ?? 25);
let db: PrismaClient | undefined;
let storage: ReturnType<typeof createMediaStorage>;
try {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('Invalid batch size.');
  if (apply) { storage = createMediaStorage(process.env); if (!storage) throw new Error('Object storage required.'); }
  db = new PrismaClient({ datasources: { db: { url: databaseUrl(process.env) } } });
  const result = await migrateBase64(db, storage, { apply, batchSize });
  console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', ...result }));
  if (result.invalid || result.failed) process.exitCode = 1;
} catch {
  console.error('MEDIA_MIGRATION_FAILED: revisa el entorno privado, permisos y configuración. Los originales no se sustituyen sin confirmar la subida.');
  process.exitCode = 1;
} finally { storage?.close(); await db?.$disconnect(); }
