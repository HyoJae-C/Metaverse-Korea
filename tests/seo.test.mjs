// Search-engine files: robots.txt points at the sitemap, every sitemap URL is a
// real page, and the generated about pages match scripts/build-seo-pages.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { files, SITE, PAGES } from '../scripts/build-seo-pages.mjs';

test('robots.txt allows crawling and names the sitemap', () => {
  const robots = readFileSync('public/robots.txt', 'utf8');
  assert.match(robots, /User-agent: \*/);
  assert.doesNotMatch(robots, /Disallow: \/\s*$/m);
  assert.match(robots, new RegExp(`Sitemap: ${SITE}sitemap.xml`));
});

test('generated SEO pages are up to date (run node scripts/build-seo-pages.mjs)', () => {
  for (const [path, text] of Object.entries(files())) {
    assert.ok(existsSync(path), `${path} missing`);
    assert.equal(readFileSync(path, 'utf8'), text, `${path} is stale`);
  }
});

test('every sitemap URL is a file in public/ or the game page', () => {
  const locs = [...readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  assert.ok(locs.length >= PAGES.length + 1);
  for (const loc of locs) {
    assert.ok(loc.startsWith(SITE), loc);
    const rel = loc.slice(SITE.length);
    if (rel === '') continue;
    const file = rel.endsWith('/') ? `public/${rel}index.html` : `public/${rel}`;
    assert.ok(existsSync(file), `${loc} → ${file} missing`);
  }
});

test('game page has a title, description and canonical URL', () => {
  const html = readFileSync('index.html', 'utf8');
  assert.match(html, /<title>[^<]{10,}<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]{50,160}"/);
  assert.match(html, new RegExp(`<link rel="canonical" href="${SITE}"`));
});
