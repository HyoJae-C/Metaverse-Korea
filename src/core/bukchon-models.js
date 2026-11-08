// Bukchon landmarks (map "landmarks" in districts/bukchon.json): the Open
// House (a ㄷ-shaped hanok round a courtyard, with a persimmon tree and a
// magpie), the rooftop view terrace,
// and Changdeokgung's roofs seen from the east edge. Visual only: collision
// comes from the map's blockers.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { hipRoofGeometry } from './landmarks.js';
import { HANOK, curvedRoof } from './hanok.js';
import { BUKCHON, ground } from '../data/bukchon.js';

// Many small boxes cost a draw call each: merge a landmark's plain meshes
// into one per material (the ones with a texture or several materials stay).
export function mergeStatic(g) {
  g.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(g.matrixWorld).invert();
  const byMat = new Map(), drop = [];
  g.traverse((o) => {
    if (!o.isMesh || Array.isArray(o.material) || o.material.map) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    for (const a of Object.keys(geo.attributes)) if (!['position', 'normal', 'color'].includes(a)) geo.deleteAttribute(a);
    if (!byMat.has(o.material)) byMat.set(o.material, []);
    byMat.get(o.material).push({ geo, noShadow: o.userData.noShadow });
    drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  for (const [m, list] of byMat) {
    const ok = list.filter((x) => !!x.geo.attributes.color === !!list[0].geo.attributes.color);
    const merged = mergeGeometries(ok.map((x) => x.geo));
    if (!merged) continue;
    const mesh = new THREE.Mesh(merged, m);
    mesh.userData.noShadow = ok.every((x) => x.noShadow);
    g.add(mesh);
  }
}
const tileMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
function tiles(g, w, d, h, y, o, x = 0, z = 0, ry = 0) {
  for (const geo of curvedRoof(w, d, h, o)) {
    const m = new THREE.Mesh(geo, tileMat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
  }
}
function signTexture(ko, en) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 160;
  const x = c.getContext('2d');
  x.fillStyle = '#2b2118'; x.fillRect(0, 0, 512, 160);
  x.strokeStyle = '#c9a25a'; x.lineWidth = 8; x.strokeRect(8, 8, 496, 144);
  x.fillStyle = '#f3e3b5'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.font = '800 64px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  x.fillText(ko, 256, 66);
  x.font = '600 26px system-ui, sans-serif';
  x.fillText(en, 256, 124);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
function box(g, sx, sy, sz, x, y, z, c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
}
const C = { base: '#b9ae98', wall: '#f1e7d2', wood: '#6b4630', lattice: '#8a6446', roof: '#4a5059', ridge: '#30353c', stone: '#cfc6b4', dark: '#9c927f' };

function roof(g, w, d, h, y, x = 0, z = 0, ry = 0) {
  const r = new THREE.Mesh(hipRoofGeometry(w, d, h), new THREE.MeshLambertMaterial({ color: C.roof, flatShading: true, side: THREE.DoubleSide }));
  r.position.set(x, y, z);
  r.rotation.y = ry;
  g.add(r);
  const ridge = Math.max(1, w - d * 0.9);
  const b = box(g, ridge + 0.6, h * 0.16, h * 0.16, x, y + h * 1.04, z, C.ridge);
  b.rotation.y = ry;
}

// One wing: base, walls, frame, lattice doors on the courtyard side (+z
// before turning), a roof. Centre (x, z), size w × d, turned ry.
function wing(g, x, z, w, d, ry, { maru = false } = {}) {
  const k = new THREE.Group();
  k.position.set(x, 0, z);
  k.rotation.y = ry;
  const B = HANOK.base, Wh = HANOK.wall + 0.3;
  box(k, w + 0.8, B, d + 0.8, 0, B / 2, 0, C.base);
  if (maru) {
    // The middle bays are the open wooden hall: a floor and posts, no wall in front.
    box(k, w, Wh, d * 0.45, 0, B + Wh / 2, -d * 0.275, C.wall); // back wall half
    box(k, w * 0.3, Wh, d * 0.55, -w * 0.35, B + Wh / 2, d * 0.225, C.wall);
    box(k, w * 0.3, Wh, d * 0.55, w * 0.35, B + Wh / 2, d * 0.225, C.wall);
    box(k, w * 0.4, 0.2, d * 0.55, 0, B + 0.1, d * 0.225, '#b07a4a'); // the maru floor
    for (const sx of [-0.2, 0.2]) box(k, 0.32, Wh, 0.32, sx * w, B + Wh / 2, d / 2, C.wood);
  } else box(k, w, Wh, d, 0, B + Wh / 2, 0, C.wall);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(k, 0.34, Wh, 0.34, sx * w / 2, B + Wh / 2, sz * d / 2, C.wood);
  box(k, w + 0.3, 0.34, d + 0.3, 0, B + Wh - 0.17, 0, C.wood);
  const bays = Math.max(2, Math.round(w / 3));
  for (let i = 0; i < bays; i++) {
    const bx = -w / 2 + ((i + 0.5) * w) / bays;
    if (maru && Math.abs(bx) < w * 0.2) continue;
    box(k, Math.min(1.8, (w / bays) * 0.7), 1.9, 0.06, bx, B + 1.2, d / 2 + 0.04, C.lattice); // paper doors
  }
  roof(k, w + 2.2, d + 2.4, HANOK.roof + 0.3, B + Wh);
  g.add(k);
}

const BUILD = {
  // The Open House: l.w × l.d compound centred on (x, z). North: the main
  // hall with the maru; west and east wings; a south wall with a gate.
  openhouse(g, l) {
    const w = l.w, d = l.d, hw = w / 2, hd = d / 2;
    wing(g, 0, -hd + 6, w, 11, 0, { maru: true }); // main hall (faces the courtyard, south)
    const side = d - 16, sz = -hd + 12 + side / 2; // the side wings, from the hall to near the gate wall
    wing(g, -hw + 4.5, sz, side, 8, Math.PI / 2); // west wing, doors facing east
    wing(g, hw - 4.5, sz, side, 8, -Math.PI / 2); // east wing, doors facing west
    // South wall with a tiled cap, and the gate (대문)
    for (const sx of [-1, 1]) {
      const len = hw - 2.5;
      box(g, len, 2.2, 0.6, sx * (2.5 + len / 2), 1.1, hd - 0.5, C.stone);
      box(g, len + 0.4, 0.3, 1.2, sx * (2.5 + len / 2), 2.35, hd - 0.5, C.roof);
    }
    for (const sx of [-1, 1]) box(g, 0.4, 3.2, 0.4, sx * 2.3, 1.6, hd - 0.5, C.wood);
    box(g, 5.2, 0.4, 0.6, 0, 3.1, hd - 0.5, C.wood);
    roof(g, 6.4, 3, 1.2, 3.3, 0, hd - 0.5);
    // Persimmon tree (감나무) with fruit, a magpie on top, near the west wing.
    const tx = -hw + 12, tz = hd - 8;
    box(g, 0.5, 3.4, 0.5, tx, 1.7, tz, '#6b4a33');
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(2.6, 0), mat('#7d9a4a'));
    crown.position.set(tx, 4.6, tz);
    crown.scale.set(1, 0.8, 1);
    g.add(crown);
    for (let i = 0; i < 11; i++) {
      const a = i * 2.4, r = 1.6 + (i % 3) * 0.5;
      const fruit = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 5), mat('#f07a1a'));
      fruit.position.set(tx + Math.cos(a) * r, 3.8 + (i % 4) * 0.6, tz + Math.sin(a) * r);
      g.add(fruit);
    }
    const bird = new THREE.Group(); // a magpie (까치): black and white, long tail
    box(bird, 0.5, 0.32, 0.28, 0, 0, 0, '#1f2328');
    box(bird, 0.3, 0.22, 0.3, 0.05, -0.04, 0, '#f3f3f3');
    box(bird, 0.22, 0.22, 0.22, 0.32, 0.12, 0, '#1f2328');
    box(bird, 0.6, 0.08, 0.14, -0.52, 0.06, 0, '#24314a');
    bird.position.set(tx, 6.7, tz);
    g.add(bird);
    // Jangdokdae: a stone platform with onggi jars in the south-east corner.
    const jx = hw - 14, jz = hd - 8;
    box(g, 5, 0.5, 3.2, jx, 0.25, jz, C.stone);
    for (let i = 0; i < 6; i++) {
      const s = i < 3 ? 1 : 0.75;
      const jar = new THREE.Mesh(new THREE.SphereGeometry(0.55 * s, 10, 8), mat('#5a3422'));
      jar.scale.set(1, 1.15, 1);
      jar.position.set(jx - 1.7 + (i % 3) * 1.7, 0.5 + 0.6 * s, jz + (i < 3 ? -0.6 : 0.8));
      g.add(jar);
      box(g, 0.7 * s, 0.12, 0.7 * s, jar.position.x, 0.5 + 1.25 * s, jar.position.z, '#3d2418'); // lid
    }
  },
  // The rooftop view: a stone terrace with a railing on the south side and a
  // coin telescope.
  terrace(g) {
    box(g, 24, 0.3, 22, 0, 0.15, 0, C.stone); // (small: houses line the alley right up to it)
    for (let x = -11; x <= 11; x += 2.75) if (Math.abs(x) > 3) box(g, 0.25, 1.1, 0.25, x, 0.85, 10.6, C.wood); // (a gap in the middle: the way in)
    for (const sx of [-1, 1]) box(g, 8.5, 0.15, 0.3, sx * 7.4, 1.4, 10.6, C.wood);
    box(g, 0.5, 1.1, 0.5, 0, 0.85, -8, '#3a5a7a'); // telescope post
    box(g, 0.4, 0.4, 1.0, 0, 1.6, -7.8, '#3a5a7a');
  },
  // Changdeokgung beyond the east edge: a palace wall and two hall roofs.
  farpalace(g) {
    box(g, 2, 3.5, 70, -8, 1.75, 0, '#d9c9b0');
    box(g, 2.8, 0.5, 71, -8, 3.7, 0, C.roof);
    for (const [z, w] of [[-12, 24], [16, 18]]) {
      box(g, w, 6, 10, 16, 3.6, z, '#a23a2c');
      box(g, w + 1, 1, 11, 16, 6.4, z, '#2f8f6b');
      roof(g, w * 1.35, 16, 5, 6.8, 16, z);
    }
  },
  // The village wall (담장): a stone lower half, plaster above, a tiled cap.
  // l.len long along x (turned by l.ry).
  hanokwall(g, l) { // a granite retaining wall (chukdae) holding up the hill: low at the street, taller up the slope
    const len = l.len, y = l.y || 0, H = y + 1.1;
    box(g, len, H, 0.95, 0, H / 2 - y, 0, C.dark);
    for (let x = -len / 2 + 0.7; x < len / 2 - 0.4; x += 1.4) for (const sz of [-1, 1]) box(g, 0.6, 0.45, 0.04, x, 0.6, sz * 0.49, C.stone); // the stone pattern
    box(g, len + 0.1, 0.16, 1.05, 0, H - y + 0.08, 0, C.stone); // the capstones
  },
  // A stone planter with a small tree (a maple or a persimmon) or clipped
  // shrubs, kept low.
  planter(g, l) {
    box(g, 1.6, 0.5, 1.6, 0, 0.25, 0, C.stone);
    box(g, 1.4, 0.06, 1.4, 0, 0.5, 0, '#6b5a44');
    const leaf = ['#7fae5a', '#d9773a', '#9cc06a'][Math.abs(Math.round(l.x * 7 + l.z)) % 3];
    if (l.kind === 'bush') {
      for (const [x, z, s] of [[-0.35, -0.3, 0.42], [0.35, 0.1, 0.38], [-0.1, 0.4, 0.34]]) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 0), mat(leaf));
        b.position.set(x, 0.55 + s * 0.7, z);
        g.add(b);
      }
    } else {
      box(g, 0.18, 1.5, 0.18, 0, 1.25, 0, '#5e4330');
      const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.95, 0), mat(leaf));
      crown.position.set(0, 2.4, 0); crown.scale.set(1, 0.8, 1);
      g.add(crown);
    }
  },
  // The whole retaining wall as one landmark (l.segs: { x, z, len, ry, y },
  // x and z from the landmark's own spot), so it is one draw call, not one
  // per step.
  hanokwalls(g, l) {
    for (const sg of l.segs) {
      const sub = new THREE.Group();
      BUILD.hanokwall(sub, sg);
      sub.position.set(sg.x, (sg.y || 0) - (l.y || 0), sg.z);
      sub.rotation.y = sg.ry || 0;
      g.add(sub);
    }
  },
  // A village gate: two posts, painted beams (dancheong green and red), a
  // signboard and a curved tiled roof. l.w wide (the opening), facing +z.
  bukchongate(g, l) {
    const w = l.w, hw = w / 2, H = l.main ? 6.2 : 5;
    for (const sx of [-1, 1]) {
      box(g, 0.7, H, 0.7, sx * (hw + 0.2), H / 2, 0, '#7a2e22');
      box(g, 1.3, 0.5, 1.3, sx * (hw + 0.2), 0.25, 0, C.stone);
      box(g, 2.2, 1.3, 0.95, sx * (hw + 1.6), 0.65, 0, C.dark); // a stub of the stone wall each side
    }
    box(g, w + 1.6, 0.5, 0.6, 0, H - 0.35, 0, '#2f8f6b');
    box(g, w + 1.4, 0.3, 0.5, 0, H - 0.95, 0, '#a23a2c');
    if (l.main) {
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.3), new THREE.MeshBasicMaterial({ map: signTexture('북촌한옥마을', 'Bukchon Hanok Village') }));
      sign.position.set(0, H - 1.9, 0.36);
      const back = sign.clone();
      back.rotation.y = Math.PI;
      back.position.z = -0.36;
      g.add(sign, back);
      box(g, 4.4, 1.45, 0.3, 0, H - 1.9, 0, '#2b2118');
    }
    tiles(g, w + 4.6, 4.2, l.main ? 2.0 : 1.6, H, { hip: true, lift: 0.7, seg: 4, rows: 3, color: new THREE.Color(C.roof) });
  },
};

