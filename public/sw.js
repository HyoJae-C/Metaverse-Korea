// Another Seoul service worker: lets the game be added to the home screen and
// opens faster the second time. It is careful to stay out of the way:
// - only same-origin GET requests are handled, so Supabase (save, login,
//   multiplayer) and Google sign-in always go straight to the network;
// - pages are network-first, so a new deploy shows up on the next visit and
//   the Google sign-in return URL (?code=… / #access_token=…) reaches the app;
// - build files under assets/ have a hash in their name and never change, so
//   they are served from the cache once fetched;
// - everything else (maps, models, books, sounds) is network-first with the
//   cached copy as a fallback when offline.
const VERSION = 'v1';
const PAGES = `as-pages-${VERSION}`;
const ASSETS = `as-assets-${VERSION}`;
const FILES = `as-files-${VERSION}`;
const KEEP = [PAGES, ASSETS, FILES];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(PAGES).then((c) => c.add(new Request('./', { cache: 'reload' }))).catch(() => {}));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k.startsWith('as-') && !KEEP.includes(k)) await caches.delete(k);
    await self.clients.claim();
  })());
});

async function networkFirst(req, cacheName, cacheKey = req) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok && res.type === 'basic') cache.put(cacheKey, res.clone()).catch(() => {});
    return res;
  } catch (err) {
    const hit = await cache.match(cacheKey, { ignoreSearch: true });
    if (hit) return hit;
    throw err;
  }
}

async function cacheFirst(req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok && res.type === 'basic') cache.put(req, res.clone()).catch(() => {});
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase, Google, fonts: untouched
  if (req.headers.has('range')) return; // audio/video seeking
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  if (req.mode === 'navigate') {
    // Only the game page itself is cached (as "./"); other pages such as
    // privacy.html are still fetched from the network as usual.
    const isApp = url.pathname === scope.pathname || url.pathname === `${scope.pathname}index.html`;
    if (isApp) e.respondWith(networkFirst(req, PAGES, new Request('./')));
    return;
  }
  if (url.pathname.startsWith(`${scope.pathname}assets/`)) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkFirst(req, FILES));
});
