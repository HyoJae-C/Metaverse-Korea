// Another Land's bumper cars (범퍼카): the rink, how a car drives, and how a
// round and its waiting line run. No DOM and no three.js, so it can be
// unit-tested. Metres and seconds, in the theme park's room space
// (themepark.js). The game around it is game/bumper.js.
//
// A round: up to SEATS (6) drivers. The first one to get in starts a short
// boarding countdown (others can still hop in), then everyone drives for
// ROUND_S seconds and gets out. While a round is driving, or all six cars are
// taken, newcomers take a number (core/tarot-queue.js does the line).
//
// Nobody is in charge: each driver moves only their own car (core/bump.js),
// and the round's start time travels in every driver's state, so all screens
// agree on the clock.

import { Knock, collide } from './bump.js';

export const SEATS = 6;
export const BOARD_MS = 12000; // countdown after the first driver gets in
export const ROUND_S = 60; // driving time
export const TURN_MS = 20000; // a called number has this long to get in
export const BUMPER_COST = 4000; // won (the other rides: RIDE_PRICE in themepark.js)

// The rink: inner floor (cars stay inside), with the gate on the west side
// facing the plaza.
export const RINK = { x: 20.3, z: 7.5, hx: 4.4, hz: 4 };
export const RAIL = 0.35; // rail thickness round the floor
export const GATE = { x: RINK.x - RINK.hx - RAIL - 1, z: RINK.z }; // stand here to get in
// One colour per car, all different.
export const CAR_COLORS = ['#ff4f5e', '#ffd23f', '#3fa7ff', '#36cf8a', '#a77bff', '#ff9a3c'];
// Where the cars wait: three along each long rail, facing in.
// ry uses the characters' convention: facing (sin ry, cos ry).
export const HOMES = [-2.7, 0, 2.7].flatMap((dx) => [
  { x: RINK.x + dx, z: RINK.z - RINK.hz + 0.9, ry: 0 },
  { x: RINK.x + dx, z: RINK.z + RINK.hz - 0.9, ry: Math.PI },
]);

export const CAR_R = 0.72;
export const SPEED = 3.4; // m/s at full stick
export const BOOST_SPEED = 5.6; // m/s while boosting
export const ACCEL = 4.5; // m/s² speeding up
export const BOOST_ACCEL = 9;
export const BRAKE = 6; // m/s² slowing down with the stick let go
export const TURN_RATE = 3.4; // rad/s
export const BOOST_S = 1.3; // one boost lasts this long…
export const RECHARGE_S = 4; // …and takes this long to fill up again
// Bumper cars hit harder and snappier than duck boats: a clear shove back.
export const BUMPER_BUMP = { radius: CAR_R, bounce: 1, minKick: 2.2, maxKick: 6, damping: 2.6, spin: 2.6 };

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

// Keep a car centre on the floor. Returns [x, z, nx, nz]: the wall's normal
// (pointing back in) if it touched one, else 0, 0.
export function inRink(x, z, r = CAR_R) {
  const x0 = RINK.x - RINK.hx + r, x1 = RINK.x + RINK.hx - r, z0 = RINK.z - RINK.hz + r, z1 = RINK.z + RINK.hz - r;
  let nx = 0, nz = 0;
  if (x < x0) { x = x0; nx = 1; } else if (x > x1) { x = x1; nx = -1; }
  if (z < z0) { z = z0; nz = 1; } else if (z > z1) { z = z1; nz = -1; }
  return [x, z, nx, nz];
}

