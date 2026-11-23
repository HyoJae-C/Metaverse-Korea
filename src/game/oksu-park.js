// Dalmaji Park (달맞이근린공원) by Oksu Station: what you see, loaded by
// game/oksu-walk.js when you come near. The numbers are the Oksu map's
// `dalmaji` landmark (scripts/build-oksu.mjs).
//
//   The hill's ground: a grid at its height (core/dalmaji-ground.js), the
//     wood's floor.
//   The ways up: the decks and stairs in weathered wood with brown hand
//     rails on dark posts (from Yozi's photos), the park road and paths
//     paved; lamps along them.
//   Photo Island A and B (포토아일랜드): decks out over the slope with a
//     railing round three sides, facing the Han; B has its little roof.
//   The wood: round trees in the season's colours and some pines.
//   Forsythia (개나리) along the stairs on the river side, only in spring
//     when they bloom yellow (the real date, core/weather-roll.js seasonAt);
//     the rest of the year there are none (Yozi 2026-11-23), so the flowers
//     are something to come back for.
//   Gazebos (정자), the toilet, the exercise bars and the park's name stone
//     by the entrance stairs.
//
// About 25k triangles near (lowSpec: fewer trees), under 20 draw calls.
import * as THREE from 'three';
import { addSnowCover } from '../core/snow-cover.js';
import { MIX, leafColor, leafHash } from '../core/season.js';
import { seasonAt } from '../core/weather-roll.js';
import { inPoly, trailNear } from '../core/skypark-ground.js';
import { islandRing, dalmajiBox } from '../core/dalmaji-ground.js';

export const OKSU_PARK = {
  cell: 2, // m: the hill's ground grid
  sink: 0.1, // the grid is drawn this much lower (you walk on the true height)
  hide: 700, // m: past this it is not drawn
  trees: 300, // in the wood (lowSpec: 170)
  treeClear: 2.6, // m from a way up's middle
  post: 2, // m between railing posts
  railH: 1.05, // m: the hand rail
  lamp: 16, // m between lamps
  bushStep: 1.5, // m between forsythia bushes
  forsythiaNear: 26, // m: from a photo island or the entrance, along the stairs
};

// Forsythia in bloom: spring (March to May, Seoul time).
export const forsythiaInBloom = (ms = Date.now()) => seasonAt(ms) === 'spring';

const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };

// Walk a polyline every `step` m: f(x, z, y, ux, uz) at each spot.
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

