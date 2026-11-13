// Waits for you to come near Inwangsan and Bugaksan, then loads their
// ground, woods, city wall and gates (game/north-wall.js). Small on purpose:
// this is in the first download, the hills are not. The height
// (core/north-ground.js) and the wall's blockers are there from the start.
import { northBox } from '../core/north-ground.js';

const NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

// landmarks: the joined map's; y: (x, z) -> the hills' height.
export function createNorthWallNear({ landmarks = [], scene, y }) {
  const l = landmarks.find((m) => m.type === 'northwall');
  const box = l ? northBox(l) : null;
  let hills = null, loading = false;
  return {
    // Every frame on the street.
    update(p) {
      if (hills) { hills.update(p); return; }
      if (!box || loading) return;
      const [x0, z0, x1, z1] = box;
      if (p.x < x0 - NEAR || p.x > x1 + NEAR || p.z < z0 - NEAR || p.z > z1 + NEAR) return;
      loading = true;
      import('./north-wall.js')
        .then(({ buildNorthWall }) => { hills = buildNorthWall({ scene, l, y }); })
        .catch((e) => { loading = false; console.warn('north wall', e); });
    },
    get loaded() { return !!hills; },
  };
}
