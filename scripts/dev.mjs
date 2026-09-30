import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as pause } from 'node:timers/promises';
import { readConfig } from '../server/config.ts';

const children = new Set();
let stopping = false;
let deadline;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;
  for (const child of children) child.kill();
  if (children.size) deadline = setTimeout(() => {
    for (const child of children) child.kill('SIGKILL');
  }, 16_000);
}
function launch(args) {
  const child = spawn(process.execPath, args, { stdio: 'inherit', windowsHide: true });
  children.add(child);
  const remove = () => { children.delete(child); if (!children.size && deadline) clearTimeout(deadline); };
  child.on('error', () => { remove(); stop(1); });
  child.on('exit', code => { remove(); stop(code ?? 1); });
  return child;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

async function freePort(host, port) {
  const probe = createServer();
  await new Promise((resolve, reject) => {
    probe.once('error', () => reject(new Error('PORT_' + port + '_UNAVAILABLE')));
    probe.listen({ host, port, exclusive: true }, () => probe.close(resolve));
  });
}
try {
  process.loadEnvFile('.env');
  const config = readConfig(process.env);
  if (process.env.NODE_ENV === 'production' || config.origin !== 'http://localhost:5173' ||
    !['127.0.0.1', 'localhost'].includes(config.host) || config.secureCookies) throw new Error('LOCAL_CONFIGURATION_REQUIRED');
  // Vite and API inherit exactly the same port, including PORT override.
  process.env.API_PORT = String(config.port);
  // Match the IPv4 proxy target even when API_HOST was configured as localhost.
  process.env.API_HOST = '127.0.0.1';
  await freePort('127.0.0.1', config.port);
  await freePort('localhost', 5173);
  launch(['server/index.ts']);
  let ready = false;
  for (let attempt = 0; attempt < 60 && !stopping; attempt++) {
    try { ready = (await fetch(`http://127.0.0.1:${config.port}/health/ready`, { signal: AbortSignal.timeout(500) })).ok; }
    catch { /* API is still starting. */ }
    if (ready) break;
    await pause(500);
  }
  if (!stopping) {
    if (!ready) throw new Error('API_NOT_READY_CHECK_DATABASE_AND_MIGRATIONS');
    launch(['node_modules/vite/bin/vite.js']);
    console.log('API ready; starting frontend at http://localhost:5173.');
  }
} catch (error) {
  const message = error instanceof Error && /^(PORT_\d+_UNAVAILABLE|LOCAL_CONFIGURATION_REQUIRED|API_NOT_READY_CHECK_DATABASE_AND_MIGRATIONS)$/.test(error.message)
    ? error.message : 'DEV_START_FAILED_CHECK_ENV_AND_DEPENDENCIES';
  console.error(message); stop(1);
}
