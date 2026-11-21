// Waits for you to come near the weekend farm (Yongsan Family Park's eco
// allotments), then loads its glasshouse, beds and stall (game/farm.js).
// Small on purpose: this is in the first download, the farm is not.

const NEAR = 90; // m from the glasshouse: load it

// game: what createFarm needs (see game/farm.js), with `spot` the map's
// 'farm' landmark { x, z, ry } (or none).
export function createFarmNear(game) {
  let farm = null, loading = null;
  const load = () => (loading ||= import('./farm.js')
    .then(({ createFarm }) => (farm = createFarm(game)))
    .catch((e) => { loading = null; console.warn('farm', e); return null; }));
  return {
    // Every frame, after walking.
    update(p, dt) {
      if (farm) { farm.update(p, dt); return; }
      if (game.spot && !loading && game.mode() === 'street' && Math.hypot(p.x - game.spot.x, p.z - game.spot.z) < NEAR) load();
    },
    act: (p) => farm?.act(p) || null,
    staffNear: () => farm?.staffNear() || [],
    ui: { get open() { return !!farm?.ui.open; }, close() { farm?.ui.close(); } },
    get group() { return farm?.group; },
    get loaded() { return !!farm; },
  };
}
