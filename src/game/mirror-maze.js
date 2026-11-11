// Modu Land's Mirror Maze (거울 미로; the walls are park-new-rides.js,
// the layout park-rides.js MAZE): free, just walk in at the south door. A
// clock starts as you step in, and when you come out of the far (east)
// side you hear how long it took. Walking back out of the door you came in
// by says nothing.
import { MAZE } from '../core/park-rides.js';
import { t } from '../core/i18n.js';

export const inMaze = (x, z) => x > MAZE.x0 && x < MAZE.x1 && z > MAZE.z0 && z < MAZE.z1;

export function createMirrorMaze(game) {
  let t0 = 0, hello = -1e9;
  return {
    // Every frame in Modu Land (pos: the player's feet; off: on a ride or elsewhere).
    tick(pos, on) {
      if (!on) { t0 = 0; return; }
      const inside = inMaze(pos.x, pos.z), now = performance.now();
      if (inside && !t0) {
        t0 = now;
        if (now - hello > 20000) { hello = now; game.shop.toast(t('maze.in')); }
      } else if (!inside && t0) {
        if (pos.x >= MAZE.x1 - 0.2) game.shop.toast(t('maze.out', { n: Math.max(1, Math.round((now - t0) / 1000)) }));
        t0 = 0;
      }
    },
  };
}
