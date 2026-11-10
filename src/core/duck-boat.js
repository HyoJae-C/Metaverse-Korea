// Han River duck boat (오리배) free ride, no DOM so it can be unit-tested.
// Not a game: get in at the dock, steer anywhere on the water for up to a
// minute (free), then the boat pedals itself back to the dock.
// Positions are in the park's space (park.js): the river is z < BANK.
// Boats bump into each other (core/bump.js): a soft, slidey shove on water.

import { Knock, collide } from './bump.js';

export const RIDE_SECONDS = 60;
export const BOAT_SPEED = 3.2; // metres per second at full stick
export const TURN_RATE = 1.8; // radians per second the bow can swing
export const BOAT_R = 1.1; // keep this far from the edges
// How boats bump: lazy and slidey (water), unlike a snappy bumper car.
export const DUCK_BUMP = { radius: 1.0, bounce: 0.8, minKick: 1.2, maxKick: 4, damping: 1.8, spin: 1.4 };
const BANK = -4; // park.js: where the land ends and the river starts
// The water a boat may use: in front of the park, short of the bridge.
export const WATER = { minX: -24, maxX: 24, minZ: BANK - 40, maxZ: BANK - 1.5 };
// The fishing pier sticks out from the bank in the middle (park.js).
export const PIER = { minX: -1.6, maxX: 1.6, minZ: BANK - 8.6, maxZ: BANK };

// A park's own water and pier (game/han-parks.js: a park laid on the street
// has its dock and pier where its map puts them); the room parks use these.
export const AREA = { water: WATER, pier: PIER };

// Keep a boat centre on the water: inside WATER and off the pier (or the
// area's own: { water, pier }, pier null for none).
export function onWater(x, z, area = AREA) {
  const W = area.water, P = area.pier;
  x = Math.min(W.maxX - BOAT_R, Math.max(W.minX + BOAT_R, x));
  z = Math.min(W.maxZ, Math.max(W.minZ + BOAT_R, z));
  if (!P) return [x, z];
  const x0 = P.minX - BOAT_R, x1 = P.maxX + BOAT_R, z0 = P.minZ - BOAT_R;
  if (x > x0 && x < x1 && z > z0) { // touching the pier: out by the shortest way
    const pushL = x - x0, pushR = x1 - x, pushOut = z - z0;
    const m = Math.min(pushL, pushR, pushOut);
    if (m === pushOut) z = z0;
    else x = m === pushL ? x0 : x1;
  }
  return [x, z];
}

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// One boat trip. The bow faces (-sin ry, -cos ry), like the boat model
// (which faces -z at ry = 0).
export class DuckRide {
  constructor(home, seconds = RIDE_SECONDS, area = AREA) {
    this.area = area;
    this.home = { x: home.x, z: home.z };
    this.x = home.x; this.z = home.z; this.ry = 0;
    this.left = seconds;
    this.returning = false; // time up (or asked): heading back to the dock
    this.docked = false;
    this.vx = 0; this.vz = 0; // m/s last frame (for how hard we hit)
    this.knock = new Knock(DUCK_BUMP);
  }
  // Bump into other boats: [{ x, z, vx, vz, fixed }]. Moves me off them and
  // starts my slide away; returns the hardest hit this frame or null.
  bump(others) {
    if (this.docked || !others.length) return null;
    const { dx, dz, hit } = collide(this, others, this.knock, DUCK_BUMP);
    if (dx || dz) [this.x, this.z] = onWater(this.x + dx, this.z + dz, this.area);
    return hit;
  }
  // Steer towards the world direction (dx, dz); |(dx, dz)| is the throttle,
  // 0..1. Returns the metres moved.
  steer(dx, dz, dt) {
    if (this.docked) { this.vx = this.vz = 0; return 0; }
    const x0 = this.x, z0 = this.z;
    if (!this.returning) {
      this.left -= dt;
      if (this.left <= 0) { this.left = 0; this.returning = true; }
    }
    let moved = 0;
    if (this.returning) moved = this._home(dt);
    else {
      const mag = Math.min(1, Math.hypot(dx, dz));
      if (mag >= 0.05) moved = this._go(Math.atan2(-dx, -dz), mag, dt);
    }
    // Still sliding (and spinning) from a bump.
    const [kx, kz, kry] = this.knock.step(dt);
    if (kx || kz || kry) {
      [this.x, this.z] = onWater(this.x + kx, this.z + kz, this.area);
      if (!this.docked) this.ry = wrap(this.ry + kry);
    }
    if (dt > 0) { this.vx = (this.x - x0) / dt; this.vz = (this.z - z0) / dt; }
    return moved;
  }
  // Head back now, before the minute is up.
  goBack() { this.returning = true; }

  _go(want, mag, dt) {
    const d = wrap(want - this.ry);
    const turn = Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, d));
    this.ry = wrap(this.ry + turn);
    // Slow down while turning hard, like a real pedal boat.
    const v = BOAT_SPEED * mag * (0.35 + 0.65 * Math.max(0, Math.cos(d)));
    const [nx, nz] = onWater(this.x - Math.sin(this.ry) * v * dt, this.z - Math.cos(this.ry) * v * dt, this.area);
    const moved = Math.hypot(nx - this.x, nz - this.z);
    this.x = nx; this.z = nz;
    return moved;
  }
  // Back to the dock, round the pier's end if it is in the way.
  _home(dt) {
    const { x: hx, z: hz } = this.home;
    const dist = Math.hypot(hx - this.x, hz - this.z);
    if (dist < 0.4) {
      this.x = hx; this.z = hz;
      this.ry = wrap(this.ry + wrap(0 - this.ry) * Math.min(1, dt * 3));
      if (Math.abs(this.ry) < 0.05) { this.ry = 0; this.docked = true; }
      return 0;
    }
    let tx = hx, tz = hz;
    // On the far side of the pier, close in: first straight out past its end.
    const P = this.area.pier, px = P ? (P.minX + P.maxX) / 2 : 0;
    if (P && Math.sign(this.x - px) !== Math.sign(hx - px) && this.z > P.minZ - BOAT_R - 1) { tx = this.x; tz = P.minZ - BOAT_R - 2; }
    const want = Math.atan2(-(tx - this.x), -(tz - this.z));
    const slow = Math.min(1, 0.4 + dist / 4); // ease in to the dock
    return this._go(want, slow, dt);
  }
}

// Seconds shown on the clock, e.g. 0:42.
export const clock = (s) => {
  const n = Math.max(0, Math.ceil(s));
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`;
};
