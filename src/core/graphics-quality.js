// Keeping the computer cool. A player said their computer got very hot in
// Bukchon: the game drew as many frames as the screen allowed (144 a second
// on some monitors), at up to twice the screen's resolution, with soft
// shadows, whether the machine could keep up or not.
//
//   const gfx = createGraphicsQuality({ renderer, sun, capable });
//   renderer.setAnimationLoop((now) => { if (!gfx.frame(now)) return; … });
//   gfx.setSaver(true);   // the Battery saver switch in Settings
//
// - At most 60 frames a second (30 with Battery saver).
// - If the frame rate stays low for a while, the picture steps down: first
//   a lower resolution and smaller shadow map, then resolution 1 and no
//   shadows. It doesn't step back up until the page is reloaded (going up and
//   down would flicker).
// - Battery saver: 30 frames, resolution 1, no shadows.
// - Phones (Yozi, 2026-11-21: phones got hot): standing still with hands off
//   the screen for 2 s, 30 frames; the first touch, key or step is back to
//   60. A phone that can't keep up (under 45 drawn frames a second for 8 s,
//   after the first 10 s) stays at a steady 30 until the page is reloaded:
//   jumping between 40 and 50 looks rougher than an even 30.
// - Phones at a board game (Yozi, 2026-11-27: hot playing Find the Skull and
//   Bingo): setCalm(true) holds 30 even while cards are tapped. A turn game
//   taps every few seconds, and each tap had been 60 again for 2 s, so the
//   phone was at 60 the whole game.

// Quality levels, best first. ratio: the most pixels per CSS pixel; shadow:
// the shadow map's size (0: no shadows).
export const QUALITY = [
  { ratio: 2, shadow: 2048 },
  { ratio: 1.5, shadow: 1024 },
  { ratio: 1, shadow: 0 },
];
export const FPS = 60, SAVER_FPS = 30;
export const IDLE_AFTER = 2000, SLOW_FPS = 45;

// Lets through at most `fps` frames a second from requestAnimationFrame.
// The time not used carries over, so a 144 Hz screen gets about 60, not 48.
export class FramePacer {
  constructor(fps = FPS) { this.setFps(fps); this.prev = null; this.acc = 0; }
  setFps(fps) { this.fps = fps; this.gap = 1000 / fps; }
  ready(now) {
    if (this.prev == null) { this.prev = now; return true; }
    const d = now - this.prev;
    this.prev = now;
    if (d > 250 || d < 0) { this.acc = 0; return true; } // after a pause (a hidden tab)
    this.acc += d;
    if (this.acc + 1.5 < this.gap) return false; // (a little slack for timer jitter)
    this.acc = Math.min(this.acc - this.gap, this.gap); // (a frame let through early is owed back)
    return true;
  }
}

// Watches the drawn frames. Over each 4 s window, if the frame rate is under
// 3/4 of the target twice in a row, the level goes down one step. The first
// 10 s (the city still loading) and long stalls (a warp, a hidden tab) don't
// count.
export class AutoQuality {
  constructor({ level = 0, max = QUALITY.length - 1, warmup = 10000, window = 4000 } = {}) {
    Object.assign(this, { level, max, warmup, window });
    this.t = 0; this.n = 0; this.bad = 0; this.age = 0;
  }
  // dt: ms since the last drawn frame. Returns true when the level changed.
  frame(dt, fps) {
    if (!(dt > 0) || dt > 250) return false;
    this.age += dt;
    if (this.age < this.warmup || this.level >= this.max) return false;
    this.t += dt; this.n++;
    if (this.t < this.window) return false;
    const rate = (this.n * 1000) / this.t;
    this.t = 0; this.n = 0;
    if (rate >= fps * 0.75) { this.bad = 0; return false; }
    if (++this.bad < 2) return false;
    this.bad = 0;
    this.level++;
    return true;
  }
}

