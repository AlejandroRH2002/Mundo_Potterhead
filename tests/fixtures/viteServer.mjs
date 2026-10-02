import { createServer } from 'vite';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';

export async function createTestViteServer() {
  // Attach the legacy WS transport to an HTTP server that never listens.
  const transport = createHttpServer();
  const server = await createServer({
    root: fileURLToPath(new URL('../../', import.meta.url)),
    configFile: fileURLToPath(new URL('../../vite.config.ts', import.meta.url)),
    server: { hmr: false, middlewareMode: true },
    plugins: [{
      name: 'tests-no-network-hmr',
      configResolved(config) { config.server.hmr = { server: transport }; },
      configureServer(server) { server.config.server.hmr = false; },
    }],
    optimizeDeps: { noDiscovery: true, entries: [], include: [] },
    appType: 'custom',
  });
  return server;
}
