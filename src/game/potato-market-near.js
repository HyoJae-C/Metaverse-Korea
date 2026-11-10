// Waits for you to come near Potato Market (감자마켓, Dongmyo), then loads
// it (game/potato-market.js: the mats, the panel, buying and selling).
// Players with things on a mat load it at the start too, wherever they are:
// coming into the game keeps their mat out, and what sold is told.
// Small on purpose: this is in the first download, the market is not.

export const MY_MAT = 'mk.myMat'; // my open listings' ids (core/market.js)
const NEAR = 200; // m

// game: what createPotatoMarket needs (see game/potato-market.js), with
// `spot` the map's potatomarket landmark (or none) and `ready` a promise
// that resolves once the wallet has asked the server.
export function createPotatoMarketNear(game) {
  const spot = game.spot;
  let market = null, loading = null;
  const load = () => (loading ||= import('./potato-market.js')
    .then(({ createPotatoMarket }) => (market = createPotatoMarket(game)))
    .catch((e) => { loading = null; console.warn('potato market', e); return null; }));
  let onMat = false;
  try { onMat = JSON.parse(localStorage.getItem(MY_MAT) || '[]').length > 0; } catch { /* storage blocked */ }
  if (onMat && spot) Promise.resolve(game.ready).then(load).then((m) => m?.checkMine()).catch(() => {});
  return {
    // Every frame on the street.
    update(p, dt) {
      if (market) { market.update(p, dt); return; }
      if (spot && !loading && Math.hypot(p.x - spot.x, p.z - spot.z) < NEAR) load();
    },
    // The button near the market: browse it, or the mat you're beside.
    act: (p) => market?.act(p) || null,
    get open() { return !!market?.ui.open; },
    close() { market?.ui.close(); },
  };
}
