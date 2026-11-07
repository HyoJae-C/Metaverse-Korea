// Round things bumping into each other on a flat floor: duck boats on the
// river now, bumper cars later. No DOM and no three.js, so it can be
// unit-tested and reused. Everything is in metres and seconds on the x/z
// plane; tune the feel with the options (a bumper car wants a harder, snappier
// kick than a lazy pedal boat).
//
// How it works in multiplayer, with nobody in charge: each player only moves
// their own vehicle. Every frame they check it against everyone else's (as
// last seen over the network) and push only themselves away, taking half of
// the shove (the whole shove against something that can't move). The other
// player does the same on their screen, so both vehicles fly apart and
// everyone sees it through the normal position updates. No extra messages.

export const BUMP_DEFAULTS = {
  radius: 1.1, // how big each vehicle is (circle)
  bounce: 0.9, // 0 = dead stop, 1 = full rebound of the closing speed
  minKick: 1.4, // m/s: even a gentle touch pushes apart this fast
  maxKick: 5, // m/s: cap, so a laggy jump can't fling anyone across the map
  damping: 2.2, // per second: how fast the push dies away (higher = shorter slide)
  spin: 1.6, // rad/s of spin at a full-strength glancing blow (0 = none)
};

const opt = (o) => (o ? { ...BUMP_DEFAULTS, ...o } : BUMP_DEFAULTS);

// The sliding left over after a bump, on top of normal driving.
export class Knock {
  constructor(options) { this.o = opt(options); this.vx = 0; this.vz = 0; this.spin = 0; }
  get active() { return Math.abs(this.vx) + Math.abs(this.vz) + Math.abs(this.spin) > 0.02; }
  // Make sure we are moving away along (nx, nz) at least `speed` m/s. Not
  // added on top, so calling it every frame while still touching is safe.
  push(nx, nz, speed, spin = 0) {
    const along = this.vx * nx + this.vz * nz;
    if (along < speed) { this.vx += nx * (speed - along); this.vz += nz * (speed - along); }
    if (Math.abs(spin) > Math.abs(this.spin)) this.spin = spin;
  }
  // Advance dt seconds: returns [dx, dz, dry] to add to the pose.
  step(dt) {
    if (!this.active) { this.vx = this.vz = this.spin = 0; return [0, 0, 0]; }
    const out = [this.vx * dt, this.vz * dt, this.spin * dt];
    const k = Math.exp(-this.o.damping * dt);
    this.vx *= k; this.vz *= k; this.spin *= k;
    return out;
  }
  stop() { this.vx = this.vz = this.spin = 0; }
}

// Me against the others. me / each other: { x, z, vx?, vz?, ry?, r?, fixed? }
// (fixed = can't be moved, e.g. a parked boat or a wall post; ry = heading,
// facing (-sin ry, -cos ry), only used for the spin).
// Pushes `knock` and returns { dx, dz } to un-overlap me right now, plus the
// hardest hit this frame as { other, strength 0..1, x, z } (contact point),
// or hit = null.
export function collide(me, others, knock, options) {
  const o = opt(options);
  const r1 = me.r ?? o.radius;
  let dx = 0, dz = 0, hit = null;
  for (const b of others) {
    if (b === me) continue;
    const sum = r1 + (b.r ?? o.radius);
    let nx = me.x - b.x, nz = me.z - b.z;
    const d = Math.hypot(nx, nz);
    if (d >= sum) continue;
    if (d < 1e-4) { nx = 1; nz = 0; } else { nx /= d; nz /= d; } // dead on top: pick a side
    const share = b.fixed ? 1 : 0.5;
    // How fast we were closing in along the line between us.
    const closing = Math.max(0, ((b.vx || 0) - (me.vx || 0)) * nx + ((b.vz || 0) - (me.vz || 0)) * nz);
    const kick = Math.min(o.maxKick, Math.max(o.minKick, (1 + o.bounce) * closing * share));
    // Hit on the side of the bow: spin away. Head-on or rear-end: none.
    let spin = 0;
    if (o.spin && me.ry != null) {
      const fx = -Math.sin(me.ry), fz = -Math.cos(me.ry);
      spin = (fx * nz - fz * nx) * o.spin * Math.min(1, kick / o.maxKick) * -1;
    }
    knock.push(nx, nz, kick, spin);
    const over = (sum - d) * share;
    dx += nx * over; dz += nz * over;
    const strength = Math.min(1, closing / o.maxKick);
    if (!hit || strength > hit.strength) hit = { other: b, strength, x: b.x + nx * (b.r ?? o.radius), z: b.z + nz * (b.r ?? o.radius) };
  }
  return { dx, dz, hit };
}

// Remembers which pairs are touching, so a bump's sound and splash play
// once when they meet, not every frame they stay pressed together.
export class Contacts {
  constructor() { this.now = new Set(); }
  // pairs: [[keyA, keyB], ...] touching this frame. Returns the new ones.
  update(pairs) {
    const next = new Set(), fresh = [];
    for (const [a, b] of pairs) {
      const k = a < b ? `${a}|${b}` : `${b}|${a}`;
      next.add(k);
      if (!this.now.has(k)) fresh.push([a, b]);
    }
    this.now = next;
    return fresh;
  }
}

// Which of these circles touch: [[i, j], ...] by index. For the effects that
// everyone plays, whoever is driving. Tiny n (a handful of boats or cars).
export function touching(list, options) {
  const o = opt(options), out = [];
  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      // A little slack: network positions lag, so they may never quite overlap.
      if (Math.hypot(a.x - b.x, a.z - b.z) < (a.r ?? o.radius) + (b.r ?? o.radius) + 0.15) out.push([i, j]);
    }
  }
  return out;
}

// A bumped vehicle rocking side to side and settling: angle in radians.
export const wobble = (t, amp = 0.18, freq = 11, decay = 4) => (t < 0 ? 0 : amp * Math.exp(-decay * t) * Math.sin(freq * t));
