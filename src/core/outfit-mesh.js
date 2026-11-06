// Modern everyday clothes built in code on the adventurer rig: the model's
// own torso, legs and sleeves are hidden and replaced by simple skinned
// meshes (a T-shirt, trousers, sneakers, a hoodie, a puffer...). They share
// the model's skeleton, so every animation still works, and they paint
// with the model's atlas cells (the bottom row: see WEAR_CELLS in
// core/model-pack.js), so the T-shirt and trouser colours of a look still
// apply. The head (face, hair, beard, hood) stays the model's own.
//
// Everything is measured in the rig's rest pose (a T-pose, metres before
// PACK.scale): hips 0.41 m up, shoulders at y 1.11, arms along ±x, toes +z.
import * as THREE from 'three';

// A garment piece: rings swept along a path, capped at both ends.
// ring: { c: [x,y,z], u: [x,y,z], v: [x,y,z], ru, rv, role, w: [[bone, weight], ...] }
// Each strip between two rings takes the first ring's role, so colours
// change crisply (put two rings at the same spot to make a hem or cuff).
const SEG = 18;
function sweep(out, rings, { capStart = true, capEnd = true, power = 2.4 } = {}) {
  const pt = (r, k) => {
    const a = (k / SEG) * Math.PI * 2, c = Math.cos(a), s = Math.sin(a);
    // A superellipse: rounder than a box, boxier than an ellipse.
    const e = 2 / power;
    const cu = Math.sign(c) * Math.abs(c) ** e, sv = Math.sign(s) * Math.abs(s) ** e;
    const p = new THREE.Vector3(...r.c).addScaledVector(new THREE.Vector3(...r.u), cu * r.ru).addScaledVector(new THREE.Vector3(...r.v), sv * r.rv);
    const n = new THREE.Vector3(...r.u).multiplyScalar(c / r.ru).addScaledVector(new THREE.Vector3(...r.v), s / r.rv).normalize();
    return [p, n];
  };
  for (let i = 1; i < rings.length; i++) {
    const a = rings[i - 1], b = rings[i];
    for (let k = 0; k < SEG; k++) {
      const [p00, n00] = pt(a, k), [p01, n01] = pt(a, k + 1), [p10, n10] = pt(b, k), [p11, n11] = pt(b, k + 1);
      out.tri([p00, p10, p11], [n00, n10, n11], [a.w, b.w, b.w], a.role);
      out.tri([p00, p11, p01], [n00, n11, n01], [a.w, b.w, a.w], a.role);
    }
  }
  const cap = (r, dir) => {
    const c = new THREE.Vector3(...r.c);
    const axis = new THREE.Vector3().crossVectors(new THREE.Vector3(...r.u), new THREE.Vector3(...r.v)).normalize().multiplyScalar(dir);
    for (let k = 0; k < SEG; k++) {
      const [p0] = pt(r, k), [p1] = pt(r, k + 1);
      const tri = dir > 0 ? [c, p0, p1] : [c, p1, p0];
      out.tri(tri, [axis, axis, axis], [r.w, r.w, r.w], r.role);
    }
  };
  if (capStart) cap(rings[0], -1);
  if (capEnd) cap(rings[rings.length - 1], 1);
}

// A flat panel (pocket, placket, open-jacket front): a thin box.
function box(out, c, size, role, w) {
  const g = new THREE.BoxGeometry(...size).toNonIndexed();
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i += 3) {
    const ps = [0, 1, 2].map((k) => new THREE.Vector3(p.getX(i + k) + c[0], p.getY(i + k) + c[1], p.getZ(i + k) + c[2]));
    const ns = [0, 1, 2].map((k) => new THREE.Vector3(n.getX(i + k), n.getY(i + k), n.getZ(i + k)));
    out.tri(ps, ns, [w, w, w], role);
  }
}

