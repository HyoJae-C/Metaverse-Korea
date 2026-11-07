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
export class FarCull {
  constructor(objects, far) {
    const bb = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
    this.items = [];
    const add = (o, depth) => {
      if (!o) return;
      bb.setFromObject(o);
      if (bb.isEmpty()) return;
      bb.getCenter(c);
      const r = bb.getSize(s).length() / 2;
      if (r < 150) this.items.push({ o, x: c.x, z: c.z, r });
      else if (depth < 3) for (const k of o.children) add(k, depth + 1); // too big: its parts one by one
    };
    for (const o of objects) add(o, 0);
    this.far = far;
    this.wait = 0;
  }
  update(dt, p) {
    if ((this.wait -= dt) > 0) return;
    this.wait = 0.4;
    const far = this.far();
    for (const it of this.items) {
      const hide = Math.hypot(it.x - p.x, it.z - p.z) - it.r > far;
      if (hide !== !!it.o.userData.farHidden) { it.o.userData.farHidden = hide; show(it.o); }
    }
  }
}
