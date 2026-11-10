// Shop product descriptions come at the first shop door, not with
// stores.json (the build moves them to store-descs.json: vite.config.js).
// load() fetches them once and puts each back on its product; a dev server
// has no such file (its stores.json still has them), and offline the shop
// just opens without them and the next door tries again.
export function createStoreDescs({ url, stores, fetchJson = (u) => fetch(u).then((r) => (r.ok ? r.json() : null)), now = () => performance.now() }) {
  let done = false;
  let ok = false;
  let pending = null;
  let failedAt = -Infinity; // (offline: at most one try every 30 s)
  const merge = (descs) => {
    for (const s of stores()) {
      const d = descs[s.id];
      if (d) for (const p of s.products || []) if (d[p.id] != null && p.desc == null) p.desc = d[p.id];
    }
  };
  return {
    // true once a try has finished (well or not): entering never waits twice.
    ready: () => done,
    load() {
      if (ok || (!pending && now() - failedAt < 30000)) return pending || Promise.resolve();
      pending ||= Promise.resolve().then(() => fetchJson(url)).then((d) => { if (d) merge(d); ok = true; })
        .catch(() => { failedAt = now(); }).finally(() => { done = true; pending = null; });
      return pending;
    },
  };
}
