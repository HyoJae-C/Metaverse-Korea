// Hanok (한옥): map buildings marked "hanok": 1 (Bukchon) are drawn as small
// traditional houses instead of boxes: a stone base (기단), cream walls with a
// dark wooden frame and lattice windows, and a grey tiled hip roof whose
// eaves reach out past the walls. All of them are merged into a few meshes
// (one per material), so a village of a few hundred stays cheap.
// Collision still comes from the building's outline (core/collision.js).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hipRoofGeometry } from './landmarks.js';

export const HANOK = {
  base: 0.6, // stone base height
  wall: 2.7, // wall height above the base
  roof: 2.1, // roof height
  eave: 1.0, // how far the eaves reach past the walls
};

const COL = {
  base: '#b9ae98', wall: '#f1e7d2', wood: '#6b4630', lattice: '#8a6446', roof: '#4a5059', ridge: '#30353c',
};

// Footprint of an outline: centre, width along x, depth along z, turn (rad).
// Outlines are rectangles; the longer side sets the ridge direction.
export function footprint(p) {
  const [a, b, , d] = p;
  const ex = [b[0] - a[0], b[1] - a[1]], ez = [d[0] - a[0], d[1] - a[1]];
  const w = Math.hypot(...ex), dep = Math.hypot(...ez);
  const cx = p.reduce((s, q) => s + q[0], 0) / p.length, cz = p.reduce((s, q) => s + q[1], 0) / p.length;
  let ry = -Math.atan2(ex[1], ex[0]);
  return w >= dep ? { cx, cz, w, d: dep, ry } : { cx, cz, w: dep, d: w, ry: ry + Math.PI / 2 };
}

// Merged geometry lists, one per colour.
function parts(f, i) {
  const { w, d } = f;
  const out = { base: [], wall: [], wood: [], lattice: [], roof: [], ridge: [] };
  const box = (k, sx, sy, sz, x, y, z) => out[k].push(new THREE.BoxGeometry(sx, sy, sz).translate(x, y, z));
  const B = HANOK.base, Wh = HANOK.wall, top = B + Wh;
  box('base', w + 0.8, B, d + 0.8, 0, B / 2, 0);
  box('wall', w, Wh, d, 0, B + Wh / 2, 0);
  // Frame: corner posts, a beam under the eaves, a sill.
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box('wood', 0.32, Wh, 0.32, sx * (w / 2), B + Wh / 2, sz * (d / 2));
  box('wood', w + 0.3, 0.32, d + 0.3, 0, top - 0.16, 0);
  box('wood', w + 0.1, 0.18, d + 0.1, 0, B + 0.09, 0);
  // Posts along the long sides, and lattice windows (창살) between them.
  const bays = Math.max(2, Math.round(w / 3));
  for (let k = 1; k < bays; k++) {
    const x = -w / 2 + (k * w) / bays;
    for (const sz of [-1, 1]) box('wood', 0.26, Wh, 0.2, x, B + Wh / 2, sz * (d / 2 + 0.02));
  }
  for (let k = 0; k < bays; k++) {
    if ((k + i) % 3 === 2) continue; // a plain wall bay now and then
    const x = -w / 2 + ((k + 0.5) * w) / bays, ww = Math.min(1.6, (w / bays) * 0.6);
    for (const sz of [-1, 1]) box('lattice', ww, 1.1, 0.06, x, B + 1.55, sz * (d / 2 + 0.04));
  }
  // Roof
  const rw = w + HANOK.eave * 2, rd = d + HANOK.eave * 2.2, rh = HANOK.roof;
  out.roof.push(hipRoofGeometry(rw, rd, rh).clone().translate(0, top, 0));
  const ridge = Math.max(1, rw - rd * 0.9);
  box('ridge', ridge + 0.6, rh * 0.16, rh * 0.16, 0, top + rh + rh * 0.04, 0);
  for (const sx of [-1, 1]) box('ridge', rh * 0.2, rh * 0.32, rh * 0.18, sx * (ridge / 2 + 0.2), top + rh + rh * 0.12, 0);
  box('ridge', rw * 0.92, 0.12, 0.14, 0, top + 0.06, rd / 2 - 0.1);
  box('ridge', rw * 0.92, 0.12, 0.14, 0, top + 0.06, -rd / 2 + 0.1);
  // Into place
  const m = new THREE.Matrix4().makeRotationY(f.ry).setPosition(f.cx, 0, f.cz);
  for (const k of Object.keys(out)) for (const g of out[k]) g.applyMatrix4(m);
  return out;
}

export function buildHanoks(buildings) {
  const group = new THREE.Group();
  group.name = 'hanok';
  if (!buildings.length) return group;
  const all = { base: [], wall: [], wood: [], lattice: [], roof: [], ridge: [] };
  buildings.forEach((b, i) => {
    if (!b.p || b.p.length < 4) return;
    const got = parts(footprint(b.p), i);
    for (const k of Object.keys(all)) for (const g of got[k]) all[k].push(g.index ? g.toNonIndexed() : g);
  });
  for (const k of Object.keys(all)) {
    if (!all[k].length) continue;
    const geo = mergeGeometries(all[k].map((g) => { g.deleteAttribute('uv'); return g; }));
    if (!geo) continue;
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: COL[k], flatShading: true, side: k === 'roof' ? THREE.DoubleSide : THREE.FrontSide }));
    mesh.name = k === 'wall' || k === 'roof' ? 'walls' : 'hanok-' + k; // (walls cast shadows)
    group.add(mesh);
  }
  return group;
}