// Bone weights blended by position along a chain: [[bone, at], ...] sorted
// by at; t is the position along the same axis.
function chain(stops, t) {
  if (t <= stops[0][1]) return [[stops[0][0], 1]];
  for (let i = 1; i < stops.length; i++) {
    const [b0, t0] = stops[i - 1], [b1, t1] = stops[i];
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0);
      return k < 0.02 ? [[b0, 1]] : k > 0.98 ? [[b1, 1]] : [[b0, 1 - k], [b1, k]];
    }
  }
  return [[stops[stops.length - 1][0], 1]];
}
// Torso: hips below the belt, then spine, then chest.
const TORSO = [['hips', 0.5], ['spine', 0.7], ['chest', 1.02]];
// Arms along +x for the left side (mirrored for the right).
const ARM = (s) => [['upperarm' + s, 0.36], ['lowerarm' + s, 0.56], ['wrist' + s, 0.74]];
// Legs down -y (t = -y so the chain runs from the hip down).
const LEG = (s) => [['upperleg' + s, -0.4], ['lowerleg' + s, -0.22], ['foot' + s, -0.13]];

// Padded coats: a stitched groove just before each ring of the top.
function quilted(rings, axis) {
  const i = axis === 'x' ? 0 : 1;
  const outRings = [];
  rings.forEach((r, k) => {
    const prev = rings[k - 1];
    if (prev && prev.role === 'top' && r.role === 'top' && k < rings.length - 1) {
      const c = [...r.c];
      c[i] -= Math.sign(r.c[i] - prev.c[i]) * 0.014;
      outRings.push({ ...r, c, role: 'top' }, { ...r, c: [...c], ru: r.ru - 0.008, rv: r.rv - 0.008, role: 'stitch' });
      outRings.push({ ...r, ru: r.ru - 0.008, rv: r.rv - 0.008, role: 'stitch' });
    }
    outRings.push(r);
  });
  return outRings;
}

