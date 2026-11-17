// The Seoul City Wall on Namsan, from the west slope over the summit and down
// through Jangchung-dong to Gwanghuimun: the wall with its parapet on the
// hill's ground, Gwanghuimun at 43.75%, and woods along the trail off the
// hill. The numbers come from scripts/build-namsan-wall.mjs (the namsan
// landmark's `wall` and `wtrail`; the trail's decks, the wall's blockers off
// the hill and the trail's roads are there from the start: game/namsan-walk.js,
// itaewon.json). game/namsan-walk.js loads this with import() when you come
// near. It also draws the wall's trail on the hill (l.wtrail): earth, with
// granite steps where it climbs, a stone curb, low lamps and dry grass on
// its open side (Yozi 2026-11-17, from photos of the real trail).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { graniteTexture, earthTexture, slabTexture, smallGate, PARAPET, GRANITE } from './city-wall-parts.js';

const HIDE = 700; // m: past this from the wall, it is not drawn
const STEP = 2; // m: the wall follows the ground in pieces this long
export const TRAIL_LOOK = {
  steep: 0.14, // the trail's climb (8°) from which it is stone steps
  rise: 0.16, // m: a step's height
  curb: [0.16, 0.12], // m: the stone curb's width and height
  lamp: 9, // m between the low lamps
  clearTrees: 5, // m past the trail's edge kept clear of the hill's trees (core/landmarks.js)
};

