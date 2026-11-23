// Gimpo Airport (scripts/build-gimpo.mjs): the airfield is a blocker in
// the map; the domestic terminal's roof deck, the walk across its roof and
// the stair up from the forecourt are decks through it (core/collision.js
// addDeck), and on them you stand at the roof's height. The terminals,
// runways, jet bridges and the MODU AIR planes (core/gimpo-flights.js) are
// game/gimpo-site.js, loaded with import() when you come near.
// Small on purpose: this is in the first download (it is how you walk).
//
//   const gimpo = createGimpoWalk({ landmarks, collision, scene });
//   gimpo.y(x, z)       height on the deck and its stair (0 off them)
//   gimpo.update(p, dt) every frame on the street
//   gimpo.group         what loaded (main.js FarCull), or null
export const GIMPO_NEAR = 650; // m from the terminal: the runways reach far, past the fog (420 m)
const RAIL = 0.3; // m: the railings' thickness (walls you can't pass)

// The deck's parts in the airport's frame (u along the runways, v to the kerb side).
export function deckParts(l) {
  const d = l.deck;
  return {
    flat: [d.balcony, d.walk],
    stair: d.stair, run: d.run, y: d.y,
    // Railings: both long sides of the stair, and the landing's far end.
    rails: [
      [d.stair[0] + 1.5, d.stair[3] - RAIL / 2, d.walk[2], d.stair[3] + RAIL / 2],
      [d.stair[0] + 1.5, d.stair[1] - RAIL / 2, d.walk[0], d.stair[1] + RAIL / 2],
      [d.walk[2] - RAIL / 2, d.stair[1], d.walk[2] + RAIL / 2, d.stair[3]],
    ],
  };
}

// Height on the deck at airport-frame (u, v): 0 off it.
export function deckHeight(l, u, v) {
  const d = deckParts(l);
  for (const [u0, v0, u1, v1] of d.flat) if (u >= u0 && u <= u1 && v >= v0 && v <= v1) return d.y;
  const [u0, v0, u1, v1] = d.stair;
  if (u >= u0 && u <= u1 && v >= v0 && v <= v1) return Math.min(1, Math.max(0, (u - u0) / d.run)) * d.y;
  return 0;
}

export function createGimpoWalk({ landmarks = [], collision = null, scene = null, lowSpec = false }) {
  const l = landmarks.find((q) => q.type === 'gimpoairport');
  if (!l) return { y: () => 0, update() {}, group: null, landmark: null };
  const [ux, uz] = l.u, [vx, vz] = l.v;
  const toUV = (x, z) => [(x - l.x) * ux + (z - l.z) * uz, (x - l.x) * vx + (z - l.z) * vz];
  const W = ([u, v]) => [l.x + u * ux + v * vx, l.z + u * uz + v * vz];
  const quad = ([u0, v0, u1, v1]) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(W);
  const parts = deckParts(l);
  for (const r of [...parts.flat, parts.stair]) collision?.addDeck(quad(r));
  collision?.add(parts.rails.map((r) => ({ p: quad(r), low: true })));
  // (a box round the deck, to skip the sum quickly)
  const pts = [...parts.flat, parts.stair].flatMap(quad);
  const x0 = Math.min(...pts.map((q) => q[0])), x1 = Math.max(...pts.map((q) => q[0])), z0 = Math.min(...pts.map((q) => q[1])), z1 = Math.max(...pts.map((q) => q[1]));
  const y = (x, z) => (x < x0 || x > x1 || z < z0 || z > z1 ? 0 : deckHeight(l, ...toUV(x, z)));
  let site = null, loading = false;
  return {
    y,
    landmark: l,
    update(p, dt) {
      if (site) { site.update(p, dt); return; }
      if (loading || !scene || Math.hypot(p.x - l.x, p.z - l.z) > GIMPO_NEAR) return;
      loading = true;
      import('./gimpo-site.js')
        .then(({ buildGimpoSite }) => { site = buildGimpoSite({ scene, l, lowSpec }); })
        .catch((e) => { loading = false; console.warn('gimpo', e); });
    },
    get group() { return site?.group || null; },
  };
}