// A phone that can't hold 60: over each 4 s window of frames drawn while
// aiming for 60, under SLOW_FPS twice in a row. The first 10 s and long
// stalls don't count; windows spent at 30 (standing still) are skipped.
export class SlowPhone {
  constructor({ warmup = 10000, window = 4000, fps = SLOW_FPS } = {}) {
    Object.assign(this, { warmup, window, fps });
    this.slow = false; this.age = 0; this.t = 0; this.n = 0; this.bad = 0;
  }
  // dt: ms since the last drawn frame; full: this frame aimed for 60.
  frame(dt, full) {
    if (this.slow || !(dt > 0) || dt > 250) return false;
    this.age += dt;
    if (this.age < this.warmup) return false;
    if (!full) { this.t = 0; this.n = 0; return false; } // (a window is all at 60 or it doesn't count)
    this.t += dt; this.n++;
    if (this.t < this.window) return false;
    const rate = (this.n * 1000) / this.t;
    this.t = 0; this.n = 0;
    if (rate >= this.fps) { this.bad = 0; return false; }
    if (++this.bad < 2) return false;
    this.slow = true;
    return true;
  }
}

// capable: false on phones and slow or software graphics (they already start
// at resolution 1 with no shadows).
// phone: the 30-when-still and slow-phone rules. Call active(now) on any
// touch, key or movement; setStill(false) keeps 60 (a show in the sky).
export function createGraphicsQuality({ renderer, sun, capable = true, saver = false, phone = false, dpr = () => globalThis.devicePixelRatio || 1 }) {
  const pacer = new FramePacer(saver ? SAVER_FPS : FPS);
  const auto = new AutoQuality();
  const slowPhone = new SlowPhone();
  let last = null, applied = null, lastActive = -Infinity, stillOk = true, calm = false;
  const seen = new Float64Array(16);
  const target = (now) => {
    if (saver || (phone && (slowPhone.slow || calm))) return SAVER_FPS;
    if (phone && stillOk && now - lastActive > IDLE_AFTER) return SAVER_FPS;
    return FPS;
  };
  const level = () => (saver ? QUALITY.length - 1 : auto.level);
  const apply = () => {
    const q = QUALITY[level()];
    const ratio = Math.min(dpr(), capable ? q.ratio : 1);
    if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio);
    const shadows = capable && q.shadow > 0;
    if (shadows && sun.shadow.mapSize.x !== q.shadow) {
      sun.shadow.mapSize.set(q.shadow, q.shadow);
      sun.shadow.map?.dispose(); // made again at the new size
      sun.shadow.map = null;
    }
    sun.castShadow = shadows;
    applied = level();
  };
  apply();
  return {
    // Each requestAnimationFrame: true to draw this frame.
    frame(now) {
      const fps = target(now);
      if (fps !== pacer.fps) pacer.setFps(fps);
      if (!pacer.ready(now)) return false;
      if (last != null && !saver && auto.frame(now - last, FPS)) apply();
      if (last != null && phone && !saver) slowPhone.frame(now - last, fps === FPS);
      last = now;
      return true;
    },
    // Something moved or was touched: 60 again (phones).
    active(now = globalThis.performance?.now() ?? 0) { lastActive = now; },
    // Each frame, the camera's matrixWorld.elements: a camera that moved
    // (walking, a ride, a turn of the view) counts as active.
    watch(m, now) {
      let moved = false;
      for (let i = 0; i < 16; i++) if (Math.abs(m[i] - seen[i]) > 1e-5) { moved = true; seen[i] = m[i]; }
      if (moved) lastActive = now;
    },
    // false: never drop to 30 for standing still (a show is on).
    setStill(ok) { stillOk = !!ok; },
    // true: phones stay at 30 even when touched (a board game's panel is up).
    setCalm(on) { calm = !!on; },
    setSaver(on) {
      saver = !!on;
      pacer.setFps(target(globalThis.performance?.now() ?? 0));
      if (applied !== level()) apply();
    },
    get saver() { return saver; },
    state: () => ({ level: level(), saver, phone, slow: slowPhone.slow, fps: pacer.fps, ratio: renderer.getPixelRatio(), shadows: sun.castShadow, shadowSize: sun.shadow.mapSize.x }),
  };
}
