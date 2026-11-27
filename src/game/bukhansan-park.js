// Bukhansan (북한산), the Baegundae course: what you see, loaded by
// game/bukhansan-walk.js when you come near. The numbers are the Bukhansan
// map's `bukhansan` landmark (scripts/build-bukhansan.mjs).
//
//   The ground: the mountain at its height (core/bukhan-ground.js), 8 m
//     cells, 2 m ones along the way; bare granite where OSM has bare rock
//     (Baegundae, Insubong, Mangyeongdae), the wood's floor elsewhere.
//   The way: the valley road paved, the paths trodden earth, the last
//     stretch stone steps with a steel handrail both sides (really steel
//     cables on bare rock).
//   The woods: trees by the way (real height / 4, mixed: memory rule 13),
//     and the far slopes as crowns without trunks, about as high; none on
//     the rock.
//   The stops: the Visitor Support Center and Baegun Hut as plain game-size
//     buildings on their OSM spots, benches at Harujae and the hut, a brown
//     guide post at each stop, Baegunbongammun (위문) as a stone gate with
//     two short pieces of the fortress wall, and at the top the flag on its
//     pole inside a steel fence.
//   The streams by the road.
//
// About 90k triangles with everything in view (lowSpec: about half the
// trees), about 25 draw calls.
import * as THREE from 'three';
import { addSnowCover } from '../core/snow-cover.js';
import { MIX, leafColor, leafHash } from '../core/season.js';
import { inPoly, trailNear } from '../core/skypark-ground.js';
import { bukhanBox, WAY_PAST } from '../core/bukhan-ground.js';
import { thicketGeometry, thicketSpots } from './thicket.js';
import { heightGrid } from '../core/height-grid.js';

export const BUKHAN_PARK = {
  fine: 2, // m: the ground's cells along the way
  fineNear: 8, // m from the way's middle: cells this near are cut fine (14 m cost 6k triangles more for nothing you could see)
  sink: 0.1, // the ground is drawn this much lower (you walk on the true height)
  hide: 900, // m from the mountain's box: past this it is not drawn
  summitNear: 140, // m from the top: the top's own drawing loads, and shows as you climb above the gate
  sun: [330, 560], // m across: the sun's glow at sunrise and sunset, on the way up and at the top (its disc is a tenth of that)
  sunFar: 1000, // m from you (past the top's ring of far country)
  glow: [0.07, 0.16], // how much the mountain warms in the low sun, on the way up and at the top
  lift: 0.25, // how far the haze pulls back at the top (core/weather.js lift): to about 590 m, past the peaks next door
  trees: 1500, // by the way (lowSpec: half)
  treeNear: 13, // m from the way: single trees (it was 34; past this the wood is thickets, one shape each: game/thicket.js)
  thicket: { every: 10, from: 11, to: 26, clear: 9 }, // thickets beside the way: one every 10 m a side, 11-26 m off it, none within 9 m of the way or a stop
  treeClear: 2.4, // m from the way's edge
  mass: 13, // m between the far slopes' clumps of crowns (lowSpec: 18)
  woodFrom: 18, // m from the way: past this the wood is one mass (the ground in the canopy's colours, with clumps on it), not trees
  post: 2.2, // m between the handrail's posts
  railH: 1.05,
};

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };

function along(p, step, f, start = step / 2) {
  let carry = start;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1], b = p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.01) continue;
    const ux = (b[0] - a[0]) / len, uz = (b[1] - a[1]) / len;
    for (let s = carry; s < len; s += step) { const t = s / len; f(a[0] + ux * s, a[1] + uz * s, a[2] + (b[2] - a[2]) * t, ux, uz); }
    carry = (carry - len) % step; if (carry < 0) carry += step;
  }
}

function instanced(geo, mat, list, name, set) {
  const mesh = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), v = new THREE.Vector3(), s = new THREE.Vector3();
  list.forEach((it, i) => { const [x, y, z, ry = 0, sx = 1, sy = 1, sz = 1] = it; mesh.setMatrixAt(i, m4.compose(v.set(x, y, z), q.setFromAxisAngle(up, ry), s.set(sx, sy, sz))); if (set) set(mesh, i, it); });
  mesh.count = list.length;
  mesh.instanceMatrix.needsUpdate = true;
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = name;
  return mesh;
}

// The rock's bit for a grid cell (l.rock: hex, four cells a letter).
export function rockAt(l, i, j) {
  const g = l.grid;
  if (i < 0 || j < 0 || i >= g.w || j >= g.h) return false;
  const k = j * g.w + i;
  return !!((parseInt(l.rock[k >> 2] || '0', 16) >> (3 - (k & 3))) & 1);
}

const WOOD = ['#4f8045', '#5d8f4a', '#46733f', '#6a9550', '#3c6b3e'].map((c) => new THREE.Color(c)); // the wood's canopy (the last: its pines, green all year)

// A clump of the wood seen from far: green, or the season's colour, b (0-1) a little lighter or darker.
export function woodColor(n, b = 0.5) {
  const h = hash(n, 3), base = WOOD[Math.floor(h * 29) % 4];
  // (most clumps stay green, some take the season's colour whole: mixing the two makes mud)
  const c = h > 0.84 ? WOOD[4].clone() : hash(n, 11) < 0.62 ? base.clone() : leafColor(base, leafHash(n, 5), MIX.wood).clone();
  return c.multiplyScalar(0.93 + b * 0.14);
}