// The name stone's face: 달맞이 근린공원 carved top to bottom.
function stoneTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#b9b6ae'; g.fillRect(0, 0, 128, 256);
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${90 + (i % 5) * 20},${90 + (i % 5) * 20},${90 + (i % 5) * 20},0.25)`; g.fillRect((i * 37) % 128, (i * 91) % 256, 2, 2); }
  g.fillStyle = '#3d3a36'; g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
  const cols = [['달', '맞', '이'], ['근', '린', '공', '원']];
  cols.forEach((col, k) => col.forEach((ch, i) => g.fillText(ch, 84 - k * 40, 62 + i * 42)));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildOksuPark({ scene, l, y, lowSpec = false }) {
  const P = OKSU_PARK;
  const group = new THREE.Group();
  group.name = 'oksu-park';
  const W = ([x, z]) => [l.x + x, l.z + z];
  const foot = l.foot.map(W);
  const trails = l.trails.map((t) => ({ ...t, p: t.p.map(([x, z, yy]) => [l.x + x, l.z + z, yy]) }));
  const islands = (l.islands || []).map((i) => ({ ...i, ring: islandRing(i).map(W) }));
  const gazebos = (l.gazebos || []).map((g) => ({ ...g, at: W(g.at) }));
  const nearTrail = (x, z, m, except = null) => trails.some((t) => t !== except && trailNear(t, x, z).d < m);
  const onIsland = (x, z, m = 0) => islands.some((i) => inPoly(x, z, i.ring) || (m && i.ring.some((q, k) => segD(x, z, q, i.ring[(k + 1) % 4]) < m)));

  { // The hill's ground: the wood's floor.
    const [bx0, bz0, bx1, bz1] = dalmajiBox(l);
    const pos = [], col = [], c = P.cell;
    const shades = ['#6f8f4f', '#7a9a55', '#647f47', '#82995c'].map((h) => new THREE.Color(h));
    for (let z = l.z + bz0; z < l.z + bz1; z += c) for (let x = l.x + bx0; x < l.x + bx1; x += c) {
      const q = [[x, z], [x + c, z], [x + c, z + c], [x, z + c]].map(([a, b]) => [a, y(a, b), b]);
      if (Math.max(q[0][1], q[1][1], q[2][1], q[3][1]) < P.sink) continue;
      const on = shades[Math.floor(hash(Math.round(x), Math.round(z)) * shades.length) % shades.length];
      for (const k of [0, 3, 2, 0, 2, 1]) { const [a, h, b] = q[k]; pos.push(a, h - P.sink, b); col.push(on.r, on.g, on.b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true })));
    ground.name = 'ground-dalmaji';
    ground.receiveShadow = true;
    group.add(ground);
  }

  { // The ways up: decks and paths as ribbons, the stairs as steps.
    const deck = [], paved = [];
    const ribbon = (out, p, w, lift) => {
      for (let i = 1; i < p.length; i++) {
        const a = p[i - 1], b = p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (len < 0.01) continue;
        const nx = (-(b[1] - a[1]) / len) * w / 2, nz = ((b[0] - a[0]) / len) * w / 2, ya = a[2] + lift, yb = b[2] + lift;
        out.push(a[0] + nx, ya, a[1] + nz, b[0] + nx, yb, b[1] + nz, b[0] - nx, yb, b[1] - nz, a[0] + nx, ya, a[1] + nz, b[0] - nx, yb, b[1] - nz, a[0] - nx, ya, a[1] - nz);
      }
    };
    for (const t of trails) if (!t.steps) ribbon(t.deck ? deck : paved, t.p, t.w, 0.06);
    for (const i of islands) { const r = i.ring; for (const k of [0, 1, 2, 0, 2, 3]) deck.push(r[k][0], i.y + 0.08, r[k][1]); }
    const mesh = (pos, color, name) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })));
      m.name = name;
      m.receiveShadow = true;
      group.add(m);
    };
    mesh(deck, 0x8d8579, 'dalmaji-decks'); // (weathered wood, grey-brown, like the photos)
    mesh(paved, 0xc8bba2, 'dalmaji-paths');
    const steps = [];
    for (const t of trails) if (t.steps) {
      for (let i = 1; i < t.p.length; i++) {
        const a = t.p[i - 1], b = t.p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), rise = b[2] - a[2];
        if (len < 0.01) continue;
        const n = Math.max(1, Math.round(Math.abs(rise) / 0.18)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
        for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; steps.push([a[0] + (b[0] - a[0]) * f, a[2] + rise * f + 0.02, a[1] + (b[1] - a[1]) * f, ry, t.w, 1, Math.max(len / n, 0.3) + 0.05]); }
      }
    }
    const block = new THREE.BoxGeometry(1, 0.4, 1).translate(0, -0.2, 0);
    const st = instanced(block, new THREE.MeshLambertMaterial({ color: 0x7f776c }), steps, 'dalmaji-steps');
    st.receiveShadow = true;
    group.add(st);
  }

  { // Railings both sides of the decks and stairs, and round the photo
    // islands' three outer sides; lamps along the ways.
    const posts = [], rails = [], lamps = [];
    const rail = (ax, ay, az, bx, by, bz) => {
      const len = Math.hypot(bx - ax, bz - az);
      if (len < 0.05) return;
      rails.push([(ax + bx) / 2, (ay + by) / 2 + P.railH, (az + bz) / 2, Math.atan2(bx - ax, bz - az), 1, 1, Math.hypot(len, by - ay)]);
      const tilt = rails[rails.length - 1]; tilt.push(Math.atan2(by - ay, len)); // (pitch, set below)
    };
    for (const t of trails) {
      if (!(t.deck || t.steps)) continue;
      for (const side of [1, -1]) {
        let last = null;
        along(t.p, P.post, (x, z, yy, ux, uz) => {
          const px = x - uz * side * (t.w / 2 + 0.05), pz = z + ux * side * (t.w / 2 + 0.05);
          if (nearTrail(px, pz, t.w / 2 + 0.6, t) || onIsland(px, pz, 0.8)) { last = null; return; } // (open where another way or a photo island joins)
          posts.push([px, yy, pz]);
          if (last) rail(last[0], last[1], last[2], px, yy, pz);
          last = [px, yy, pz];
        }, 0.3);
      }
    }
    for (const i of islands) {
      const r = i.ring;
      for (const [a, b] of [[1, 2], [2, 3], [3, 0]]) {
        const [ax, az] = r[a], [bx, bz] = r[b], n = Math.max(1, Math.round(Math.hypot(bx - ax, bz - az) / P.post));
        for (let k = 0; k <= n; k++) posts.push([ax + ((bx - ax) * k) / n, i.y + 0.08, az + ((bz - az) * k) / n]);
        rail(ax, i.y + 0.08, az, bx, i.y + 0.08, bz);
      }
    }
    for (const t of trails) {
      along(t.p, P.lamp, (x, z, yy, ux, uz) => {
        const px = x + uz * (t.w / 2 + 0.5), pz = z - ux * (t.w / 2 + 0.5);
        if (nearTrail(px, pz, t.w / 2 + 0.3, t) || onIsland(px, pz, 0.5)) return;
        lamps.push([px, y(px, pz), pz, Math.atan2(-uz, ux)]);
      }, P.lamp * 0.4);
    }
    const postGeo = new THREE.BoxGeometry(0.06, P.railH, 0.06).translate(0, P.railH / 2, 0);
    group.add(instanced(postGeo, new THREE.MeshLambertMaterial({ color: 0x3a3a3c }), posts.map(([x, yy, z]) => [x, yy, z]), 'dalmaji-posts'));
    const railGeo = new THREE.BoxGeometry(0.07, 0.06, 1);
    const railMesh = new THREE.InstancedMesh(railGeo, new THREE.MeshLambertMaterial({ color: 0x8a4a34 }), Math.max(1, rails.length)); // (the brown hand rail)
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), s = new THREE.Vector3();
    rails.forEach(([x, yy, z, ry, , , len, pitch], i) => { e.set(-pitch, ry, 0, 'YXZ'); railMesh.setMatrixAt(i, m4.compose(v.set(x, yy, z), q.setFromEuler(e), s.set(1, 1, len))); });
    railMesh.count = rails.length;
    railMesh.computeBoundingSphere();
    railMesh.name = 'dalmaji-rails';
    group.add(railMesh);
    // lamps: a dark pole with a flat round head reaching over the way (the photo)
    const pole = new THREE.CylinderGeometry(0.06, 0.08, 3.6, 6).translate(0, 1.8, 0);
    const arm = new THREE.BoxGeometry(0.05, 0.05, 0.7).translate(0, 3.55, -0.35);
    const head = new THREE.CylinderGeometry(0.32, 0.28, 0.1, 10).translate(0, 3.5, -0.7);
    const darkMat = new THREE.MeshLambertMaterial({ color: 0x4a4c50 });
    group.add(instanced(pole, darkMat, lamps.map(([x, yy, z, ry]) => [x, yy, z, ry]), 'dalmaji-lamp-poles'));
    group.add(instanced(arm, darkMat, lamps.map(([x, yy, z, ry]) => [x, yy, z, ry]), 'dalmaji-lamp-arms'));
    group.add(instanced(head, new THREE.MeshBasicMaterial({ color: 0xfff0c8 }), lamps.map(([x, yy, z, ry]) => [x, yy, z, ry]), 'dalmaji-lamp-heads'));
    group.userData.counts = { posts: posts.length, rails: rails.length, lamps: lamps.length };
  }

  { // Photo islands: legs down to the slope; B's little roof.
    const legs = [];
    for (const i of islands) for (const [x, z] of i.ring) { const g = y(x, z), h = Math.max(0.3, i.y - g + 0.3); legs.push([x, g - 0.2, z, 0, 1, h, 1]); }
    const legGeo = new THREE.BoxGeometry(0.14, 1, 0.14).translate(0, 0.5, 0);
    group.add(instanced(legGeo, new THREE.MeshLambertMaterial({ color: 0x5a5650 }), legs, 'dalmaji-island-legs'));
    const b = islands.find((i) => /B$/.test(i.name || ''));
    if (b) {
      const r = b.ring, cx = (r[0][0] + r[2][0]) / 2, cz = (r[0][1] + r[2][1]) / 2;
      const roof = new THREE.Mesh(new THREE.BoxGeometry(b.size[0] * 0.8, 0.12, b.size[1] * 0.6), new THREE.MeshLambertMaterial({ color: 0x6b5a4a }));
      roof.position.set(cx, b.y + 2.7, cz);
      roof.rotation.y = b.ry;
      group.add(roof);
      const pg = new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6).translate(0, 1.3, 0), pm = new THREE.MeshLambertMaterial({ color: 0x3a3a3c });
      for (const [u, w] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const du = (u * b.size[0] * 0.38), dw = (w * b.size[1] * 0.27), c = Math.cos(b.ry), s = Math.sin(b.ry);
        const m = new THREE.Mesh(pg, pm); m.position.set(cx + du * c + dw * s, b.y + 0.08, cz - du * s + dw * c); group.add(m);
      }
    }
  }

  { // The wood: round trees in the season's colours, some pines; none on
    // the ways, the islands or the gazebos.
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const xs = foot.map((q) => q[0]), zs = foot.map((q) => q[1]);
    const [fx0, fx1, fz0, fz1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
    const round = [], pines = [];
    const want = lowSpec ? 170 : P.trees;
    for (let k = 0; k < want * 30 && round.length + pines.length < want; k++) {
      const x = fx0 + rnd() * (fx1 - fx0), z = fz0 + rnd() * (fz1 - fz0);
      if (!inPoly(x, z, foot)) continue;
      const g = y(x, z);
      if (g < 0.4) continue;
      if (nearTrail(x, z, P.treeClear) || onIsland(x, z, 2) || gazebos.some((q) => Math.hypot(x - q.at[0], z - q.at[1]) < 3.5)) continue;
      const sc = 0.8 + rnd() * 0.6;
      (rnd() < 0.22 ? pines : round).push([x, g - 0.1, z, rnd() * 6, sc, sc, sc]);
    }
    const trunk = new THREE.CylinderGeometry(0.14, 0.2, 2.4, 5, 1, true).translate(0, 1.2, 0);
    const crown = new THREE.IcosahedronGeometry(1.8, 0).translate(0, 3.3, 0);
    const cone = new THREE.ConeGeometry(1.4, 3.6, 6).translate(0, 3.6, 0);
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b5440 });
    group.add(instanced(trunk, trunkMat, round.concat(pines), 'dalmaji-trunks'));
    const greens = ['#5f9a4a', '#6fae55', '#4f8a43', '#7bb463'].map((c) => new THREE.Color(c));
    group.add(instanced(crown, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })), round, 'dalmaji-crowns', (m, i) => m.setColorAt(i, leafColor(greens[i % greens.length], leafHash(i, 9), MIX.wood))));
    group.add(instanced(cone, addSnowCover(new THREE.MeshLambertMaterial({ color: 0x3f6f3a, flatShading: true })), pines, 'dalmaji-pines'));
    group.userData.counts.trees = round.length + pines.length;
  }

  const bloom = forsythiaInBloom();
  group.userData.bloom = bloom;
  group.userData.counts.forsythia = 0;
  if (bloom) { // Forsythia (개나리) beside the stairs and decks near the
    // look-outs and the entrance, in spring only (Yozi 2026-11-23: none the
    // rest of the year).
    const spots = [];
    const hubs = islands.map((i) => i.ring[0]).concat([W([0, 0])]);
    for (const t of trails) {
      if (!(t.deck || t.steps)) continue;
      for (const side of [1, -1]) along(t.p, P.bushStep, (x, z, yy, ux, uz) => {
        if (!hubs.some(([a, b]) => Math.hypot(x - a, z - b) < P.forsythiaNear)) return;
        const off = t.w / 2 + 0.75 + hash(x, z) * 0.4, bx = x - uz * side * off, bz = z + ux * side * off;
        if (nearTrail(bx, bz, t.w / 2 + 0.4, t) || onIsland(bx, bz, 0.6)) return;
        spots.push([bx, y(bx, bz) - 0.05, bz, hash(z, x) * 6, 1 + hash(bx, bz) * 0.4, 0.8 + hash(bz, bx) * 0.4, 1 + hash(bx, bz) * 0.4]);
      }, side > 0 ? 0.4 : 1.1);
    }
    const yellows = ['#f6cf1e', '#f9dc3c', '#efc012', '#fbe35a'].map((c) => new THREE.Color(c));
    // (arching sprays: a squashed ball with its ends drooping)
    const geo = new THREE.IcosahedronGeometry(0.7, 1).scale(1.25, 0.75, 1.1).translate(0, 0.45, 0);
    group.add(instanced(geo, new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }), spots, 'forsythia', (m, i) => m.setColorAt(i, yellows[i % yellows.length])));
    group.userData.counts.forsythia = spots.length;
  }

  { // Gazebos (정자): a wooden floor on posts and a four-sided roof.
    const wood = new THREE.MeshLambertMaterial({ color: 0x8a5a3a }), roofMat = new THREE.MeshLambertMaterial({ color: 0x5b4636 });
    const floor = new THREE.BoxGeometry(3.2, 0.15, 3.2), post = new THREE.CylinderGeometry(0.1, 0.1, 2.5, 6).translate(0, 1.25, 0);
    const roof = new THREE.ConeGeometry(2.7, 1.2, 4).rotateY(Math.PI / 4).translate(0, 3.1, 0);
    for (const g of gazebos) {
      const [x, z] = g.at, base = Math.max(g.y, y(x, z)) + 0.45, low = Math.min(...[[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]].map(([a, b]) => y(x + a, z + b)));
      const grp = new THREE.Group();
      grp.position.set(x, base, z);
      const f = new THREE.Mesh(floor, wood); grp.add(f);
      for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
        const p = new THREE.Mesh(post, wood); p.position.set(a, 0, b); grp.add(p);
        const leg = new THREE.Mesh(post, wood); leg.position.set(a, low - base - 0.2, b); leg.scale.y = Math.max(0.05, (base - low + 0.2) / 2.5); grp.add(leg);
      }
      const r = new THREE.Mesh(roof, roofMat); r.castShadow = true; grp.add(r);
      group.add(grp);
    }
  }

  if (l.toilet) { // The public toilet (game-size).
    const [cx, cz] = W(l.toilet.reduce((s, q) => [s[0] + q[0] / l.toilet.length, s[1] + q[1] / l.toilet.length], [0, 0]));
    const b = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.8, 2.6).translate(0, 1.4, 0), new THREE.MeshLambertMaterial({ color: 0xd9cfbf }));
    b.position.set(cx, y(cx, cz) - 0.3, cz);
    group.add(b);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.2, 3), new THREE.MeshLambertMaterial({ color: 0x5b6b5a }));
    roof.position.set(cx, y(cx, cz) + 2.6, cz);
    group.add(roof);
  }

  { // Exercise bars (철봉) at OSM's exercise corners.
    const bars = (l.fitness || []).map(W).filter(([x, z]) => !nearTrail(x, z, 1.4)).map(([x, z]) => [x, y(x, z) - 0.05, z, hash(x, z) * 3]);
    const geo = new THREE.BoxGeometry(0.08, 2, 0.08).translate(-0.7, 1, 0);
    const geo2 = new THREE.BoxGeometry(0.08, 2, 0.08).translate(0.7, 1, 0);
    const bar = new THREE.BoxGeometry(1.5, 0.05, 0.05).translate(0, 1.95, 0);
    const mat = new THREE.MeshLambertMaterial({ color: 0x4f7fa8 });
    group.add(instanced(geo, mat, bars, 'dalmaji-bars-a'), instanced(geo2, mat, bars, 'dalmaji-bars-b'), instanced(bar, mat, bars, 'dalmaji-bars-c'));
  }

  if (l.stone) { // The name stone (달맞이 근린공원) by the entrance stairs.
    const [x, z] = W(l.stone.at);
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0).scale(0.75, 1.5, 0.45), new THREE.MeshLambertMaterial({ color: 0xb4b1a9, flatShading: true }));
    rock.position.set(x, y(x, z) + 0.9, z);
    rock.rotation.y = l.stone.ry;
    group.add(rock);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.24), new THREE.MeshLambertMaterial({ map: stoneTexture() }));
    face.position.set(0, 0.05, 0.38);
    rock.add(face);
  }

  scene.add(group);
  return {
    group,
    counts: group.userData.counts,
    update(p) {
      const far = Math.hypot(p.x - l.x, p.z - l.z) > P.hide;
      group.visible = !far;
    },
  };
}
