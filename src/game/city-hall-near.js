// Waits for you to come near Seoul Plaza, then loads the people on its lawn
// (game/city-hall.js). Small on purpose: this is in the first download, the
// people are not. The plaza, the lawn and both halls are on the map from the
// start (scripts/build-city-hall.mjs).
const NEAR = 170; // m from the lawn's middle: before you can make anyone out

// game: { scene, labels, areas, roadGraph, randomLook }
export function createCityHallNear(game) {
  const lawn = (game.areas || []).find((a) => a.oval && a.lawn);
  if (!lawn) return { update() {}, nearest: () => null, loaded: false };
  const xs = lawn.p.map((q) => q[0]), zs = lawn.p.map((q) => q[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cz = (Math.min(...zs) + Math.max(...zs)) / 2;
  let plaza = null, loading = false;
  return {
    // Every frame on the street.
    update(p, dt, camera, w, h) {
      if (plaza) { plaza.update(p, dt, camera, w, h); return; }
      if (loading || Math.hypot(p.x - cx, p.z - cz) > NEAR) return;
      loading = true;
      import('./city-hall.js')
        .then(({ createCityHall }) => { plaza = createCityHall({ ...game, lawn: lawn.p, centre: [cx, cz] }); })
        .catch((e) => { loading = false; console.warn('city-hall', e); });
    },
    nearest: (x, z) => plaza?.nearest(x, z) || null, // someone to say hello to
    get loaded() { return !!plaza; },
    get people() { return plaza?.people || []; },
  };
}