// Each builder's boxes merged into a few meshes (fewer draw calls).
export const BUKCHON_BUILD = Object.fromEntries(Object.entries(BUILD).map(([k, f]) => [k, (g, l) => { const t = f(g, l); mergeStatic(g); return t; }]));

// The hill inside Bukchon's wall (data/bukchon.js ground()): a sloped ground
// and the alleys paved in granite on it. roads: the district's roads (world
// metres), [ox, oz]: its offset. Built with the village, on the first visit.
// Paving, drawn once. 'alley': across the alley (u 0..1), asphalt down the
// middle with a narrow edging of grey setts at both sides, only a little
// lighter than the asphalt; one texture is 2 m along. 'yard': big pale
// granite slabs, 1.6 m.
const paveCache = {};
function pavingTexture(kind) {
  if (kind in paveCache) return paveCache[kind];
  if (typeof document === 'undefined') return (paveCache[kind] = null);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 128;
  const x = c.getContext('2d');
  if (kind === 'alley') {
    x.fillStyle = '#5b5d60'; x.fillRect(0, 0, 128, 128); // asphalt
    let s = 7; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let k = 0; k < 900; k++) { // its grain
      const v = rnd();
      x.fillStyle = v < 0.5 ? 'rgba(40,42,45,0.35)' : 'rgba(150,150,148,0.25)';
      x.fillRect(Math.floor(rnd() * 128), Math.floor(rnd() * 128), 1, 1);
    }
    const E = 12; // the edging: about a tenth of the width on each side
    for (const x0 of [0, 128 - E]) {
      x.fillStyle = '#5f5e5a'; x.fillRect(x0, 0, E, 128); // joints
      const tones = ['#77756f', '#7d7b75', '#73716c', '#7a7872'];
      for (let r = 0; r < 8; r++) { x.fillStyle = tones[(r + (x0 ? 1 : 0)) % 4]; x.fillRect(x0 + 1, r * 16 + 1, E - 2, 14); }
    }
  } else {
    x.fillStyle = '#bdb5a6'; x.fillRect(0, 0, 128, 128);
    const tones = ['#ddd5c5', '#d5ccbb', '#e3dccd', '#d0c7b6'];
    for (let r = 0; r < 2; r++) for (let i = 0; i < 2; i++) {
      x.fillStyle = tones[r * 2 + i];
      x.fillRect(i * 64 + 2 + (r ? 16 : 0) % 64, r * 64 + 2, 60, 60);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  return (paveCache[kind] = t);
}

export function buildBukchonHill(roads, [ox, oz]) {
  const g = new THREE.Group();
  g.name = 'bukchon-hill';
  const [x0, , x1, z1] = BUKCHON.area, foot = BUKCHON.hill.foot;
  // (fine enough across too: the hill is flat across x, but ground() is 0
  // right on the edge, so the edge row is taken just inside it)
  const nx = Math.ceil((x1 - x0) / 4), nz = Math.ceil((foot - z1) / 2);
  const geo = new THREE.PlaneGeometry(x1 - x0, foot - z1, nx, nz).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + (x0 + x1) / 2, z = pos.getZ(i) + (foot + z1) / 2;
    pos.setXYZ(i, x + ox, ground(Math.min(Math.max(x, x0 + 0.01), x1 - 0.01), Math.min(Math.max(z, z1 + 0.01), foot - 0.01)) + 0.02, z + oz);
  }
  geo.computeVertexNormals();
  { // the hillside between the houses is paved too (granite slabs, see pavingTexture)
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / 1.6, pos.getZ(i) / 1.6);
  }
  const earth = new THREE.Mesh(geo, new THREE.MeshLambertMaterial(pavingTexture('yard') ? { map: pavingTexture('yard') } : { color: '#d8d0c0' }));
  earth.receiveShadow = true;
  g.add(earth);
  // Alleys: ribbons along each footpath, on the slope.
  const pts = [], uvs = [], STEP = 1.5;
  for (const r of roads) {
    if (r.k !== 'walk') continue;
    for (let i = 1; i < r.p.length; i++) {
      const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i], len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(len / STEP));
      const px = -(bz - az) / len * r.w / 2, pz = (bx - ax) / len * r.w / 2;
      for (let k = 0; k < n; k++) {
        const quad = [k / n, (k + 1) / n].map((t) => {
          const x = ax + (bx - ax) * t, z = az + (bz - az) * t, y = ground(x - ox, z - oz) + 0.12; // (well above the plain footpath world.js draws at 0.06 on the flat)
          return [[x - px, y, z - pz], [x + px, y, z + pz]];
        });
        const [[a, b], [c, d]] = quad;
        pts.push(...a, ...b, ...d, ...a, ...d, ...c);
        const v0 = (k * len) / n / 2, v1 = ((k + 1) * len) / n / 2; // one tile every 2 m along
        uvs.push(0, v0, 1, v0, 1, v1, 0, v0, 1, v1, 0, v1);
      }
    }
  }
  if (pts.length) {
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    rg.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    rg.computeVertexNormals();
    const alleys = new THREE.Mesh(rg, new THREE.MeshLambertMaterial(pavingTexture('alley') ? { map: pavingTexture('alley'), side: THREE.DoubleSide } : { color: '#8f8c88', side: THREE.DoubleSide }));
    alleys.receiveShadow = true;
    g.add(alleys);
  }
  return g;
}
