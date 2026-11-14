// Modu Seoul service worker: lets the game be added to the home screen and
// opens faster the second time. It is careful to stay out of the way:
// - only same-origin GET requests are handled, so Supabase (save, login,
//   multiplayer) and Google sign-in always go straight to the network;
// - pages are network-first, so a new deploy shows up on the next visit and
//   the Google sign-in return URL (?code=… / #access_token=…) reaches the app;
// - build files under assets/ have a hash in their name and never change, so
//   they are served from the cache once fetched;
// - everything else (maps, models, books, sounds) is network-first with the
//   cached copy as a fallback when offline;
// - "network-first" waits a few seconds at most when a cached copy exists:
//   on a connection that hangs instead of failing, the saved copy is used
//   and the new one keeps downloading for next time.
// "Network" means really asking the server: GitHub Pages tells browsers to
// keep every file for 10 minutes, so a plain fetch() could hand back the old
// page or old map data for that long after a deploy. Revalidating (cache:
// 'no-cache') costs a small 304 when nothing changed and gets the new build
// at once when something did.
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

// How long to wait for the network before using the saved copy. A slow or
// half-broken connection (a free VPN, a far-away country, a weak signal)
// often never fails, it just hangs; without a limit the page would wait
// for minutes. The download keeps going after we answer from the cache, so
// the new copy is there next time.
const WAIT_PAGE = 3000;
const WAIT_FILE = 3000;

// A saved game page can only be used if every build file it loads (main
// script, style, preloads) is saved too: the server deletes old build files
// on every deploy, so an old page with a missing file would be stuck.
async function pageUsable(res) {
  try {
    const html = await res.clone().text();
    const assets = await caches.open(ASSETS);
    const refs = [...html.matchAll(/(?:src|href)="([^"]*assets\/[^"]+\.(?:js|css))"/g)];
    if (!refs.length) return false;
    for (const m of refs) {
      if (!(await assets.match(new URL(m[1], self.registration.scope).href, { ignoreVary: true }))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function networkFirst(e, req, cacheName, { key = req, wait = WAIT_FILE, usable = null } = {}) {
  const cache = await caches.open(cacheName);
  const net = fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok && res.type === 'basic') {
      const put = cache.put(key, res.clone()).catch(() => {});
      try { e.waitUntil(put); } catch { /* the event is over; the put still runs */ }
    }
    return res;
  });
  e.waitUntil(net.catch(() => {})); // let a slow download finish in the background
  const saved = async () => {
    const hit = await cache.match(key, { ignoreSearch: true });
    return hit && (!usable || (await usable(hit))) ? hit : null;
  };
  try {
    const first = await Promise.race([net, new Promise((r) => setTimeout(r, wait, null))]);
    if (first) return first;
    return (await saved()) || (await net);
  } catch (err) {
    const hit = (await saved()) || (await cache.match(key, { ignoreSearch: true }));
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
    if (isApp) e.respondWith(networkFirst(e, req, PAGES, { key: new Request('./'), wait: WAIT_PAGE, usable: pageUsable }));
    return;
  }
  if (url.pathname.startsWith(`${scope.pathname}assets/`)) { e.respondWith(cacheFirst(req)); return; }
  e.respondWith(networkFirst(e, req, FILES));
});
