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

// Quality levels, best first. ratio: the most pixels per CSS pixel; shadow:
// the shadow map's size (0: no shadows).
export const QUALITY = [
  { ratio: 2, shadow: 2048 },
  { ratio: 1.5, shadow: 1024 },
  { ratio: 1, shadow: 0 },
];
export const FPS = 60, SAVER_FPS = 30;

// Lets through at most `fps` frames a second from requestAnimationFrame.
// The time not used carries over, so a 144 Hz screen gets about 60, not 48.
export class FramePacer {
  constructor(fps = FPS) { this.setFps(fps); this.prev = null; this.acc = 0; }
  setFps(fps) { this.gap = 1000 / fps; }
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

// capable: false on phones and slow or software graphics (they already start
// at resolution 1 with no shadows).
export function createGraphicsQuality({ renderer, sun, capable = true, saver = false, dpr = () => globalThis.devicePixelRatio || 1 }) {
  const pacer = new FramePacer(saver ? SAVER_FPS : FPS);
  const auto = new AutoQuality();
  let last = null, applied = null;
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
      if (!pacer.ready(now)) return false;
      if (last != null && !saver && auto.frame(now - last, FPS)) apply();
      last = now;
      return true;
    },
    setSaver(on) {
      saver = !!on;
      pacer.setFps(saver ? SAVER_FPS : FPS);
      if (applied !== level()) apply();
    },
    get saver() { return saver; },
    state: () => ({ level: level(), saver, fps: saver ? SAVER_FPS : FPS, ratio: renderer.getPixelRatio(), shadows: sun.castShadow, shadowSize: sun.shadow.mapSize.x }),
  };
}
