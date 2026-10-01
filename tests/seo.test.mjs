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
  const { createServer } = await import('vite');
  const { readFile } = await import('node:fs/promises');
  const previous = process.env.VITE_SITE_URL;
  process.env.VITE_SITE_URL = '';
  const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' });
  try {
    const html = await server.transformIndexHtml('/', await readFile('index.html', 'utf8'));
    assert.doesNotMatch(html, /__SITE_URL__|__ROBOTS__|rel="canonical"|property="og:url"|property="og:image"/);
    assert.match(html, /noindex, nofollow/);
  } finally {
    await server.close();
    if (previous === undefined) delete process.env.VITE_SITE_URL; else process.env.VITE_SITE_URL = previous;
  }
});
