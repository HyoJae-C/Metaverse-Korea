// Han River duck boat (오리배) free ride, no DOM so it can be unit-tested.
// Not a game: get in at the dock, steer anywhere on the water for up to a
// minute (free), then the boat pedals itself back to the dock.
// Positions are in the park's space (park.js): the river is z < BANK.

export const RIDE_SECONDS = 60;
export const BOAT_SPEED = 3.2; // metres per second at full stick
export const TURN_RATE = 1.8; // radians per second the bow can swing
export const BOAT_R = 1.1; // keep this far from the edges
const BANK = -4; // park.js: where the land ends and the river starts
// The water a boat may use: in front of the park, short of the bridge.
export const WATER = { minX: -24, maxX: 24, minZ: BANK - 40, maxZ: BANK - 1.5 };
// The fishing pier sticks out from the bank in the middle (park.js).
export const PIER = { minX: -1.6, maxX: 1.6, minZ: BANK - 8.6, maxZ: BANK };

// Keep a boat centre on the water: inside WATER and off the pier.
export function onWater(x, z) {
  x = Math.min(WATER.maxX - BOAT_R, Math.max(WATER.minX + BOAT_R, x));
  z = Math.min(WATER.maxZ, Math.max(WATER.minZ + BOAT_R, z));
  const x0 = PIER.minX - BOAT_R, x1 = PIER.maxX + BOAT_R, z0 = PIER.minZ - BOAT_R;
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
  constructor(home, seconds = RIDE_SECONDS) {
    this.home = { x: home.x, z: home.z };
    this.x = home.x; this.z = home.z; this.ry = 0;
    this.left = seconds;
    this.returning = false; // time up (or asked): heading back to the dock
    this.docked = false;
  }
  // Steer towards the world direction (dx, dz); |(dx, dz)| is the throttle,
  // 0..1. Returns the metres moved.
  steer(dx, dz, dt) {
    if (this.docked) return 0;
    if (!this.returning) {
      this.left -= dt;
      if (this.left <= 0) { this.left = 0; this.returning = true; }
    }
    if (this.returning) return this._home(dt);
    const mag = Math.min(1, Math.hypot(dx, dz));
    if (mag < 0.05) return 0;
    return this._go(Math.atan2(-dx, -dz), mag, dt);
  }
  // Head back now, before the minute is up.
  goBack() { this.returning = true; }

  _go(want, mag, dt) {
    const d = wrap(want - this.ry);
    const turn = Math.max(-TURN_RATE * dt, Math.min(TURN_RATE * dt, d));
    this.ry = wrap(this.ry + turn);
    // Slow down while turning hard, like a real pedal boat.
    const v = BOAT_SPEED * mag * (0.35 + 0.65 * Math.max(0, Math.cos(d)));
    const [nx, nz] = onWater(this.x - Math.sin(this.ry) * v * dt, this.z - Math.cos(this.ry) * v * dt);
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
    if (Math.sign(this.x) !== Math.sign(hx) && this.z > PIER.minZ - BOAT_R - 1) { tx = this.x; tz = PIER.minZ - BOAT_R - 2; }
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
