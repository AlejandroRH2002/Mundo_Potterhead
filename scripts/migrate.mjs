import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { databaseUrl } from '../server/database.ts';

// Production never loads dotenv and requires an explicit direct connection.
if (process.env.NODE_ENV !== 'production' && existsSync('.env')) process.loadEnvFile('.env');
let connection;
try { connection = databaseUrl(process.env, true); }
catch (error) { console.error(error instanceof Error ? error.message : 'Invalid migration configuration.'); process.exit(1); }
const child = spawn(process.execPath, ['node_modules/prisma/build/index.js', 'migrate', 'deploy'], {
  env: { ...process.env, DATABASE_URL: connection }, stdio: ['ignore', 'ignore', 'ignore'], windowsHide: true,
});
// Prisma can print connection details: expose only the exit status in CI.
child.on('error', () => { console.error('Could not start Prisma migration process.'); process.exitCode = 1; });
child.on('exit', code => {
  process.exitCode = code ?? 1;
  console.log(code === 0 ? 'Prisma migrate deploy completed.' : 'Migration failed. Inspect migration status privately before retrying; no reset was performed.');
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); });