// l: the namsan landmark (world x, z), y: (x, z) -> ground height,
// roads: the joined map's (the trail's are marked hw), buildings, blockers.
export function buildNamsanWall({ scene, l, y, roads = [], buildings = [] }) {
  const { thick: T, H, runs, gate } = l.wall;
  const group = new THREE.Group();
  group.name = 'namsan-wall';
  const W = (p) => p.map(([x, z]) => [l.x + x, l.z + z]);
  const lines = runs.map(W);
  const top = H - PARAPET.h - PARAPET.cap; // the body's top above the ground at its middle

  const merlons = []; // [x, z, y, ry]
  { // The wall: a stone body from below the ground on its low side to its
    // top, following the slope, and the parapet's blocks along its top.
    const pos = [], uv = [], idx = [];
    const quad = (a, b, c, d, ua, ub, va, vb) => {
      const s = pos.length / 3;
      pos.push(...a, ...b, ...c, ...d);
      uv.push(ua, va, ub, va, ub, vb, ua, vb);
      idx.push(s, s + 1, s + 2, s, s + 2, s + 3);
    };
    const U = 1 / 3.2, V = 1 / 1.6; // (texture: courses 0.4 m high)
    for (const p of lines) {
      let u = 0;
      for (let i = 1; i < p.length; i++) {
        const [ax, az] = p[i - 1], [bx, bz] = p[i], len = Math.hypot(bx - ax, bz - az);
        if (len < 0.01) continue;
        const ux = (bx - ax) / len, uz = (bz - az) / len, nx = uz * T / 2, nz = -ux * T / 2;
        const n = Math.max(1, Math.ceil(len / STEP));
        for (let k = 0; k < n; k++) {
          const e0 = k === 0 ? -0.2 : 0, e1 = k === n - 1 ? 0.2 : 0; // (a little past the bends)
          const s0 = (len * k) / n + e0, s1 = (len * (k + 1)) / n + e1;
          const at = (s) => {
            const x = ax + ux * s, z = az + uz * s;
            const g = y(x, z), lo = Math.min(y(x + nx, z + nz), y(x - nx, z - nz), g);
            return { x, z, y0: lo - 0.6, y1: g + top };
          };
          const A = at(s0), B = at(s1);
          const L = [A.x + nx, A.z + nz], Lb = [B.x + nx, B.z + nz], Rg = [A.x - nx, A.z - nz], Rb = [B.x - nx, B.z - nz];
          const ua = (u + s0) * U, ub = (u + s1) * U;
          quad([Rg[0], A.y0, Rg[1]], [Rb[0], B.y0, Rb[1]], [Rb[0], B.y1, Rb[1]], [Rg[0], A.y1, Rg[1]], ua, ub, A.y0 * V, A.y1 * V);
          quad([Lb[0], B.y0, Lb[1]], [L[0], A.y0, L[1]], [L[0], A.y1, L[1]], [Lb[0], B.y1, Lb[1]], ub, ua, B.y0 * V, B.y1 * V);
          quad([Rg[0], A.y1, Rg[1]], [Rb[0], B.y1, Rb[1]], [Lb[0], B.y1, Lb[1]], [L[0], A.y1, L[1]], ua, ub, 0, T * V);
        }
        { // the parapet's blocks, close, evenly spread along the piece
          const k = Math.max(1, Math.round((len - 0.2) / (PARAPET.len + PARAPET.gap))), L = (len - 0.2) / k;
          for (let i = 0; i < k; i++) {
            const sm = 0.1 + L * (i + 0.5), x = ax + ux * sm, z = az + uz * sm;
            merlons.push([x, z, y(x, z) + top, Math.atan2(-uz, ux), L - PARAPET.gap]);
          }
        }
        u += len;
      }
      // The stretch's ends: a face across the wall.
      for (const [k, o] of [[0, 1], [p.length - 1, p.length - 2]]) {
        const [x0, z0] = p[k], [x1, z1] = p[o], len = Math.hypot(x0 - x1, z0 - z1) || 1;
        const ux = (x0 - x1) / len, uz = (z0 - z1) / len, nx = uz * T / 2, nz = -ux * T / 2, ex = x0 + ux * 0.2, ez = z0 + uz * 0.2;
        const g = y(ex, ez), y0 = Math.min(g, y(ex + nx, ez + nz), y(ex - nx, ez - nz)) - 0.6, y1 = g + top;
        quad([ex - nx, y0, ez - nz], [ex + nx, y0, ez + nz], [ex + nx, y1, ez + nz], [ex - nx, y1, ez - nz], 0, T * U, y0 * V, y1 * V);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const tex = graniteTexture();
    const wall = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: tex ? 0xffffff : GRANITE, map: tex, side: THREE.DoubleSide }));
    wall.name = 'wall-namsan';
    wall.castShadow = wall.receiveShadow = true;
    group.add(wall);
    // The parapet: a block (1 m long, stretched to its length) under a cap
    // stone a little wider, with a dark loophole in its face each side.
    const P = PARAPET;
    const block = new THREE.BoxGeometry(1, P.h, P.t).translate(0, P.h / 2, 0);
    const cap = new THREE.BoxGeometry(1, P.cap, P.t + P.over * 2).translate(0, P.h + P.cap / 2, 0);
    const hole = mergeGeometries([0.5, -0.5].map((f) => new THREE.PlaneGeometry(0.16, 0.14).rotateY(f > 0 ? 0 : Math.PI).translate(0, P.h * 0.45, f * (P.t + 0.02))));
    const btex = tex?.clone();
    if (btex) { btex.repeat.set(0.45, 0.4); btex.needsUpdate = true; }
    const blocks = new THREE.InstancedMesh(block, new THREE.MeshLambertMaterial({ color: btex ? 0xffffff : GRANITE, map: btex }), merlons.length);
    const caps = new THREE.InstancedMesh(cap, new THREE.MeshLambertMaterial({ color: '#c4c5c1' }), merlons.length);
    const holes = new THREE.InstancedMesh(hole, new THREE.MeshBasicMaterial({ color: '#3a3833' }), merlons.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
    merlons.forEach(([x, z, yy, ry, len], i) => {
      q.setFromAxisAngle(up, ry);
      blocks.setMatrixAt(i, m4.compose(p3.set(x, yy, z), q, sc.set(len, 1, 1)));
      caps.setMatrixAt(i, m4.compose(p3, q, sc.set(len + 0.04, 1, 1)));
      holes.setMatrixAt(i, m4.compose(p3, q, sc.set(1, 1, 1)));
    });
    blocks.castShadow = true; // (the caps and loopholes: no shadows, to keep the frame light)
    group.add(blocks, caps, holes);
  }

  if (l.wtrail?.length) group.add(wallTrail({ l, y, lines }));

  { // Gwanghuimun (광희문), 43.75%, like Hyehwamun.
    const g = smallGate(gate, 'gwanghuimun');
    const gx = l.x + gate.x, gz = l.z + gate.z;
    g.position.set(gx, y(gx, gz), gz);
    g.rotation.y = gate.ry;
    group.add(g);
  }

  // (no woods along the trail: Yozi 2026-11-17, Namsan without trees is fine and lighter)
  scene.add(group);

  const pts = lines.flat();
  const xs = pts.map((p) => p[0]), zs = pts.map((p) => p[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  return {
    group,
    update(p) {
      const dx = Math.max(x0 - p.x, 0, p.x - x1), dz = Math.max(z0 - p.z, 0, p.z - z1);
      const show = Math.hypot(dx, dz) < HIDE;
      if (group.visible !== show) group.visible = show;
    },
  };
}

// The wall's trail on the hill (l.wtrail, world = l.x/l.z + its points): an
// earth path pathW wide, granite steps where it climbs steeper than
// TRAIL_LOOK.steep, a stone curb either side, and on its open side (away
// from the wall) low lamps, dry grass and shrubs. The ground under you is
// the hill's (y); the steps are drawn round it (half a step up or down).
function wallTrail({ l, y, lines }) {
  const T = TRAIL_LOOK, w = l.wpathW || 3, h = w / 2;
  const g = new THREE.Group();
  g.name = 'namsan-wall-trail';
  const earth = { pos: [], uv: [] }, tread = { pos: [], uv: [] }, riser = { pos: [] }, curb = { pos: [] }, verge = { pos: [] };
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const wallD = (x, z) => { let b = Infinity; for (const p of lines) for (let i = 1; i < p.length; i++) b = Math.min(b, segD(x, z, p[i - 1], p[i])); return b; };
  const tri = (o, a, b, c) => o.pos.push(...a, ...b, ...c);
  const quad = (o, a, b, c, d) => { tri(o, a, b, c); tri(o, a, c, d); };
  const lamps = [], tufts = [], shrubs = [];
  let seed = 31;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const allRuns = [...l.wtrail, ...(l.trail?.length > 1 ? [l.trail] : [])].map((r) => r.map(([x, z]) => [l.x + x, l.z + z]));
  const otherD = (x, z, me) => { let b = Infinity; for (const p of allRuns) if (p !== me) for (let i = 1; i < p.length; i++) b = Math.min(b, segD(x, z, p[i - 1], p[i])); return b; };
  for (const [ri, src] of allRuns.entries()) { // (and the trail up from Sowol-ro, which shares its way east of the plaza)
    const summit = ri >= l.wtrail.length; // (where it meets the wall's trail, that one is drawn)
    // Points every 0.5 m, with the normal at each (mitred: no gaps or
    // overlaps at the bends) and the ground's height.
    const pts = [];
    for (let i = 1; i < src.length; i++) {
      const [ax, az] = src[i - 1], [bx, bz] = src[i], n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5));
      for (let k = 0; k < n; k++) pts.push([ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n]);
    }
    pts.push(src.at(-1));
    if (pts.length < 2) continue;
    const s = [0];
    for (let i = 1; i < pts.length; i++) s.push(s[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const nrm = pts.map((_, i) => {
      const a = pts[Math.max(0, i - 2)], b = pts[Math.min(pts.length - 1, i + 2)], len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      return [-(b[1] - a[1]) / len, (b[0] - a[0]) / len];
    });
    const gy = pts.map(([x, z]) => y(x, z));
    // How steep, over 3 m round each point; a little run of steep is kept steep.
    const grade = pts.map((_, i) => {
      let j0 = i, j1 = i;
      while (j0 > 0 && s[i] - s[j0] < 1.5) j0--;
      while (j1 < pts.length - 1 && s[j1] - s[i] < 1.5) j1++;
      return Math.abs(gy[j1] - gy[j0]) / (s[j1] - s[j0] || 1);
    });
    const steep = grade.map((v) => v > T.steep);
    for (let i = 1; i < steep.length - 1; i++) if (!steep[i] && steep[i - 1] && steep[i + 1]) steep[i] = true;
    const side = (i, o, up) => [pts[i][0] + nrm[i][0] * o, gy[i] + up, pts[i][1] + nrm[i][1] * o];
    // The path: earth where gentle; steps where steep.
    let i = 0;
    while (i < pts.length - 1) {
      if (summit && otherD(pts[i][0], pts[i][1], src) < h + 1) { i++; continue; }
      if (!steep[i]) {
        const a = side(i, h, 0.1), b = side(i, -h, 0.1), c = side(i + 1, -h, 0.1), d = side(i + 1, h, 0.1);
        quad(earth, a, b, c, d);
        earth.uv.push(0, s[i] / 2, w / 2, s[i] / 2, w / 2, s[i + 1] / 2, 0, s[i] / 2, w / 2, s[i + 1] / 2, 0, s[i + 1] / 2);
        i++;
        continue;
      }
      // A flight: from i while steep; a step each `rise` of the ground.
      let j = i;
      while (j < pts.length - 1 && steep[j]) j++;
      const steps = [];
      for (let k = i; k < j;) {
        let m = k + 1;
        while (m < j && Math.abs(gy[m] - gy[k]) < T.rise) m++;
        steps.push([k, m, Math.max(gy[k], gy[m]) - Math.abs(gy[m] - gy[k]) / 2 + 0.1]); // (the tread at the middle of the ground under it)
        k = m;
      }
      steps.forEach(([k, m, ty], n) => {
        for (let q = k; q < m; q++) { // the tread over the points it covers
          const a = side(q, h, 0), b = side(q, -h, 0), c = side(q + 1, -h, 0), d = side(q + 1, h, 0);
          for (const v of [a, b, c, d]) v[1] = ty;
          quad(tread, a, b, c, d);
          const v0 = (s[q] - s[k]) / (s[m] - s[k] || 1), v1 = (s[q + 1] - s[k]) / (s[m] - s[k] || 1); // (one slab pattern per tread)
          tread.uv.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
        }
        // the face between it and the one before (or the earth before the flight)
        const prev = n ? steps[n - 1][2] : gy[k] + 0.1;
        const riserAt = (q, y0, y1) => { const L = side(q, h, 0), R = side(q, -h, 0), lo = Math.min(y0, y1) - 0.02, hi = Math.max(y0, y1); quad(riser, [L[0], lo, L[2]], [R[0], lo, R[2]], [R[0], hi, R[2]], [L[0], hi, L[2]]); };
        riserAt(k, prev, ty);
        if (n === steps.length - 1) riserAt(m, ty, gy[m] + 0.1); // (and the earth after it)
      });
      i = j;
    }
    // The curb: a stone strip on each edge, the path's height plus its own.
    const [cw, ch] = T.curb;
    for (const sg of [1, -1]) for (let q0 = 0; q0 < pts.length - 1; q0 += 2) { // (every metre)
      const q = q0, q1 = Math.min(q0 + 2, pts.length - 1);
      if (s[q] < 1.5 || s.at(-1) - s[q + 1] < 1.5) continue; // (not where it meets another way)
      { // (not where another way, or this one's own other leg on a zigzag, is on it)
        const cx = pts[q][0] + nrm[q][0] * sg * (h + cw / 2), cz = pts[q][1] + nrm[q][1] * sg * (h + cw / 2);
        if (otherD(cx, cz, src) < h + 0.8) continue;
        let own = Infinity;
        for (let r = 1; r < pts.length; r++) if (Math.abs(s[r] - s[q]) > 6) own = Math.min(own, segD(cx, cz, pts[r - 1], pts[r]));
        if (own < h + 0.8) continue;
      }
      const o0 = sg * (h + cw / 2), y0 = steep[q] ? 0.18 : 0.1;
      const A = side(q, o0 - cw / 2, -0.05), B = side(q1, o0 - cw / 2, -0.05), C = side(q1, o0 + cw / 2, -0.05), D = side(q, o0 + cw / 2, -0.05);
      const top = (v, yy) => [v[0], v[1] + 0.05 + yy + ch, v[2]];
      quad(curb, top(A, y0), top(B, y0), top(C, y0), top(D, y0));
      quad(curb, D, C, top(C, y0), top(D, y0)); // (its outer face; the inner one is hidden by the path)
    }
    // Grass verges either side, from the curb down into the slope (whose
    // triangles are sunk a little here: core/landmarks.js).
    for (const sg of [1, -1]) for (let q = 0; q < pts.length - 1; q += 2) {
      const o0 = sg * (h + cw), o1 = sg * (h + cw + 3), q1 = Math.min(q + 2, pts.length - 1);
      quad(verge, side(q, o0, 0.05), side(q1, o0, 0.05), side(q1, o1, -0.45), side(q, o1, -0.45));
    }
    // The open side (away from the wall): lamps, dry grass, shrubs.
    let next = T.lamp / 2;
    for (let q = 0; q < pts.length; q++) {
      const [x, z] = pts[q], o = h + 0.6;
      const open = wallD(x + nrm[q][0] * o, z + nrm[q][1] * o) > wallD(x - nrm[q][0] * o, z - nrm[q][1] * o) ? 1 : -1;
      const at = (d) => { const px = x + nrm[q][0] * d * open, pz = z + nrm[q][1] * d * open; return [px, y(px, pz), pz]; };
      if (s[q] >= next) { lamps.push(at(h + cw + 0.35)); next += T.lamp; }
      if (q % 2 === 0) for (let n = 0; n < 1; n++) { const p = at(h + cw + 0.3 + rnd() * 4.5); p[0] += (rnd() - 0.5) * 0.4; tufts.push([...p, 0.7 + rnd() * 0.7]); }
      if (q % 7 === 3 && rnd() < 0.6) shrubs.push([...at(h + cw + 1.6 + rnd() * 3), 0.7 + rnd() * 0.6]);
      if (q % 3 === 1 && rnd() < 0.5) { const p = at(-(h + cw + 0.25 + rnd() * 0.4)); if (wallD(p[0], p[2]) > (l.wall?.thick || 1.4) / 2 + 0.2) tufts.push([...p, 0.5 + rnd() * 0.4]); } // (a few by the wall's foot)
    }
  }
  const mesh = (o, mat, uv) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(o.pos, 3));
    if (uv) geo.setAttribute('uv', new THREE.Float32BufferAttribute(o.uv, 2));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    return m;
  };
  const etex = earthTexture();
  g.add(mesh(earth, new THREE.MeshLambertMaterial({ color: etex ? 0xffffff : '#cdb48a', map: etex, side: THREE.DoubleSide }), true));
  const ttex = slabTexture(); // (not the wall's blocks: Yozi 2026-11-17)
  g.add(mesh(tread, new THREE.MeshLambertMaterial({ color: ttex ? 0xffffff : '#d9d6cd', map: ttex, side: THREE.DoubleSide }), true));
  g.add(mesh(verge, new THREE.MeshLambertMaterial({ color: '#86b56f', side: THREE.DoubleSide })));
  g.add(mesh({ pos: [...riser.pos, ...curb.pos] }, new THREE.MeshLambertMaterial({ color: '#a2a3a0', side: THREE.DoubleSide }))); // (the steps' fronts and the curb, one stone)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3();
  const inst = (geo, mat, list, f) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length)); m.count = list.length; list.forEach((it, i) => { f(it); m.setMatrixAt(i, m4.compose(p3, q, sc)); }); g.add(m); return m; };
  // Low lamps: a dark post with a pale head.
  { // (post and head in one mesh, coloured per vertex)
    const paint = (geo, c) => { const col = new THREE.Color(c), n = geo.attributes.position.count; geo.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: n * 3 }, (_, i) => col.toArray()[i % 3]), 3)); return geo; };
    const lamp = mergeGeometries([paint(new THREE.CylinderGeometry(0.06, 0.07, 0.8, 6, 1, true).translate(0, 0.4, 0), '#4a4c4f'), paint(new THREE.CylinderGeometry(0.09, 0.09, 0.16, 6).translate(0, 0.88, 0), '#fff6dc')]);
    inst(lamp, new THREE.MeshLambertMaterial({ vertexColors: true }), lamps, ([x, yy, z]) => { p3.set(x, yy - 0.05, z); sc.set(1, 1, 1); });
  }
  // Dry grass, in tufts of straw and faded green.
  const tuft = inst(new THREE.ConeGeometry(0.28, 0.34, 5, 1, true).translate(0, 0.12, 0), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), tufts, ([x, yy, z, k]) => { p3.set(x, yy, z); sc.set(k, k * (0.8 + (x * 7 % 1 + 1) % 1 * 0.6), k); });
  const straw = ['#c9b273', '#b9a466', '#a8a564', '#d3bf86'].map((c) => new THREE.Color(c));
  tufts.forEach((_, i) => tuft.setColorAt(i, straw[i % straw.length]));
  // Low shrubs.
  const bush = inst(new THREE.IcosahedronGeometry(0.75, 0).scale(1, 0.62, 1).translate(0, 0.3, 0), new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), shrubs, ([x, yy, z, k]) => { p3.set(x, yy, z); sc.set(k, k, k); });
  const greens = ['#5c8a45', '#6c9a50', '#4e7c3e'].map((c) => new THREE.Color(c));
  shrubs.forEach((_, i) => bush.setColorAt(i, greens[i % greens.length]));
  g.userData.counts = { lamps: lamps.length, tufts: tufts.length, shrubs: shrubs.length, stepsTris: tread.pos.length / 9 };
  return g;
}
