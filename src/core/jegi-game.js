// Jegichagi (제기차기) rules, no DOM (ui/jegi-ui.js draws it).
//
// A jegi (a coin wrapped in paper with a long tassel) floats down slowly.
// Tap when it is just above your foot to kick it back up. The closer to the
// sweet spot, the straighter it goes; a sloppy kick sends it drifting to the
// side, and if it drifts out of reach or reaches the ground, the round is
// over. It falls a little faster as the count grows.
//
// Units: metres and seconds. y is the height above the top of the foot,
// x the distance sideways from the foot.

export const JEGI_GAME = 'jegi';
export const GRAVITY = 6; // a feathery jegi falls slower than a stone
export const TERMINAL = 2.4; // fastest it falls (the tassel acts as a brake)
export const KICK_TOP = 0.42; // highest you can reach with a kick
export const SWEET = 0.14; // perfect contact height
export const REACH = 0.34; // how far sideways you can still reach
export const FLOOR = -0.32; // the ground, below the top of the foot
export const MEDAL_KICKS = { gold: 40, silver: 20, bronze: 8 };

export function jegiMedal(kicks) {
  for (const m of ['gold', 'silver', 'bronze']) if (kicks >= MEDAL_KICKS[m]) return m;
  return null;
}

// Contact quality 0..1 at height y and sideways offset x (0 = whiff).
export function kickQuality(y, x) {
  if (y > KICK_TOP || y < FLOOR + 0.06 || Math.abs(x) > REACH) return 0;
  const h = 1 - Math.abs(y - SWEET) / (KICK_TOP - SWEET + 0.02);
  const side = 1 - (Math.abs(x) / REACH) * 0.5;
  return Math.max(0.05, Math.min(1, h * side));
}
export const kickLabel = (q) => (q >= 0.85 ? 'perfect' : q >= 0.55 ? 'good' : q > 0 ? 'ok' : 'whiff');

export class JegiRound {
  constructor(rand = Math.random) {
    this.rand = rand;
    this.kicks = 0;
    this.perfects = 0;
    this.best = 0; // longest run of perfects
    this.run = 0;
    this.y = 1.1; this.vy = 0; // dropped from the hand to start
    this.x = 0; this.vx = 0;
    this.over = false;
    this.time = 0;
    this.lastKick = -1;
  }
  get gravity() { return GRAVITY * Math.min(1.45, 1 + this.kicks * 0.012); }

  step(dt) {
    if (this.over) return;
    this.time += dt;
    this.vy = Math.max(-TERMINAL * Math.min(1.3, 1 + this.kicks * 0.008), this.vy - this.gravity * dt);
    this.y += this.vy * dt;
    this.x += this.vx * dt;
    if (this.y <= FLOOR) { this.y = FLOOR; this.over = true; }
  }

  // A tap. Returns { label, q }. A kick only connects while the jegi is
  // coming down (or barely rising) near the foot.
  kick() {
    if (this.over) return { label: 'whiff', q: 0 };
    if (this.time - this.lastKick < 0.18) return { label: 'whiff', q: 0 }; // the foot is still up
    const q = this.vy > 0.6 ? 0 : kickQuality(this.y, this.x);
    this.lastKick = this.time;
    const label = kickLabel(q);
    if (!q) return { label, q };
    this.kicks++;
    if (label === 'perfect') { this.perfects++; this.run++; this.best = Math.max(this.best, this.run); } else this.run = 0;
    this.vy = 3.3 + q * 0.5;
    // A clean kick pulls it back over the foot; a sloppy one pushes it away.
    const push = (this.rand() - 0.5) * 2 * (1 - q) * 0.55;
    this.vx = -this.x * q * 1.6 + this.vx * (1 - q) * 0.5 + push;
    return { label, q };
  }
}
