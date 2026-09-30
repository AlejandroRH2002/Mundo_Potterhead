import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, process.cwd(), 'VITE_');
  const allowed = new Set(['VITE_WHATSAPP_NUMBER', 'VITE_API_URL']);
  for (const key of Object.keys(publicEnv)) {
    if (!allowed.has(key)) throw new Error(`Variable pública no autorizada: ${key}. Los secretos pertenecen al entorno del servidor.`);
  }
  const apiUrl = publicEnv.VITE_API_URL ?? '/api';
  if (apiUrl !== '/api') {
    const url = new URL(apiUrl);
    if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(mode === 'development' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('VITE_API_URL must be a public HTTPS endpoint without credentials or query parameters.');
  }
  const port = Number(loadEnv(mode, process.cwd(), 'API_PORT').API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválido.');
  return {
    plugins: [react()],
    envPrefix: 'VITE_',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: 'localhost',
      port: 5173,
      strictPort: true,
      proxy: { '/api': { target: `http://127.0.0.1:${port}`, changeOrigin: false } },
      fs: { deny: ['.env', '.env.*', '**/*.pem', '**/*.crt', '**/.git/**', '**/server/**', '**/dist-server/**', '**/prisma/**', '**/tests/**'] },
    },
    preview: { proxy: { '/api': { target: `http://127.0.0.1:${port}`, changeOrigin: false } } },
  };
})
