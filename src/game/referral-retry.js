// Friend invites that the server didn't take (supabase/025_referrals.sql).
// A new player types the friend's name once, on the start screen. If the
// server can't be asked then (offline, slow, SQL missing), the name used to
// be dropped without a word and the friend was never paid. Now it is kept on
// this device and sent again when the game has its server wallet, until the
// server gives a real answer. The server's own 24-hour new-account rule still
// decides; a name older than that here is dropped too.

const KEY = 'mk.refPending';
const KEEP_MS = 24 * 3600 * 1000;

export function keepPending(storage, name, now = Date.now()) {
  try { storage.setItem(KEY, JSON.stringify({ name: String(name).slice(0, 16), at: now })); } catch { /* ignore */ }
}

function readPending(storage, now) {
  try {
    const p = JSON.parse(storage.getItem(KEY) || 'null');
    if (p && typeof p.name === 'string' && p.name && now - Number(p.at) < KEEP_MS) return p;
    storage.removeItem(KEY);
  } catch { /* ignore */ }
  return null;
}

// Sends a kept name again. Resolves the server's answer ('ok', 'nobody',
// 'self', 'done', 'late'), 'offline' (kept for next time), or null (nothing kept).
export async function retryPending({ cloud, storage, now = Date.now() }) {
  const p = readPending(storage, now);
  if (!p) return null;
  const r = await cloud.claimReferral(p.name);
  if (r !== 'offline') { try { storage.removeItem(KEY); } catch { /* ignore */ } }
  return r;
}
