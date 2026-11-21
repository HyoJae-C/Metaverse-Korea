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

// A flat shape on the chest (a lapel, a pocket flap, a V of shirt): a 2D
// outline in x/y, pushed out `depth` from z, leaning back `lean` radians
// (top further back) so it lies on the chest's slope.
function plate(out, pts, { z, depth = 0.012, role, w, lean = 0, pivot = 1.0 }) {
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: false, curveSegments: 1 }).toNonIndexed();
  const m = new THREE.Matrix4().makeTranslation(0, pivot, z)
    .multiply(new THREE.Matrix4().makeRotationX(lean))
    .multiply(new THREE.Matrix4().makeTranslation(0, -pivot, 0));
  g.applyMatrix4(m);
  const p = g.attributes.position, n = g.attributes.normal;
  for (let i = 0; i < p.count; i += 3) {
    const ps = [0, 1, 2].map((k) => new THREE.Vector3(p.getX(i + k), p.getY(i + k), p.getZ(i + k)));
    const ns = [0, 1, 2].map((k) => new THREE.Vector3(n.getX(i + k), n.getY(i + k), n.getZ(i + k)));
    out.tri(ps, ns, [w, w, w], role);
  }
}
const mirror = (pts) => pts.map(([x, y]) => [-x, y]).reverse();

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

// Stripes (a Breton top, a rugby shirt): bands of another colour across the
// top, every `step` metres, `width` wide, from `from` up to `to` along the
// axis (y for the body, x for a sleeve). Extra rings go in between the
// existing ones, at radii blended from their neighbours.
function striped(rings, st, axis, from, to) {
  const i = axis === 'x' ? 0 : 1;
  const at = (r) => Math.abs(r.c[i]);
  const cuts = []; // [start, end, start, end, ...]
  for (let t = from + st.step * 0.5; t + st.width < to; t += st.step) cuts.push(t, t + st.width);
  const inBand = (x) => cuts.some((t, n) => n % 2 === 0 && x >= t - 1e-6 && x < cuts[n + 1] - 1e-6);
  // A segment takes its first ring's colour.
  const paint = (r) => (r.role === 'top' && inBand(at(r)) ? { ...r, role: st.role } : r);
  const out = [];
  for (let k = 0; k < rings.length; k++) {
    const a = rings[k], b = rings[k + 1];
    out.push(paint(a));
    if (!b || a.role !== 'top' || at(b) <= at(a)) continue;
    for (const t of cuts) {
      if (t <= at(a) || t >= at(b)) continue;
      const f = (t - at(a)) / (at(b) - at(a)), mix = (x, y) => x + (y - x) * f;
      out.push(paint({ ...a, c: a.c.map((v, j) => mix(v, b.c[j])), ru: mix(a.ru, b.ru), rv: mix(a.rv, b.rv) }));
    }
  }
  return out;
}

