// A pet that walks with you (adopted at the pet shop, or by code). It trots
// behind you, sits when you stop, hides while you ride, and now and then
// poops on the street. Poop must be cleaned up within CLEAN_SECONDS or a
// fine notice arrives and FINE coins are taken, so the streets stay clean.
// Other players see it too (sent as `pt` in our state); poop stays local.
import * as THREE from 'three';
import { makeAnimal, turn } from './pets.js';
import { matCache } from './three-kit.js';

export const CLEAN_SECONDS = 45;
// Like the real fine in Korea for not picking up after a dog (₩50,000).
export const FINE = 50000;
// Metres walked between poops (random in this range).
export const POOP_EVERY = [150, 260];
export const nextPoopAt = (rand = Math.random) => POOP_EVERY[0] + rand() * (POOP_EVERY[1] - POOP_EVERY[0]);

// Poop timers, without any 3D (unit-tested). Each poop: { id, left }.
export class PoopTimers {
  constructor() { this.list = []; this.seq = 0; }
  add() { const p = { id: ++this.seq, left: CLEAN_SECONDS }; this.list.push(p); return p; }
  clean(id) { const i = this.list.findIndex((p) => p.id === id); if (i >= 0) this.list.splice(i, 1); return i >= 0; }
  // Advance time; returns the poops whose time ran out (removed).
  step(dt) {
    for (const p of this.list) p.left -= dt;
    const late = this.list.filter((p) => p.left <= 0);
    this.list = this.list.filter((p) => p.left > 0);
    return late;
  }
}

const mat = matCache();
// A cartoon poop swirl.
export function makePoop() {
  const g = new THREE.Group();
  [[0.11, 0.05], [0.08, 0.1], [0.05, 0.145]].forEach(([r, y]) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat('#6b4423'));
    m.position.y = y;
    m.scale.y = 0.7;
    g.add(m);
  });
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.06, 8), mat('#6b4423'));
  tip.position.y = 0.19;
  g.add(tip);
  return g;
}

export class Companion {
  // def: { kind, name, rom, color, accent, scale } (see ITEMS in inventory.js)
  constructor(id, def) {
    this.id = id;
    this.def = def;
    const a = makeAnimal(def.kind, def.color, def.accent, def.scale || 1);
    Object.assign(this, a);
    this.phase = Math.random() * 6;
    this.squat = 0; // seconds left of a poop pose
    this.walked = 0; // metres since the last poop
    this.poopAt = nextPoopAt();
  }

  // Put the pet next to the owner at once (on adopting, entering a room…).
  place(x, z, ry, y = 0) {
    this.root.position.set(x - Math.sin(ry) * 1.1 + Math.cos(ry) * 0.5, y, z - Math.cos(ry) * 1.1 - Math.sin(ry) * 0.5);
    this.root.rotation.y = ry;
  }

  // owner: { x, z, ry, y }; riding: hide and wait. Returns true when it poops.
  // y is the owner's height (down by a stream, on the stairs, up a hill), so
  // the pet walks on the same ground and not in the air above it.
  update(dt, owner, riding, canPoop) {
    this.phase += dt;
    this.root.visible = !riding;
    if (riding) { this.place(owner.x, owner.z, owner.ry, owner.y || 0); return false; }
    const r = this.root.position;
    // Aim for a spot behind and a little to the side of the owner.
    const tx = owner.x - Math.sin(owner.ry) * 1.1 + Math.cos(owner.ry) * 0.5;
    const tz = owner.z - Math.cos(owner.ry) * 1.1 - Math.sin(owner.ry) * 0.5;
    const dx = tx - r.x, dz = tz - r.z, d = Math.hypot(dx, dz);
    let moving = false;
    if (d > 12) this.place(owner.x, owner.z, owner.ry, owner.y || 0); // left behind: catch up
    else if (this.squat > 0) this.squat -= dt;
    else if (d > 0.35) {
      const sp = Math.min(d, Math.max(1.6, d * 2.2) * dt); // trot faster when further behind
      r.x += (dx / d) * sp;
      r.z += (dz / d) * sp;
      turn(this.root, Math.atan2(dx, dz), dt);
      moving = true;
      this.walked += sp;
    } else turn(this.root, owner.ry, dt);
    r.y += ((owner.y || 0) - r.y) * Math.min(1, dt * 8); // follow the owner up and down the stairs
    // Pose: trotting legs, wagging tail, sit when still, squat to poop.
    const step = moving ? Math.sin(this.phase * 16) * 0.5 : 0;
    this.legs.forEach((l, i) => { l.rotation.x = i % 2 === (i < 2 ? 0 : 1) ? step : -step; });
    const low = this.squat > 0 ? 0.08 : moving ? 0 : 0.04;
    this.body.position.y += (-low - this.body.position.y) * Math.min(1, dt * 10);
    this.body.rotation.x = this.squat > 0 ? -0.35 : moving ? 0 : -0.2;
    this.tail.rotation.y = Math.sin(this.phase * (moving ? 12 : 4)) * 0.5;
    if (canPoop && moving && this.walked >= this.poopAt) {
      this.walked = 0;
      this.poopAt = nextPoopAt();
      this.squat = 1.6;
      return true;
    }
    return false;
  }

  dispose() { this.root.removeFromParent(); }
}
