// Seoul National Cemetery (국립서울현충원): what you see, loaded by
// game/hyeonchungwon-walk.js when you come near. The numbers are the map's
// `hyeonchung` landmark (scripts/build-hyeonchungwon.mjs).
//
//   The ground: a grid at its height (core/hyeonchung-ground.js): the wood's
//     floor, lighter on the burial plots and the lawns.
//   The roads and paths as ribbons, the stairs as steps.
//   The burial plots: rows of plain white headstones, no names (one
//     InstancedMesh per 60 m tile; far tiles draw one flat face a stone).
//   The lawn, the paved court, Hyeonchungmun (blue-green tiled roof on white
//     columns, two low wings), the tower's terrace and stairs, the Memorial
//     Tower (a tall granite shaft on a stepped base) with its altar and
//     incense burner, the Chungseong Fountain, the main gate's pillars.
//   The wood: pines mostly (OSM: needleleaved), some round trees in the
//     season's colours.
//   White chrysanthemums on the altar after you pay your respects.
//
// The gate, the tower and the fountain are from Yozi's photos; their
// outlines are approximate (meta.approx). About 90k triangles near
// (lowSpec: fewer stones in a row, half the trees).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { addSnowCover } from '../core/snow-cover.js';
import { MIX, leafColor, leafHash } from '../core/season.js';
import { inPoly } from '../core/skypark-ground.js';
import { wayNear, flatAt, hyeonchungBox } from '../core/hyeonchung-ground.js';
import { hyeonchungSolids } from './hyeonchungwon-walk.js';

export const HC_PARK = {
  cell: 3, // m: the ground's grid
  sink: 0.1, // the grid is drawn this much lower (you walk on the true height)
  hide: 700, // m: past this nothing is drawn
  rows: 1.9, // m between rows of headstones
  stones: 1.15, // m between stones in a row (lowSpec: 1.9)
  stone: [0.3, 0.62, 0.12], // m: a headstone (game-size)
  edge: 0.9, // m: no stone this near a plot's edge or a road
  tile: 60, // m: headstones are drawn by tile
  stonesNear: 110, // m: a tile past this draws each stone as one flat face
  stonesFar: 300, // m: a tile past this is not drawn
  trees: 1100, // in the wood (lowSpec: 550)
  treeClear: 2.2, // m from a road's edge
  flowers: 120, // s: the chrysanthemums stay on the altar
};

const ringDist = (x, z, p) => { let d = Infinity; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [ax, az] = p[j], [bx, bz] = p[i], dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); d = Math.min(d, Math.hypot(x - ax - dx * t, z - az - dz * t)); } return d; };
const boxOf = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
const inBox = (x, z, b, m = 0) => x >= b[0] - m && x <= b[2] + m && z >= b[1] - m && z <= b[3] + m;

// Where the headstones stand in a plot (landmark metres): rows `rows` apart
// along the plot's long side, `step` between stones, none within `edge` of
// its outline. ok(x, z): false where something else is (a road, the court).
export function plotStones(plot, { rows = HC_PARK.rows, step = HC_PARK.stones, edge = HC_PARK.edge } = {}, ok = () => true) {
  const c = Math.cos(plot.a), s = Math.sin(plot.a), out = [];
  const uv = plot.p.map(([x, z]) => [x * c + z * s, -x * s + z * c]);
  const [u0, v0, u1, v1] = boxOf(uv);
  for (let v = v0 + rows / 2; v < v1; v += rows) for (let u = u0 + step / 2; u < u1; u += step) {
    const x = u * c - v * s, z = u * s + v * c;
    if (inPoly(x, z, plot.p) && ringDist(x, z, plot.p) > edge && ok(x, z)) out.push([x, z]);
  }
  return out;
}

// Many boxes and other static shapes in one mesh: each keeps its own colour.
function batch() {
  const parts = [];
  const add = (geo, color, m) => {
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (m) g.applyMatrix4(m);
    const c = new THREE.Color(color), n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.deleteAttribute('uv');
    g.deleteAttribute('normal'); // (made again once merged)
    parts.push(g);
  };
  return {
    add,
    box(w, h, d, x, y, z, color, m, ry = 0) { const g = new THREE.BoxGeometry(w, h, d); if (ry) g.rotateY(ry); g.translate(x, y, z); add(g, color, m); },
    mesh(name) {
      const geo = mergeGeometries(parts, false);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
      mesh.name = name;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    },
  };
}

