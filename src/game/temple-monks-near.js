// Waits until you are near Jogyesa or Bongeunsa, then loads
// game/temple-monks.js to put their monks there (data/temple-monks.js).
// Small on purpose: this is in the first download, the monks are not.
import { MONK_SITES } from '../data/temple-monks.js';

const NEAR = 150; // m

// game: { scene, offsets: { district id: [x, z] } }.
export function createTempleMonksNear(game) {
  const sites = MONK_SITES.filter((s) => game.offsets[s.district]);
  let monks = null, loading = null, check = 0;
  const near = (p) => sites.some((s) => Math.hypot(p.x - game.offsets[s.district][0] - s.at[0], p.z - game.offsets[s.district][1] - s.at[1]) < NEAR);
  return {
    // Every frame on the street.
    update(p, dt) {
      if (monks) { monks.update(p, dt); return; }
      if (loading || (check -= dt) > 0) return;
      check = 1;
      if (!near(p)) return;
      loading = import('./temple-monks.js')
        .then(({ createTempleMonks }) => { monks = createTempleMonks(game, sites); })
        .catch((e) => { loading = null; console.warn('temple monks', e); });
    },
  };
}
