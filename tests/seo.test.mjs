import { test } from 'node:test';
import assert from 'node:assert/strict';
import { discoveryFiles, routeMetadata, siteOrigin, publicRoutes } from '../shared/seo.ts';
test('canonical base rejects unsafe values and supports an unset prelaunch build', () => {
  assert.equal(siteOrigin(''), undefined);
  assert.equal(siteOrigin('https://shop.example/'), 'https://shop.example');
  for (const value of ['http://shop.example', 'https://user:pass@shop.example', 'https://shop.example/path', 'https://shop.example/?secret=x']) assert.throws(() => siteOrigin(value));
});
test('discovery files contain only static public pages; private routes are noindex', () => {
  const files = discoveryFiles('https://shop.example');
  for (const path of Object.keys(publicRoutes)) assert.ok(files.sitemap.includes('<loc>https://shop.example' + path + '</loc>'));
  assert.doesNotMatch(files.sitemap, /admin|products|profile|cart|login/);
  for (const path of ['/admin', '/products/new', '/products/edit/id', '/profile', '/cart', '/login', '/unknown']) assert.equal(routeMetadata(path).noindex, true);
  assert.match(files.robots, /Sitemap: https:\/\/shop.example\/sitemap.xml/);
  assert.match(discoveryFiles(undefined).robots, /Disallow: \//);
  assert.doesNotMatch(discoveryFiles(undefined).sitemap, /<loc>/);
});

test('HTML transform removes unresolved placeholders and canonical when origin is unset', async () => {
  const { createTestViteServer } = await import('./fixtures/viteServer.mjs');
  const { readFile } = await import('node:fs/promises');
  const previous = process.env.VITE_SITE_URL;
  process.env.VITE_SITE_URL = '';
  const server = await createTestViteServer();
  try {
    const source = (await readFile('index.html', 'utf8')).replace(/\r\n?/g, '\n');
    const versions = [source, source.replace(/\n/g, '\r\n'), source.replace(/\n/g, (_, offset) => offset % 2 ? '\r\n' : '\n')];
    for (const input of versions) {
      const html = await server.transformIndexHtml('/', input);
      assert.doesNotMatch(html, /__SITE_URL__|__ROBOTS__|rel="canonical"|property="og:url"|property="og:image"/);
      assert.match(html, /noindex, nofollow/);
      assert.doesNotMatch(html, /\r/);
    }
    const provider = await server.ssrLoadModule('/src/features/auth/services/AuthProvider.tsx');
    assert.equal(typeof provider.AuthProvider, 'function');
  } finally {
    await server.close();
    if (previous === undefined) delete process.env.VITE_SITE_URL; else process.env.VITE_SITE_URL = previous;
  }
});