// A hipped roof: eaves w x d at y0, a ridge `ridge` long at y1 (along x).
function hipRoof(w, d, y0, y1, ridge) {
  const a = w / 2, b = d / 2, r = ridge / 2;
  const v = [[-a, y0, -b], [a, y0, -b], [a, y0, b], [-a, y0, b], [-r, y1, 0], [r, y1, 0]];
  const f = [[3, 2, 5], [3, 5, 4], [1, 0, 4], [1, 4, 5], [0, 3, 4], [2, 1, 5], [0, 1, 2], [0, 2, 3]];
  const pos = [];
  for (const t of f) for (const i of t) pos.push(...v[i]);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

// White letters on a dark board (현충문) or dark letters cut in stone (국립서울현충원).
function textPlane(text, w, h, { bg = '#1c1c1c', fg = '#f4f1e8', font = 'bold 84px serif' } = {}) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = Math.round((512 * h) / w);
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, c.width / 2, c.height / 2 + 4, c.width - 30);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }));
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
  mesh.userData.noSplit = true;
  return mesh;
}

const C = {
  granite: '#d2cdc2', stone: '#bdb8ad', paving: '#d9d3c6', pavingDark: '#c4bdae', white: '#f3f0e8', tile: '#2e7f86', tileDark: '#256a70',
  bronze: '#5b4a34', dark: '#3a3936', wall: '#ebe7dc', base: '#8f8b84', basin: '#9fd2c2', water: '#6fb7d6', lawn: '#8dba63',
};