// My car. Faces (sin ry, cos ry), like the character sitting in it.
export class BumperCar {
  constructor(home) {
    this.x = home.x; this.z = home.z; this.ry = home.ry || 0;
    this.speed = 0; // forward m/s
    this.vx = 0; this.vz = 0; // actual m/s last frame (for how hard we hit)
    this.boostLeft = 0; // seconds of boost still burning
    this.charge = 1; // 0..1, boost ready at 1
    this.knock = new Knock(BUMPER_BUMP);
  }
  get boosting() { return this.boostLeft > 0; }
  // Start a boost if it's charged. Returns true if it fired.
  boost() {
    if (this.charge < 1 || this.boosting) return false;
    this.boostLeft = BOOST_S; this.charge = 0;
    return true;
  }
  // Drive towards the world direction (dx, dz); its length is the throttle
  // (0..1). Returns { wall: 0..1 } when we hit the rail this frame.
  drive(dx, dz, dt) {
    const x0 = this.x, z0 = this.z;
    if (this.boosting) this.boostLeft = Math.max(0, this.boostLeft - dt);
    else this.charge = Math.min(1, this.charge + dt / RECHARGE_S);
    const mag = Math.min(1, Math.hypot(dx, dz));
    let target = 0;
    if (mag >= 0.05) {
      const want = Math.atan2(dx, dz), diff = wrap(want - this.ry);
      const turn = TURN_RATE * dt;
      this.ry = wrap(this.ry + Math.max(-turn, Math.min(turn, diff)));
      // Ease off while swinging round hard, full speed once lined up.
      target = mag * (this.boosting ? BOOST_SPEED : SPEED) * Math.max(0.25, Math.cos(Math.min(Math.abs(diff), Math.PI / 2)));
    }
    if (this.boosting && mag < 0.05) target = BOOST_SPEED * 0.8; // a boost with no stick still lunges ahead
    const acc = target > this.speed ? (this.boosting ? BOOST_ACCEL : ACCEL) : BRAKE;
    this.speed += Math.max(-acc * dt, Math.min(acc * dt, target - this.speed));
    let x = this.x + Math.sin(this.ry) * this.speed * dt, z = this.z + Math.cos(this.ry) * this.speed * dt;
    const [kx, kz, kry] = this.knock.step(dt);
    x += kx; z += kz;
    if (kry) this.ry = wrap(this.ry + kry);
    const [cx, cz, nx, nz] = inRink(x, z);
    this.x = cx; this.z = cz;
    let wall = 0;
    if (nx || nz) {
      // Into the rail: bounce back off it.
      const fx = Math.sin(this.ry) * this.speed + this.knock.vx, fz = Math.cos(this.ry) * this.speed + this.knock.vz;
      const into = -(fx * nx + fz * nz);
      if (into > 0.3) {
        const n = Math.hypot(nx, nz);
        this.knock.push(nx / n, nz / n, Math.min(BUMPER_BUMP.maxKick, Math.max(1.2, into * 0.7)));
        this.speed *= 0.3;
        wall = Math.min(1, into / BUMPER_BUMP.maxKick);
      }
    }
    if (dt > 0) { this.vx = (this.x - x0) / dt; this.vz = (this.z - z0) / dt; }
    return { wall };
  }
  // Bump into the other cars: [{ x, z, vx, vz, fixed, id }]. Moves me off
  // them and starts my slide back; returns the hardest hit or null.
  bump(others) {
    if (!others.length) return null;
    // (bump.js faces boats the other way round: (-sin ry, -cos ry))
    const me = { x: this.x, z: this.z, vx: this.vx, vz: this.vz, ry: this.ry + Math.PI };
    const { dx, dz, hit } = collide(me, others, this.knock, BUMPER_BUMP);
    if (dx || dz) [this.x, this.z] = inRink(this.x + dx, this.z + dz);
    if (hit) {
      // Something hit our nose: the push wins over the pedal for a moment.
      const nx = this.x - hit.other.x, nz = this.z - hit.other.z;
      if (Math.sin(this.ry) * nx + Math.cos(this.ry) * nz < 0) this.speed *= 0.3;
      hit.mine = rammedBy(this, hit.other);
    }
    return hit;
  }
}

// Did `a` ram `b` (rather than get rammed)? Whoever drove into the other
// faster, at a real speed. Both have { x, z, vx, vz }.
export function rammedBy(a, b) {
  let nx = b.x - a.x, nz = b.z - a.z;
  const d = Math.hypot(nx, nz) || 1;
  nx /= d; nz /= d;
  const aIn = (a.vx || 0) * nx + (a.vz || 0) * nz, bIn = -((b.vx || 0) * nx + (b.vz || 0) * nz);
  return aIn > 1 && aIn > bIn;
}

// Where a round is at `now` (ms), given its go time: 'idle' (no round),
// 'boarding' (counting down), 'driving', or 'over'. Plus the seconds left
// in that phase.
export function phaseOf(go, now) {
  if (!go) return { phase: 'idle', left: 0 };
  if (now < go) return { phase: 'boarding', left: Math.ceil((go - now) / 1000) };
  const end = go + ROUND_S * 1000;
  if (now < end) return { phase: 'driving', left: Math.ceil((end - now) / 1000) };
  return { phase: 'over', left: 0 };
}

// The round everyone in the cars is on: the earliest go time among drivers
// whose round isn't over yet (two people getting in at the same moment end
// up on the same clock). riders: [{ go }]. 0 when there is none.
export function roundGo(riders, now) {
  let best = 0;
  for (const r of riders) {
    if (!r.go || phaseOf(r.go, now).phase === 'over') continue;
    if (!best || r.go < best) best = r.go;
  }
  return best;
}

// A free car: the lowest slot nobody else has, or -1 when all are taken.
export function freeSlot(taken) {
  for (let i = 0; i < SEATS; i++) if (!taken.includes(i)) return i;
  return -1;
}

// Two people grabbed the same car at once: the smaller id keeps it, the
// other moves to a free one (or has to get out: -1). Returns my slot.
export function settleSlot(myId, mySlot, others) {
  const clash = others.some((o) => o.slot === mySlot && o.id < myId);
  if (!clash) return mySlot;
  return freeSlot(others.map((o) => o.slot));
}

// May I get in now? Not while a round is driving or the cars are full, and
// not ahead of anyone in line (unless it's my turn).
// turn: TarotQueue.update()'s result for the bumper line.
export function mayBoard({ phase, riders, turn, myId }) {
  if (phase === 'driving' || riders >= SEATS) return false;
  return turn.order.length === 0 || turn.callable.includes(myId);
}

// How many cars the line may fill right now (0 while a round drives).
export const freeForLine = (phase, riders) => (phase === 'driving' ? 0 : Math.max(0, SEATS - riders));

// Who bumped the most this round: [{ id, hits }] → sorted, best first.
export const ranking = (list) => [...list].sort((a, b) => b.hits - a.hits || (a.id < b.id ? -1 : 1));
