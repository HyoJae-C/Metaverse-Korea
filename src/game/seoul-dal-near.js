// Waits for you to come near Seoul Dal in Yeouido Park, then loads the
// balloon and its ride (game/seoul-dal.js). Small on purpose: this is in the
// first download, the balloon is not. Where it stands comes from the map
// (a "seouldal" landmark, scripts/build-yeouido.mjs).
import { DAL } from '../core/seoul-dal.js';

// game: what createSeoulDal needs (see game/seoul-dal.js), with `landmarks`
// the joined map's landmarks.
export function createSeoulDalNear(game) {
  const at = game.landmarks.find((l) => l.type === 'seouldal');
  let dal = null, loading = false;
  return {
    // Every frame.
    update(p, dt) {
      if (dal) { dal.update(dt); return; }
      if (!at || loading || game.mode !== 'street' || Math.hypot(p.x - at.x, p.z - at.z) > DAL.load) return;
      loading = true;
      import('./seoul-dal.js')
        .then(({ createSeoulDal }) => { dal = createSeoulDal(game, { x: at.x, z: at.z, ry: at.ry || 0 }); })
        .catch((e) => { loading = false; console.warn('seoul-dal', e); });
    },
    act: (p) => dal?.act(p) || null,
    get busy() { return !!dal?.busy; },
  };
}