// ---- the garments ---------------------------------------------------------
// o: the outfit's shape options (see OUTFITS in data/characters/kaykit2.js).
// A onesie's tail and spikes: a mesh of their own (Outfit_Tail), so bags
// and scarves, sized from the Body mesh, don't count them.
function tails(out, o) {
  const bulk = o.bulk || 0;
  // A round pompom (a bear, a bunny) or a dinosaur's long tail on the
  // seat, and the dinosaur's spikes down its back.
  const back = (y) => -(y > 1.1 ? 0.2 : 0.215) - bulk + 0.01;
  if (o.tail === 'pom') {
    const r = (z, rr) => ({ c: [0, 0.5, z], u: [1, 0, 0], v: [0, 1, 0], ru: rr, rv: rr, role: 'top', w: [['hips', 1]] });
    sweep(out, [r(back(0.5) + 0.03, 0.05), r(back(0.5) - 0.02, 0.08), r(back(0.5) - 0.07, 0.085), r(back(0.5) - 0.12, 0.06), r(back(0.5) - 0.145, 0.02)], { power: 2 });
  } else if (o.tail === 'dino') {
    const r = (z, y, rr) => ({ c: [0, y, z], u: [1, 0, 0], v: [0, 1, 0], ru: rr, rv: rr * 0.9, role: 'top', w: [['hips', 1]] });
    sweep(out, [r(back(0.5) + 0.04, 0.5, 0.13), r(back(0.5) - 0.1, 0.46, 0.11), r(back(0.5) - 0.26, 0.38, 0.08), r(back(0.5) - 0.42, 0.27, 0.05), r(back(0.5) - 0.55, 0.17, 0.012)], { power: 2 });
  }
  if (o.spikes) for (const [y, k] of [[0.62, 0.8], [0.76, 1], [0.9, 1.05], [1.04, 1], [1.16, 0.75]]) {
    const r = (dz, ru, rv) => ({ c: [0, y, back(y) + dz], u: [1, 0, 0], v: [0, 1, 0], ru, rv, role: o.spikes, w: chain(TORSO, y) });
    sweep(out, [r(0.03, 0.016, 0.06 * k), r(-0.02, 0.014, 0.05 * k), r(-0.08 * k, 0.004, 0.008)], { power: 2 });
  }
}

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
  } else if (o.rib) { // a ribbed band round the hem (knits, sweatshirts, hoodies)
    add(hemY, 0.296 + bulk, 0.224 + bulk, o.rib);
    add(hemY + 0.045, 0.3 + bulk, 0.228 + bulk, 'top');
  } else {
    add(hemY, 0.3 + bulk, 0.228 + bulk, 'top');
  }
  const bodyTop = [[0.66, 0.29, 0.22], [0.78, 0.285, 0.215], [0.9, 0.295, 0.222], [1.0, 0.3, 0.225], [1.08, 0.292, 0.218]];
  for (const [y, rx, rz] of bodyTop) if (y > (o.coat ? 0.6 : hemY)) add(y, rx + bulk, rz + bulk, 'top');
  add(1.15, 0.25 + bulk * 0.8, 0.195 + bulk * 0.8, 'top');
  add(1.21, 0.17 + bulk * 0.5, 0.14 + bulk * 0.5, 'top');
  add(1.25, 0.12, 0.1, o.neck || 'top');
  sweep(out, o.quilt ? quilted(rings, 'y') : o.stripes ? striped(rings, o.stripes, 'y', o.hem, 1.12) : rings, { power: 2.5 });
  // Neckline rim (crew neck) or collar.
  if (o.turtle) { // a turtleneck: a thick folded collar up under the chin
    sweep(out, [
      { c: [0, 1.14, 0.0], u: [1, 0, 0], v: [0, 0, 1], ru: 0.235, rv: 0.2, role: o.turtle, w: [['chest', 1]] },
      { c: [0, 1.2, 0.0], u: [1, 0, 0], v: [0, 0, 1], ru: 0.215, rv: 0.185, role: o.turtle, w: [['chest', 1]] },
      { c: [0, 1.27, -0.005], u: [1, 0, 0], v: [0, 0, 1], ru: 0.19, rv: 0.165, role: o.turtle, w: [['chest', 0.7], ['head', 0.3]] },
      { c: [0, 1.31, -0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.15, rv: 0.13, role: o.turtle, w: [['chest', 0.6], ['head', 0.4]] },
    ], { power: 2.2 });
  } else if (o.collar) {
    sweep(out, [
      { c: [0, 1.17, 0.0], u: [1, 0, 0], v: [0, 0, 1], ru: 0.2, rv: 0.17, role: o.collar, w: [['chest', 1]] },
      { c: [0, 1.26, -0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.16, rv: 0.14, role: o.collar, w: [['chest', 1]] },
    ], { power: 2.2 });
  }
  const front = (z) => 0.24 + bulk + z;
  if (o.placket) box(out, [0, 0.86, front(0.0)], [0.05, 0.42, 0.02], o.placket, [['spine', 0.5], ['chest', 0.5]]);
  const chestW = [['spine', 0.4], ['chest', 0.6]];
  if (o.panel) { // an open front: the shirt under it shows in a V at the neck
    const bottom = o.coat ? 0.6 : o.hem + 0.01, vy = o.lapel ? 0.88 : 0.98;
    plate(out, [[-0.05, bottom], [0.05, bottom], [0.05, vy], [0.11, 1.16], [-0.11, 1.16], [-0.05, vy]], { z: front(-0.012), depth: 0.02, role: o.panel, w: chestW, lean: 0.12, pivot: 0.95 });
  }
  if (o.tie) { // a necktie down the shirt's V (a suit)
    plate(out, [[-0.022, 1.12], [0.022, 1.12], [0.016, 1.08], [0.032, 0.9], [0, 0.86], [-0.032, 0.9], [-0.016, 1.08]], { z: front(0.002), depth: 0.012, role: o.tie, w: chestW, lean: 0.12, pivot: 0.95 });
  }
  if (o.lapel) for (const sx of [-1, 1]) { // a tailored jacket's notched lapels
    const pts = [[0.045, 0.88], [0.18, 1.04], [0.155, 1.09], [0.195, 1.11], [0.15, 1.19], [0.1, 1.17]];
    plate(out, sx > 0 ? pts : mirror(pts), { z: front(0.0), depth: 0.014, role: o.lapel, w: chestW, lean: 0.16, pivot: 0.95 });
  }
  if (o.buttons) { // buttons down the front (a coat, a cardigan, a suit)
    const n = o.buttons.n ?? 2, x = o.buttons.x ?? 0.075;
    for (let i = 0; i < n; i++) {
      const y = (o.buttons.top ?? 0.84) - i * (o.buttons.gap ?? 0.09);
      if (y > (o.coat ? 0.3 : o.hem + 0.03)) box(out, [x, y, front(0.012)], [0.032, 0.032, 0.014], o.buttons.role, y > 0.7 ? chestW : [['spine', 1]]);
    }
  }
  if (o.flaps) for (const sx of [-1, 1]) { // a denim jacket's chest pockets with buttoned flaps
    plate(out, [[sx * 0.07, 1.0], [sx * 0.17, 1.0], [sx * 0.17, 0.96], [sx * 0.12, 0.94], [sx * 0.07, 0.96]].map(([x, y]) => [x, y]), { z: front(-0.004), depth: 0.016, role: o.flaps, w: [['chest', 1]], lean: 0.1, pivot: 0.98 });
    box(out, [sx * 0.12, 0.955, front(0.012)], [0.018, 0.018, 0.012], 'stitch', [['chest', 1]]);
  }
  if (o.points) for (const sx of [-1, 1]) { // a shirt collar's two points
    const pts = [[0.012, 1.17], [0.15, 1.17], [0.05, 1.05]];
    plate(out, sx > 0 ? pts : mirror(pts), { z: front(-0.004), depth: 0.014, role: o.points, w: [['chest', 1]], lean: 0.5, pivot: 1.05 });
  }
  if (o.strings) for (const sx of [-1, 1]) { // a hoodie's drawstrings
    box(out, [sx * 0.055, 1.07, front(0.006)], [0.016, 0.16, 0.014], o.strings, [['chest', 1]]);
    box(out, [sx * 0.055, 0.985, front(0.01)], [0.026, 0.026, 0.02], o.strings, [['chest', 1]]);
  }
  // A onesie's tummy patch, a lighter oval on the front.
  if (o.belly) {
    const pts = [];
    for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; pts.push([Math.cos(a) * 0.14, 0.82 + Math.sin(a) * 0.17]); }
    plate(out, pts, { z: front(-0.02), depth: 0.016, role: o.belly, w: [['spine', 0.6], ['chest', 0.4]], lean: 0.05, pivot: 0.8 });
  }
  // A belt round the waist (a dress: the skirt is tucked under it).
  if (o.belt) sweep(out, [
    { c: [0, 0.6, 0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.306 + bulk, rv: 0.234 + bulk, role: o.belt, w: chain(TORSO, 0.6) },
    { c: [0, 0.66, 0.01], u: [1, 0, 0], v: [0, 0, 1], ru: 0.306 + bulk, rv: 0.234 + bulk, role: o.belt, w: chain(TORSO, 0.66) },
  ], { power: 2.5 });
  if (o.pocket) plate(out, [[-0.15, 0.64], [0.15, 0.64], [0.15, 0.7], [0.1, 0.79], [-0.1, 0.79], [-0.15, 0.7]], { z: front(-0.012), depth: 0.024, role: o.pocket, w: [['spine', 1]] });
  if (o.badge) box(out, [0.1, 0.98, front(-0.012)], [0.09, 0.09, 0.02], o.badge, [['chest', 1]]); // a chest logo or number
  if (o.zip) box(out, [0, 0.82, front(0.012)], [0.018, 0.56, 0.02], o.zip, [['spine', 0.5], ['chest', 0.5]]);
  // A fishing vest's pockets: two on the chest, two bigger ones below, each
  // side of the zip.
  if (o.pockets) for (const sx of [-1, 1]) {
    box(out, [sx * 0.12, 0.97, front(0.008)], [0.1, 0.09, 0.025], o.pockets, [['chest', 1]]);
    box(out, [sx * 0.13, 0.75, front(0.006)], [0.13, 0.12, 0.03], o.pockets, [['spine', 1]]);
  }
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
  const bulk = o.vest ? 0 : (o.bulk || 0) * 0.7; // (a vest: the T-shirt's own sleeves)
  const add = (x, r, role) => rings.push({ c: [x * side, 1.107, 0], u: [0, 1, 0], v: [0, 0, 1], ru: r, rv: r, role, w: chain(ARM(s), x) });
  const sleeve = o.sleeve ?? 0.42; // where the sleeve ends (x)
  const arms = o.arms || 'top'; // sleeves in their own colour (a varsity jacket)
  if (sleeve > 0.2) {
    add(0.16, 0.115 + bulk, arms);
    for (let x = 0.26; x < sleeve; x += 0.08) add(x, 0.105 + bulk, arms);
    add(sleeve, 0.1 + bulk, o.cuff || arms);
    if (o.cuff) add(sleeve + 0.03, 0.095 + bulk, arms);
    else add(sleeve, 0.068, 'skin');
  } else add(0.18, 0.08, 'skin'); // sleeveless: a bare shoulder from inside the top
  if (sleeve < 0.8) {
    add(Math.max(sleeve, 0.3) + 0.06, 0.074, 'skin');
    add(0.7, 0.07, 'skin');
    add(0.82, 0.068, 'skin');
  }
  sweep(out, o.quilt && !o.vest ? quilted(rings, 'x') : o.stripes && arms === 'top' ? striped(rings, o.stripes, 'x', 0.16, sleeve) : rings, { capStart: true, capEnd: sleeve < 0.8, power: 2 });
  // A rounded fist and a thumb.
  const hw = [['hand' + s, 1]];
  const fist = (x, ry, rz) => ({ c: [x * side, 1.1, 0.005], u: [0, 1, 0], v: [0, 0, 1], ru: ry, rv: rz, role: 'skin', w: x < 0.8 ? [['wrist' + s, 1]] : hw });
  sweep(out, [fist(0.79, 0.062, 0.07), fist(0.84, 0.08, 0.088), fist(0.92, 0.082, 0.09), fist(0.98, 0.06, 0.07), fist(1.0, 0.03, 0.035)], { power: 2.6 });
  const thumb = (x, r) => ({ c: [x * side, 1.13, 0.085], u: [0, 1, 0], v: [0, 0, 1], ru: r, rv: r, role: 'skin', w: hw });
  sweep(out, [thumb(0.82, 0.02), thumb(0.85, 0.032), thumb(0.9, 0.03), thumb(0.93, 0.015)], { power: 2 });
}

// Trouser cuts (data/appearance.js PANTS_CUT picks one per trouser colour):
// jeans with a rolled hem, slim slacks, wide trousers over the shoes, and
// cargo trousers with a pocket on each thigh.
export const LEG_CUTS = ['jeans', 'slacks', 'wide', 'cargo'];
function leg(out, o, side, cut = 'jeans') {
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
  } else if (cut === 'wide') { // widening down to a hem that covers the shoe's top
    add(0.34, 0.128, 'bottom');
    add(0.22, 0.136, 'bottom');
    add(0.1, 0.143, 'bottom');
    add(0.075, 0.145, 'bottom');
  } else if (cut === 'slacks') { // slim, tapered to the ankle
    add(0.34, 0.11, 'bottom');
    add(0.22, 0.1, 'bottom');
    add(0.13, 0.094, 'bottom');
  } else {
    add(0.34, 0.112, 'bottom');
    add(0.22, 0.104, 'bottom');
    if (cut === 'jeans') { // a rolled-up hem
      add(0.165, 0.101, 'bottom');
      add(0.165, 0.112, 'bottom');
      add(0.12, 0.113, 'bottom');
    } else add(0.12, 0.1, 'bottom');
  }
  sweep(out, rings, { power: 2 });
  if (cut === 'cargo' && !shorts) { // a pocket with a flap on the outer thigh
    const w = [['upperleg' + s, 0.6], ['lowerleg' + s, 0.4]];
    box(out, [x + side * 0.118, 0.33, 0.01], [0.03, 0.12, 0.12], 'bottom', w);
    box(out, [x + side * 0.124, 0.39, 0.01], [0.03, 0.03, 0.13], 'bottom', w);
  }
}

