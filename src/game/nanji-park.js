// Haneul Park (하늘공원) and the Nanji Campground (난지캠핑장): what you see,
// loaded by game/nanji-walk.js when you come near. The numbers are the Nanji
// map's `skypark` and `nanjicamp` landmarks (scripts/build-nanji.mjs).
//
//   The hill's ground: a grid over it at its height (core/skypark-ground.js),
//     green on the slopes, the fields' straw colour on the level top.
//   The ways up: 하늘길 paved, the stairs as steps.
//   The fields on the top (they change with core/season.js SEASON):
//     pink muhly (핑크뮬리): soft pink clouds in autumn, green in summer
//     silver grass (억새): tall blades with silver plumes in autumn
//     kochia (댑싸리): round bushes, red in autumn
//     all swaying in the wind (one shader, no extra draw calls).
//   Five small wind turbines along the south-west edge, turning, and the
//     bowl look-out (하늘을 담는 그릇) up on legs (you walk under it).
//   The campground: dome tents with two chairs each, and fire pits with a
//     ring of camp chairs you can sit in (불멍), the flames flickering.
//
// About 40k triangles near (lowSpec: fewer tufts), 20 draw calls.
import * as THREE from 'three';
import { addSnowCover } from '../core/snow-cover.js';
import { SEASON } from '../core/season.js';
import { inPoly, skyparkBox, trailNear } from '../core/skypark-ground.js';

export const NANJI_PARK = {
  cell: 3, // m: the hill's ground grid
  sink: 0.12, // the grid is drawn this much lower (you walk on the true height)
  hide: 700, // m: past this it is not drawn
  // How thick the fields are: m² per tuft (lowSpec: twice the room).
  muhlyRoom: 0.55,
  grassRoom: 1.3,
  pathClear: 0.9, // m kept clear beside a path or a way up
  turbine: { h: 8, blade: 3, rpm: 14 }, // m, m, turns a minute (small, like the park's own)
  bowl: { r: 4.6, legs: 2.4, depth: 1.4 }, // m: the look-out's rim, its height off the ground, its depth
  chairR: 2.1, // m from a fire pit to its chairs
  chairs: 6, // round each fire pit
};

// The fields' colours by season (tip of the tuft; the base is always green).
export const FIELD_COLORS = {
  summer: { muhly: ['#7fa654', '#8bb35e', '#76a04e'], under: '#8fb866', grass: ['#9fbf6a', '#a9c773'], stem: ['#5d8a3c', '#8fb05a'], plume: '#c4d69a', kochia: ['#5f9a3c', '#6aa646'], top: '#9cbf6a' },
  autumn: { muhly: ['#f08fc4', '#f6a8d2', '#ea7cb8', '#f9bddd'], under: '#e2a6c2', grass: ['#cdb57c', '#d8c48f'], stem: ['#8c7a4a', '#c2ae7c'], plume: '#fbf8ef', kochia: ['#c9474c', '#d65a5a', '#b83c45'], top: '#d6c28c' },
  winter: { muhly: ['#c8a98c', '#bf9f84'], under: '#c9b49c', grass: ['#bba27a', '#c4ad86'], stem: ['#8a7656', '#b09a74'], plume: '#e6dfd0', kochia: ['#8a5a3c', '#7d5236'], top: '#c9b48f' },
};
const fieldColors = () => FIELD_COLORS[SEASON] || FIELD_COLORS.autumn;

// A steady 0-1 number for a spot (the same tuft always gets the same look).
const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