export function buildHyeonchungwonPark({ scene, l, y, lowSpec = false }) {
  const P = HC_PARK;
  const group = new THREE.Group();
  group.name = 'hyeonchungwon-park';
  group.userData.counts = {};
  const LY = (x, z) => y(l.x + x, l.z + z); // height at landmark metres
  const trails = l.trails;
  const plots = l.plots.map((p) => ({ ...p, box: boxOf(p.p) }));
  const lawns = l.lawns.map((p) => ({ p, box: boxOf(p) }));
  const water = l.water.map((w) => ({ ...w, box: boxOf(w.p) }));
  const builds = l.buildings.map((b) => ({ ...b, box: boxOf(b.p) }));
  const solids = hyeonchungSolids(l).map((p) => ({ p, box: boxOf(p) }));
  const inAny = (list, x, z, m = 0) => list.some((q) => inBox(x, z, q.box, m) && (inPoly(x, z, q.p) || (m && ringDist(x, z, q.p) < m)));
  const offWay = (x, z, m) => { const n = wayNear(l, x, z); return !n || n.e > m; };

  { // The ground: the wood's floor, lighter on the plots and the lawns.
    const [bx0, bz0, bx1, bz1] = hyeonchungBox(l);
    const pos = [], col = [], c = P.cell;
    const wood = ['#6f8f4f', '#7a9a55', '#647f47', '#82995c'].map((h) => new THREE.Color(h));
    const turf = ['#8cb866', '#93be6c', '#86b160'].map((h) => new THREE.Color(h));
    const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    const yy = (x, z) => { const h = LY(x, z); return Math.max(h - P.sink, 0.035); }; // (level ground: just over the map's park green)
    for (let z = bz0; z < bz1; z += c) for (let x = bx0; x < bx1; x += c) {
      const mx = x + c / 2, mz = z + c / 2;
      if (!inPoly(mx, mz, l.foot) && !inPoly(x, z, l.foot)) continue;
      if (flatAt(l, mx, mz)) continue; // (the court and the lawn have their own floor)
      const q = [[x, z], [x + c, z], [x + c, z + c], [x, z + c]].map(([a, b]) => [a, yy(a, b), b]);
      const light = inAny(plots, mx, mz) || inAny(lawns, mx, mz);
      const list = light ? turf : wood, on = list[Math.floor(hash(Math.round(x), Math.round(z)) * list.length) % list.length];
      for (const k of [0, 3, 2, 0, 2, 1]) { const [a, h, b] = q[k]; pos.push(l.x + a, h, l.z + b); col.push(on.r, on.g, on.b); }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true })));
    ground.name = 'ground-hyeonchung';
    ground.receiveShadow = true;
    group.add(ground);
  }

  { // The roads and paths as ribbons (cut where a segment is long, so they follow the ground), the stairs as steps.
    const road = [], path = [], steps = [];
    const ribbon = (out, a, b, w) => {
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 0.01) return;
      const nx = (-(b[1] - a[1]) / len) * w / 2, nz = ((b[0] - a[0]) / len) * w / 2, lift = 0.07;
      const A = [l.x + a[0], a[2] + lift, l.z + a[1]], B = [l.x + b[0], b[2] + lift, l.z + b[1]];
      out.push(A[0] + nx, A[1], A[2] + nz, B[0] + nx, B[1], B[2] + nz, B[0] - nx, B[1], B[2] - nz, A[0] + nx, A[1], A[2] + nz, B[0] - nx, B[1], B[2] - nz, A[0] - nx, A[1], A[2] - nz);
    };
    for (const t of trails) {
      if (t.court) continue; // (the terrace's stairs are drawn with the court)
      for (let i = 1; i < t.p.length; i++) {
        const a = t.p[i - 1], b = t.p[i], len = Math.hypot(b[0] - a[0], b[1] - a[1]), rise = b[2] - a[2];
        if (len < 0.01) continue;
        if (t.steps) {
          const n = Math.max(1, Math.round(Math.abs(rise) / 0.18)), ry = Math.atan2(b[0] - a[0], b[1] - a[1]);
          for (let k = 0; k < n; k++) { const f = (k + 0.5) / n; steps.push([l.x + a[0] + (b[0] - a[0]) * f, a[2] + rise * f + 0.02, l.z + a[1] + (b[1] - a[1]) * f, ry, t.w, 1, Math.max(len / n, 0.3) + 0.05]); }
        } else {
          // (past both ends by half its width, so the bends join up)
          const e = t.w / 2 / len;
          ribbon(t.k === 'service' || t.k === 'pedestrian' ? road : path, [a[0] - (b[0] - a[0]) * e, a[1] - (b[1] - a[1]) * e, a[2]], [b[0] + (b[0] - a[0]) * e, b[1] + (b[1] - a[1]) * e, b[2]], t.w);
        }
      }
    }
    const mesh = (pos, color, name, factor) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: factor })));
      m.name = name;
      m.receiveShadow = true;
      group.add(m);
    };
    mesh(road, 0xb7b2a8, 'hyeonchung-roads', -2);
    mesh(path, 0xcbbfa6, 'hyeonchung-paths', -3);
    const st = instanced(new THREE.BoxGeometry(1, 0.4, 1).translate(0, -0.2, 0), new THREE.MeshLambertMaterial({ color: 0xa9a399 }), steps, 'hyeonchung-steps');
    st.receiveShadow = true;
    group.add(st);
  }

  const flat = (ring, yy, color, name, depth = 0) => { // a level floor (or a slab `depth` thick) from a ring
    const sh = new THREE.Shape(ring.map(([x, z]) => new THREE.Vector2(l.x + x, -(l.z + z))));
    const geo = depth ? new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }) : new THREE.ShapeGeometry(sh);
    geo.rotateX(-Math.PI / 2);
    geo.translate(0, yy - depth, 0);
    const m = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ color, polygonOffset: true, polygonOffsetFactor: -4 })));
    m.name = name;
    m.receiveShadow = true;
    group.add(m);
    return m;
  };

  { // The lawn, the court's paving, the terrace (a slab 1.2 m up), the water.
    for (const f of l.flats) {
      if (f.k === 'lawn') flat(f.p, 0.05, C.lawn, 'hyeonchung-lawn');
      else if (f.k === 'court') flat(f.p, 0.06, C.paving, 'hyeonchung-court');
      else flat(f.p, f.y + 0.02, C.pavingDark, 'hyeonchung-terrace', f.y);
    }
    for (const w of water) flat(w.p, w.y + 0.06, C.water, 'hyeonchung-water');
  }

  const B = batch();
  const frame = (at, ry, yy = 0) => new THREE.Matrix4().makeRotationY(ry).setPosition(l.x + at[0], yy, l.z + at[1]);

  { // The terrace's stairs and its front wall.
    const [a, b] = l.stairs.p, len = Math.hypot(b[0] - a[0], b[1] - a[1]), ry = Math.atan2(b[0] - a[0], b[1] - a[1]), n = 8;
    const m = frame(a, ry);
    for (let k = 0; k < n; k++) B.box(l.stairs.w, ((k + 1) * (b[2] - a[2])) / n, len / n + 0.02, 0, ((k + 1) * (b[2] - a[2])) / n / 2, (k + 0.5) * (len / n), C.stone, m);
    for (const [p, q] of l.walls) {
      const wl = Math.hypot(q[0] - p[0], q[1] - p[1]);
      B.box(wl, 0.5, 0.5, 0, b[2] + 0.25, 0, C.granite, frame([(p[0] + q[0]) / 2, (p[1] + q[1]) / 2], Math.atan2(-(q[1] - p[1]), q[0] - p[0])));
    }
  }

  { // Hyeonchungmun: the open hall on white columns under a blue-green tiled roof, a low wing either side.
    const g = l.gate, m = frame(g.at, g.ry), hallW = g.w * 0.52, d = g.d, colH = g.h * 0.5, plat = 0.45;
    B.box(hallW + 1.6, plat, d + 1.4, 0, plat / 2, 0, C.stone, m);
    for (let k = 1; k <= 3; k++) for (const s of [1, -1]) B.box(hallW * 0.7, plat * (1 - k / 4), 0.4, 0, (plat * (1 - k / 4)) / 2, s * (d / 2 + 0.7 + 0.4 * k - 0.2), C.stone, m); // (steps, front and back)
    for (let i = 0; i < 6; i++) for (const s of [1, -1]) {
      const cg = new THREE.CylinderGeometry(0.27, 0.3, colH, 10).translate(-hallW / 2 + 0.5 + (i * (hallW - 1)) / 5, plat + colH / 2, s * (d / 2 - 0.9));
      B.add(cg, C.white, m);
    }
    const top = plat + colH;
    B.box(hallW + 0.2, 0.55, d - 1.2, 0, top + 0.27, 0, C.white, m); // the beams
    B.box(hallW + 0.5, 0.16, d - 0.9, 0, top + 0.63, 0, C.tileDark, m); // (the painted band under the eaves)
    B.add(hipRoof(hallW + 3.2, d + 2.4, top + 0.7, g.h, hallW * 0.5), C.tile, m);
    B.box(hallW * 0.5 + 0.3, 0.22, 0.3, 0, g.h + 0.06, 0, C.white, m); // the ridge
    B.box(hallW + 3.3, 0.1, d + 2.5, 0, top + 0.68, 0, C.white, m); // (the eaves' white edge)
    const wingW = (g.w - hallW) / 2, wd = d * 0.62, wh = g.h * 0.36;
    for (const s of [1, -1]) {
      const x = s * (g.w / 2 - wingW / 2);
      B.box(wingW, 0.7, wd, x, 0.35, 0, C.base, m);
      B.box(wingW - 0.1, wh - 0.7, wd - 0.1, x, 0.7 + (wh - 0.7) / 2, 0, C.wall, m);
      for (let i = 0; i < 3; i++) for (const f of [1, -1]) B.box(wingW / 5, 0.6, 0.06, x - wingW / 3.2 + (i * wingW) / 3.2, wh * 0.68, f * (wd / 2), C.dark, m); // windows
      B.add(hipRoof(wingW + 1.2, wd + 1.6, wh, wh + 1.25, wingW * 0.55).translate(x, 0, 0), C.tile, m);
      B.box(wingW * 0.55 + 0.2, 0.16, 0.24, x, wh + 1.28, 0, C.white, m);
      // a stone guardian either side of the front steps
      B.box(0.9, 0.7, 1.3, s * (hallW * 0.35 + 1.2), 0.35, d / 2 + 2.2, C.stone, m);
      B.box(0.6, 0.6, 0.9, s * (hallW * 0.35 + 1.2), 1.0, d / 2 + 2.2, C.granite, m);
      B.box(0.45, 0.45, 0.45, s * (hallW * 0.35 + 1.2), 1.45, d / 2 + 2.55, C.granite, m);
    }
    for (const s of [1, -1]) { // the name board, front and back
      const board = textPlane('현충문', 2.2, 0.8);
      board.position.set(0, top + 0.1, s * (d / 2 - 0.45));
      board.rotation.y = s > 0 ? 0 : Math.PI;
      const holder = new THREE.Group();
      holder.applyMatrix4(m);
      holder.add(board);
      group.add(holder);
    }
  }

  let flowers = null;
  { // The Memorial Tower on its stepped base, the stone walls either side, the altar and the incense burner.
    const t = l.tower, yT = l.tribute.y, m = frame(t.at, t.ry, yT), w = t.w;
    for (let k = 0; k < 3; k++) B.box(w + 3.6 - k * 1.2, 0.35, w + 3.6 - k * 1.2, 0, 0.175 + k * 0.35, 0, C.granite, m);
    const y0 = 1.05, H = t.h - y0;
    const shaft = new THREE.CylinderGeometry(w * 0.2, w * 0.36, H, 4, 1).rotateY(Math.PI / 4).translate(0, y0 + H / 2, 0);
    B.add(shaft, C.granite, m);
    for (let k = 0; k < 4; k++) { // four fins: the plan is a cross
      const fin = new THREE.CylinderGeometry(w * 0.07, w * 0.2, H * 0.86, 4, 1).rotateY(Math.PI / 4).scale(1, 1, 0.42).translate(0, y0 + (H * 0.86) / 2, w * 0.36).rotateY((k * Math.PI) / 2);
      B.add(fin, C.stone, m);
    }
    B.box(w * 0.5, 0.3, w * 0.5, 0, t.h + 0.15, 0, C.stone, m);
    B.box(w * 0.34, H * 0.3, 0.12, 0, y0 + H * 0.24, w * 0.36 * 0.72 + 0.12, C.dark, m); // (the dark panel on its front)
    for (const s of [1, -1]) { // the stone walls with bronze figures before them
      const wm = frame(t.at, t.ry + s * 0.35, yT);
      B.box(6.5, 2.3, 0.7, s * (w / 2 + 5.4), 1.15, -0.4, C.granite, wm);
      B.box(6.9, 0.3, 1.1, s * (w / 2 + 5.4), 0.15, -0.2, C.stone, wm);
      for (let i = 0; i < 5; i++) { B.box(0.42, 1.25, 0.34, s * (w / 2 + 3.4 + i * 1.0), 0.92, 0.45, C.bronze, wm); B.box(0.3, 0.3, 0.3, s * (w / 2 + 3.4 + i * 1.0), 1.7, 0.45, C.bronze, wm); }
    }
    const am = frame(l.altar.at, l.altar.ry, yT);
    B.box(2.4, 0.75, 1.0, 0, 0.375, 0, C.granite, am);
    B.box(2.7, 0.14, 1.2, 0, 0.82, 0, C.stone, am);
    B.add(new THREE.CylinderGeometry(0.34, 0.24, 0.42, 10).translate(0, 0.52, 1.25), C.bronze, am); // the incense burner
    B.box(0.7, 0.3, 0.7, 0, 0.15, 1.25, C.stone, am);
    // white chrysanthemums on the altar (shown after a tribute)
    flowers = new THREE.Group();
    const stem = new THREE.CylinderGeometry(0.012, 0.012, 0.34, 4).rotateZ(Math.PI / 2), head = new THREE.IcosahedronGeometry(0.075, 0);
    const sm = new THREE.MeshLambertMaterial({ color: 0x4f7f45 }), hm = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
    for (let i = 0; i < 9; i++) {
      const f = new THREE.Group(), a = new THREE.Mesh(stem, sm), b = new THREE.Mesh(head, hm);
      b.position.x = 0.2;
      f.add(a, b);
      f.position.set(-0.9 + i * 0.225, 0.92, 0.25 + (i % 2) * 0.1);
      f.rotation.y = Math.PI / 2 + (i % 3 - 1) * 0.25;
      flowers.add(f);
    }
    flowers.applyMatrix4(am);
    flowers.visible = false;
    flowers.name = 'hyeonchung-flowers';
    group.add(flowers);
  }

  { // The Chungseong Fountain: two pale green basins, bronze figures with a flag on top.
    const f = l.fountain, m = frame(f.at, 0);
    B.add(new THREE.CylinderGeometry(f.r, f.r * 0.94, 0.55, 20).translate(0, 0.275, 0), C.basin, m);
    B.add(new THREE.CylinderGeometry(f.r * 0.93, f.r * 0.93, 0.05, 20).translate(0, 0.56, 0), C.water, m);
    B.add(new THREE.CylinderGeometry(0.5, 0.75, 1.5, 10).translate(0, 1.0, 0), C.basin, m);
    B.add(new THREE.CylinderGeometry(f.r * 0.6, 0.6, 0.7, 20).translate(0, 2.0, 0), C.basin, m);
    B.add(new THREE.CylinderGeometry(f.r * 0.57, f.r * 0.57, 0.05, 20).translate(0, 2.36, 0), C.water, m);
    B.add(new THREE.CylinderGeometry(0.7, 0.9, 0.5, 8).translate(0, 2.6, 0), C.stone, m);
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; B.box(0.32, 1.0, 0.26, Math.cos(a) * 0.45, 3.35, Math.sin(a) * 0.45, C.bronze, m, -a); B.box(0.22, 0.22, 0.22, Math.cos(a) * 0.45, 3.97, Math.sin(a) * 0.45, C.bronze, m); }
    B.add(new THREE.CylinderGeometry(0.035, 0.035, 2.6, 5).translate(0, 4.1, 0), C.bronze, m);
    B.box(0.9, 0.6, 0.05, 0.47, 5.05, 0, C.bronze, m);
  }

  { // The main gate on Hyeonchung-ro: a stone pillar either side of the road, the name on a stone by it.
    const g = l.mainGate, m = frame(g.at, g.ry);
    for (const s of [1, -1]) { B.box(1.1, 3.2, 1.1, s * (g.w / 2), 1.6, 0, C.granite, m); B.box(1.4, 0.25, 1.4, s * (g.w / 2), 3.32, 0, C.stone, m); }
    B.box(4.4, 1.5, 0.6, g.w / 2 + 3.6, 0.75, 0.2, C.granite, m);
    const name = textPlane('국립서울현충원', 4.0, 1.0, { bg: '#d2cdc2', fg: '#2f2d2a', font: 'bold 64px serif' });
    name.position.set(g.w / 2 + 3.6, 0.8, 0.52);
    const holder = new THREE.Group();
    holder.applyMatrix4(m);
    holder.add(name);
    group.add(holder);
  }

  { // The buildings on the grounds: plain pale walls, a dark green roof slab.
    for (const b of builds) {
      const sh = new THREE.Shape(b.p.map(([x, z]) => new THREE.Vector2(l.x + x, -(l.z + z))));
      const wall = new THREE.ExtrudeGeometry(sh, { depth: b.h + 0.6, bevelEnabled: false }).rotateX(-Math.PI / 2).translate(0, b.y - 0.6, 0);
      B.add(wall, C.wall);
      const [x0, z0, x1, z1] = b.box;
      B.box(x1 - x0 + 0.6, 0.3, z1 - z0 + 0.6, l.x + (x0 + x1) / 2, b.y + b.h + 0.15, l.z + (z0 + z1) / 2, C.tileDark);
    }
  }
  group.add(B.mesh('hyeonchung-built'));

  { // The headstones: plain white, no names; by tile, so far ones are skipped.
    const [sw, sh, sd] = P.stone, tiles = new Map();
    const ok = (x, z) => offWay(x, z, P.edge) && !flatAt(l, x, z) && !inAny(builds, x, z, 1) && !inAny(water, x, z, 0.8);
    let count = 0;
    for (const pl of plots) {
      for (const [x, z] of plotStones(pl, { step: lowSpec ? 1.9 : P.stones }, ok)) {
        const k = Math.floor(x / P.tile) + ',' + Math.floor(z / P.tile);
        if (!tiles.has(k)) tiles.set(k, []);
        tiles.get(k).push([l.x + x, LY(x, z), l.z + z, -pl.a]);
        count++;
      }
    }
    // (near: a box each; far: one flat face each, a sixth of the triangles)
    const geo = new THREE.BoxGeometry(sw, sh, sd).translate(0, sh / 2, 0), mat = addSnowCover(new THREE.MeshLambertMaterial({ color: 0xf4f2ec }));
    const flat = new THREE.PlaneGeometry(sw, sh).translate(0, sh / 2, 0), flatMat = new THREE.MeshLambertMaterial({ color: 0xf4f2ec, side: THREE.DoubleSide });
    group.userData.stoneTiles = [];
    for (const [k, list] of tiles) {
      const [i, j] = k.split(',').map(Number);
      const mid = [l.x + (i + 0.5) * P.tile, l.z + (j + 0.5) * P.tile];
      const near = instanced(geo, mat, list, 'hyeonchung-stones-' + k), far = instanced(flat, flatMat, list, 'hyeonchung-stones-far-' + k);
      far.visible = false;
      group.userData.stoneTiles.push({ mid, near, far });
      group.add(near, far);
    }
    group.userData.counts.stones = count;
  }

  { // The wood: pines mostly, some round trees; none on the plots, the roads, the court or the lawns.
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const [fx0, fz0, fx1, fz1] = boxOf(l.foot);
    const round = [], pines = [], courtBox = boxOf(l.court);
    const want = lowSpec ? P.trees / 2 : P.trees;
    for (let k = 0; k < want * 40 && round.length + pines.length < want; k++) {
      const x = fx0 + rnd() * (fx1 - fx0), z = fz0 + rnd() * (fz1 - fz0);
      if (!inPoly(x, z, l.foot) || ringDist(x, z, l.foot) < 1.5) continue;
      if (flatAt(l, x, z) || inAny(plots, x, z, 1.5) || inAny(lawns, x, z, 1) || inAny(water, x, z, 1.5) || inAny(builds, x, z, 2.5) || inAny(solids, x, z, 3) || !offWay(x, z, P.treeClear)) continue;
      if (inBox(x, z, courtBox, 4) && ringDist(x, z, l.court) < 4) continue;
      const sc = 0.85 + rnd() * 0.7;
      (rnd() < 0.72 ? pines : round).push([l.x + x, LY(x, z) - 0.1, l.z + z, rnd() * 6, sc, sc, sc]);
    }
    const trunk = new THREE.CylinderGeometry(0.14, 0.2, 2.4, 5, 1, true).translate(0, 1.2, 0);
    const crown = new THREE.IcosahedronGeometry(1.8, 0).translate(0, 3.3, 0);
    const cone = new THREE.ConeGeometry(1.4, 3.8, 6).translate(0, 3.7, 0);
    group.add(instanced(trunk, new THREE.MeshLambertMaterial({ color: 0x6b5440 }), round.concat(pines), 'hyeonchung-trunks'));
    const greens = ['#5f9a4a', '#6fae55', '#4f8a43', '#7bb463'].map((c) => new THREE.Color(c));
    group.add(instanced(crown, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })), round, 'hyeonchung-crowns', (m, i) => m.setColorAt(i, leafColor(greens[i % greens.length], leafHash(i, 9), MIX.wood))));
    group.add(instanced(cone, addSnowCover(new THREE.MeshLambertMaterial({ color: 0x3f6f3a, flatShading: true })), pines, 'hyeonchung-pines'));
    group.userData.counts.trees = round.length + pines.length;
  }

  scene.add(group);
  const [bx0, bz0, bx1, bz1] = hyeonchungBox(l);
  let wait = 0, flowersLeft = 0;
  return {
    group,
    counts: group.userData.counts,
    tribute() { flowersLeft = P.flowers; flowers.visible = true; },
    update(p, dt = 0) {
      if (flowersLeft > 0 && (flowersLeft -= dt) <= 0) flowers.visible = false;
      if ((wait -= dt) > 0) return;
      wait = 0.25;
      const far = Math.hypot(Math.max(l.x + bx0 - p.x, 0, p.x - l.x - bx1), Math.max(l.z + bz0 - p.z, 0, p.z - l.z - bz1)) > P.hide;
      group.visible = !far;
      if (!far) for (const t of group.userData.stoneTiles) { const d = Math.hypot(p.x - t.mid[0], p.z - t.mid[1]); t.near.visible = d < P.stonesNear; t.far.visible = !t.near.visible && d < P.stonesFar; }
    },
  };
}
