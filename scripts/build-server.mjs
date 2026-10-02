import { build } from 'esbuild';
await build({ entryPoints: ['server/index.ts', 'server/scripts/bootstrap.ts', 'scripts/migrate.mjs', 'server/scripts/migrateMedia.ts', 'server/scripts/backfillSubcategory.ts'], outdir: 'dist-server',
  entryNames: '[name]', bundle: true, packages: 'external', platform: 'node', format: 'esm', target: 'node24', sourcemap: false });
console.log('Independent backend compiled in dist-server.');