// How far up (0-1) you are at height y, the gate at gateY: 0 until 4 m above the gate, 1 from 20 m above it.
export const summitOpen = (y, gateY) => { const k = Math.max(0, Math.min(1, (y - gateY - 4) / 16)); return k * k * (3 - 2 * k); };

// The Taegeukgi (the flag at the top), drawn.
function flagTexture() {
  const c = document.createElement('canvas');
  c.width = 192; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 192, 128);
  g.save();
  g.translate(96, 64); g.rotate(Math.atan2(2, 3));
  g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(0, 0, 32, Math.PI, 0); g.fill();
  g.fillStyle = '#0047a0'; g.beginPath(); g.arc(0, 0, 32, 0, Math.PI); g.fill();
  g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(-16, 0, 16, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0047a0'; g.beginPath(); g.arc(16, 0, 16, 0, Math.PI * 2); g.fill();
  g.restore();
  // the four trigrams: bars, broken (0) or whole (1), from the outside in
  const tri = [[-1, -1, [1, 1, 1]], [1, -1, [0, 1, 0]], [-1, 1, [1, 0, 1]], [1, 1, [0, 0, 0]]];
  g.fillStyle = '#111';
  for (const [sx, sy, bars] of tri) {
    g.save();
    g.translate(96 + sx * 58, 64 + sy * 38); g.rotate(Math.atan2(sy * 2, sx * 3) + Math.PI / 2);
    bars.forEach((whole, k) => { const yy = -10 + k * 8; if (whole) g.fillRect(-13, yy, 26, 5); else { g.fillRect(-13, yy, 11, 5); g.fillRect(2, yy, 11, 5); } });
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// The carving on the rock at the top, as it really is: 北漢山 over 白雲臺, the height under it, cut dark into the granite.
function carvedTexture(height) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  g.fillStyle = '#bdb6a9'; g.fillRect(0, 0, 512, 288);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(${i % 2 ? 255 : 90},${i % 2 ? 250 : 84},${i % 2 ? 240 : 76},0.07)`; g.fillRect(hash(i, 1) * 512, hash(i, 2) * 288, 14 + hash(i, 3) * 60, 3 + hash(i, 4) * 10); } // (the granite's grain)
  g.fillStyle = '#2f2b27'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const serif = '"Noto Serif KR", "Noto Serif CJK KR", "Nanum Myeongjo", "Songti SC", "SimSun", "MS Mincho", serif';
  g.font = `600 44px ${serif}`;
  ['北', '漢', '山'].forEach((ch, i) => g.fillText(ch, 196 + i * 62, 52));
  g.font = `700 112px ${serif}`;
  ['白', '雲', '臺'].forEach((ch, i) => g.fillText(ch, 106 + i * 150, 152));
  g.font = '600 46px Georgia, serif';
  g.fillText(height, 372, 246);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// A brown guide post's board: the place's name in Korean and English.
function boardTexture(ko, en, sub) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5b4030'; g.fillRect(0, 0, 256, 128);
  g.strokeStyle = '#e9dcc0'; g.lineWidth = 4; g.strokeRect(6, 6, 244, 116);
  g.fillStyle = '#f4ead2'; g.textAlign = 'center';
  g.font = 'bold 40px sans-serif'; g.fillText(ko, 128, 54, 230);
  g.font = '22px sans-serif'; g.fillText(en, 128, 84, 230);
  if (sub) { g.font = '18px sans-serif'; g.fillText(sub, 128, 110, 230); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export const STOP_NAMES = {
  center: ['백운대탐방지원센터', 'Baegundae Visitor Support Center'],
  haru: ['하루재', 'Harujae'],
  hut: ['백운산장', 'Baegun Hut'],
  gate: ['백운봉암문 (위문)', 'Baegunbongammun Gate'],
  peak: ['백운대', 'Baegundae'],
};

export function buildBukhansanPark({ scene, l, y, lowSpec = false, daylight = () => 1, sfx = () => null, weather = () => null }) {
  const P = BUKHAN_PARK;
  const woods = []; // the far slopes' tiles (those under the clouds are not drawn from the top)
  const group = new THREE.Group();
  group.name = 'bukhansan-park';
  const counts = {};
  const W = ([x, z]) => [l.x + x, l.z + z];
  const foot = l.foot.map(W);
  const trails = l.trails.map((t) => ({ ...t, p: t.p.map(([x, z, yy]) => [l.x + x, l.z + z, yy]) }));
  const pads = l.pads.map((p) => ({ ...p, at: W(p.at) }));
  const pad = (k) => pads.find((p) => p.k === k);
  const trailD = (x, z) => { let d = Infinity; for (const t of trails) d = Math.min(d, trailNear(t, x, z).d - t.w / 2); return d; };
  const padD = (x, z) => Math.min(...pads.map((p) => Math.hypot(x - p.at[0], z - p.at[1]) - p.r));
  const g = l.grid, gx0 = l.x + g.x0, gz0 = l.z + g.z0;
  const rockXZ = (x, z) => rockAt(l, Math.round((x - gx0) / g.cell), Math.round((z - gz0) / g.cell));
  const seats = [];

  { // The ground: the grid's own 8 m cells, cut to 2 m ones along the way
    // (where the true height eases into the way and its stops).
    const [bx0, bz0, bx1, bz1] = bukhanBox(l);
    const pos = [], col = [];
    const greens = ['#6f8f4f', '#7a9a55', '#647f47', '#82995c'].map((h) => new THREE.Color(h));
    const greys = ['#b9b2a6', '#c4bdb0', '#aea79b', '#cbc5ba'].map((h) => new THREE.Color(h));
    const c = g.cell, f = P.fine, n = c / f;
    // (greens only: an 8 m triangle in an autumn colour reads as a flag, not a tree; the season shows on the clumps that stand on it)
    const canopy = (i, j, k) => WOOD[Math.floor(hash(i * 3 + k, j * 5 + 1) * 4)].clone().multiplyScalar(0.94 + hash(i * 2 + k, j * 2 + 7) * 0.12);
    const hg = heightGrid(l.x + bx0, l.z + bz0, l.x + bx1, l.z + bz1, f, y); // (fine corners, asked only where used)
    const quad = (i0, j0, i1, j1, shade, shade2 = shade) => {
      const q = [[hg.xs[i0], hg.y(i0, j0), hg.zs[j0]], [hg.xs[i1], hg.y(i1, j0), hg.zs[j0]], [hg.xs[i1], hg.y(i1, j1), hg.zs[j1]], [hg.xs[i0], hg.y(i0, j1), hg.zs[j1]]];
      if (Math.max(q[0][1], q[1][1], q[2][1], q[3][1]) < P.sink) return;
      [0, 3, 2, 0, 2, 1].forEach((k, t) => { const [a, h, b] = q[k], s = t < 3 ? shade : shade2; pos.push(a, h - P.sink, b); col.push(s.r, s.g, s.b); });
    };
    for (let j = 0; j < g.h - 1; j++) for (let i = 0; i < g.w - 1; i++) {
      const cx = gx0 + (i + 0.5) * c, cz = gz0 + (j + 0.5) * c;
      const rock = rockAt(l, i, j) || rockAt(l, i + 1, j) || rockAt(l, i, j + 1) || rockAt(l, i + 1, j + 1);
      const pick = (a, b) => (rock ? greys : greens)[Math.floor(hash(a, b) * 4) % 4];
      if (Math.min(trailD(cx, cz), padD(cx, cz)) < P.fineNear) {
        for (let b = 0; b < n; b++) for (let a = 0; a < n; a++) quad(i * n + a, j * n + b, i * n + a + 1, j * n + b + 1, pick(i * n + a, j * n + b));
      } else if (!rock && Math.min(trailD(cx, cz), padD(cx, cz)) > P.woodFrom) {
        // Away from the way the wood is one mass, not trees (Yozi 2026-11-27: from up a mountain you see it in clumps): the ground itself in the canopy's colours, a patch a triangle.
        quad(i * n, j * n, (i + 1) * n, (j + 1) * n, canopy(i, j, 0), canopy(i, j, 1));
      } else quad(i * n, j * n, (i + 1) * n, (j + 1) * n, pick(i, j));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true })));
    ground.name = 'ground-bukhansan';
    ground.receiveShadow = true;
    group.add(ground);
    counts.groundTris = pos.length / 9;
  }

  { // The way: the road, the paths, the steps; the stops' floors.
    const road = [], path = [], stone = [];
    const ribbon = (out, p, w, lift) => {
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.01) continue;
        const e = Math.min(w / 2, WAY_PAST) / len, ax = a[0] - (b[0] - a[0]) * e, az = a[1] - (b[1] - a[1]) * e, bx = b[0] + (b[0] - a[0]) * e, bz = b[1] + (b[1] - a[1]) * e; // (a little past both ends, so the bends close)
        const nx = (-(b[1] - a[1]) / len) * w / 2, nz = ((b[0] - a[0]) / len) * w / 2, rise = (b[2] - a[2]) * e, ya = a[2] - rise + lift, yb = b[2] + rise + lift; // (the same slope past the ends: the stretches meet with no ledge)
        out.push(ax + nx, ya, az + nz, bx + nx, yb, bz + nz, bx - nx, yb, bz - nz, ax + nx, ya, az + nz, bx - nx, yb, bz - nz, ax - nx, ya, az - nz);
      }
    };
    for (const t of trails) if (!t.steps) ribbon(t.k === 'road' ? road : path, t.p, t.w, 0.06);
    for (const p of pads) { // a round floor
      const out = p.k === 'center' ? road : p.k === 'peak' || p.k === 'gate' ? stone : path, n = 20;
      for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2, b = ((k + 1) / n) * Math.PI * 2; out.push(p.at[0], p.y + 0.07, p.at[1], p.at[0] + Math.cos(b) * p.r, p.y + 0.07, p.at[1] + Math.sin(b) * p.r, p.at[0] + Math.cos(a) * p.r, p.y + 0.07, p.at[1] + Math.sin(a) * p.r); }
    }
    const mesh = (pos, color, name) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }), 0.8));
      m.name = name;
      m.receiveShadow = true;
      group.add(m);
    };
    mesh(road, 0x8f9094, 'bukhansan-road');
    mesh(path, 0xb89c78, 'bukhansan-paths');
    mesh(stone, 0xc9c2b4, 'bukhansan-rock-floors');
    const steps = [], posts = [], rails = [];
    for (const t of trails) if (t.steps) {
      for (let i = 1; i < t.p.length; i++) {
        const a = t.p[i - 1], b = t.p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), rise = b[2] - a[2];
        if (len < 0.01) continue;
        const n = Math.max(1, Math.round(Math.abs(rise) / 0.2)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
        for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; steps.push([a[0] + (b[0] - a[0]) * f, a[2] + rise * f + 0.02, a[1] + (b[1] - a[1]) * f, ry, t.w, 1, Math.max(len / n, 0.3) + 0.06]); }
      }
      for (const side of [1, -1]) {
        let last = null;
        along(t.p, P.post, (x, z, yy, ux, uz) => {
          const px = x - uz * side * (t.w / 2 + 0.05), pz = z + ux * side * (t.w / 2 + 0.05);
          if (padD(px, pz) < 0.4) { last = null; return; } // (open at the gate and at the top)
          posts.push([px, yy, pz]);
          if (last) { const len = Math.hypot(px - last[0], pz - last[2]); rails.push([(px + last[0]) / 2, (yy + last[1]) / 2 + P.railH, (pz + last[2]) / 2, Math.atan2(px - last[0], pz - last[2]), Math.hypot(len, yy - last[1]), Math.atan2(yy - last[1], len)]); }
          last = [px, yy, pz];
        }, 0.4);
      }
    }
    const block = new THREE.BoxGeometry(1, 0.45, 1).translate(0, -0.225, 0);
    const st = instanced(block, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xc2bbad }), 0.8), steps, 'bukhansan-steps');
    st.receiveShadow = true;
    group.add(st);
    // The top's fence: steel posts and one cable round the edge of the rock you can walk on (summit.rock; the level top if there is none), open where the steps come up.
    const top = pad('peak'), tEnd = trails.find((t) => t.steps)?.p.at(-2);
    const gap = tEnd ? Math.atan2(tEnd[1] - top.at[1], tEnd[0] - top.at[0]) : 0;
    const edge = l.summit.rock ? l.summit.rock.map(W) : Array.from({ length: 23 }, (_, k) => { const a = (k / 23) * Math.PI * 2; return [top.at[0] + Math.cos(a) * top.r, top.at[1] + Math.sin(a) * top.r]; });
    let lastTop = null;
    for (let k = 0; k <= edge.length; k++) {
      const [ex, ez] = edge[k % edge.length], a = Math.atan2(ez - top.at[1], ex - top.at[0]), r = Math.hypot(ex - top.at[0], ez - top.at[1]) - 0.2;
      if (Math.abs(((a - gap + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.42) { lastTop = null; continue; } // (the way in)
      const px = top.at[0] + Math.cos(a) * r, pz = top.at[1] + Math.sin(a) * r, py = y(px, pz);
      posts.push([px, py, pz]);
      if (lastTop) { const len = Math.hypot(px - lastTop[0], pz - lastTop[2]); rails.push([(px + lastTop[0]) / 2, (py + lastTop[1]) / 2 + P.railH - 0.12, (pz + lastTop[2]) / 2, Math.atan2(px - lastTop[0], pz - lastTop[2]), Math.hypot(len, py - lastTop[1]), Math.atan2(py - lastTop[1], len), 1]); }
      lastTop = [px, py, pz];
    }
    const steel = new THREE.MeshLambertMaterial({ color: 0x8b8f96 });
    group.add(instanced(new THREE.CylinderGeometry(0.035, 0.035, P.railH, 5).translate(0, P.railH / 2, 0), steel, posts, 'bukhansan-posts'));
    const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 1), steel, Math.max(1, rails.length * 2));
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    rails.forEach(([x, yy, z, ry, len, pitch, one], i) => {
      e.set(-pitch, ry, 0, 'YXZ'); q.setFromEuler(e);
      railMesh.setMatrixAt(i * 2, m4.compose(v.set(x, yy, z), q, s.set(1, 1, len)));
      railMesh.setMatrixAt(i * 2 + 1, m4.compose(v.set(x, yy - (one ? 0 : 0.45), z), q, s.set(1, 1, len))); // (two lines, like the cables; round the top one cable, as it really is)
    });
    railMesh.count = rails.length * 2;
    railMesh.computeBoundingSphere();
    railMesh.name = 'bukhansan-rails';
    group.add(railMesh);
    counts.steps = steps.length; counts.posts = posts.length;
  }

  if (l.streams?.length) { // The streams: a ribbon of water on the valley's floor.
    const pos = [];
    for (const s of l.streams) {
      const p = s.p.map(W);
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.01) continue;
        const n = Math.max(1, Math.ceil(len / 3)), nx = (-(b[1] - a[1]) / len) * 0.9, nz = ((b[0] - a[0]) / len) * 0.9;
        for (let k = 0; k < n; k++) {
          const at = (t, sd) => { const x = a[0] + (b[0] - a[0]) * t + nx * sd, z = a[1] + (b[1] - a[1]) * t + nz * sd; return [x, y(x, z) + 0.05, z]; };
          const q0 = at(k / n, 1), q1 = at(k / n, -1), q2 = at((k + 1) / n, -1), q3 = at((k + 1) / n, 1);
          if (trailD(q0[0], q0[2]) < 0.3 || trailD(q2[0], q2[2]) < 0.3) continue; // (under the road: not drawn over it)
          pos.push(...q0, ...q3, ...q1, ...q1, ...q3, ...q2);
        }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: 0x7fb7cf, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
    m.name = 'bukhansan-streams';
    group.add(m);
  }

  { // The woods. By the way: single trees, real height / 4 (1.6-4 m), mixed.
    // The far slopes: low masses of crowns. None on the bare rock.
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const round = [], pines = [];
    const want = lowSpec ? Math.round(P.trees / 2) : P.trees;
    const lines = trails.map((t) => t.p);
    const total = lines.reduce((s, p) => s + p.slice(1).reduce((q, b, i) => q + Math.hypot(b[0] - p[i][0], b[1] - p[i][1]), 0), 0);
    for (const p of lines) {
      along(p, total / want, (x, z, yy, ux, uz) => {
        const side = rnd() < 0.5 ? 1 : -1, off = P.treeClear + 1 + rnd() * rnd() * (P.treeNear - P.treeClear);
        const tx = x - uz * side * off + (rnd() - 0.5) * 3, tz = z + ux * side * off + (rnd() - 0.5) * 3;
        if (!inPoly(tx, tz, foot) || rockXZ(tx, tz) || trailD(tx, tz) < P.treeClear || padD(tx, tz) < 2.5) return;
        const gy = y(tx, tz);
        if (gy < 0.3) return;
        const sc = 0.5 + rnd() * 0.75; // (crown top 1.6-4 m: real 6-16 m / 4)
        (rnd() < 0.3 ? pines : round).push([tx, gy - 0.1, tz, rnd() * 6, sc, sc, sc]);
      });
    }
    const trunk = new THREE.CylinderGeometry(0.1, 0.15, 1.6, 5, 1, true).translate(0, 0.8, 0);
    const crown = new THREE.IcosahedronGeometry(1.1, 0).translate(0, 2.1, 0);
    const cone = new THREE.ConeGeometry(0.95, 2.4, 6).translate(0, 2.0, 0);
    group.add(instanced(trunk, new THREE.MeshLambertMaterial({ color: 0x6b5440 }), round.concat(pines), 'bukhansan-trunks'));
    const greens = ['#5f9a4a', '#6fae55', '#4f8a43', '#7bb463'].map((c) => new THREE.Color(c));
    group.add(instanced(crown, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })), round, 'bukhansan-crowns', (m, i) => m.setColorAt(i, leafColor(greens[i % greens.length], leafHash(i, 13), MIX.wood))));
    group.add(instanced(cone, addSnowCover(new THREE.MeshLambertMaterial({ color: 0x3f6f3a, flatShading: true })), pines, 'bukhansan-pines'));
    counts.trees = round.length + pines.length;
    // the far slopes, in tiles (so the ones out of view are skipped)
    const step = lowSpec ? 18 : P.mass, TILE = 160, tiles = new Map();
    const xs = foot.map((q) => q[0]), zs = foot.map((q) => q[1]);
    for (let z = Math.min(...zs); z < Math.max(...zs); z += step) for (let x = Math.min(...xs); x < Math.max(...xs); x += step) {
      const tx = x + hash(x, z) * step * 0.8, tz = z + hash(z, x) * step * 0.8;
      if (!inPoly(tx, tz, foot) || rockXZ(tx, tz) || trailD(tx, tz) < P.woodFrom - 4 || padD(tx, tz) < P.woodFrom - 4) continue;
      const gy = y(tx, tz);
      if (gy < 0.6) continue;
      const r = 3.2 + hash(tx, tz) * 2.6, h = 1.6 + hash(tz, tx) * 1.2; // (a clump of crowns: 6-12 m across, 2-3 m up)
      const key = Math.floor(tx / TILE) + ',' + Math.floor(tz / TILE);
      if (!tiles.has(key)) tiles.set(key, []);
      tiles.get(key).push([tx, gy + h * 0.3, tz, hash(tx, tz) * 6, r, h, r * (0.7 + hash(tx + 1, tz) * 0.5)]);
    }
    const blob = new THREE.OctahedronGeometry(1, 0).rotateY(0.6); // (8 triangles a clump: flattened and seen from far, as good as 20)
    const massMat = addSnowCover(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }));
    let n = 0;
    for (const [key, list] of tiles) { group.add(instanced(blob, massMat, list, `bukhansan-wood-${key}`, (m, i) => m.setColorAt(i, woodColor((i + n) * 7 + 1, hash(i, n))))); const tile = group.children.at(-1); tile.userData.topY = Math.max(...list.map((q) => q[1])); woods.push(tile); n += list.length; }
    counts.mass = n; counts.massTiles = tiles.size;
    // between the two: thickets, a big mass of leaves as one shape (Yozi 2026-11-27), in tiles too
    const T = P.thicket, bushTiles = new Map();
    const spots = thicketSpots(lines, { every: lowSpec ? T.every * 1.6 : T.every, from: T.from, to: T.to, r: [3, 4.8], h: [2.4, 3.8], ok: (x, z) => inPoly(x, z, foot) && !rockXZ(x, z) && trailD(x, z) > T.clear && padD(x, z) > T.clear && y(x, z) > 0.6 });
    for (const [x, z, r, h, turn] of spots) {
      const key = Math.floor(x / TILE) + ',' + Math.floor(z / TILE);
      if (!bushTiles.has(key)) bushTiles.set(key, []);
      bushTiles.get(key).push([x, y(x, z) - 0.3, z, turn, r, h, r]);
    }
    const bush = thicketGeometry();
    let nb = 0;
    for (const [key, list] of bushTiles) { group.add(instanced(bush, massMat, list, `bukhansan-thicket-${key}`, (m, i) => m.setColorAt(i, woodColor((i + nb) * 5 + 3, hash(i + 40, nb))))); const tile = group.children.at(-1); tile.userData.topY = Math.max(...list.map((q) => q[1] + q[5])); woods.push(tile); nb += list.length; }
    counts.thickets = nb;
  }

  // --- The stops -------------------------------------------------------------
  // The two houses stand beside their pads, on the side OSM has them (or, if
  // the way runs there, on the side farthest from it), their doors to the pad.
  const HOUSE = { center: [l.office, 6.5, 4.5], hut: [l.hut, 7.5, 5] };
  const houseAt = {};
  for (const [k, [b, , d]] of Object.entries(HOUSE)) {
    if (!b) continue;
    const p = pad(k), [bx, bz] = W(b.at), spot = (f) => [p.at[0] + Math.cos(f) * (p.r + d / 2 + 0.4), p.at[1] + Math.sin(f) * (p.r + d / 2 + 0.4)];
    let f = Math.atan2(bz - p.at[1], bx - p.at[0]);
    if (trailD(...spot(f)) < d / 2 + 1.5) { let bd = -1; for (let a = 0; a < 24; a++) { const q = (a / 24) * Math.PI * 2, dd = trailD(...spot(q)); if (dd > bd) { bd = dd; f = q; } } }
    houseAt[k] = spot(f);
  }
  const post = (k, dx, dz, sub) => { // a brown guide post with the place's name
    const p = pad(k), [ko, en] = STOP_NAMES[k], x = p.at[0] + dx, z = p.at[1] + dz;
    const grp = new THREE.Group();
    grp.position.set(x, p.y, z);
    grp.rotation.y = Math.atan2(p.at[0] - x, p.at[1] - z); // (facing the pad's middle)
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.1, 0.12).translate(0, 1.05, 0), new THREE.MeshLambertMaterial({ color: 0x5b4030 }));
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.75, 0.06).translate(0, 1.75, 0.08), [0, 1, 2, 3].map(() => new THREE.MeshLambertMaterial({ color: 0x5b4030 })).concat([new THREE.MeshLambertMaterial({ map: boardTexture(ko, en, sub) }), new THREE.MeshLambertMaterial({ color: 0x5b4030 })]));
    grp.add(pole, board);
    grp.name = `bukhansan-post-${k}`;
    group.add(grp);
  };
  const out = (k, f) => { const p = pad(k); return [Math.cos(f) * (p.r - 0.7), Math.sin(f) * (p.r - 0.7)]; };
  const awayFromWay = (k) => { // an angle on the pad's edge away from the ways that meet there
    const p = pad(k);
    let best = 0, bd = -1;
    for (let a = 0; a < 16; a++) { const f = (a / 16) * Math.PI * 2, x = p.at[0] + Math.cos(f) * (p.r - 0.7), z = p.at[1] + Math.sin(f) * (p.r - 0.7), h = houseAt[k], d = Math.min(trailD(x, z), h ? Math.hypot(x - h[0], z - h[1]) - 4.5 : Infinity); if (d > bd) { bd = d; best = f; } }
    return best;
  };
  const ele = (m) => `${Math.round(m)} m`;
  const BASE_ELE = l.summit.ele - l.summit.y * 4; // (the station's height above the sea)
  for (const k of ['center', 'haru', 'hut', 'gate']) { const f = awayFromWay(k), [dx, dz] = out(k, f); post(k, dx, dz, ele(BASE_ELE + pad(k).y * 4)); }

  { // Benches at Harujae and the hut's yard (you can sit: main.js streetSeats).
    const list = [];
    for (const k of ['haru', 'hut', 'center']) {
      const p = pad(k), f0 = awayFromWay(k);
      for (const df of [0.75, -0.75]) {
        const f = f0 + df, x = p.at[0] + Math.cos(f) * (p.r - 0.9), z = p.at[1] + Math.sin(f) * (p.r - 0.9);
        if (trailD(x, z) < 0.6) continue;
        const ry = Math.atan2(p.at[0] - x, p.at[1] - z);
        list.push([x, p.y, z, ry]);
        seats.push({ x, z, ry, stand: [x + Math.sin(ry) * 0.8, z + Math.cos(ry) * 0.8], street: true });
      }
    }
    const wood = new THREE.MeshLambertMaterial({ color: 0x9a6b42 });
    group.add(instanced(new THREE.BoxGeometry(1.6, 0.08, 0.45).translate(0, 0.45, 0), wood, list, 'bukhansan-bench-seats'));
    group.add(instanced(new THREE.BoxGeometry(1.5, 0.45, 0.3).translate(0, 0.2, 0), new THREE.MeshLambertMaterial({ color: 0x77736c }), list, 'bukhansan-bench-legs'));
    counts.benches = list.length;
  }

  const house = (b, w, d, h, wall, roofColor, name, key) => { // a plain gabled house on its OSM spot, beside its pad
    const [x, z] = houseAt[key], p = pad(key), grp = new THREE.Group(), gy = Math.max(y(x, z), b.y);
    grp.position.set(x, gy, z);
    grp.rotation.y = Math.atan2(p.at[0] - x, p.at[1] - z); // (its door to the pad)
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h + 4, d).translate(0, h / 2 - 2, 0), new THREE.MeshLambertMaterial({ color: wall }));
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, d * 0.72, 1.3, 4, 1).rotateY(Math.PI / 4).scale(w / d * 1.02, 1, 1).translate(0, h + 0.65, 0), addSnowCover(new THREE.MeshLambertMaterial({ color: roofColor, flatShading: true })));
    body.castShadow = roof.castShadow = true;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1, 1.9, 0.06).translate(-w * 0.22, 0.95, d / 2 + 0.02), new THREE.MeshLambertMaterial({ color: 0x5b4636 }));
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.2).translate(w * 0.16, 1.75, d / 2 + 0.03), new THREE.MeshLambertMaterial({ map: boardTexture(...STOP_NAMES[key]) }));
    grp.add(body, roof, door, sign);
    grp.name = name;
    group.add(grp);
  };
  // (plain and game-size until there are photos: meta.approx)
  if (l.office) house(l.office, HOUSE.center[1], HOUSE.center[2], 2.9, 0xd8cfbd, 0x5b6b5a, 'bukhansan-office', 'center');
  if (l.hut) house(l.hut, HOUSE.hut[1], HOUSE.hut[2], 2.8, 0x9b958a, 0x6a4a3a, 'bukhansan-hut', 'hut');

  { // Baegunbongammun (위문): a stone gate over the way, with two short
    // pieces of the fortress wall (the real wall runs on along the ridge).
    const p = pad('gate'), t = trails.find((q) => q.steps), a = t.p[0], b = t.p[1];
    const ry = Math.atan2(b[0] - a[0], b[1] - a[1]), ux = Math.sin(ry), uz = Math.cos(ry);
    const grp = new THREE.Group();
    grp.position.set(p.at[0] + ux * (p.r - 0.6), p.y, p.at[1] + uz * (p.r - 0.6));
    grp.rotation.y = ry;
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xa9a294, flatShading: true });
    const half = t.w / 2 + 0.15;
    for (const sd of [-1, 1]) {
      grp.add(new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6, 1.2).translate(sd * (half + 0.55), 1.3, 0), stoneMat));
      const wall = new THREE.Mesh(new THREE.BoxGeometry(3.6, 2.0, 0.9).translate(sd * (half + 2.9), 0.8, 0), stoneMat); // (drops with the slope)
      grp.add(wall);
    }
    grp.add(new THREE.Mesh(new THREE.BoxGeometry(half * 2 + 2.4, 0.5, 1.3).translate(0, 2.85, 0), stoneMat));
    grp.name = 'bukhansan-gate';
    group.add(grp);
  }

  { // The top: the flag on its pole.
    const top = pad('peak');
    const grp = new THREE.Group();
    const ff = awayFromWay('peak') + 2.2; // (off the middle, where you stand)
    grp.position.set(top.at[0] + Math.cos(ff) * 1.9, top.y, top.at[1] + Math.sin(ff) * 1.9);
    const rockMat = new THREE.MeshLambertMaterial({ color: 0xbdb6a9, flatShading: true });
    const knob = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0).scale(1.3, 0.55, 1.1).translate(0, 0.15, 0), rockMat); // (the last knob of rock the pole stands on)
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 3.2, 6).translate(0, 2.2, 0), new THREE.MeshLambertMaterial({ color: 0xd9dadc }));
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.35, 0.9, 9, 3).translate(0.7, 3.3, 0), new THREE.MeshLambertMaterial({ map: flagTexture(), side: THREE.DoubleSide }));
    flag.name = 'bukhansan-flag';
    grp.add(knob, pole, flag);
    grp.name = 'bukhansan-summit';
    group.add(grp);
    const f = awayFromWay('peak'), [dx, dz] = [Math.cos(f) * (top.r - 1), Math.sin(f) * (top.r - 1)];
    // The carving, as it really is: cut big into a sloping face of the rock floor itself (北漢山 白雲臺 836m), read from the middle of the top.
    const carved = new THREE.MeshLambertMaterial({ map: carvedTexture(`${Math.round(l.summit.ele)}m`) });
    const stele = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.6, 1.92), [rockMat, rockMat, carved, rockMat, rockMat, rockMat]);
    stele.rotation.order = 'YXZ';
    stele.position.set(top.at[0] + dx, top.y + 0.12, top.at[1] + dz);
    stele.rotation.x = 0.4; // (its far edge up: a slab of the rock, sloping to you)
    stele.rotation.y = Math.atan2(-dx, -dz);
    stele.name = 'bukhansan-post-peak';
    group.add(stele);
  }

  group.userData.counts = counts;
  scene.add(group);
  const [bx0, bz0, bx1, bz1] = bukhanBox(l);
  const flag = group.getObjectByName('bukhansan-flag');
  const flagAt = flag && Float32Array.from(flag.geometry.attributes.position.array);
  const gate = l.pads.find((q) => q.k === 'gate'), sx = l.x + l.summit.at[0], sz = l.z + l.summit.at[1];
  const trunks = group.getObjectByName('bukhansan-trunks');
  let t = 0, summit = null, summitLoading = false, lifted = false, hidUnder = -Infinity;
  // Sunrise and sunset on the mountain (Yozi 2026-11-27: strong on the mountain, stronger at the top): a big sun with its glow
  // where core/sunset-sky.js has the sun, and the rock and woods warm in its light. (The top adds its own: game/bukhansan-summit.js.)
  const sunTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), f = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    f.addColorStop(0, 'rgba(255,255,255,1)'); f.addColorStop(0.085, 'rgba(255,250,225,1)'); f.addColorStop(0.11, 'rgba(255,214,150,0.62)'); f.addColorStop(0.3, 'rgba(255,170,100,0.26)'); f.addColorStop(0.62, 'rgba(255,140,90,0.07)'); f.addColorStop(1, 'rgba(255,120,80,0)');
    g.fillStyle = f; g.fillRect(0, 0, 128, 128);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; return tx;
  })();
  const sunGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: sunTex, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending, opacity: 0 }));
  sunGlow.name = 'bukhansan-sun';
  sunGlow.renderOrder = -4; // (before the top's far country: it comes up from behind the ridges)
  sunGlow.visible = false;
  group.add(sunGlow);
  const groundMat = group.getObjectByName('ground-bukhansan')?.material, warm = new THREE.Color();
  const sunrise = (p, open) => {
    const ss = weather()?.sunset, k = ss?.mix || 0, u = ss?.dome.material.uniforms;
    const up = u ? Math.min(1, Math.max(0, (u.uSun.value.y + 0.035) / 0.05)) : 0; // (not while it is under the horizon)
    sunGlow.visible = k * up > 0.01;
    if (groundMat) groundMat.emissive.copy(u ? warm.copy(u.uGlow.value) : warm.set(0)).multiplyScalar(k * (P.glow[0] + (P.glow[1] - P.glow[0]) * open));
    if (!sunGlow.visible) return;
    const size = P.sun[0] + (P.sun[1] - P.sun[0]) * open;
    sunGlow.position.copy(u.uSun.value).multiplyScalar(P.sunFar).add(p);
    sunGlow.scale.set(size, size, 1);
    sunGlow.material.opacity = k * up * (0.7 + 0.3 * open);
  };
  return {
    group,
    counts,
    seats,
    get summit() { return summit; },
    update(p, dt = 0) {
      const d = Math.hypot(Math.max(l.x + bx0 - p.x, 0, p.x - l.x - bx1), Math.max(l.z + bz0 - p.z, 0, p.z - l.z - bz1));
      group.visible = d < P.hide;
      if (!group.visible) return;
      t += dt;
      // Above the gate the top is drawn its own way (game/bukhansan-summit.js): the haze pulls back, the far country, the clouds, the wind.
      const near = Math.hypot(p.x - sx, p.z - sz);
      if (!summit && !summitLoading && near < P.summitNear) {
        summitLoading = true;
        import('./bukhansan-summit.js').then(({ createBukhanSummit }) => { summit = createBukhanSummit({ group, l, lowSpec, daylight, sfx, sun: () => weather()?.sunset }); }).catch((e) => { summitLoading = false; console.warn('bukhansan summit', e); });
      }
      const open = near < P.summitNear ? summitOpen(p.y, gate.y) : 0;
      summit?.update(p, dt, open);
      // From the top, what lies under the sea of clouds is not drawn (the woods of the valleys, the trunks).
      const under = summit && open > 0.97 ? summit.seaY - 3 : -Infinity;
      if (under !== hidUnder) { hidUnder = under; for (const w of woods) w.visible = w.userData.topY > under; if (trunks) trunks.visible = under === -Infinity; }
      sunrise(p, open);
      const w = weather();
      if (w && (open > 0 || lifted)) { w.lift = open * P.lift; lifted = open > 0; } // (as on Seoul Dal: core/weather.js)
      if (flag) { // the flag in the wind: it ripples, harder the higher you are
        const a = flag.geometry.attributes.position, k = 0.5 + open * 0.35; // (a breeze, not a gale: Yozi 2026-11-27)
        for (let i = 0; i < a.count; i++) { const x = flagAt[i * 3]; a.setZ(i, (Math.sin(x * 5.5 - t * (7 + open * 2)) * 0.07 + Math.sin(x * 2.3 - t * 3.1) * 0.05) * x * k); }
        a.needsUpdate = true;
        flag.rotation.y = -0.35 + Math.sin(t * 1.3) * 0.12;
      }
    },
  };
}
