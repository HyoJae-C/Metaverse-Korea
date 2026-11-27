// The board games' small 3D pictures (the toys, Find the Skull from my seat)
// have a renderer of their own, which drew every frame the screen gave: 60,
// or 120 on fast phone screens, at twice the resolution with smoothing, next
// to the café drawn behind. Phones got hot (Yozi 2026-11-27). On phones:
// 30 frames, resolution at most 1.5, no smoothing (as the street on phones);
// and a picture that has stopped moving is not drawn again until it has to
// be (wake()).
//
//   const pace = createViewPace();
//   new THREE.WebGLRenderer({ antialias: pace.smooth, ... }); renderer.setPixelRatio(pace.ratio());
//   each frame: if (!pace.ready(now)) return;   on a change: pace.wake();
import { FramePacer } from '../core/graphics-quality.js';

export const PHONE_FPS = 30, STILL_AFTER = 2000;

export function createViewPace({ phone = !!globalThis.matchMedia?.('(pointer: coarse)').matches, dpr = () => globalThis.devicePixelRatio || 1, idle = false } = {}) {
  const pacer = new FramePacer(phone ? PHONE_FPS : 60);
  let awake = -Infinity, keep = false;
  return {
    smooth: !phone,
    ratio: () => Math.min(phone ? 1.5 : 2, dpr()),
    // Something changed (a move, a tap, a new size): draw for a while.
    wake(now = performance.now()) { awake = now; },
    // true while something moves on its own (a face bobbing, a card flying).
    set moving(on) { keep = !!on; },
    ready(now) {
      if (idle && !keep && now - awake > STILL_AFTER) { pacer.prev = null; return false; }
      return pacer.ready(now);
    },
  };
}
