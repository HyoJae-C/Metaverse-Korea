// Waits for the lantern parade (core/lantern-parade.js: every 9 hours, from
// the notice 10 minutes before) while you are near its way, Cheonggyecheon
// to Jogyesa, then loads game/lantern-parade.js to draw it.
// Small on purpose: this is in the first download, the parade is not.
import { paradeAt } from '../core/lantern-parade.js';

const NEAR = 420; // m from the middle of the way
const MID = [-1520, -745]; // (world metres: half way along, Gwansugyo to Jogyesa)

// game: { scene, stream (Cheonggyecheon), off (the Gyeongbokgung district's
// offset), darkness() }.
export function createLanternParadeNear(game) {
  let parade = null, loading = null, check = 0;
  const ok = !!(game.stream && game.off);
  return {
    // Every frame on the street.
    update(p, dt) {
      if (parade) { parade.update(); return; }
      if (!ok || loading || (check -= dt) > 0) return;
      check = 1;
      if (!paradeAt() || Math.hypot(p.x - MID[0], p.z - MID[1]) > NEAR) return;
      loading = import('./lantern-parade.js')
        .then(({ createLanternParade }) => { parade = createLanternParade(game); })
        .catch((e) => { loading = null; console.warn('lantern parade', e); });
    },
    get loaded() { return !!parade; },
  };
}
