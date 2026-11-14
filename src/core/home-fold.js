// One home per player (2026-11): Sunny Villa was folded into Forest Lane
// Apartments. A villa layout moves into the apartment the first time the
// home is opened; whichever room had more furniture wins, and the other
// layout is kept under mk.home.backup.<id> (synced like other mk.* keys).
export const HOME_ID = 'forest-lane-apt';
const OLD = ['sunny-villa'];

const pieces = (raw) => {
  try { const a = JSON.parse(raw || '[]'); return Array.isArray(a) ? a.length : 0; } catch { return 0; }
};

export function foldHomes(storage) {
  try {
    for (const id of OLD) {
      const old = storage.getItem('mk.home.' + id);
      if (old == null) continue;
      const cur = storage.getItem('mk.home.' + HOME_ID);
      if (pieces(old) > pieces(cur)) {
        if (pieces(cur)) storage.setItem('mk.home.backup.' + HOME_ID, cur);
        storage.setItem('mk.home.' + HOME_ID, old);
      } else if (pieces(old)) storage.setItem('mk.home.backup.' + id, old);
      storage.removeItem('mk.home.' + id);
    }
  } catch { /* storage blocked */ }
}
