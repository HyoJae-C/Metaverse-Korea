// Waits for you to come near the seed shop by Heunginjimun, then loads it
// (game/seed-shop.js). Small on purpose: this is in the first download,
// the shop is not.

const NEAR = 80; // m from the shop: load it

// game: what createSeedShop needs (see game/seed-shop.js), with `spot` the
// map's 'seedshop' landmark { x, z, ry } (or none).
export function createSeedShopNear(game) {
  let shop = null, loading = null;
  const load = () => (loading ||= import('./seed-shop.js')
    .then(({ createSeedShop }) => (shop = createSeedShop(game)))
    .catch((e) => { loading = null; console.warn('seed shop', e); return null; }));
  return {
    // Every frame, after walking.
    update(p, dt) {
      if (shop) { shop.update(p, dt); return; }
      if (game.spot && !loading && game.mode() === 'street' && Math.hypot(p.x - game.spot.x, p.z - game.spot.z) < NEAR) load();
    },
    act: (p) => shop?.act(p) || null,
    staffNear: () => shop?.staffNear() || [],
    ui: { get open() { return !!shop?.ui.open; }, close() { shop?.ui.close(); } },
    get group() { return shop?.group; },
    get loaded() { return !!shop; },
  };
}
