// Waits for you to come near Euljiro 3-ga's neon alley, then loads its signs,
// wires and people (game/neon-alley.js). Small on purpose: this is in the
// first download, the alley is not. The lane and its buildings are on the
// map from the start (scripts/build-neon-alley.mjs).
import { NEON_CENTER, NEON_REACH } from '../data/neon-alley.js';

const NEAR = 260; // m: well before you can see down the lane

// game: { scene, labels, roadGraph, randomLook }
export function createNeonAlleyNear(game) {
  const [cx, cz] = NEON_CENTER;
  let alley = null, loading = false;
  return {
    // Every frame on the street.
    update(p, dt, camera, w, h) {
      if (alley) { alley.update(p, dt, camera, w, h); return; }
      if (loading || Math.hypot(p.x - cx, p.z - cz) > NEAR + NEON_REACH) return;
      loading = true;
      import('./neon-alley.js')
        .then(({ createNeonAlley }) => { alley = createNeonAlley(game); })
        .catch((e) => { loading = false; console.warn('neon-alley', e); });
    },
    nearest: (x, z) => alley?.nearest(x, z) || null, // someone to say hello to
    get loaded() { return !!alley; },
    get group() { return alley?.group || null; },
  };
}
