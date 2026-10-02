import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { discoveryFiles, siteOrigin } from './shared/seo';

const root = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig(({ mode }) => {
  const publicEnv = loadEnv(mode, root, 'VITE_');
  const allowed = new Set(['VITE_WHATSAPP_NUMBER', 'VITE_API_URL', 'VITE_LEGAL_NAME', 'VITE_LEGAL_EMAIL', 'VITE_SITE_URL', 'VITE_MAP_QUERY', 'VITE_MAP_EMBED_URL']);
  for (const key of Object.keys(publicEnv)) {
    if (!allowed.has(key)) throw new Error('Variable pública no autorizada: ' + key + '. Los secretos pertenecen al entorno del servidor.');
  }
  const apiUrl = publicEnv.VITE_API_URL ?? '/api';
  if (apiUrl !== '/api') {
    const url = new URL(apiUrl);
    if (url.username || url.password || url.search || url.hash ||
      (url.protocol !== 'https:' && !(mode === 'development' && url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)))) throw new Error('VITE_API_URL must be a public HTTPS endpoint without credentials or query parameters.');
  }
  const site = siteOrigin(publicEnv.VITE_SITE_URL);
  const discovery = discoveryFiles(site);
  const port = Number(loadEnv(mode, root, 'API_PORT').API_PORT ?? 3001);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('API_PORT inválido.');
  return {
    root,
    plugins: [react(), {
      name: 'site-metadata',
      transformIndexHtml(html) {
        const escaped = (site ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
        const normalized = html.replace(/\r\n?/g, '\n');
        const filtered = site ? normalized : normalized
          .replace(/^[ \t]*<link\b[^>]*\brel="canonical"[^>]*>[ \t]*\n?/gm, '')
          .replace(/^[ \t]*<meta\b[^>]*\bproperty="og:(?:url|image)"[^>]*>[ \t]*\n?/gm, '');
        return filtered.replace(/__SITE_URL__/g, escaped).replace(/__ROBOTS__/g, site ? 'index, follow' : 'noindex, nofollow');
      },
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'robots.txt', source: discovery.robots });
        this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: discovery.sitemap });
      },
    }],
    define: { __HAS_BANNER_2X__: JSON.stringify(existsSync(fileURLToPath(new URL('./public/brand/banner@2x.jpg', import.meta.url)))) },
    envPrefix: 'VITE_',
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      host: 'localhost', port: 5173, strictPort: true,
      proxy: { '/api': { target: 'http://127.0.0.1:' + port, changeOrigin: false } },
      fs: { deny: ['.env', '.env.*', '**/*.pem', '**/*.crt', '**/.git/**', '**/server/**', '**/dist-server/**', '**/prisma/**', '**/tests/**'] },
    },
    preview: { proxy: { '/api': { target: 'http://127.0.0.1:' + port, changeOrigin: false } } },
  };
});
