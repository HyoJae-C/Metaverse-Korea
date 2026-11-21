// Up on Bongeunsa's Buddha terrace the statue (11.5 m, on its 2.4 m terrace)
// was cut off at the top of the screen when you stood near it (Yozi
// 2026-11-15). There the camera eases back a little and tilts up, the way
// game/tower-look.js does for Modu Tower, so the whole Buddha fits; it gives
// the usual view back on the way down. Like game/palace-view.js it only
// eases the view while the player isn't steering it.
//   const view = createBuddhaView({ cam, landmarks, steering: () => manualCamT > 0 });
//   view.min(p)       // the lowest pitch allowed here (for dragging), or null
//   view.tick(p, dt)  // each frame on the street
import { onTerrace } from '../core/temple-terrace.js';

export const BUDDHA_VIEW = {
  up: { pitch: -0.3, dist: 8.5 }, // on the terrace: tilted up (tower-look.js raises the look-at point below -0.12)
  street: { pitch: 0.42, dist: 9 }, // the usual view (main.js)
  minPitch: -0.35,
};

export function createBuddhaView({ cam, landmarks, steering }) {
  let on = false, own = false, back = 0;
  return {
    min: (p) => (onTerrace(landmarks, p.x, p.z) ? BUDDHA_VIEW.minPitch : null),
    tick(p, dt) {
      const now = !!onTerrace(landmarks, p.x, p.z);
      if (now !== on) {
        if (!now && own) back = 1.5; // came down: ease back to the street view
        on = now;
        own = now;
      }
      if (steering()) { own = false; if (!on) back = 0; return; } // the player's view is theirs until they come up again
      const want = own ? BUDDHA_VIEW.up : back > 0 ? BUDDHA_VIEW.street : null;
      if (!want) return;
      back -= dt;
      const f = Math.min(1, dt * 2.5);
      cam.pitch += (want.pitch - cam.pitch) * f;
      cam.dist += (want.dist - cam.dist) * f;
    },
  };
}
