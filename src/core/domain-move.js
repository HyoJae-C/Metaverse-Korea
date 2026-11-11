// The game moved from another-seoul.com to moduseoul.com (2026-11). The old
// address now serves a small page (its own repository) that reads the
// player's data from that browser — the same origin the game used to live
// on — and sends it here in the address's #fragment, which never reaches a
// server. This puts it back into localStorage before anything else reads it,
// so a guest who never signed in keeps their character, coins and account.
//
// Only taken when it comes straight from the old address and this browser has
// no game data here yet, so a link can't overwrite someone's save.
export const OLD_ORIGIN = 'https://another-seoul.com';
export const KEEP = (k) => k === 'mkauth' || k.startsWith('mk') || k.startsWith('as.');

export function decodeMove(hash) {
  const m = /^#move=([A-Za-z0-9_-]+)$/.exec(hash || '');
  if (!m) return null;
  try {
    const b64 = m[1].replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    return data && data.v === 1 && data.keys && typeof data.keys === 'object' ? data.keys : null;
  } catch { return null; }
}

export function takeMove({ hash, referrer, storage, onDone }) {
  const keys = decodeMove(hash);
  if (!keys) return 0;
  onDone?.(); // drop the fragment from the address either way
  let fromOld = false;
  try { fromOld = new URL(referrer).origin === OLD_ORIGIN; } catch { /* no referrer */ }
  if (!fromOld) return 0;
  for (let i = 0; i < storage.length; i++) if (KEEP(storage.key(i) || '')) return 0; // already has a save here
  let n = 0;
  for (const [k, v] of Object.entries(keys)) {
    if (KEEP(k) && typeof v === 'string') { storage.setItem(k, v); n++; }
  }
  return n;
}

if (typeof location !== 'undefined' && location.hash.startsWith('#move=')) {
  try {
    takeMove({
      hash: location.hash, referrer: document.referrer, storage: localStorage,
      onDone: () => history.replaceState(null, '', location.pathname + location.search),
    });
  } catch { /* storage blocked: start fresh */ }
}