// Sway: the tufts' tops move with the wind, each a little out of step.
const wind = { value: 0 };
function swaying(mat, amount) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uWind = wind;
    sh.vertexShader = 'uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        float ph = instanceMatrix[3].x * 0.37 + instanceMatrix[3].z * 0.23;
      #else
        float ph = 0.0;
      #endif
      float sw = sin(uWind * 1.7 + ph) * 0.6 + sin(uWind * 2.9 + ph * 1.7) * 0.4;
      transformed.x += sw * ${amount.toFixed(3)} * position.y * position.y;
      transformed.z += sw * ${(amount * 0.5).toFixed(3)} * position.y * position.y;`);
  };
  return mat;
}

// A tuft: blades fanned round, each one triangle, coloured base -> tip, and
// (silver grass) a nodding plume of three thin feathers on most blades.
function tuftGeo(blades, h, spread, base, tip, plume = null) {
  const pos = [], col = [];
  const cb = new THREE.Color(base), ct = new THREE.Color(tip), cp = plume ? new THREE.Color(plume) : null;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + i * 0.4, lean = spread * (0.5 + 0.5 * ((i * 7) % 3) / 2);
    const hx = Math.cos(a), hz = Math.sin(a), w = 0.05;
    const tx = hx * lean, tz = hz * lean, th = h * (0.75 + 0.25 * ((i * 5) % 4) / 3);
    pos.push(-hz * w, 0, hx * w, hz * w, 0, -hx * w, tx, th, tz);
    col.push(cb.r, cb.g, cb.b, cb.r, cb.g, cb.b, ct.r, ct.g, ct.b);
    if (cp && i % 3 !== 2) { // the plume: feathers fanning out and nodding from the blade's top
      for (let f = -1; f <= 1; f++) {
        const fx = hx * Math.cos(f * 0.5) - hz * Math.sin(f * 0.5), fz = hz * Math.cos(f * 0.5) + hx * Math.sin(f * 0.5);
        const bx = tx * 0.96, by = th * 0.9, bz = tz * 0.96;
        pos.push(bx - fz * 0.07, by, bz + fx * 0.07, bx + fz * 0.07, by, bz - fx * 0.07, bx + fx * 0.42, by + 0.1 - Math.abs(f) * 0.1, bz + fz * 0.42);
        col.push(cp.r * 0.85, cp.g * 0.85, cp.b * 0.85, cp.r * 0.85, cp.g * 0.85, cp.b * 0.85, cp.r, cp.g, cp.b);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

// Pink muhly: a soft airy cloud, four crossed fans with a rounded top. The
// vertex colours are light and dark (the hue comes from each tuft's own
// instance colour), lighter at the top like the hazy flower heads.
function cloudGeo(r, h) {
  const pos = [], col = [], N = 7, F = 4;
  for (let k = 0; k < F; k++) {
    const a = (k / F) * Math.PI, cx = Math.cos(a), cz = Math.sin(a);
    for (let i = 0; i < N; i++) {
      const t0 = (i / N) * Math.PI, t1 = ((i + 1) / N) * Math.PI;
      const p = (t, j) => { const q = j % 2 ? 0.8 : 1.05; return [Math.cos(t) * r * cx * q, h * 0.3 + Math.sin(t) * h * 0.7 * q, Math.cos(t) * r * cz * q]; };
      const [ax, ay, az] = p(t0, i + k), [bx, by, bz] = p(t1, i + k + 1);
      pos.push(0, 0.05, 0, ax, ay, az, bx, by, bz);
      const sa = 0.85 + 0.15 * (ay / h), sb = 0.85 + 0.15 * (by / h);
      col.push(0.45, 0.5, 0.42, sa, sa, sa, sb, sb, sb);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  // (every normal up: lit like a soft haze, no umbrella ribs between the fans)
  g.setAttribute('normal', new THREE.Float32BufferAttribute(pos.map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
  return g;
}

function scatter(list, mesh, y, scale, colors = null) {
  const c = new THREE.Color();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach(([x, z], i) => {
    const k = scale(x, z);
    mesh.setMatrixAt(i, m4.compose(v.set(x, y(x, z) - 0.05, z), q.setFromAxisAngle(up, hash(x, z) * Math.PI * 2), s.set(k, k * (0.85 + 0.3 * hash(z, x)), k)));
    if (colors) mesh.setColorAt(i, c.set(colors[Math.floor(hash(x * 7.1, z * 3.3) * colors.length) % colors.length]));
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingBox();
  mesh.computeBoundingSphere();
}

export function buildNanjiPark({ scene, l, camp, y, lowSpec = false }) {
  const P = NANJI_PARK, C = fieldColors();
  const group = new THREE.Group();
  group.name = 'nanji-park';
  const W = ([x, z]) => [l.x + x, l.z + z];
  const top = l.top.map(W), muhly = l.muhly.map(W);
  const paths = (l.paths || []).map((p) => p.map(W));
  const trails = l.trails.map((t) => ({ ...t, p: t.p.map(([x, z, yy]) => [l.x + x, l.z + z, yy]) }));
  const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
  const nearLine = (x, z, p, m) => { for (let i = 1; i < p.length; i++) if (segD(x, z, p[i - 1], p[i]) < m) return true; return false; };
  const seats = [];

  { // The hill's ground.
    const [bx0, bz0, bx1, bz1] = skyparkBox(l);
    const pos = [], col = [], green = new THREE.Color('#8fbf6e'), dark = new THREE.Color('#6f9f55'), straw = new THREE.Color(C.top), under = new THREE.Color(C.under);
    const c = P.cell;
    for (let z = l.z + bz0; z < l.z + bz1; z += c) for (let x = l.x + bx0; x < l.x + bx1; x += c) {
      const q = [[x, z], [x + c, z], [x + c, z + c], [x, z + c]].map(([a, b]) => [a, y(a, b), b]);
      if (Math.max(q[0][1], q[1][1], q[2][1], q[3][1]) < P.sink) continue;
      for (const k of [0, 3, 2, 0, 2, 1]) {
        const [a, h, b] = q[k];
        pos.push(a, h - P.sink, b);
        const on = inPoly(a, b, muhly) ? under : inPoly(a, b, top) ? straw : hash(Math.round(a), Math.round(b)) > 0.5 ? green : dark;
        col.push(on.r, on.g, on.b);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true })));
    ground.name = 'ground-skypark';
    ground.receiveShadow = true;
    group.add(ground);
  }

  { // The paths on the top, and 하늘길 paved; the stairs as steps.
    const pos = [];
    const ribbon = (p, w, lift, yAt) => {
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.01) continue;
        const nx = (-(b[1] - a[1]) / len) * w / 2, nz = ((b[0] - a[0]) / len) * w / 2;
        const ya = yAt(a) + lift, yb = yAt(b) + lift;
        pos.push(a[0] + nx, ya, a[1] + nz, b[0] + nx, yb, b[1] + nz, b[0] - nx, yb, b[1] - nz, a[0] + nx, ya, a[1] + nz, b[0] - nx, yb, b[1] - nz, a[0] - nx, ya, a[1] - nz);
      }
    };
    for (const p of paths) ribbon(p, 1.4, 0.04, () => l.topH);
    for (const t of trails) if (!t.steps) {
      const fine = [];
      for (let i = 1; i < t.p.length; i++) { const a = t.p[i - 1], b = t.p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2)); for (let k = i === 1 ? 0 : 1; k <= n; k++) fine.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]); }
      ribbon(fine, t.w, 0.05, (q) => q[2]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const paving = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xd8c9a6, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));
    paving.name = 'skypark-paths';
    paving.receiveShadow = true;
    group.add(paving);
    // the steps: one block every 0.45 m of climb
    const steps = [];
    for (const t of trails) if (t.steps) {
      for (let i = 1; i < t.p.length; i++) {
        const a = t.p[i - 1], b = t.p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), rise = b[2] - a[2];
        const n = Math.max(1, Math.round(Math.abs(rise) / 0.18)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
        for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; steps.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + rise * f, ry, len / n, t.w]); }
      }
    }
    if (steps.length) {
      const block = new THREE.BoxGeometry(1, 0.4, 1).translate(0, -0.2, 0);
      const mesh = new THREE.InstancedMesh(block, new THREE.MeshLambertMaterial({ color: 0xb9a888 }), steps.length);
      const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3();
      steps.forEach(([x, z, yy, ry, d, w], i) => mesh.setMatrixAt(i, m4.compose(v.set(x, yy + 0.02, z), q.setFromAxisAngle(up, ry), s.set(w, 1, Math.max(d, 0.3) + 0.05))));
      mesh.computeBoundingSphere();
      mesh.name = 'skypark-steps';
      mesh.receiveShadow = true;
      group.add(mesh);
    }
  }

  // Fields: scatter on the top, off the paths, the ways up, the turbines and the bowl.
  const bowlAt = W(l.bowl), turbines = l.turbines.map(W);
  const clear = (x, z) => paths.some((p) => nearLine(x, z, p, 0.7 + P.pathClear)) || trails.some((t) => trailNear({ p: t.p }, x, z).d < t.w / 2 + P.pathClear) || turbines.some(([a, b]) => Math.hypot(x - a, z - b) < 1.6);
  const fill = (inside, room) => {
    const out = [], xs = top.map((q) => q[0]), zs = top.map((q) => q[1]);
    const step = Math.sqrt(room * (lowSpec ? 2 : 1));
    for (let z = Math.min(...zs); z < Math.max(...zs); z += step) for (let x = Math.min(...xs); x < Math.max(...xs); x += step) {
      const jx = x + (hash(x, z) - 0.5) * step * 0.9, jz = z + (hash(z, x) - 0.5) * step * 0.9;
      if (!inPoly(jx, jz, top) || !inside(jx, jz) || clear(jx, jz)) continue;
      out.push([jx, jz]);
    }
    return out;
  };
  const inMuhly = (x, z) => inPoly(x, z, muhly);
  const kochia = l.kochia.map(W);
  const nearKochia = (x, z) => kochia.some(([a, b]) => Math.hypot(x - a, z - b) < 1.3);
  const muhlySpots = fill(inMuhly, P.muhlyRoom);
  const grassSpots = fill((x, z) => !inMuhly(x, z) && !nearKochia(x, z) && Math.hypot(x - bowlAt[0], z - bowlAt[1]) > P.bowl.r * 0.5, P.grassRoom);
  const flat = () => l.topH;
  {
    const geo = cloudGeo(0.7, 0.9);
    const mesh = new THREE.InstancedMesh(geo, swaying(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.06), muhlySpots.length);
    scatter(muhlySpots, mesh, flat, (x, z) => 0.85 + 0.4 * hash(x * 3, z * 3), C.muhly);
    mesh.name = 'muhly';
    group.add(mesh);
  }
  {
    const geo = tuftGeo(7, 1.8, 0.4, C.stem[0], C.stem[1], C.plume);
    const mesh = new THREE.InstancedMesh(geo, swaying(new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }), 0.04), grassSpots.length);
    scatter(grassSpots, mesh, flat, (x, z) => 0.8 + 0.45 * hash(x * 5, z * 5), C.grass.map((g) => new THREE.Color(g).lerp(new THREE.Color('#ffffff'), 0.75)));
    mesh.name = 'silver-grass';
    group.add(mesh);
  }
  {
    const geo = new THREE.IcosahedronGeometry(0.42, 1).scale(1, 0.9, 1).translate(0, 0.34, 0);
    const mesh = new THREE.InstancedMesh(geo, new THREE.MeshLambertMaterial({ color: 0xffffff }), kochia.length);
    scatter(kochia, mesh, flat, (x, z) => 0.85 + 0.3 * hash(x, z), C.kochia);
    mesh.name = 'kochia';
    group.add(mesh);
  }

  const spin = [];
  { // Wind turbines.
    const T = P.turbine, mat = new THREE.MeshLambertMaterial({ color: 0xf4f4f0 });
    const tower = new THREE.CylinderGeometry(0.12, 0.22, T.h, 8).translate(0, T.h / 2, 0);
    const blade = new THREE.BoxGeometry(0.22, T.blade, 0.05).translate(0, T.blade / 2, 0);
    for (const [x, z] of turbines) {
      const g = new THREE.Group();
      g.position.set(x, l.topH, z);
      g.add(new THREE.Mesh(tower, mat));
      const hub = new THREE.Group();
      hub.position.set(0, T.h, 0.3);
      for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(blade, mat); b.rotation.z = (k * Math.PI * 2) / 3; hub.add(b); }
      hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat));
      g.add(hub);
      g.rotation.y = Math.atan2(l.x - x, l.z - z) + Math.PI; // (all facing the same wind, across the top)
      spin.push(hub);
      group.add(g);
    }
  }
  { // The bowl look-out, up on legs.
    const B = P.bowl, mat = new THREE.MeshLambertMaterial({ color: 0xc9cfd3, side: THREE.DoubleSide });
    const g = new THREE.Group();
    g.position.set(bowlAt[0], l.topH, bowlAt[1]);
    const pts = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; pts.push(new THREE.Vector2(B.r * (0.35 + 0.65 * Math.sin((t * Math.PI) / 2)), B.depth * t)); }
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), mat);
    bowl.position.y = B.legs;
    g.add(bowl);
    const leg = new THREE.CylinderGeometry(0.12, 0.12, B.legs, 6).translate(0, B.legs / 2, 0);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, m = new THREE.Mesh(leg, mat); m.position.set(Math.cos(a) * B.r * 0.4, 0, Math.sin(a) * B.r * 0.4); g.add(m); }
    group.add(g);
  }

  const flames = [];
  if (camp) { // The campground.
    const cw = ([x, z]) => [camp.x + x, camp.z + z];
    const TENT = ['#f2a541', '#5aa9e6', '#e85d75', '#7cc576', '#f7d046', '#9b7ede'];
    const tentGeo = new THREE.SphereGeometry(1.35, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.85, 1.2);
    const doorGeo = new THREE.PlaneGeometry(0.8, 0.8).translate(0, 0.42, 0);
    const chairSeat = new THREE.BoxGeometry(0.5, 0.06, 0.45).translate(0, 0.38, 0);
    const chairBack = new THREE.BoxGeometry(0.5, 0.5, 0.06).translate(0, 0.62, -0.22);
    const legGeo = new THREE.BoxGeometry(0.04, 0.38, 0.04).translate(0, 0.19, 0);
    const chairMat = new THREE.MeshLambertMaterial({ color: 0x3f5d4a }), legMat = new THREE.MeshLambertMaterial({ color: 0x2d2d2d });
    const chair = (x, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z);
      g.rotation.y = ry;
      g.add(new THREE.Mesh(chairSeat, chairMat), new THREE.Mesh(chairBack, chairMat));
      for (const [a, b] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) { const m = new THREE.Mesh(legGeo, legMat); m.position.set(a, 0, b); g.add(m); }
      group.add(g);
      // a seat: facing the way the chair faces (ry), stand up behind it
      seats.push({ x, z, ry, stand: [x - Math.sin(ry) * 0.8, z - Math.cos(ry) * 0.8], street: true, camp: true });
    };
    const tentMats = TENT.map((c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
    const doorMat = new THREE.MeshLambertMaterial({ color: 0x2b2b33, side: THREE.DoubleSide });
    for (const [px, pz, ry, k] of camp.pitches) {
      const [x, z] = cw([px, pz]);
      const tent = new THREE.Mesh(tentGeo, tentMats[(Math.round(px * 7 + pz * 3) % TENT.length + TENT.length) % TENT.length]);
      tent.position.set(x, 0, z);
      tent.rotation.y = ry;
      tent.castShadow = true;
      group.add(tent);
      const door = new THREE.Mesh(doorGeo, doorMat);
      door.position.set(x + Math.sin(ry) * 1.6, 0, z + Math.cos(ry) * 1.6);
      door.rotation.y = ry;
      group.add(door);
      if (k !== 2) { // two chairs in front of most tents, facing each other a little
        const fx = x + Math.sin(ry) * 2.6, fz = z + Math.cos(ry) * 2.6, sx = Math.cos(ry) * 0.6, sz = -Math.sin(ry) * 0.6;
        chair(fx + sx, fz + sz, ry + Math.PI - 0.5);
        chair(fx - sx, fz - sz, ry + Math.PI + 0.5);
      }
    }
    // Fire pits (불멍): a stone ring, logs, flames, and camp chairs round it.
    const stone = new THREE.TorusGeometry(0.62, 0.16, 5, 10).rotateX(Math.PI / 2).translate(0, 0.12, 0);
    const log = new THREE.CylinderGeometry(0.07, 0.07, 0.8, 6).rotateZ(Math.PI / 2).translate(0, 0.12, 0);
    const flame = new THREE.ConeGeometry(0.26, 0.85, 7).translate(0, 0.5, 0);
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0x8a8580, flatShading: true }), logMat = new THREE.MeshLambertMaterial({ color: 0x6b4428 });
    const flameMats = [0xff7a1a, 0xffb52e, 0xff4d1a].map((c) => new THREE.MeshBasicMaterial({ color: c }));
    for (const f of camp.fires) {
      const [x, z] = cw(f);
      const ring = new THREE.Mesh(stone, stoneMat);
      ring.position.set(x, 0, z);
      group.add(ring);
      for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(log, logMat); m.position.set(x, 0.02 * k, z); m.rotation.y = (k * Math.PI) / 3; group.add(m); }
      for (let k = 0; k < 3; k++) {
        const m = new THREE.Mesh(flame, flameMats[k]);
        m.position.set(x + Math.cos(k * 2.1) * 0.12, 0.08, z + Math.sin(k * 2.1) * 0.12);
        m.scale.setScalar(1 - k * 0.22);
        group.add(m);
        flames.push({ m, k, base: 1 - k * 0.22 });
      }
      for (let k = 0; k < P.chairs; k++) {
        const a = (k / P.chairs) * Math.PI * 2 + 0.3, cx = x + Math.cos(a) * P.chairR, cz = z + Math.sin(a) * P.chairR;
        chair(cx, cz, Math.atan2(x - cx, z - cz)); // facing the fire
      }
    }
  }

  scene.add(group);
  let t = 0;
  return {
    group,
    seats,
    counts: { muhly: muhlySpots.length, grass: grassSpots.length, kochia: kochia.length },
    update(p, dt) {
      const far = Math.hypot(p.x - l.x, p.z - l.z) > P.hide + 200 && (!camp || Math.hypot(p.x - camp.x, p.z - camp.z) > P.hide);
      group.visible = !far;
      if (far) return;
      t += dt;
      wind.value = t;
      const turn = (P.turbine.rpm / 60) * Math.PI * 2 * dt;
      for (const h of spin) h.rotation.z += turn;
      for (const f of flames) { const s = f.base * (0.85 + 0.25 * Math.abs(Math.sin(t * (7 + f.k * 3) + f.k))); f.m.scale.set(f.base, s, f.base); }
    },
  };
}