// Shoes: sneakers (laces, tongue, heel tab, a light rubber sole) or leather
// loafers (lower and sleeker, a strap across, a dark sole).
export const SHOE_KINDS = ['sneaker', 'loafer'];
function shoes(out, o, side, kind = 'sneaker') {
  const s = side > 0 ? 'l' : 'r';
  const x = 0.171 * side;
  const fw = (z) => (z > 0.06 ? [['toes' + s, 1]] : [['foot' + s, 1]]);
  if (o.barefoot) { // swimwear: a bare foot instead of a shoe
    const foot = [];
    const fAdd = (z, h, wd) => foot.push({ c: [x, h / 2, z], u: [1, 0, 0], v: [0, 1, 0], ru: wd, rv: h / 2, role: 'skin', w: fw(z) });
    fAdd(-0.08, 0.1, 0.07); fAdd(-0.04, 0.13, 0.08); fAdd(0.04, 0.1, 0.085); fAdd(0.12, 0.07, 0.08); fAdd(0.17, 0.05, 0.065);
    sweep(out, foot, { power: 2.4 });
    return;
  }
  const shoe = [];
  const sAdd = (z, h, wd, role, y0 = 0) => shoe.push({ c: [x, y0 + h / 2, z], u: [1, 0, 0], v: [0, 1, 0], ru: wd, rv: h / 2, role, w: fw(z) });
  const sole = [];
  const lAdd = (z, wd, y, h, role) => sole.push({ c: [x, y, z], u: [1, 0, 0], v: [0, 1, 0], ru: wd, rv: h, role, w: fw(z) });
  if (kind === 'loafer') {
    sAdd(-0.1, 0.1, 0.08, 'shoes', 0.012);
    sAdd(-0.07, 0.12, 0.092, 'shoes', 0.012);
    sAdd(0.02, 0.11, 0.096, 'shoes', 0.012);
    sAdd(0.12, 0.075, 0.09, 'shoes', 0.012);
    sAdd(0.19, 0.05, 0.075, 'shoes', 0.012);
    sAdd(0.225, 0.03, 0.05, 'shoes', 0.012);
    sweep(out, shoe, { power: 3 });
    lAdd(-0.112, 0.078, 0.012, 0.014, 'stitch'); lAdd(-0.08, 0.098, 0.012, 0.014, 'stitch'); lAdd(0.1, 0.1, 0.012, 0.014, 'stitch'); lAdd(0.2, 0.078, 0.012, 0.014, 'stitch'); lAdd(0.235, 0.045, 0.012, 0.014, 'stitch');
    sweep(out, sole, { power: 3 });
    box(out, [x, 0.098, 0.1], [0.1, 0.018, 0.03], 'stitch', fw(0.1)); // the strap across the instep
    return;
  }
  sAdd(-0.1, 0.12, 0.085, 'shoes', 0.02);
  sAdd(-0.07, 0.15, 0.1, 'shoes', 0.02);
  sAdd(0.02, 0.14, 0.105, 'shoes', 0.02);
  sAdd(0.11, 0.1, 0.1, 'shoes', 0.02);
  sAdd(0.17, 0.075, 0.09, 'shoes', 0.02);
  sAdd(0.19, 0.06, 0.08, 'sole', 0.02); // a rubber toe cap
  sAdd(0.2, 0.05, 0.07, 'sole', 0.02);
  sweep(out, shoe, { power: 3 });
  // A thick light midsole over a thin dark tread.
  lAdd(-0.118, 0.084, 0.03, 0.022, 'sole'); lAdd(-0.08, 0.11, 0.03, 0.022, 'sole'); lAdd(0.1, 0.112, 0.03, 0.022, 'sole'); lAdd(0.19, 0.088, 0.03, 0.022, 'sole'); lAdd(0.218, 0.052, 0.03, 0.022, 'sole');
  sweep(out, sole, { power: 3 });
  const tread = [];
  const tAdd = (z, wd) => tread.push({ c: [x, 0.008, z], u: [1, 0, 0], v: [0, 1, 0], ru: wd, rv: 0.009, role: 'stitch', w: fw(z) });
  tAdd(-0.12, 0.086); tAdd(-0.08, 0.112); tAdd(0.1, 0.114); tAdd(0.19, 0.09); tAdd(0.22, 0.054);
  sweep(out, tread, { power: 3 });
  // Three laces and a heel tab.
  const fw0 = fw(0);
  // (in front of the trouser hem, on the slope of the instep)
  for (const z of [0.075, 0.105, 0.135]) box(out, [x, 0.168 - (z - 0.02) * 0.5, z], [0.1, 0.014, 0.016], 'sole', fw(z));
  box(out, [x, 0.17, -0.105], [0.05, 0.07, 0.02], 'sole', fw0);
}

