import { spawnSync } from 'node:child_process';
import { randomBytes, randomUUID } from 'node:crypto';
import { setTimeout } from 'node:timers/promises';

// This command NEVER uses DATABASE_URL from .env: only a disposable PostgreSQL container.
const name = 'mp-integration-' + randomUUID();
const imageIndex = process.argv.indexOf('--image');
const imageName = imageIndex === -1 ? undefined : process.argv[imageIndex + 1];
if (imageIndex !== -1 && !imageName) throw new Error('Provide the backend image name after --image.');
const network = name + '-network';
const apiName = name + '-api';
const password = randomBytes(32).toString('hex');
const env = { ...process.env, POSTGRES_PASSWORD: password };
function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', env, timeout: 180_000, windowsHide: true, ...options });
  if (result.error || result.status !== 0) throw new Error('Integration step failed: ' + command + ' ' + args[0]);
  return result.stdout?.trim();
}
let created = false;
let networkCreated = false;
let apiCreated = false;
try {
  if (imageName) { run('docker', ['network', 'create', network]); networkCreated = true; }
  run('docker', ['run', '--detach', '--rm', '--name', name, ...(imageName ? ['--network', network] : []), '-e', 'POSTGRES_PASSWORD', '-e', 'POSTGRES_USER=mp_test', '-e', 'POSTGRES_DB=mp_test', '-p', '127.0.0.1::5432', 'postgres:16-alpine']);
  created = true;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    const result = spawnSync('docker', ['exec', name, 'pg_isready', '-U', 'mp_test', '-d', 'mp_test'], { stdio: 'ignore', windowsHide: true });
    if (result.status === 0) { ready = true; break; }
    await setTimeout(500);
  }
  if (!ready) throw new Error('Disposable PostgreSQL did not become ready.');
  const port = run('docker', ['inspect', '--format', '{{(index (index .NetworkSettings.Ports "5432/tcp") 0).HostPort}}', name]);
  const testEnv = { ...env, DATABASE_URL: `postgresql://mp_test:${password}@127.0.0.1:${port}/mp_test`, SESSION_SECRET: randomBytes(48).toString('hex'), MP_ISOLATED_TEST_DB: 'true', DB_TLS_MODE: 'disable' };
  const migrationEnv = { ...testEnv, NODE_ENV: 'production', DIRECT_DATABASE_URL: testEnv.DATABASE_URL };
  run(process.execPath, ['scripts/migrate.mjs'], { env: migrationEnv });
  run(process.execPath, ['scripts/migrate.mjs'], { env: migrationEnv }); // Idempotent release retry.
  console.log('Both migrations applied to disposable PostgreSQL.');
  run(process.execPath, ['--test', 'tests/persistence.test.mjs'], { env: testEnv, stdio: 'inherit' });
  if (imageName) {
    const apiEnv = { ...testEnv, DATABASE_URL: `postgresql://mp_test:${password}@${name}:5432/mp_test`, APP_ORIGIN: 'https://shop.test.invalid' };
    apiEnv.DIRECT_DATABASE_URL = apiEnv.DATABASE_URL;
    run('docker', ['run', '--rm', '--network', network, '-e', 'DIRECT_DATABASE_URL', '-e', 'DB_TLS_MODE',
      imageName, 'node', 'dist-server/migrate.js'], { env: apiEnv });
    run('docker', ['run', '--detach', '--rm', '--name', apiName, '--network', network, '-p', '127.0.0.1::3001',
      '-e', 'DATABASE_URL', '-e', 'DB_TLS_MODE', '-e', 'SESSION_SECRET', '-e', 'APP_ORIGIN', imageName], { env: apiEnv });
    apiCreated = true;
    const apiPort = run('docker', ['inspect', '--format', '{{(index (index .NetworkSettings.Ports "3001/tcp") 0).HostPort}}', apiName]);
    let healthy = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      try { healthy = (await fetch(`http://127.0.0.1:${apiPort}/health/ready`, { signal: AbortSignal.timeout(500) })).ok; } catch { /* startup */ }
      if (healthy) break;
      await setTimeout(200);
    }
    if (!healthy) throw new Error('Docker API did not become ready.');
    run('docker', ['exec', apiName, 'node', '--input-type=module', '-e',
      "import {existsSync} from 'node:fs'; if(process.getuid()===0 || ['.env','node_modules/vite','node_modules/typescript'].some(existsSync)) process.exit(1);"]);
    console.log('Docker API ready on PostgreSQL, running unprivileged without .env, Vite or TypeScript.');
    run('docker', ['kill', '--signal=TERM', apiName]);
    let draining = false;
    for (let attempt = 0; attempt < 10; attempt++) {
      draining = (await fetch(`http://127.0.0.1:${apiPort}/health/ready`, { signal: AbortSignal.timeout(2000) })).status === 503;
      if (draining) break;
      await setTimeout(50);
    }
    if (!draining || !(await fetch(`http://127.0.0.1:${apiPort}/health/live`)).ok) throw new Error('Invalid draining health state.');
    if (run('docker', ['wait', apiName]) !== '0') throw new Error('Backend failed graceful shutdown.');
    apiCreated = false;
    console.log('SIGTERM: readiness 503, liveness 200 during drain, clean shutdown.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Integration failed.'); process.exitCode = 1;
} finally {
  if (apiCreated) spawnSync('docker', ['rm', '--force', apiName], { stdio: 'ignore', windowsHide: true });
  if (created) {
    const result = spawnSync('docker', ['rm', '--force', name], { stdio: 'ignore', windowsHide: true });
    if (result.status !== 0) { console.error('Could not remove test container: ' + name); process.exitCode = 1; }
  }
  if (networkCreated) spawnSync('docker', ['network', 'rm', network], { stdio: 'ignore', windowsHide: true });
}
