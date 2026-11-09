// Where new players start. On the start screen they pick what they came for
// (region.json spawn.starts): sights (Bukchon), shopping and dressing up
// (Seongsu Square), an outing (Ttukseom Han River Park), a quiet walk (Seoul
// Forest), or "anywhere": wherever most people are right now.
//
// A start is a spot in a district's own metres, turned into street metres
// with that district's offset, and the way to face (heading: compass
// degrees, 0 = north; the character faces +z at rotation 0, and north is -z).
// "square": true starts beside the square guide instead (the old start).

export const ANY = 'any';
const KEY = 'mk.start'; // the start picked on this device (kept through the welcome)

// The starts this region offers, in order: [{ k, icon, ... }].
export function startList(region) {
  const s = region?.spawn?.starts;
  return Array.isArray(s) ? s.filter((it) => it && typeof it.k === 'string') : [];
}

// A start's spot in street metres: { k, district, x, z, ry, square }, or
// null (unknown start, or its district isn't on the map).
export function startSpot(region, k) {
  const f = startList(region).find((it) => it.k === k);
  if (!f) return null;
  if (f.square) return { k, square: true, district: f.district || null };
  if (!Array.isArray(f.at)) return null;
  const d = (region.districts || []).find((it) => it.id === f.district);
  const off = d?.offset || (f.district ? null : [0, 0]);
  if (!off) return null;
  const [x, z] = [f.at[0] + off[0], f.at[1] + off[1]];
  if (![x, z].every(Number.isFinite)) return null;
  return { k, district: f.district || null, x, z, ry: Math.PI - ((f.heading ?? 0) * Math.PI) / 180, trip: f.trip || null };
}

// The first start (sights in Bukchon): where everyone lands who didn't pick.
export function firstStopSpot(region) {
  const first = startList(region)[0];
  return first ? startSpot(region, first.k) : null;
}

// "Anywhere": the start with the most people near it (counts in the same
// order as keys); a tie or nobody at all picks one at random.
export function busiestStart(keys, counts, rand = Math.random) {
  if (!keys.length) return null;
  const n = keys.map((_, i) => (Number.isFinite(counts?.[i]) ? counts[i] : 0));
  const top = Math.max(...n);
  const best = keys.filter((_, i) => n[i] === top);
  return best[Math.floor(rand() * best.length)] || keys[0];
}

// How many people are near each spot right now (supabase/032_start_crowds.sql).
// Resolves to null when it can't tell (no server, SQL not run yet, offline).
export async function askCrowds(provider, cfg, spots, timeoutMs = 2500) {
  if (provider !== 'supabase' || !cfg?.url || !cfg?.key || !spots.length) return null;
  try {
    const { sharedClient } = await import('../net/adapters/supabase.js');
    const client = sharedClient(cfg.url, cfg.key);
    const ask = client.rpc('start_crowds', { xs: spots.map((s) => s.x), zs: spots.map((s) => s.z), r: 150 });
    const late = new Promise((resolve) => setTimeout(() => resolve({ error: 'late' }), timeoutMs));
    const { data, error } = await Promise.race([ask, late]);
    return !error && Array.isArray(data) ? data.map(Number) : null;
  } catch { return null; }
}

export function savedStart(storage = globalThis.localStorage) {
  try { return storage?.getItem(KEY) || null; } catch { return null; }
}
export function saveStart(k, storage = globalThis.localStorage) {
  try { storage?.setItem(KEY, k); } catch { /* storage blocked */ }
}
