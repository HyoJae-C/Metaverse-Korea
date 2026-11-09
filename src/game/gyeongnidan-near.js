// Waits for you to come near Gyeongnidan-gil, then loads its hill
// (game/gyeongnidan.js: the slope, the streets on it and the neighbours).
// Small on purpose: this is in the first download, the hill is not.
import { hillBox } from '../core/hill-ground.js';

const NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

// game: what createGyeongnidan needs (see game/gyeongnidan.js), with
// `district` the joined map's district that has a hill (or none).
export function createGyeongnidanNear(game) {
  const d = game.district;
  const box = d?.hill ? hillBox(d.hill, d.offset) : null;
  let hill = null, loading = false;
  return {
    // Every frame on the street.
    update(p, dt, camera, w, h) {
      if (hill) { hill.update(dt, camera, w, h); return; }
      if (!box || loading) return;
      const [x0, z0, x1, z1] = box;
      if (p.x < x0 - NEAR || p.x > x1 + NEAR || p.z < z0 - NEAR || p.z > z1 + NEAR) return;
      loading = true;
      import('./gyeongnidan.js')
        .then(({ createGyeongnidan }) => { hill = createGyeongnidan({ ...game, offset: d.offset, hill: d.hill }); })
        .catch((e) => { loading = false; console.warn('gyeongnidan', e); });
    },
    nearest: (x, z) => hill?.nearest(x, z) || null, // a neighbour to say hello to
    get loaded() { return !!hill; },
  };
}
