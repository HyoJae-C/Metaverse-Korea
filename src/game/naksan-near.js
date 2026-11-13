// Waits for you to come near Naksan, then loads its hill and city wall
// (game/naksan.js: the ground, the wall, Hyehwamun, the paths' paving,
// woods and walkers). Small on purpose: this is in the first download, the
// hill is not. The height (core/ridge-ground.js) and the wall's blockers
// are there from the start.
import { ridgeBox } from '../core/ridge-ground.js';

const NEAR = 480; // m: past the fog (it ends at 420 m), so it is there before you see it

// game: what createNaksan needs (see game/naksan.js), with `district` the
// joined map's district that has a ridge (or none).
export function createNaksanNear(game) {
  const d = game.district;
  const box = d?.ridge ? ridgeBox(d.ridge, d.offset) : null;
  let hill = null, loading = false;
  return {
    // Every frame on the street.
    update(p, dt, camera, w, h) {
      if (hill) { hill.update(p, dt, camera, w, h); return; }
      if (!box || loading) return;
      const [x0, z0, x1, z1] = box;
      if (p.x < x0 - NEAR || p.x > x1 + NEAR || p.z < z0 - NEAR || p.z > z1 + NEAR) return;
      loading = true;
      import('./naksan.js')
        .then(({ createNaksan }) => { hill = createNaksan({ ...game, offset: d.offset, ridge: d.ridge }); })
        .catch((e) => { loading = false; console.warn('naksan', e); });
    },
    nearest: (x, z) => hill?.nearest(x, z) || null, // a walker to say hello to
    get loaded() { return !!hill; },
  };
}