// Builds the outfit's mesh for one model (in place, on the loaded glTF).
// cellUv(role) -> [u, v] centre of the atlas cell painted for that role.
export function buildOutfit(gltf, o, cellUv) {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const bones = [];
  scene.traverse((b) => { if (b.isBone) bones.push(b); });
  const index = new Map(bones.map((b, i) => [b.name, i]));
  // keep: which roles go in this mesh; uvAt: real texture coordinates (a
  // printed top) instead of the role's atlas cell.
  const part = (draw, keep = () => true, uvAt = null) => {
    const pos = [], nor = [], uv = [], si = [], sw = [];
    draw({
      tri(ps, ns, ws, role) {
        if (!keep(role)) return;
        const cell = uvAt ? null : cellUv(role);
        const uvs = uvAt ? ps.map(uvAt) : null;
        if (uvs) { // a triangle across the wrap-round seam: its low side goes up by whole repeats
          const top = Math.max(...uvs.map((q) => q[0]));
          for (const q of uvs) if (top - q[0] > 0.5) q[0] += Math.round(top - q[0]);
        }
        for (let k = 0; k < 3; k++) {
          pos.push(ps[k].x, ps[k].y, ps[k].z);
          nor.push(ns[k].x, ns[k].y, ns[k].z);
          uv.push(...(cell || uvs[k]));
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
  // A printed top (o.print, a floral dress): the top's cloth is a mesh of
  // its own with texture coordinates wrapped round the body and the arms,
  // painted with the print (core/model-pack.js); the rest stays on the atlas.
  const plain = o.print ? (r) => r !== 'top' : undefined;
  const drawArms = (out) => { arm(out, o, 1); arm(out, o, -1); };
  const geos = {
    Outfit_Body: part((out) => torso(out, o), plain),
    Outfit_Limbs: part(drawArms, plain),
  };
  if (o.tail || o.spikes) geos.Outfit_Tail = part((out) => tails(out, o));
  if (o.print) {
    // Round the body and round each arm, a whole number of repeats (no
    // seam), about as big as on the dress's skirt (core/skirt-mesh.js).
    const round = (a, b, turns) => (Math.atan2(a, b) / (Math.PI * 2) + 0.5) * turns;
    geos.Outfit_Print = part((out) => torso(out, o), (r) => r === 'top', (p) => [round(p.x, p.z - 0.01, 3), p.y * 3]);
    geos.Outfit_Print_Sleeves = part(drawArms, (r) => r === 'top', (p) => [round(p.y - 1.107, p.z, 1), Math.abs(p.x) * 3]);
  }
  // One mesh per trouser cut and per shoe kind: each character shows only
  // the ones its look picks (core/model-pack.js, attachModel).
  for (const cut of o.shorts ? ['jeans'] : LEG_CUTS) geos['Outfit_Legs_' + cut] = part((out) => { leg(out, o, 1, cut); leg(out, o, -1, cut); });
  for (const kind of o.barefoot ? ['sneaker'] : SHOE_KINDS) geos['Outfit_Shoes_' + kind] = part((out) => { shoes(out, o, 1, kind); shoes(out, o, -1, kind); });
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