// ---- the garments ---------------------------------------------------------
// o: the outfit's shape options (see OUTFITS in data/characters/kaykit2.js).
function torso(out, o) {
  const rings = [];
  const add = (y, rx, rz, role, z = 0.01) => rings.push({ c: [0, y, z], u: [1, 0, 0], v: [0, 0, 1], ru: rx, rv: rz, role, w: chain(TORSO, y) });
  const bulk = o.bulk || 0;
  // Trousers from the crotch up to the waistband.
  add(0.4, 0.26, 0.2, 'bottom');
  add(0.46, 0.285, 0.215, 'bottom');
  add(o.hem, 0.29, 0.22, 'bottom');
  // The top: a little wider at the hem so it reads as a shirt over trousers.
  const hemY = o.hem;
  if (o.coat) { // a long coat: from the knees up, legs walk underneath
    rings.length = 0;
    add(o.coat, 0.31 + bulk, 0.27 + bulk, 'top', 0.0);
    for (let y = o.coat + 0.09; y < 0.62; y += 0.09) add(y, 0.3 + bulk - (y - o.coat) * 0.05, 0.25 + bulk, 'top', 0.0);
  } else {
    add(hemY, 0.3 + bulk, 0.228 + bulk, 'top');
  }
  const bodyTop = [[0.66, 0.29, 0.22], [0.78, 0.285, 0.215], [0.9, 0.295, 0.222], [1.0, 0.3, 0.225], [1.08, 0.292, 0.218]];
  for (const [y, rx, rz] of bodyTop) if (y > (o.coat ? 0.6 : hemY)) add(y, rx + bulk, rz + bulk, 'top');
  add(1.15, 0.25 + bulk * 0.8, 0.195 + bulk * 0.8, 'top');
  add(1.21, 0.17 + bulk * 0.5, 0.14 + bulk * 0.5, 'top');
  add(1.25, 0.12, 0.1, o.neck || 'top');
  sweep(out, o.quilt ? quilted(rings, 'y') : rings, { power: 2.5 });
  // Neckline rim (crew neck) or collar.
  if (o.collar) {
    sweep(out, [
      { c: [0, 1.17, 0.0], u: [1, 0, 0], v: [0, 0, 1], ru: 0.2, rv: 0.17, role: o.collar, w: [['chest', 1]] },
      { c: [0, 1.26, -0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.16, rv: 0.14, role: o.collar, w: [['chest', 1]] },
    ], { power: 2.2 });
  }
  const front = (z) => 0.24 + bulk + z;
  if (o.placket) box(out, [0, 0.86, front(0.0)], [0.05, 0.42, 0.02], o.placket, [['spine', 0.5], ['chest', 0.5]]);
  if (o.panel) box(out, [0, 0.86, front(0.0)], [0.15, 0.48, 0.02], o.panel, [['spine', 0.5], ['chest', 0.5]]);
  if (o.pocket) box(out, [0, 0.72, front(0.0)], [0.26, 0.13, 0.03], o.pocket, [['spine', 1]]);
  if (o.zip) box(out, [0, 0.82, front(0.012)], [0.018, 0.56, 0.02], o.zip, [['spine', 0.5], ['chest', 0.5]]);
  // Hanbok: the goreum, a ribbon tied on the right of the chest with two
  // long ends hanging down (one longer than the other).
  if (o.goreum) {
    const z = front(0.03), w = [['spine', 0.4], ['chest', 0.6]];
    box(out, [-0.07, 1.0, z], [0.07, 0.05, 0.03], o.goreum, w);
    box(out, [-0.09, 0.86, z], [0.045, 0.26, 0.015], o.goreum, w);
    box(out, [-0.04, 0.89, z + 0.004], [0.04, 0.2, 0.015], o.goreum, w);
  }
}

function arm(out, o, side) {
  const s = side > 0 ? 'l' : 'r';
  const rings = [];
  const bulk = (o.bulk || 0) * 0.7;
  const add = (x, r, role) => rings.push({ c: [x * side, 1.107, 0], u: [0, 1, 0], v: [0, 0, 1], ru: r, rv: r, role, w: chain(ARM(s), x) });
  const sleeve = o.sleeve ?? 0.42; // where the sleeve ends (x)
  if (sleeve > 0.2) {
    add(0.16, 0.115 + bulk, 'top');
    for (let x = 0.26; x < sleeve; x += 0.08) add(x, 0.105 + bulk, 'top');
    add(sleeve, 0.1 + bulk, o.cuff || 'top');
    if (o.cuff) add(sleeve + 0.03, 0.095 + bulk, 'top');
    else add(sleeve, 0.068, 'skin');
  } else add(0.18, 0.08, 'skin'); // sleeveless: a bare shoulder from inside the top
  if (sleeve < 0.8) {
    add(Math.max(sleeve, 0.3) + 0.06, 0.074, 'skin');
    add(0.7, 0.07, 'skin');
    add(0.82, 0.068, 'skin');
  }
  sweep(out, o.quilt ? quilted(rings, 'x') : rings, { capStart: true, capEnd: sleeve < 0.8, power: 2 });
  // A rounded fist and a thumb.
  const hw = [['hand' + s, 1]];
  const fist = (x, ry, rz) => ({ c: [x * side, 1.1, 0.005], u: [0, 1, 0], v: [0, 0, 1], ru: ry, rv: rz, role: 'skin', w: x < 0.8 ? [['wrist' + s, 1]] : hw });
  sweep(out, [fist(0.79, 0.062, 0.07), fist(0.84, 0.08, 0.088), fist(0.92, 0.082, 0.09), fist(0.98, 0.06, 0.07), fist(1.0, 0.03, 0.035)], { power: 2.6 });
  const thumb = (x, r) => ({ c: [x * side, 1.13, 0.085], u: [0, 1, 0], v: [0, 0, 1], ru: r, rv: r, role: 'skin', w: hw });
  sweep(out, [thumb(0.82, 0.02), thumb(0.85, 0.032), thumb(0.9, 0.03), thumb(0.93, 0.015)], { power: 2 });
}

function leg(out, o, side) {
  const s = side > 0 ? 'l' : 'r';
  const x = 0.171 * side;
  const rings = [];
  const add = (y, r, role) => rings.push({ c: [x, y, 0.005], u: [1, 0, 0], v: [0, 0, 1], ru: r, rv: r * 1.02, role, w: chain(LEG(s), -y) });
  const shorts = o.shorts; // where the shorts end (y), else trousers to the shoe
  add(0.56, 0.125, 'bottom');
  add(0.46, 0.122, 'bottom');
  if (shorts) {
    add(shorts, 0.12, 'bottom');
    add(shorts, 0.075, 'skin');
    add(0.2, 0.07, 'skin');
    add(0.12, 0.072, o.socks || 'skin');
  } else {
    add(0.34, 0.112, 'bottom');
    add(0.22, 0.104, 'bottom');
    add(0.12, 0.1, 'bottom');
  }
  sweep(out, rings, { power: 2 });
  // A sneaker on the foot, toe to +z, and a sole round it.
  const shoe = [];
  const sAdd = (z, h, wd, role, y0 = 0) => shoe.push({ c: [x, y0 + h / 2, z], u: [1, 0, 0], v: [0, 1, 0], ru: wd, rv: h / 2, role, w: z > 0.06 ? [['toes' + s, 1]] : [['foot' + s, 1]] });
  sAdd(-0.1, 0.12, 0.085, 'shoes');
  sAdd(-0.07, 0.15, 0.1, 'shoes');
  sAdd(0.02, 0.14, 0.105, 'shoes');
  sAdd(0.11, 0.1, 0.1, 'shoes');
  sAdd(0.17, 0.075, 0.09, 'shoes');
  sAdd(0.2, 0.05, 0.07, 'shoes');
  sweep(out, shoe, { power: 3 });
  const sole = [];
  const lAdd = (z, wd) => sole.push({ c: [x, 0.016, z], u: [1, 0, 0], v: [0, 1, 0], ru: wd, rv: 0.018, role: 'sole', w: z > 0.06 ? [['toes' + s, 1]] : [['foot' + s, 1]] });
  lAdd(-0.115, 0.08); lAdd(-0.08, 0.108); lAdd(0.1, 0.11); lAdd(0.19, 0.085); lAdd(0.215, 0.05);
  sweep(out, sole, { power: 3 });
}

// Builds the outfit's mesh for one model (in place, on the loaded glTF).
// cellUv(role) -> [u, v] centre of the atlas cell painted for that role.
export function buildOutfit(gltf, o, cellUv) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const bones = [];
  scene.traverse((b) => { if (b.isBone) bones.push(b); });
  const index = new Map(bones.map((b, i) => [b.name, i]));
  const part = (draw) => {
    const pos = [], nor = [], uv = [], si = [], sw = [];
    draw({
      tri(ps, ns, ws, role) {
        const [u, v] = cellUv(role);
        for (let k = 0; k < 3; k++) {
          pos.push(ps[k].x, ps[k].y, ps[k].z);
          nor.push(ns[k].x, ns[k].y, ns[k].z);
          uv.push(u, v);
          const w = ws[k].slice(0, 4);
          for (let j = 0; j < 4; j++) { si.push(w[j] ? index.get(w[j][0]) ?? 0 : 0); sw.push(w[j] ? w[j][1] : 0); }
        }
      },
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    return geo;
  };
  // The torso is its own mesh ("Body": bags and scarves are sized from it).
  const geos = {
    Outfit_Body: part((out) => torso(out, o)),
    Outfit_Limbs: part((out) => { arm(out, o, 1); arm(out, o, -1); leg(out, o, 1); leg(out, o, -1); }),
  };
  // The model's own body, arms, legs (and the ninja's mask) are hidden.
  let parent = null, material = null;
  scene.traverse((m) => {
    if (!m.isSkinnedMesh) return;
    if (/body|leg|arm|mask/i.test(m.name)) { m.userData.wearHidden = true; parent ||= m.parent; material ||= m.material; }
  });
  parent ||= scene;
  const toLocal = parent.matrixWorld.clone().invert();
  const skeleton = new THREE.Skeleton(bones);
  skeleton.calculateInverses();
  for (const [name, geo] of Object.entries(geos)) {
    geo.applyMatrix4(toLocal);
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    const mesh = new THREE.SkinnedMesh(geo, material);
    mesh.name = name;
    parent.add(mesh);
    mesh.updateMatrixWorld(true);
    mesh.bind(skeleton, mesh.matrixWorld.clone());
    mesh.frustumCulled = false;
  }
}
