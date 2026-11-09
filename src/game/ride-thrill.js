// The Cotton Candy Express's sense of speed, lent to Another Land's swing
// ride and drop tower: the same numbers (coaster.js rideFx: a wider view
// and a shake that grow with the speed, a narrow view while it climbs and
// holds) and the same overlay and sounds (ui/coaster-fx.js: speed lines,
// the dark edge, cotton candy bits, the lift's clack, the heartbeat at the
// top, the release clunk and screams, the wind). The speed comes from
// park-rides.js rideSpeed(). main.js calls update() after the ride camera
// has placed the view.
import { rideFx } from '../core/coaster.js';
import { rideSpeed } from '../core/park-rides.js';

export const THRILL_RIDES = new Set(['swing', 'drop']);
const BASE_FOV = 62;

export function createRideThrill({ camera, fx: overlay }) {
  let on = false, fov = BASE_FOV, t = 0, lag = 0;
  return {
    start(scene) { on = true; fov = camera.fov; t = 0; lag = 0; overlay.start(scene); },
    stop() {
      if (!on) return;
      on = false;
      overlay.stop();
      camera.fov = BASE_FOV;
      camera.updateProjectionMatrix();
    },
    // kind, now (the shared ride clock), soft (the gentle setting), first (from your seat).
    update(dt, kind, now, soft, first) {
      if (!on) return;
      t += dt;
      const sp = rideSpeed(kind, now), fx = rideFx(sp.k, sp.phase, soft);
      // Shake: the coaster's smooth wobble (k², so only when it's fast), and
      // a sharp jolt as the drop tower's brakes bite.
      const jolt = kind === 'drop' && sp.phase === 'run' ? 0.12 * sp.k * (soft ? 0.5 : 1) : 0;
      const sh = (fx.shake + jolt) * (first ? 0.45 : 1);
      camera.position.x += sh * (Math.sin(t * 23) + 0.6 * Math.sin(t * 37.3));
      camera.position.y += sh * (Math.sin(t * 29.1 + 1) + 0.5 * Math.sin(t * 51));
      camera.position.z += sh * Math.sin(t * 19.7 + 2);
      // In the drop tower's fall the view can't keep up: it's left a little
      // above you as you fall away from it, and catches up in the brakes.
      lag += ((kind === 'drop' && sp.phase === 'drop' ? sp.v * 0.06 : 0) - lag) * Math.min(1, dt * 5);
      camera.position.y += lag * (soft ? 0.5 : 1);
      fov += (fx.fov - fov) * Math.min(1, dt * (sp.phase === 'drop' ? 6 : 3));
      if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix(); }
      overlay.update(dt, { fx, k: sp.k, v: sp.v, phase: sp.phase, camera, tunnel: false });
    },
  };
}
