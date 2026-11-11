// Walled places you enter (Gyeongbokgung): from outside you see the wall and
// the gates; what stands inside is only drawn while you are in. That keeps
// the open city light: the palace halls are not drawn from the street, and
// hanok inside an enclosure are not even built until you first walk in.
//
//   const e = new Enclosure({ box: [x0, z0, x1, z1], onFirstEnter: () => [...objects] });
//   e.collect([landmarks, scene], skip);   // objects that sit wholly inside
//   e.update(player.position);             // each frame: 'enter' | 'leave' | null
import * as THREE from 'three';

// An object is drawn unless an enclosure hides it (you are outside its wall)
// or it is past the fog (FarCull below).
const show = (o) => { o.visible = !o.userData.encHidden && !o.userData.farHidden; };

export class Enclosure {
  constructor({ id, box, inset = 1, onFirstEnter = null }) {
    this.id = id;
    const [ax, az, bx, bz] = box;
    this.box = { x0: Math.min(ax, bx), x1: Math.max(ax, bx), z0: Math.min(az, bz), z1: Math.max(az, bz) };
    this.inset = inset;
    this.onFirstEnter = onFirstEnter;
    this.objects = new Set();
    this.inside = null; // unknown until the first update
    this.loaded = false;
  }
  contains(x, z, m = 0) {
    const b = this.box;
    return x > b.x0 + m && x < b.x1 - m && z > b.z0 + m && z < b.z1 - m;
  }
  adopt(list) {
    for (const o of list) if (o) { this.objects.add(o); o.userData.encHidden = !this.inside; show(o); }
  }
  // Children of the roots whose bounds lie wholly inside the wall (minus the
  // inset, so the wall and the gates on its line stay).
  collect(roots, skip = new Set()) {
    const bb = new THREE.Box3();
    const found = [];
    for (const r of roots) for (const o of r.children) {
      if (skip.has(o) || this.objects.has(o) || !o.visible) continue;
      bb.setFromObject(o);
      if (bb.isEmpty()) continue;
      if (this.contains(bb.min.x, bb.min.z, this.inset) && this.contains(bb.max.x, bb.max.z, this.inset)) found.push(o);
    }
    this.adopt(found);
    return found.length;
  }
  update(p) {
    const now = this.contains(p.x, p.z);
    if (now === this.inside) return null;
    const first = this.inside !== null;
    this.inside = now;
    if (now && !this.loaded) {
      this.loaded = true;
      if (this.onFirstEnter) this.adopt(this.onFirstEnter() || []);
    }
    for (const o of this.objects) { o.userData.encHidden = !now; show(o); }
    return first ? (now ? 'enter' : 'leave') : null;
  }
}

// Past the fog nothing can be seen, yet it would still be drawn: shops,
// landmarks and lanterns further away than the fog's far edge are skipped.
// far(): the distance (the fog's far edge, which the weather changes).
const JUMP = 40; // m between two checks: a jump, not a walk or a ride
export class FarCull {
  // objects: what to hide past the fog. A big one (over 150 m across) is
  // split into its parts, and is also hidden as a whole when its whole box
  // is past the fog: things added inside it later (a wish lantern floating
  // down Cheonggyecheon) go with it. watch: containers (landmarks) whose
  // children added later are picked up too.
  constructor(objects, far, watch = []) {
    this.items = [];
    this.boxes = [];
    this.seen = new Set();
    for (const o of objects) this.add(o);
    this.watch = watch.filter(Boolean).map((c) => ({ c, n: c.children.length }));
    this.far = far;
    this.wait = 0;
    this.at = null; // where the last check was made
  }
  add(o, depth = 0) {
    if (!o || this.seen.has(o) || o.userData.farKeep) return; // (farKeep: a landmark meant to be seen over the fog, e.g. Modu Tower)
    this.seen.add(o);
    const bb = new THREE.Box3().setFromObject(o);
    if (bb.isEmpty()) return;
    const c = bb.getCenter(new THREE.Vector3());
    const r = bb.getSize(new THREE.Vector3()).length() / 2;
    if (r < 150) { this.items.push({ o, x: c.x, z: c.z, r }); return; }
    this.boxes.push({ o, x0: bb.min.x, x1: bb.max.x, z0: bb.min.z, z1: bb.max.z });
    if (depth < 3) for (const k of o.children) this.add(k, depth + 1); // too big: its parts one by one
  }
  // Checks every 0.4 s of real time (not of game time: on a slow phone a
  // frame's dt is capped, so 0.4 s of game time could be many seconds), and
  // at once after a jump (a taxi, the map, the subway): until then the
  // whole city round the old spot would still be drawn.
  update(dt, p, now = performance.now()) {
    const jumped = !this.at || Math.hypot(p.x - this.at[0], p.z - this.at[1]) > JUMP;
    if (!jumped && now < this.wait) return;
    this.wait = now + 400;
    this.at = [p.x, p.z];
    for (const w of this.watch) if (w.c.children.length !== w.n) { w.n = w.c.children.length; for (const k of w.c.children) this.add(k); }
    const far = this.far();
    for (const it of this.items) {
      const hide = Math.hypot(it.x - p.x, it.z - p.z) - it.r > far;
      if (hide !== !!it.o.userData.farHidden) { it.o.userData.farHidden = hide; show(it.o); }
    }
    for (const b of this.boxes) {
      const dx = Math.max(b.x0 - p.x, 0, p.x - b.x1), dz = Math.max(b.z0 - p.z, 0, p.z - b.z1);
      const hide = Math.hypot(dx, dz) > far;
      if (hide !== !!b.o.userData.farHidden) { b.o.userData.farHidden = hide; show(b.o); }
    }
  }
}
