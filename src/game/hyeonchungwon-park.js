// Seoul National Cemetery (국립서울현충원): what you see, loaded by
// game/hyeonchungwon-walk.js when you come near. The numbers are the map's
// `hyeonchung` landmark (scripts/build-hyeonchungwon.mjs).
//
//   The ground: a grid at its height (core/hyeonchung-ground.js): the wood's
//     floor, lighter on the burial plots and the lawns.
//   The roads and paths as ribbons, the stairs as steps.
//   The burial plots: rows of plain white headstones, no names (one
//     InstancedMesh per 60 m tile; far tiles draw one flat face a stone).
//   The lawn, the paved court, Hyeonchungmun (blue-green tiled roof with its
//     ribs, ridges and raised eave tips on white columns, a painted band and
//     brackets under the eaves, two low wings with latticed windows), the
//     tower's terrace and stairs, the Memorial Tower (a tall granite shaft on
//     a stepped base) with its altar and incense burner, the Chungseong
//     Fountain (two basins with falling water, bronze soldiers, a flag on
//     top), the Taegeukgi on a pole, the main gate's pillars.
//   The sun and the moon over the ridge behind the tower, both always there
//     (the verse: "the sun and the moon shall keep this hill"), and a soft
//     light on the tower after dark.
//   The ridge behind (closed land, landmark `ridge`): a bare green hill, one
//     mesh, so the grounds do not end in flat land.
//   The wood: pines mostly (OSM: needleleaved), some round trees in the
//     season's colours.
//   Incense burns at the altar after you pay your respects.
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
import { createCharacter } from '../core/character.js';
import { hyeonchungSolids, HC_GATE } from './hyeonchungwon-walk.js';
import { heightGrid, polyRow } from '../core/height-grid.js';

export const HC_PARK = {
  cell: 3, // m: the ground's grid
  sink: 0.1, // the grid is drawn this much lower (you walk on the true height)
  hide: 700, // m: past this nothing is drawn
  rows: 2.2, // m between rows of headstones (Yozi 2026-11-24: a quarter fewer than 1.9 x 1.15 m, a little bigger)
  stones: 1.33, // m between stones in a row (lowSpec: 2)
  stone: [0.36, 0.72, 0.14], // m: a headstone (game-size)
  edge: 0.9, // m: no stone this near a plot's edge or a road
  tile: 60, // m: headstones are drawn by tile
  stonesNear: 110, // m: a tile past this draws each stone as one flat face
  stonesFar: 300, // m: a tile past this is not drawn
  trees: 1100, // in the wood (lowSpec: 550)
  treeClear: 2.2, // m from a road's edge
  skyFar: 330, // m from you: where the sun and the moon over the ridge are drawn
  sun: [-0.33, 0.17, 38], // to one side of the tower: turn and height (radians), size (m)
  moon: [0.33, 0.15, 30], // to the other
  wood: { drawn: false, cell: 6, clear: 5, way: 4, top: [4.6, 2.4], foot: 1.2 }, // the wood inside the grounds, drawn whole: m from plots and lawns, m from a way's edge, treetop height (least, spread)
  belt: { fill: 3.1, reach: 24, close: 1.8, lawn: 13, dots: 0.07, clear: 22 }, // the wood round the court: a tree every `fill` m on the free ground out to `reach` m; `close` to the terrace and the gate, `lawn` m back from the paved way (open lawn, with a tree on `dots` of its spots); no headstones within `clear` m of the court
  rim: { step: 3, deep: 8, clump: 9, share: 0.5, court: 9 }, // the lawn before the gate: trees within `deep` m of its rim, in clumps (`share` of the `clump` m cells), none this near the court
  flowers: 15, // s: the incense burns, then it is out so the next visitor can light theirs (Yozi 2026-11-25; was 120)
  smoke: { n: 14, life: 8, h: 1.3, op: 0.5, out: 3 }, // wisps; s for one to climb h m; its strongest opacity; s over which it thins at the end
};

// The verse on the wall before the Memorial Tower (the offering place's dedication, by Yi Eun-sang), as it is cut there.
export const HC_VERSE = ['여기는 민족의 얼이 서린 곳', '조국과 함께 영원히 가는 이들', '해와 달이 이 언덕을 보호하리라'];

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

// The Taegeukgi on a canvas (3:2): the taegeuk a half of the height across,
// its halves along the diagonal, the four trigrams on the diagonals
// (geon upper left, gon lower right, gam upper right, ri lower left).
export function taegeukgi(c, W = 384) {
  const H = (W * 2) / 3, R = H / 4, g = c.getContext('2d');
  c.width = W; c.height = H;
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(Math.atan2(2, 3));
  g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(0, 0, R, Math.PI, 0); g.fill();
  g.fillStyle = '#0047a0'; g.beginPath(); g.arc(0, 0, R, 0, Math.PI); g.fill();
  g.fillStyle = '#cd2e3a'; g.beginPath(); g.arc(-R / 2, 0, R / 2, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#0047a0'; g.beginPath(); g.arc(R / 2, 0, R / 2, 0, Math.PI * 2); g.fill();
  g.restore();
  const a = Math.atan2(2, 3), bar = R / 6, gap = R / 12;
  // each: its direction from the middle, its three bars from the inside out (1 whole, 0 broken)
  for (const [dir, bars] of [[Math.PI + a, [1, 1, 1]], [a, [0, 0, 0]], [-a, [0, 1, 0]], [Math.PI - a, [1, 0, 1]]]) {
    g.save();
    g.translate(W / 2, H / 2);
    g.rotate(dir);
    g.fillStyle = '#000000';
    bars.forEach((whole, i) => {
      const x = R * 1.5 + i * (bar + gap);
      if (whole) g.fillRect(x, -R / 2, bar, R);
      else { g.fillRect(x, -R / 2, bar, R / 2 - gap / 2); g.fillRect(x, gap / 2, bar, R / 2 - gap / 2); }
    });
    g.restore();
  }
  return c;
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

// Lines of text cut in dark stone (the verse wall): a sharp canvas, each line on its own row.
function textLines(lines, w, h, { bg = '#27324a', fg = '#d9d2b8' } = {}) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = Math.round((1024 * h) / w);
  const g = c.getContext('2d'), row = c.height / (lines.length + 0.6), size = Math.floor(row * 0.62);
  g.fillStyle = bg; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = fg; g.font = `bold ${size}px 'Nanum Myeongjo', 'Noto Serif KR', 'AppleMyungjo', 'Batang', serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((t, i) => g.fillText(t, c.width / 2, row * (i + 0.8), c.width - 60));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: t }));
}

// The same words in brush script (public/hyeonchungwon/*.png, drawn once with the JS Arirang font, Jeongseon County's
// free font; Yozi 2026-11-25). The canvas text above stays until the picture is in, and if it never comes.
function brush(mesh, file) {
  new THREE.TextureLoader().load((import.meta.env?.BASE_URL || '/') + 'hyeonchungwon/' + file, (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    mesh.material.map.dispose(); mesh.material.map = t; mesh.material.needsUpdate = true;
  }, undefined, () => {});
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
  bronze: '#5b4a34', bronzeDark: '#43372a', cream: '#efe6cf', dan: '#3d8f7a', red: '#c8452f', ochre: '#e0b84a', silver: '#b4b8bd', blue: '#2f6fa8', joint: '#9c978c', verse: '#27324a', patina: '#4f6f63', dark: '#3a3936', wall: '#ebe7dc', base: '#8f8b84', basin: '#9fd2c2', water: '#6fb7d6', lawn: '#8dba63',
};

export function buildHyeonchungwonPark({ scene, l, y, lowSpec = false, sky = null }) {
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
  const mems = (l.memorials || []).map((m) => { const c = Math.cos(m.ry), sn = Math.sin(m.ry), [w, d] = m.size, p = [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map(([u, v]) => [m.at[0] + u * c + v * sn, m.at[1] - u * sn + v * c]); return { p, box: boxOf(p) }; });
  const inAny = (list, x, z, m = 0) => list.some((q) => inBox(x, z, q.box, m) && (inPoly(x, z, q.p) || (m && ringDist(x, z, q.p) < m)));
  const offWay = (x, z, m) => { const n = wayNear(l, x, z); return !n || n.e > m; };

  { // The ground: the wood's floor, lighter on the plots and the lawns.
    const [bx0, bz0, bx1, bz1] = hyeonchungBox(l);
    const pos = [], col = [], c = P.cell;
    const wood = ['#6f8f4f', '#7a9a55', '#647f47', '#82995c'].map((h) => new THREE.Color(h));
    const turf = ['#8cb866', '#93be6c', '#86b160'].map((h) => new THREE.Color(h));
    const hash = (a, b) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
    const yy = (x, z) => { const h = LY(x, z); return Math.max(h - P.sink, 0.035); }; // (level ground: just over the map's park green)
    const hg = heightGrid(bx0, bz0, bx1, bz1, c, yy); // (each corner's height once, not once per cell)
    for (let j = 0; j < hg.zs.length - 1; j++) {
      const z = hg.zs[j], z2 = hg.zs[j + 1], mz = z + c / 2;
      const inMid = polyRow(l.foot, mz), inCorner = polyRow(l.foot, z); // (inPoly along this row, the foot's crossings found once)
      for (let i = 0; i < hg.xs.length - 1; i++) {
        const x = hg.xs[i], x2 = hg.xs[i + 1], mx = x + c / 2;
        if (!inMid(mx) && !inCorner(x)) continue;
        if (flatAt(l, mx, mz)) continue; // (the court and the lawn have their own floor)
        const q = [[x, hg.y(i, j), z], [x2, hg.y(i + 1, j), z], [x2, hg.y(i + 1, j + 1), z2], [x, hg.y(i, j + 1), z2]];
        const light = inAny(plots, mx, mz) || inAny(lawns, mx, mz);
        const list = light ? turf : wood, on = list[Math.floor(hash(Math.round(x), Math.round(z)) * list.length) % list.length];
        for (const k of [0, 3, 2, 0, 2, 1]) { const [a, h, b] = q[k]; pos.push(l.x + a, h, l.z + b); col.push(on.r, on.g, on.b); }
      }
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
        if ((inPoly((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, l.court) || (inPoly(a[0], a[1], l.court) && inPoly(b[0], b[1], l.court)))) continue; // (a way that crosses the court: the court's own paving is there)
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
      else flat(f.p, f.y + 0.09, C.pavingDark, 'hyeonchung-terrace', f.y); // (just over a way's ribbon, 0.07: a real path runs along the terrace's edge and half under it)
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

  // A bar from p to q (frame metres), t thick: roof ribs, rafters, arms, rifles.
  const bar = (p, q, t, color, m, w = t) => {
    const a = new THREE.Vector3(...p), b = new THREE.Vector3(...q), len = a.distanceTo(b);
    const g = new THREE.BoxGeometry(w, t, len);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.clone().sub(a).normalize()));
    g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
    B.add(g, color, m);
  };
  // A tiled hipped roof at (ox, 0): the tiles' ribs down every slope, white ridges, raised eave tips.
  const tiledRoof = (w, d, y0, y1, ridge, ox, m, step = 0.55, lift = 0.45) => { // (lift: how far the corners sweep up, m)
    const a = w / 2, b = d / 2, r = ridge / 2, up = 0.05;
    B.box(w + 0.12, 0.12, d + 0.12, ox, y0 - 0.05, 0, C.white, m); // the eaves' white edge
    B.add(hipRoof(w, d, y0, y1, ridge).translate(ox, 0, 0), C.tile, m);
    for (let x = -a + 0.3; x <= a - 0.3; x += step) { // front and back
      const t = Math.abs(x) <= r ? 1 : (a - Math.abs(x)) / (a - r);
      for (const s of [1, -1]) bar([ox + x, y0 + up, s * b], [ox + x, y0 + (y1 - y0) * t + up, s * b * (1 - t)], 0.07, C.tileDark, m, 0.13);
    }
    for (let z = -b + 0.3; z <= b - 0.3; z += step) { // the two ends
      const t = 1 - Math.abs(z) / b;
      for (const s of [1, -1]) bar([ox + s * a, y0 + up, z], [ox + s * (a - (a - r) * t), y0 + (y1 - y0) * t + up, z], 0.07, C.tileDark, m, 0.13);
    }
    B.box(ridge + 0.5, 0.3, 0.34, ox, y1 + 0.12, 0, C.white, m); // the ridge and its two end tiles
    for (const s of [1, -1]) B.box(0.3, 0.5, 0.4, ox + s * (r + 0.2), y1 + 0.3, 0, C.white, m);
    for (const sx of [1, -1]) for (const sz of [1, -1]) {
      bar([ox + sx * r, y1 + 0.08, 0], [ox + sx * a, y0 + 0.1, sz * b], 0.2, C.white, m); // the hips
      // the raised tip: the corner's ridge curves up and out in four short pieces, steeper each time; a finial on its end
      const N = 4, reach = 0.45 + lift * 0.25, at = (k) => { const f = k / N; return [ox + sx * (a - 0.6 + (reach + 0.6) * f), y0 + 0.12 + lift * f * f, sz * (b - 0.6 + (reach + 0.6) * f)]; };
      for (let k = 0; k < N; k++) bar(at(k), at(k + 1), 0.2, C.white, m);
      if (lift > 0.8) { // (a big roof: the eaves' own edge lifts to the tip too, and the tip's end tile)
        const tip = at(N);
        const e = [tip[0], tip[1] - 0.1, tip[2]], h = lift * 0.16; // (two pieces a side, so the edge bends)
        bar([ox + sx * (a - 3.2), y0 + 0.02, sz * b], [ox + sx * (a - 1.3), y0 + h, sz * (b + 0.05)], 0.16, C.white, m, 0.22);
        bar([ox + sx * (a - 1.3), y0 + h, sz * (b + 0.05)], e, 0.16, C.white, m, 0.22);
        bar([ox + sx * a, y0 + 0.02, sz * (b - 2.6)], [ox + sx * (a + 0.05), y0 + h, sz * (b - 1.1)], 0.16, C.white, m, 0.22);
        bar([ox + sx * (a + 0.05), y0 + h, sz * (b - 1.1)], e, 0.16, C.white, m, 0.22);
        B.box(0.24, 0.3, 0.24, tip[0], tip[1] + 0.12, tip[2], C.white, m);
      }
    }
  };

  { // Hyeonchungmun (Yozi's photo, 2026-11-25): the open hall on four white square columns, white beams and white
    // brackets under the eaves (no painted colours), a blue-green tiled roof whose corners sweep up, a low wing either side.
    const g = l.gate, G = HC_GATE, m = frame(g.at, g.ry), hallW = g.w * G.hall, d = g.d, colH = g.h * 0.5, plat = G.plat, COLS = 4;
    B.box(hallW + 2 * G.side, plat, d + 2 * G.out, 0, plat / 2, 0, C.stone, m);
    for (let k = 1; k <= 3; k++) for (const s of [1, -1]) B.box(hallW * G.stair, plat * (1 - k / 4), G.steps / 3, 0, (plat * (1 - k / 4)) / 2, s * (d / 2 + G.out + (G.steps / 3) * (k - 0.5)), C.stone, m); // (steps, front and back)
    for (const s of [1, -1]) for (const e of [1, -1]) B.box(0.4, plat + 0.2, 1.7, e * (hallW * G.stair / 2 + 0.2), (plat + 0.2) / 2, s * (d / 2 + 1.35), C.granite, m); // (the steps' side stones)
    const colZ = d / 2 - 0.9, colX = (i) => -hallW / 2 + 0.6 + (i * (hallW - 1.2)) / (COLS - 1);
    for (let i = 0; i < COLS; i++) for (const s of [1, -1]) {
      B.box(0.62, colH, 0.62, colX(i), plat + colH / 2, s * colZ, C.white, m); // a square white column
      B.box(0.9, 0.16, 0.9, colX(i), plat + 0.08, s * colZ, C.granite, m); // its base stone
      B.box(0.8, 0.16, 0.8, colX(i), plat + colH - 0.08, s * colZ, C.white, m); // its capital
    }
    const top = plat + colH, fz = d / 2 - 0.6;
    B.box(hallW + 0.2, 0.42, d - 1.2, 0, top + 0.21, 0, C.white, m); // the beams
    B.box(hallW + 0.3, 0.34, d - 1.1, 0, top + 0.59, 0, C.white, m); // the band over them, white as the rest
    const nb = Math.round(hallW / 1.05); // a row of white brackets under the eaves, front and back
    for (let i = 0; i <= nb; i++) for (const s of [1, -1]) {
      const x = -hallW / 2 + 0.3 + (i * (hallW - 0.6)) / nb;
      B.box(0.5, 0.26, 1.0, x, top + 0.89, s * (colZ + 0.3), C.white, m);
      B.box(0.3, 0.2, 0.5, x, top + 1.08, s * (colZ + 0.75), C.cream, m);
    }
    const y0 = top + 1.2, rw = hallW + 3.6, rd = d + 3.0, nr = Math.round(rw / 0.5);
    for (let i = 0; i <= nr; i++) for (const s of [1, -1]) { // rafter ends under the eaves, white
      const x = -rw / 2 + 0.25 + (i * (rw - 0.5)) / nr;
      bar([x, y0 - 0.3, s * (colZ + 0.2)], [x, y0 - 0.12, s * (rd / 2 - 0.1)], 0.1, C.white, m, 0.12);
    }
    tiledRoof(rw, rd, y0, g.h + 0.7, hallW * 0.55, 0, m, 0.55, 0.95);
    const wingW = (g.w - hallW) / 2, wd = d * 0.62, wh = g.h * 0.36, bays = 4;
    for (const s of [1, -1]) {
      const x = s * (g.w / 2 - wingW / 2);
      B.box(wingW + 0.1, 0.9, wd + 0.1, x, 0.45, 0, C.base, m); // the stone base
      for (let k = 0; k < 2; k++) for (const f of [1, -1]) B.box(wingW + 0.14, 0.04, 0.04, x, 0.3 + k * 0.3, f * (wd / 2 + 0.06), C.stone, m); // (its courses)
      B.box(wingW - 0.1, wh - 0.9, wd - 0.1, x, 0.9 + (wh - 0.9) / 2, 0, C.wall, m);
      for (let i = 0; i <= bays; i++) for (const f of [1, -1]) B.box(0.22, wh - 0.9, 0.12, x - wingW / 2 + 0.16 + (i * (wingW - 0.32)) / bays, 0.9 + (wh - 0.9) / 2, f * (wd / 2), C.white, m); // posts
      for (let i = 0; i < bays; i++) for (const f of [1, -1]) { // a window in each bay: dark glass, a white lattice
        const wx = x - wingW / 2 + 0.16 + ((i + 0.5) * (wingW - 0.32)) / bays, ww = (wingW - 0.32) / bays - 0.42, wy = 0.9 + (wh - 0.9) * 0.52, hh = (wh - 0.9) * 0.62;
        B.box(ww, hh, 0.06, wx, wy, f * (wd / 2 - 0.02), C.dark, m);
        B.box(ww + 0.12, 0.07, 0.1, wx, wy + hh / 2, f * (wd / 2), C.white, m);
        B.box(ww + 0.12, 0.07, 0.1, wx, wy - hh / 2, f * (wd / 2), C.white, m);
        B.box(0.05, hh, 0.09, wx, wy, f * (wd / 2 + 0.01), C.white, m);
        B.box(ww, 0.05, 0.09, wx, wy, f * (wd / 2 + 0.01), C.white, m);
      }
      B.box(wingW + 0.3, 0.2, wd + 0.3, x, wh + 0.02, 0, C.white, m); // (the white band under the wing's eaves)
      tiledRoof(wingW + 1.4, wd + 1.8, wh + 0.14, wh + 1.5, wingW * 0.55, x, m);
    }
    for (const s of [1, -1]) { // the name board in its white frame, front and back
      B.box(3.0, 1.2, 0.1, 0, top + 0.5, s * (fz + 0.12), C.white, m);
      const board = textPlane('현충문', 2.7, 0.95);
      board.position.set(0, top + 0.5, s * (fz + 0.19));
      board.rotation.y = s > 0 ? 0 : Math.PI;
      const holder = new THREE.Group();
      holder.applyMatrix4(m);
      holder.add(board);
      group.add(holder);
    }
  }

  // Two honour guards in black dress uniform stand at the gate's front, one before each inner column (Yozi's photo).
  const guards = [];
  {
    const g = l.gate, hallW = g.w * HC_GATE.hall, gx = (hallW - 1.2) / 6, gz = g.d / 2 - 0.9 + 0.75, c = Math.cos(g.ry), sn = Math.sin(g.ry);
    const black = new THREE.MeshLambertMaterial({ color: 0x17171c }), white = new THREE.MeshLambertMaterial({ color: 0xf2f0ea }), gold = new THREE.MeshLambertMaterial({ color: 0xd9b24a });
    for (const e of [1, -1]) {
      const ch = createCharacter({ model: 'jacket-black', pants: 'black', skirt: null, tee: null, hair: 'black', dye: 'black', hairStyle: 'shaved', skin: 'light' });
      const cap = new THREE.Group(); // a peaked cap: black crown, white band, a short visor, a gold badge
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.31, 0.16, 16), black); crown.position.y = 0.4;
      const band = new THREE.Mesh(new THREE.CylinderGeometry(0.315, 0.315, 0.07, 16), white); band.position.y = 0.3;
      const visor = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 16, 1, false, -Math.PI / 2.6, Math.PI / 1.3), black); visor.position.set(0, 0.26, 0.14);
      const badge = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.03), gold); badge.position.set(0, 0.38, 0.34);
      cap.add(crown, band, visor, badge);
      cap.position.y = -0.1; // (down onto the head: it sat above the forehead, Yozi 2026-11-25)
      ch.addProp('head', cap);
      const kit = new THREE.Group(); // a white belt with a gold buckle
      const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.245, 0.25, 0.05, 14), white); belt.position.y = 0.44;
      const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), gold); buckle.position.set(0, 0.44, 0.22);
      kit.add(belt, buckle);
      ch.addProp('body', kit);
      ch.root.position.set(l.x + g.at[0] + e * gx * c + gz * sn, HC_GATE.plat, l.z + g.at[1] - e * gx * sn + gz * c);
      ch.root.rotation.y = g.ry;
      ch.root.name = 'hyeonchung-guard';
      ch.animate(0, 0);
      group.add(ch.root);
      guards.push(ch);
    }
    group.userData.counts.guards = guards.length;
  }

  let flowers = null;
  { // The Memorial Tower (Seoul's, from Yozi's two photos, 2026-11-25): a thick round stone canopy on a drum, wide
    // over the offering place, and on it the tower: four smooth granite slabs in a cross, their outer edges leaning
    // in and their tops cut on a slope up to the middle, each with a low sloping foot out over the canopy. No courses.
    // The back is not in the photos: drawn the same as the front (made up). Before it the verse wall, the burner, the
    // "충혼" stone.
    const t = l.tower, yT = l.tribute.y, m = frame(t.at, t.ry, yT), w = t.w;
    const yD = 3.2, R = w * 0.82, fh = 1.25; // (the canopy's underside over the verse wall, its radius, its face's height)
    B.add(new THREE.CylinderGeometry(w * 0.52, w * 0.52, yD, 24).translate(0, yD / 2, 0), C.stone, m); // the drum under it, in its shade
    B.box(w * 1.12, yD, 0.5, 0, yD / 2, w * 0.5, C.dark, m); // (the shade behind the verse wall)
    B.add(new THREE.CylinderGeometry(R, R - 0.35, fh, 32).translate(0, yD + fh / 2, 0), C.granite, m); // the canopy
    B.add(new THREE.CylinderGeometry(R - 0.5, R - 0.5, 0.08, 32).translate(0, yD + fh + 0.04, 0), C.lawn, m); // (grass on its top, as from the air)
    for (let i = 0; i < 18; i++) { const a = (i / 18) * Math.PI * 2 + 0.17, r = R - 0.165; bar([Math.sin(a) * (r - 0.175), yD, Math.cos(a) * (r - 0.175)], [Math.sin(a) * (r + 0.175), yD + fh, Math.cos(a) * (r + 0.175)], 0.03, C.joint, m, 0.05); } // (its face's joints)
    const y0 = yD + fh + 0.08, H = t.h - y0, th = w * 0.155, a0 = w * 0.3, a1 = w * 0.14;
    // a slab from the middle out along +z, turned k quarter turns: out to r0 at its foot and r1 at its top, hIn high
    // at the middle and hOut at its outer edge, th thick
    const slab = (z0, r0, r1, hIn, hOut, k, color) => {
      const g = new THREE.BoxGeometry(th, 1, 1), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const up = p.getY(i) > 0, out = p.getZ(i) > 0; p.setY(i, y0 + (up ? (out ? hOut : hIn) : 0)); p.setZ(i, out ? (up ? r1 : r0) : z0); }
      g.computeVertexNormals();
      B.add(g.rotateY((k * Math.PI) / 2), color, m);
    };
    for (let k = 0; k < 4; k++) {
      slab(0, a0, a1, H, H * 0.9, k, k % 2 ? C.stone : C.granite); // the tower's slab (two tones, so the cross reads)
      slab(a0 - 0.05, R - 1.0, R - 1.0, 1.3, 0.3, k, C.granite); // its low foot, sloping out over the canopy
      const q = ((k + 0.5) * Math.PI) / 2, d = (th / 2 + 0.01) * Math.SQRT2; // (the dark corner between two slabs, to the top)
      bar([Math.sin(q) * d, y0, Math.cos(q) * d], [Math.sin(q) * d, y0 + H * 0.97, Math.cos(q) * d], 0.07, C.joint, m);
    }
    for (const s of [1, -1]) { // the stone walls with bronze figures before them
      const wm = frame(t.at, t.ry + s * 0.35, yT);
      B.box(6.5, 2.3, 0.7, s * (w / 2 + 5.4), 1.15, -0.4, C.granite, wm);
      B.box(6.9, 0.3, 1.1, s * (w / 2 + 5.4), 0.15, -0.2, C.stone, wm);
      for (let i = 0; i < 5; i++) { B.box(0.42, 1.25, 0.34, s * (w / 2 + 3.4 + i * 1.0), 0.92, 0.45, C.bronze, wm); B.box(0.3, 0.3, 0.3, s * (w / 2 + 3.4 + i * 1.0), 1.7, 0.45, C.bronze, wm); }
    }
    // The verse wall (the offering place's dedication, by Yi Eun-sang): dark stone in a granite frame, the three lines as they are cut.
    const am = frame(l.altar.at, l.altar.ry, yT), vw = 6.2, vh = 1.7, vb = 1.25, vz = -1.25; // (the dark stone starts over the burner's height, so the lines are read past it)
    B.box(vw + 0.9, vb, 0.9, 0, vb / 2, vz, C.granite, am);
    B.box(vw + 1.1, 0.12, 1.0, 0, vb + 0.06, vz, C.stone, am);
    B.box(vw, vh, 0.4, 0, vb + vh / 2, vz, C.verse, am);
    for (const s of [1, -1]) B.box(0.45, vh + 0.2, 0.6, s * (vw / 2 + 0.22), vb + (vh + 0.2) / 2, vz, C.granite, am);
    B.box(vw + 0.9, 0.18, 0.6, 0, vb + vh + 0.09, vz, C.granite, am);
    const verse = textLines(HC_VERSE, vw - 0.3, vh - 0.2, { bg: C.verse, fg: '#d9d2b8' });
    verse.position.set(0, vb + vh / 2, vz + 0.215);
    brush(verse, 'verse.png');
    // The incense burner (bronze, three legs, a lid) and the "충혼" stone beside it, on one low slab.
    B.box(3.3, 0.16, 1.3, 0, 0.08, 0, C.stone, am);
    const bx = -0.75;
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + Math.PI / 3; bar([bx + Math.sin(a) * 0.3, 0.16, Math.cos(a) * 0.3], [bx + Math.sin(a) * 0.24, 0.6, Math.cos(a) * 0.24], 0.1, C.patina, am); }
    B.add(new THREE.CylinderGeometry(0.44, 0.32, 0.5, 12).translate(bx, 0.8, 0), C.patina, am);
    B.add(new THREE.CylinderGeometry(0.5, 0.5, 0.07, 12).translate(bx, 1.07, 0), C.silver, am); // its lid's rim (silver: Yozi 2026-11-25)
    B.add(new THREE.CylinderGeometry(0.12, 0.42, 0.14, 12).translate(bx, 1.17, 0), C.silver, am);
    for (const s of [1, -1]) B.box(0.08, 0.22, 0.2, bx + s * 0.5, 1.0, 0, C.patina, am); // (its two ears)
    B.box(1.25, 0.82, 0.8, 0.85, 0.57, 0, C.verse, am);
    B.box(1.35, 0.08, 0.9, 0.85, 1.02, 0, C.granite, am);
    B.add(new THREE.CylinderGeometry(0.2, 0.14, 0.14, 10).translate(0.7, 1.13, 0), C.patina, am); // (the small incense bowl on it)
    const soul = textLines(['충 혼'], 1.2, 0.72, { bg: C.verse, fg: '#d9d2b8' }); // (the two letters apart and large, as on the stone)
    soul.position.set(0.85, 0.6, 0.405);
    brush(soul, 'soul.png');
    const holder = new THREE.Group();
    holder.applyMatrix4(am);
    holder.add(verse, soul);
    group.add(holder);
    // Wreaths on stands either side (nothing stands before the burner and the stone: they are seen whole, Yozi 2026-11-25).
    for (const s of [1, -1]) for (let i = 0; i < 4; i++) {
      const x = s * (vw / 2 + 1.0 + i * 0.8);
      bar([x, 0, vz + 0.45], [x, 1.05, vz + 0.6], 0.04, C.dark, am);
      B.add(new THREE.CylinderGeometry(0.27, 0.27, 0.06, 12).rotateX(Math.PI / 2 - 0.13).translate(x, 0.9, vz + 0.63), C.white, am);
      B.add(new THREE.CylinderGeometry(0.12, 0.12, 0.08, 10).rotateX(Math.PI / 2 - 0.13).translate(x, 0.9, vz + 0.65), i % 2 ? C.ochre : C.white, am);
    }
    // Incense (shown after you burn some): three sticks in the small bowl on the stone, their tips aglow, smoke rising.
    flowers = new THREE.Group();
    const stick = new THREE.CylinderGeometry(0.008, 0.008, 0.3, 4), tip = new THREE.SphereGeometry(0.018, 6, 4);
    const stickM = new THREE.MeshLambertMaterial({ color: 0x6d5a3a }), tipM = new THREE.MeshBasicMaterial({ color: 0xff7a3a });
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(stick, stickM), b = new THREE.Mesh(tip, tipM);
      a.position.set(0.7 + (i - 1) * 0.06, 1.33, 0); a.rotation.z = (i - 1) * 0.12;
      b.position.set(0.7 + (i - 1) * 0.078, 1.48, 0);
      flowers.add(a, b);
    }
    // The smoke: thin wisps that leave the tips one after another, climb slowly, curl to one side, spread and fade
    // (Yozi 2026-11-25: not round puffs shooting up).
    const puff = new THREE.SphereGeometry(0.03, 6, 5), S = P.smoke;
    flowers.userData.smoke = Array.from({ length: S.n }, (_, i) => {
      const q = new THREE.Mesh(puff, new THREE.MeshBasicMaterial({ color: 0xe6e3dc, transparent: true, opacity: 0, depthWrite: false }));
      q.userData.i = i;
      flowers.add(q);
      return q;
    });
    flowers.userData.rise = (t, left = 9) => {
      const out = Math.min(1, left / S.out); // (the last seconds: it thins away)
      for (const q of flowers.userData.smoke) {
        const i = q.userData.i, age = t / S.life - i / S.n;
        if (age < 0) { q.material.opacity = 0; continue; } // (not yet off the tip)
        const f = age % 1, k = (i % 3) - 1, curl = Math.sin(f * 4.2 + i * 1.7 + t * 0.35) * 0.05 + f * f * 0.16;
        q.position.set(0.7 + k * 0.078 * (1 - f) + curl, 1.5 + f * S.h, Math.cos(f * 3.1 + i * 2.3) * 0.05 * f);
        const w = 0.5 + f * 3.4;
        q.scale.set(w, w * (1.9 - f * 0.6), w);
        q.material.opacity = S.op * Math.min(1, f * 8) * (1 - f) * (1 - f) * out;
      }
    };
    flowers.userData.rise(0);
    flowers.applyMatrix4(am);
    flowers.visible = false;
    flowers.name = 'hyeonchung-incense';
    group.add(flowers);
  }

  // A bronze figure about 1.5 m tall at (x, y, z) facing ry: `arm` 0 = rifle held across, 1 = one arm raised, 2 = rifle forward.
  const figure = (x, y, z, ry, arm, m, sc = 1) => {
    const fm = m.clone().multiply(new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z)).multiply(new THREE.Matrix4().makeScale(sc, sc, sc));
    B.box(0.16, 0.66, 0.2, -0.13, 0.33, 0.06, C.bronze, fm); B.box(0.16, 0.66, 0.2, 0.13, 0.33, -0.08, C.bronze, fm); // a stride
    B.box(0.44, 0.56, 0.26, 0, 0.93, 0, C.bronze, fm);
    B.box(0.22, 0.24, 0.22, 0, 1.33, 0.02, C.bronze, fm);
    B.box(0.3, 0.1, 0.3, 0, 1.47, 0.02, C.bronzeDark, fm); // the helmet
    if (arm === 1) { bar([0.24, 1.15, 0], [0.42, 1.78, 0.1], 0.13, C.bronze, fm); bar([-0.24, 1.15, 0], [-0.3, 0.72, 0.16], 0.13, C.bronze, fm); }
    else if (arm === 2) { bar([0.24, 1.12, 0], [0.2, 0.95, 0.5], 0.13, C.bronze, fm); bar([-0.24, 1.12, 0], [-0.1, 1.0, 0.45], 0.13, C.bronze, fm); bar([0.05, 0.92, 0.1], [0.1, 1.08, 1.15], 0.07, C.bronzeDark, fm); }
    else { bar([0.24, 1.12, 0], [0.1, 0.9, 0.3], 0.13, C.bronze, fm); bar([-0.24, 1.12, 0], [-0.12, 1.2, 0.3], 0.13, C.bronze, fm); bar([0.28, 0.72, 0.28], [-0.3, 1.5, 0.3], 0.07, C.bronzeDark, fm); }
  };

  { // The Chungseong Fountain: two basins with falling water, soldiers round the middle, three more with a flag on top.
    const f = l.fountain, m = frame(f.at, 0), r = f.r, H = f.h || 8.4, y1 = H * 0.3, y2 = H * 0.42;
    B.add(new THREE.CylinderGeometry(r, r * 0.95, 0.7, 24).translate(0, 0.35, 0), C.basin, m);
    B.add(new THREE.CylinderGeometry(r + 0.12, r + 0.12, 0.12, 24).translate(0, 0.72, 0), C.granite, m); // its rim
    B.add(new THREE.CylinderGeometry(r * 0.94, r * 0.94, 0.05, 24).translate(0, 0.66, 0), C.water, m);
    B.add(new THREE.CylinderGeometry(r * 0.3, r * 0.4, y1, 12).translate(0, y1 / 2, 0), C.basin, m);
    B.add(new THREE.CylinderGeometry(r * 0.62, r * 0.34, 0.7, 24).translate(0, y1 + 0.35, 0), C.basin, m); // the upper basin
    B.add(new THREE.CylinderGeometry(r * 0.59, r * 0.59, 0.05, 24).translate(0, y1 + 0.68, 0), C.water, m);
    B.add(new THREE.CylinderGeometry(r * 0.3, r * 0.36, y2 - y1 - 0.7, 12).translate(0, (y1 + 0.7 + y2) / 2, 0), C.stone, m); // the plinth
    B.add(new THREE.CylinderGeometry(r * 0.34, r * 0.34, 0.14, 12).translate(0, y2 + 0.07, 0), C.granite, m);
    const n = 7, rr = r * 0.47;
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; figure(Math.sin(a) * rr, y1 + 0.7, Math.cos(a) * rr, a, i % 3, m, 0.92); } // round the upper basin, facing out
    for (let i = 0; i < 3; i++) { const a = (i / 3) * Math.PI * 2 + 0.5; figure(Math.sin(a) * 0.42, y2 + 0.14, Math.cos(a) * 0.42, a, i === 0 ? 1 : 0, m, 0.95); }
    B.add(new THREE.CylinderGeometry(0.04, 0.05, H - y2 - 0.1, 5).translate(0, (y2 + 0.1 + H) / 2, 0), C.bronzeDark, m); // the flagstaff
    bar([0.05, H - 0.15, 0], [0.5, H - 1.5, 0.12], 0.07, C.bronzeDark, m, 1.0); // the flag, hanging in folds
    bar([0.2, H - 0.5, -0.05], [0.75, H - 1.9, 0.0], 0.06, C.bronze, m, 0.7);
    // the water: a curtain off each basin's rim, jets round the lower one (one see-through mesh)
    const parts = [new THREE.CylinderGeometry(r * 0.63, r * 0.78, y1 + 0.02, 24, 1, true).translate(0, 0.7 + (y1 - 0.0) / 2, 0)];
    parts.push(new THREE.SphereGeometry(r * 0.93, 24, 5, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.42, 1).translate(0, 0.7, 0));
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2; parts.push(new THREE.ConeGeometry(0.1, 1.5, 5).rotateX(-0.5).translate(0, 1.35, r * 0.82).rotateY(a)); }
    const wg = mergeGeometries(parts.map((q) => { const u = q.toNonIndexed(); u.deleteAttribute('uv'); return u; }), false);
    wg.applyMatrix4(m);
    const wm = new THREE.Mesh(wg, new THREE.MeshLambertMaterial({ color: 0xe6f6fa, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide }));
    wm.name = 'hyeonchung-fountain-water';
    group.add(wm);
  }

  let flag = null;
  if (l.flag) { // The Taegeukgi on its pole beside the forecourt.
    const q = l.flag, m = frame(q.at, q.ry), fw = 3.0, fh = 2.0;
    B.box(1.0, 0.3, 1.0, 0, 0.15, 0, C.granite, m);
    B.add(new THREE.CylinderGeometry(0.06, 0.09, q.h, 8).translate(0, q.h / 2, 0), C.white, m);
    B.add(new THREE.SphereGeometry(0.16, 8, 6).translate(0, q.h + 0.12, 0), C.ochre, m);
    const tex = new THREE.CanvasTexture(taegeukgi(document.createElement('canvas')));
    tex.colorSpace = THREE.SRGBColorSpace;
    const cloth = new THREE.Mesh(new THREE.PlaneGeometry(fw, fh).translate(fw / 2 + 0.08, 0, 0), new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }));
    cloth.position.y = q.h - fh / 2 - 0.15;
    flag = new THREE.Group();
    flag.applyMatrix4(m);
    flag.add(cloth);
    flag.name = 'hyeonchung-taegeukgi';
    flag.userData.cloth = cloth;
    group.add(flag);
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
  for (const mm of l.memorials || []) { // The memorials (from Yozi's photos), at mm.s of their real size.
    const k = mm.s, [fw, fd] = mm.size, fr = [Math.sin(mm.ry), Math.cos(mm.ry)];
    // (level with the way before it, or with the ground under its middle where that is higher: on a slope its floor is a terrace)
    const gy = Math.max(...[0, 0.5, 0.5 + 1 / fd].map((t) => LY(mm.at[0] + fr[0] * fd * t, mm.at[1] + fr[1] * fd * t))), m = frame(mm.at, mm.ry, gy);
    const arch = (w, h, t, d, x, z) => { // a round arch of cut stone: w across, h to its crown, piers t thick
      const r = w / 2, sh = new THREE.Shape();
      sh.moveTo(-r, 0); sh.lineTo(-r, h - r); sh.absarc(0, h - r, r, Math.PI, 0, true); sh.lineTo(r, 0); sh.lineTo(r - t, 0); sh.lineTo(r - t, h - r); sh.absarc(0, h - r, r - t, 0, Math.PI, false); sh.lineTo(-r + t, 0); sh.lineTo(-r, 0);
      B.add(new THREE.ExtrudeGeometry(sh, { depth: d, bevelEnabled: false, curveSegments: 5 }).translate(x, 0.2 * k, z - d / 2), C.granite, m);
      for (const e of [1, -1]) for (let c = 1; c * 0.9 * k < h - r; c++) B.box(t + 0.03, 0.03, d + 0.03, x + e * (r - t / 2), 0.2 * k + c * 0.9 * k, z, C.joint, m); // (the piers' courses)
    };
    const plaque = (lines, w, h, x, yy, z, bg = '#1d1d22') => { const t = textLines(lines, w, h, { bg, fg: bg === '#ece8dd' ? '#2a2a2e' : '#e6dfc8' }); t.position.set(x, yy, z); const hold = new THREE.Group(); hold.applyMatrix4(m); hold.add(t); group.add(hold); };
    const burner = (x, z, sc, y0 = 0) => { // a bronze incense burner on three legs
      for (const [a, b] of [[-1, -1], [1, -1], [0, 1]]) B.box(0.1 * sc, 0.34 * sc, 0.1 * sc, x + a * 0.2 * sc, 0.17 * sc + 0.2 * k + y0, z + b * 0.2 * sc, C.bronzeDark, m);
      B.box(0.62 * sc, 0.4 * sc, 0.62 * sc, x, 0.52 * sc + 0.2 * k + y0, z, C.bronze, m);
      B.box(0.74 * sc, 0.07 * sc, 0.74 * sc, x, 0.74 * sc + 0.2 * k + y0, z, C.bronzeDark, m);
      for (const e of [1, -1]) B.box(0.07 * sc, 0.3 * sc, 0.07 * sc, x + e * 0.36 * sc, 0.88 * sc + 0.2 * k + y0, z, C.bronzeDark, m);
    };
    B.box(fw, 5, fd, 0, 0.2 * k - 2.5, 0, C.stone, m); // the paved floor (a terrace down into the slope)
    if (mm.id === 'student-unknown') {
      // Three round arches of granite: the tall one in the middle over the stele and the stone tomb, a lower one out to each side and forward.
      arch(4.6 * k, 6 * k, 0.9 * k, 1.3 * k, 0, -1.2 * k);
      for (const e of [1, -1]) arch(3 * k, 3.6 * k, 0.7 * k, 1.0 * k, e * 4.4 * k, 1.2 * k);
      B.box(2 * k, 0.8 * k, 1.6 * k, 0, 0.2 * k + 0.4 * k, -1.2 * k, C.granite, m); // the stele's base
      B.box(1.2 * k, 2.6 * k, 0.7 * k, 0, 0.2 * k + 0.8 * k + 1.3 * k, -1.3 * k, C.granite, m); // the stele
      B.box(1.5 * k, 0.3 * k, 0.9 * k, 0, 0.2 * k + 3.55 * k, -1.3 * k, C.stone, m); // its cap
      plaque(['無', '名', '勇', '士', '英', '顯'], 0.7 * k, 2.1 * k, 0, 0.2 * k + 0.8 * k + 1.3 * k, -1.3 * k + 0.36 * k);
      B.box(2.6 * k, 0.6 * k, 1.5 * k, 0, 0.2 * k + 0.3 * k, 0.6 * k, C.stone, m); // the stone tomb before it
      B.box(2.3 * k, 0.2 * k, 1.2 * k, 0, 0.2 * k + 0.7 * k, 0.6 * k, C.granite, m);
      burner(0, 2.2 * k, 1.1 * k);
    } else if (mm.id === 'chungyeoldae') {
      // A broad flight of steps up to a walled terrace; on it the great stone with the black tablet "민족의 얼" between two
      // beast heads over a carved base, a stone figure to the right, the bronze burner on its own block before the steps.
      const steps = 7, rise = 0.32 * k, run = 0.62 * k, top = 0.2 * k + steps * rise, back = -fd / 2 + 4.4 * k;
      for (let i = 0; i < steps; i++) B.box(fw - 2 * i * 0.3 * k, rise * (i + 1), run + 0.02, 0, 0.2 * k + (rise * (i + 1)) / 2, back + 1.6 * k + (steps - i - 0.5) * run, i % 2 ? C.stone : C.granite, m);
      B.box(fw, top - 0.2 * k, 6 * k, 0, 0.2 * k + (top - 0.2 * k) / 2, back - 1.4 * k, C.granite, m); // the terrace
      B.box(fw, 0.9 * k, 0.5 * k, 0, top + 0.45 * k, back - 1.0 * k, C.stone, m); // its low wall with carved panels
      for (let i = 0; i < 8; i++) B.box(0.9 * k, 0.5 * k, 0.06, -fw / 2 + (i + 0.5) * (fw / 8), top + 0.45 * k, back - 1.0 * k + 0.26 * k, C.joint, m);
      B.box(6.4 * k, 2.4 * k, 2.2 * k, 0, top + 0.9 * k + 1.2 * k, back - 2.4 * k, C.granite, m); // the carved base (beast faces)
      for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) B.box(1.2 * k, 0.9 * k, 0.1, -2.25 * k + i * 1.5 * k, top + 1.5 * k + j * 1.1 * k, back - 2.4 * k + 1.12 * k, C.stone, m);
      B.box(5.2 * k, 2.6 * k, 1.5 * k, 0, top + 3.3 * k + 1.3 * k, back - 2.4 * k, C.dark, m); // the black tablet's stone
      plaque(['민족의 얼'], 4.6 * k, 1.9 * k, 0, top + 3.3 * k + 1.3 * k, back - 2.4 * k + 0.76 * k, '#16161a');
      for (const e of [1, -1]) { // the beast heads at its ends
        B.box(1.5 * k, 1.5 * k, 1.5 * k, e * 3.3 * k, top + 3.9 * k, back - 2.3 * k, C.white, m);
        B.box(1.2 * k, 0.8 * k, 1.0 * k, e * 4.2 * k, top + 3.6 * k, back - 2.0 * k, C.white, m);
        B.box(0.3 * k, 0.7 * k, 0.3 * k, e * 3.1 * k, top + 4.9 * k, back - 2.3 * k, C.white, m);
      }
      const fx = fw / 2 - 1.5 * k; // the stone figure on its block, right
      B.box(1.8 * k, 0.6 * k, 1.8 * k, fx, top + 0.3 * k, back + 0.2 * k, C.granite, m);
      B.box(1.2 * k, 2.6 * k, 1.0 * k, fx, top + 0.6 * k + 1.3 * k, back + 0.2 * k, C.white, m);
      B.box(0.9 * k, 0.9 * k, 0.9 * k, fx, top + 3.2 * k + 0.45 * k, back + 0.2 * k, C.white, m);
      B.box(1.1 * k, 0.5 * k, 1.0 * k, fx, top + 4.1 * k + 0.25 * k, back + 0.2 * k, C.white, m);
      B.box(2 * k, 1.2 * k, 2 * k, 0, 0.2 * k + 0.6 * k, fd / 2 - 1.0 * k, C.stone, m); // the burner's block
      burner(0, fd / 2 - 1.0 * k, 1.8 * k, 1.2 * k);
      B.box(0.5 * k, 0.9 * k, 0.4 * k, 1.9 * k, 0.2 * k + 0.45 * k, fd / 2 - 0.9 * k, C.bronzeDark, m); // (the small incense stand)
    } else if (mm.id === 'muhu-altar') {
      // A long wall of pale stone with carved reliefs to the left and right, a dark band along its top; in the middle an open
      // hall under a dark flat roof on two white piers, rows of tablets inside, broad steps and a carved stone before it.
      const W = fw / k, y0 = 0.2 * k, wallH = 5.2 * k, zb = -fd / 2 + 0.6 * k, slate = '#474b52';
      B.box(fw, wallH, 0.6 * k, 0, y0 + wallH / 2, zb, C.granite, m);
      B.box(fw + 0.1, 0.8 * k, 0.8 * k, 0, y0 + wallH + 0.3 * k, zb, slate, m);
      for (const e of [1, -1]) { // the reliefs: a raised panel and figures in low relief on it
        const cx = e * (W / 2 - 4.2) * k;
        B.box(6.6 * k, 3.6 * k, 0.12, cx, y0 + 2.6 * k, zb + 0.34 * k, C.white, m);
        for (let i = 0; i < 6; i++) {
          const fx = cx + (-2.6 + i * 1.05) * k, lean = ((i * 37) % 5 - 2) * 0.12, fh = (1.9 + ((i * 53) % 4) * 0.25) * k;
          B.box(0.6 * k, fh, 0.1, fx, y0 + 1.3 * k + fh / 2, zb + 0.42 * k, C.stone, new THREE.Matrix4().copy(m).multiply(new THREE.Matrix4().makeRotationZ(lean * 0.4)));
          B.box(0.44 * k, 0.44 * k, 0.1, fx + lean * k, y0 + 1.5 * k + fh, zb + 0.42 * k, C.stone, m);
        }
      }
      const hw = 9.6 * k, hd = 4.2 * k, hz = zb + hd / 2; // the hall
      B.box(hw - 1.2 * k, wallH - 0.4 * k, 0.3 * k, 0, y0 + (wallH - 0.4 * k) / 2, zb + 0.4 * k, C.dark, m); // its shaded back
      for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) if (i !== 4) B.box(0.5 * k, 0.5 * k, 0.3 * k, (-3.2 + i * 0.8) * k, y0 + (1.5 + r * 0.7) * k, zb + (1.6 - r * 0.4) * k, C.cream, m); // rows of tablets
      B.box(1.0 * k, 2.2 * k, 0.5 * k, 0, y0 + 1.9 * k, zb + 0.9 * k, C.ochre, m); // the main tablet
      for (const e of [1, -1]) B.box(1.3 * k, wallH - 1.2 * k, 1.3 * k, e * (hw / 2 - 0.65 * k), y0 + (wallH - 1.2 * k) / 2, zb + hd - 0.7 * k, C.white, m); // the piers
      B.box(hw + 1.2 * k, 1.5 * k, hd + 0.6 * k, 0, y0 + wallH - 0.45 * k, hz + 0.2 * k, slate, m); // the roof
      for (let i = 0; i < 3; i++) B.box(hw + (2.4 - i * 0.8) * k, 0.3 * k * (3 - i) / 3 + 0.02, 0.7 * k, 0, y0 + 0.15 * k * (3 - i) / 3, zb + hd + (0.3 + i * 0.7) * k, i % 2 ? C.stone : C.granite, m); // steps
      B.box(2.6 * k, 0.9 * k, 1.6 * k, 0, y0 + 0.45 * k, fd / 2 - 1.2 * k, C.granite, m); // the carved stone before the steps
      B.box(2.2 * k, 0.7 * k, 0.3 * k, 0, y0 + 1.25 * k, fd / 2 - 1.8 * k, C.verse, m); // the dark tablet on it
      for (const e of [1, -1]) { B.box(0.5 * k, 0.5 * k, 0.5 * k, e * 1.9 * k, y0 + 0.25 * k, fd / 2 - 1.9 * k, C.white, m); B.box(0.7 * k, 0.4 * k, 0.7 * k, e * 1.9 * k, y0 + 0.7 * k, fd / 2 - 1.9 * k, '#b0489a', m); } // potted chrysanthemums
    } else if (mm.id === 'independence-unknown') {
      // Two tall blades of white stone that curve apart towards the top, a slim pillar between them, a black altar block
      // with a round stone before it, and a low carved wall to each side.
      const y0 = 0.2 * k, H = 12 * k, dz = 1.0 * k;
      const blade = (e, inner, wide, color, depth) => {
        const pts = [], N = 7, xin = (t) => (1.0 + 2.3 * t ** 2.3) * k;
        for (let i = 0; i <= N; i++) { const t = i / N; pts.push([xin(t) + inner, t * H * (0.93 + 0)]); }
        for (let i = N; i >= 0; i--) { const t = i / N; pts.push([xin(t) + inner + wide * (1 - 0.42 * t) , t * H * (i === N ? 1 : 0.93 + 0.07 * t)]); }
        const sh = new THREE.Shape(pts.map(([x, yy]) => new THREE.Vector2(e * x, yy)));
        B.add(new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }).translate(0, y0, -depth / 2), color, m);
      };
      for (const e of [1, -1]) { blade(e, 0, 2.5 * k, C.white, dz); blade(e, -0.02, 0.2 * k, C.dark, dz + 0.04); }
      B.box(0.9 * k, H * 0.97, 0.9 * k, 0, y0 + (H * 0.97) / 2, 0, C.granite, m); // the pillar and its dark groove
      B.box(0.16 * k, H * 0.97, 0.06, 0, y0 + (H * 0.97) / 2, 0.46 * k, C.dark, m);
      plaque(['대', '한', '독', '립', '군', '무', '명', '용', '사', '위', '령', '탑'], 0.5 * k, 4.6 * k, 2.35 * k, y0 + 5.2 * k, dz / 2 + 0.03, '#ece8dd');
      B.box(3.6 * k, 0.9 * k, 1.4 * k, 0, y0 + 0.45 * k, 1.5 * k, '#2c2c30', m); // the black altar block
      B.add(new THREE.CylinderGeometry(0.5 * k, 0.5 * k, 0.8 * k, 10).translate(0, y0 + 0.4 * k, 2.5 * k), '#2c2c30', m);
      for (const e of [1, -1]) { B.box(0.7 * k, 0.6 * k, 0.5 * k, e * 1.1 * k, y0 + 0.3 * k, 2.5 * k, C.white, m); B.box(0.8 * k, 0.45 * k, 0.8 * k, e * 1.1 * k, y0 + 0.85 * k, 2.5 * k, '#b0489a', m); }
      for (const e of [1, -1]) { // the low carved walls
        B.box(4.2 * k, 1.5 * k, 0.7 * k, e * 5.6 * k, y0 + 0.75 * k, -0.6 * k, C.granite, m);
        B.box(3.6 * k, 1.0 * k, 0.1, e * 5.6 * k, y0 + 0.8 * k, -0.24 * k, C.white, m);
        for (let i = 0; i < 5; i++) B.box(0.34 * k, (0.6 + ((i * 7) % 3) * 0.12) * k, 0.08, e * (4.3 + i * 0.65) * k, y0 + 0.8 * k, -0.2 * k, C.stone, m);
      }
    }
  }
  group.add(B.mesh('hyeonchung-built'));

  // The wood inside the grounds, drawn whole (Yozi: in the photos the trees stand round the plots and behind the
  // gate and close the view). Every slope that is not a plot, a lawn, a way or a building is wood: one mesh of
  // treetops over it, coming down to the ground at its edges. You only walk the ways, so nobody stands under it.
  const wood = (() => {
    const W = P.wood, c = W.cell, [fx0, fz0, fx1, fz1] = boxOf(l.foot), w = Math.ceil((fx1 - fx0) / c) + 1, h = Math.ceil((fz1 - fz0) / c) + 1;
    const on = new Uint8Array(w * h);
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const x = fx0 + i * c, z = fz0 + j * c;
      if (!inPoly(x, z, l.foot) || ringDist(x, z, l.foot) < 2) continue;
      if (flatAt(l, x, z) || inBox(x, z, boxOf(l.court), W.clear + 3) && ringDist(x, z, l.court) < W.clear + 3) continue;
      if (inAny(plots, x, z, W.clear) || inAny(lawns, x, z, W.clear) || inAny(water, x, z, W.clear) || inAny(builds, x, z, W.clear) || inAny(solids, x, z, W.clear) || !offWay(x, z, W.way)) continue;
      on[j * w + i] = 1;
    }
    const at = (i, j) => (i < 0 || j < 0 || i >= w || j >= h ? 0 : on[j * w + i]);
    const quad = (i, j) => at(i, j) && at(i + 1, j) && at(i, j + 1) && at(i + 1, j + 1);
    // (deep in the wood: single trees there would be hidden)
    const deep = (x, z) => { const i = Math.floor((x - fx0) / c), j = Math.floor((z - fz0) / c); return !!quad(i, j); };
    return { c, w, h, x0: fx0, z0: fz0, at, quad, deep };
  })();
  // Round the court behind the gate's front the wood stands, so no headstones this near.
  const beltU = (() => { const n = Math.hypot(l.tower.at[0] - l.gate.at[0], l.tower.at[1] - l.gate.at[1]) || 1; return [(l.tower.at[0] - l.gate.at[0]) / n, (l.tower.at[1] - l.gate.at[1]) / n]; })();
  const courtBox0 = boxOf(l.court);
  const beltAt = (x, z) => (x - l.gate.at[0]) * beltU[0] + (z - l.gate.at[1]) * beltU[1]; // m behind the gate's middle
  const gateFront = Math.min(...l.court.map(([x, z]) => beltAt(x, z))) + 0.6; // (the forecourt's front edge: the front stays open to the lawn)
  const behindGate = (x, z) => beltAt(x, z) > gateFront;
  const stairU = (l.stairs.p[0][0] - l.gate.at[0]) * beltU[0] + (l.stairs.p[0][1] - l.gate.at[1]) * beltU[1];
  const byTerrace = (x, z) => { const u = beltAt(x, z); return u > stairU || u < l.gate.d / 2 + 4; }; // (beside or behind the tower's terrace, or beside Hyeonchungmun: the wood closes in round both)
  const inBelt = (x, z) => behindGate(x, z) && inBox(x, z, courtBox0, P.belt.clear) && !inPoly(x, z, l.court) && ringDist(x, z, l.court) < P.belt.clear;
  // The wood's treetops are not drawn (Yozi 2026-11-25: bare slopes behind, like Namsan): the slopes show their
  // ground, and the trees stand only round the court, the gate and along the ways.
  if (P.wood.drawn) { // the wood's mesh
    const hash = (a, b) => { const s = Math.sin(a * 53.9 + b * 71.3) * 43758.5453; return s - Math.floor(s); };
    const { c, w, h, x0, z0 } = wood, pos = [], col = [];
    const pines = ['#3f6f3a', '#467a40', '#39653a'].map((v) => new THREE.Color(v)), leaves = ['#5f9a4a', '#6fae55', '#4f8a43'].map((v) => new THREE.Color(v));
    const top = (i, j) => [l.x + x0 + i * c + (hash(i, j + 9) - 0.5) * 1.6, LY(x0 + i * c, z0 + j * c) + P.wood.top[0] + P.wood.top[1] * hash(i, j), l.z + z0 + j * c + (hash(i + 9, j) - 0.5) * 1.6];
    const base = (i, j) => { const t = top(i, j); return [t[0], LY(x0 + i * c, z0 + j * c) + P.wood.foot - 2.2, t[2]]; };
    const put = (a, b, d, k) => { for (const v of [a, b, d]) { pos.push(...v); col.push(k.r, k.g, k.b); } };
    for (let j = 0; j < h - 1; j++) for (let i = 0; i < w - 1; i++) {
      if (!wood.quad(i, j)) continue;
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]];
      const t = q.map(([a, b]) => top(a, b));
      for (const [n, tri] of [[0, [0, 3, 2]], [1, [0, 2, 1]]]) {
        const r = hash(i * 2 + n, j + 0.5), k = r < 0.65 ? pines[Math.floor(r * 40) % 3] : leafColor(leaves[Math.floor(r * 40) % 3], leafHash(i * h + j, 5 + n), MIX.wood);
        put(t[tri[0]], t[tri[1]], t[tri[2]], k);
      }
      // the wall down to the ground on each side where the wood ends
      for (const [e, [di, dj]] of [[[0, 1], [0, -1]], [[1, 2], [1, 0]], [[2, 3], [0, 1]], [[3, 0], [-1, 0]]]) {
        if (wood.quad(i + di, j + dj)) continue;
        // (no dark wall: in Seonjeongneung it read as a strange green fence, Yozi 2026-11-24; the treetops come down to the ground, leaning out)
        const [a, b] = e.map((n) => q[n]), ta = top(...a), tb = top(...b), lean = (g) => [g[0] + di * 1.4, g[1], g[2] + dj * 1.4], ga = lean(base(...a)), gb = lean(base(...b));
        const kk = pines[(i + j * 3 + di + 2 * dj + 6) % 3];
        put(ta, ga, gb, kk); put(ta, gb, tb, kk);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide })));
    mesh.name = 'hyeonchung-wood';
    group.add(mesh);
    group.userData.counts.woodTris = pos.length / 9;
  }

  if (l.ridge) { // The ridge behind the grounds (closed land), one mesh.
    const k = l.ridge, c = k.cell, pos = [], col = [];
    const hash = (a, b) => { const s = Math.sin(a * 91.7 + b * 47.3) * 43758.5453; return s - Math.floor(s); };
    const at = (i, j) => (i < 0 || j < 0 || i >= k.w || j >= k.h ? 0 : k.m[j * k.w + i]);
    // A bare green hill like Namsan (Yozi 2026-11-25: no treetops behind): the ground's own shape in calm greens.
    const top = (i, j) => Math.max(0, at(i, j));
    const greens = ['#7fae5c', '#86b562', '#78a657'].map((h) => new THREE.Color(h));
    for (let j = 0; j < k.h - 1; j++) for (let i = 0; i < k.w - 1; i++) {
      if (!at(i, j) && !at(i + 1, j) && !at(i, j + 1) && !at(i + 1, j + 1)) continue;
      const q = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]].map(([a, b]) => [l.x + k.x0 + a * c, top(a, b), l.z + k.z0 + b * c]);
      for (const [n, tri] of [[0, [0, 3, 2]], [1, [0, 2, 1]]]) {
        const on = greens[Math.floor(hash(i * 2 + n, j + 0.5) * 3)];
        for (const v of tri) { pos.push(...q[v]); col.push(on.r, on.g, on.b); }
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const ridge = new THREE.Mesh(geo, addSnowCover(new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true })));
    ridge.name = 'hyeonchung-ridge';
    group.add(ridge);
    group.userData.counts.ridgeTris = pos.length / 9;
  }

  { // The headstones: plain white, no names; by tile, so far ones are skipped.
    const [sw, sh, sd] = P.stone, tiles = new Map();
    const ok = (x, z) => offWay(x, z, P.edge) && !flatAt(l, x, z) && !inAny(builds, x, z, 1) && !inAny(water, x, z, 0.8) && !inBelt(x, z) && !inAny(mems, x, z, 1.5);
    let count = 0;
    for (const pl of plots) {
      for (const [x, z] of plotStones(pl, { step: lowSpec ? 2 : P.stones }, ok)) {
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
    const flowerGeo = new THREE.PlaneGeometry(0.34, 0.56).rotateX(-Math.PI / 2 + 0.12);
    const flowerMat = (() => {
      const c = document.createElement('canvas'); c.width = 48; c.height = 80;
      const g = c.getContext('2d');
      g.strokeStyle = '#4c7a3c'; g.lineWidth = 5; g.beginPath(); g.moveTo(24, 78); g.lineTo(24, 30); g.stroke();
      g.fillStyle = '#4c7a3c'; g.beginPath(); g.ellipse(33, 56, 9, 4, -0.6, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; for (let i = 0; i < 10; i++) { g.beginPath(); g.ellipse(24 + Math.cos(i * 0.63) * 9, 19 + Math.sin(i * 0.63) * 9, 8, 5, i * 0.63, 0, 7); g.fill(); }
      g.fillStyle = '#f3e6a8'; g.beginPath(); g.arc(24, 19, 5, 0, 7); g.fill();
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
      return new THREE.MeshLambertMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide });
    })();
    for (const [k, list] of tiles) {
      const [i, j] = k.split(',').map(Number);
      const mid = [l.x + (i + 0.5) * P.tile, l.z + (j + 0.5) * P.tile];
      const near = instanced(geo, mat, list, 'hyeonchung-stones-' + k), far = instanced(flat, flatMat, list, 'hyeonchung-stones-far-' + k);
      far.visible = false;
      // A white chrysanthemum laid before every stone (Yozi: one from the maker for each of them). Seen near only.
      const laid = instanced(flowerGeo, flowerMat, list.map(([x, yy, z, ry]) => [x + Math.sin(ry) * 0.42, yy + 0.05, z + Math.cos(ry) * 0.42, ry]), 'hyeonchung-laid-' + k);
      near.add(laid);
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
      if (flatAt(l, x, z) || inAny(plots, x, z, 1.5) || inAny(lawns, x, z, 1) || inAny(water, x, z, 1.5) || inAny(builds, x, z, 2.5) || inAny(solids, x, z, 3) || inAny(mems, x, z, 6) || !offWay(x, z, P.treeClear)) continue;
      if (inBox(x, z, courtBox, 4) && ringDist(x, z, l.court) < 4) continue;
      if (wood.deep(x, z)) continue; // (under the wood's own treetops)
      const sc = 0.85 + rnd() * 0.7;
      (rnd() < 0.72 ? pines : round).push([l.x + x, LY(x, z) - 0.1, l.z + z, rnd() * 6, sc, sc, sc]);
    }
    // The wood round the court, as the aerial photo shows it (Naver, Yozi 2026-11-24): it stands close round the tower's
    // terrace and at the gate's sides; either side of the paved way from the gate to the tower is open lawn with a tree
    // here and there, and the wood round its rim. A tall tree on every free spot between the ways.
    let belt = 0;
    const B = P.belt, [cx0, cz0, cx1, cz1] = courtBox;
    const cellHash = (a, b) => { const q = Math.sin(a * 91.7 + b * 37.3) * 43758.5453; return q - Math.floor(q); };
    for (let gz = cz0 - B.reach, j = 0; gz <= cz1 + B.reach; gz += B.fill, j++) {
      for (let gx = cx0 - B.reach + (j % 2) * B.fill / 2, i = 0; gx <= cx1 + B.reach; gx += B.fill, i++) {
        const x = gx + (rnd() - 0.5) * 1.3, z = gz + (rnd() - 0.5) * 1.3;
        if (!behindGate(x, z) || inPoly(x, z, l.court) || !inPoly(x, z, l.foot)) continue;
        const dc = ringDist(x, z, l.court);
        if (dc > B.reach) continue;
        const near = byTerrace(x, z) ? B.close : cellHash(i, j) < B.dots && dc > B.close * 2.5 ? 0 : B.lawn; // (the open lawn beside the way)
        if (dc < near) continue;
        if (flatAt(l, x, z) || inAny(water, x, z, 1) || inAny(builds, x, z, 2) || inAny(solids, x, z, 2) || inAny(mems, x, z, 2.5) || !offWay(x, z, 1.1)) continue;
        const sc = 1.2 + rnd() * 0.6;
        (belt % 4 === 3 ? round : pines).push([l.x + x, LY(x, z) - 0.1, l.z + z, rnd() * 6, sc, sc * 1.1, sc]);
        belt++;
      }
    }
    // The lawn before the gate (겨레얼마당): open in the middle, trees in clumps along its rim (the same photo).
    let rim = 0;
    const lawnF = l.flats.find((f) => f.k === 'lawn');
    if (lawnF) {
      const [lx0, lz0, lx1, lz1] = boxOf(lawnF.p);
      for (let gz = lz0, j = 0; gz <= lz1; gz += P.rim.step, j++) for (let gx = lx0, i = 0; gx <= lx1; gx += P.rim.step, i++) {
        const x = gx + (rnd() - 0.5) * 1.4, z = gz + (rnd() - 0.5) * 1.4;
        if (!inPoly(x, z, lawnF.p) || cellHash(Math.floor(x / P.rim.clump) + 7, Math.floor(z / P.rim.clump)) > P.rim.share) continue;
        const de = ringDist(x, z, lawnF.p);
        if (de < 1.2 || de > P.rim.deep || ringDist(x, z, l.court) < P.rim.court || inAny(solids, x, z, 2.5) || !offWay(x, z, 1.1)) continue;
        const sc = 1.1 + rnd() * 0.6;
        (rim % 3 === 2 ? pines : round).push([l.x + x, LY(x, z) - 0.1, l.z + z, rnd() * 6, sc, sc * 1.05, sc]);
        rim++;
      }
    }
    group.userData.counts.rim = rim;
    group.userData.counts.belt = belt;
    const trunk = new THREE.CylinderGeometry(0.14, 0.2, 2.4, 5, 1, true).translate(0, 1.2, 0);
    const crown = new THREE.IcosahedronGeometry(1.8, 0).translate(0, 3.3, 0);
    const cone = new THREE.ConeGeometry(1.4, 3.8, 6).translate(0, 3.7, 0);
    group.add(instanced(trunk, new THREE.MeshLambertMaterial({ color: 0x6b5440 }), round.concat(pines), 'hyeonchung-trunks'));
    const greens = ['#5f9a4a', '#6fae55', '#4f8a43', '#7bb463'].map((c) => new THREE.Color(c));
    group.add(instanced(crown, addSnowCover(new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true })), round, 'hyeonchung-crowns', (m, i) => m.setColorAt(i, leafColor(greens[i % greens.length], leafHash(i, 9), MIX.wood))));
    group.add(instanced(cone, addSnowCover(new THREE.MeshLambertMaterial({ color: 0x3f6f3a, flatShading: true })), pines, 'hyeonchung-pines'));
    group.userData.counts.trees = round.length + pines.length;
  }

  // "The sun and the moon shall keep this hill" (the verse): both stand over the ridge behind the tower all the
  // time, the sun the brighter by day and the moon by night, and the tower has a soft light on it after dark.
  const lights = (() => {
    const disc = (stops, spots = []) => {
      const c = document.createElement('canvas');
      c.width = c.height = 128;
      const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      for (const [at, col] of stops) gr.addColorStop(at, col);
      g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
      g.fillStyle = 'rgba(150,165,200,0.28)';
      for (const [x, y2, r] of spots) { g.beginPath(); g.arc(x, y2, r, 0, Math.PI * 2); g.fill(); }
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const sprite = (map, size, name) => {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
      sp.scale.set(size, size, 1);
      sp.name = name;
      sp.renderOrder = -1;
      sp.userData.farKeep = true; // (it moves with you: main.js FarCull must not hide it by where it was built)
      group.add(sp);
      return sp;
    };
    const sun = sprite(disc([[0, 'rgba(255,252,236,1)'], [0.2, 'rgba(255,246,210,1)'], [0.26, 'rgba(255,226,150,0.5)'], [1, 'rgba(255,214,130,0)']]), P.sun[2], 'hyeonchung-sun');
    const moon = sprite(disc([[0, 'rgba(244,247,255,1)'], [0.27, 'rgba(232,238,255,1)'], [0.32, 'rgba(170,190,255,0.35)'], [1, 'rgba(150,175,255,0)']], [[56, 54, 6], [72, 66, 5], [62, 74, 4]]), P.moon[2], 'hyeonchung-moon');
    const halo = sprite(disc([[0, 'rgba(210,222,255,0.55)'], [1, 'rgba(190,205,255,0)']]), 1, 'hyeonchung-tower-light');
    halo.scale.set(l.tower.w * 2.6, l.tower.h * 1.5, 1);
    halo.position.set(l.x + l.tower.at[0], l.tribute.y + l.tower.h * 0.6, l.z + l.tower.at[1]);
    const back = l.gate.ry + Math.PI; // (the way you look from the gate to the tower)
    const dir = ([turn, up]) => new THREE.Vector3(Math.sin(back + turn) * Math.cos(up), Math.sin(up), Math.cos(back + turn) * Math.cos(up)).multiplyScalar(P.skyFar);
    const dSun = dir(P.sun), dMoon = dir(P.moon);
    return (p) => {
      const s = sky ? sky() : { dark: 0, wet: false }, k = s.wet ? 0.2 : 1, y0 = p.y || 0;
      sun.position.set(p.x + dSun.x, y0 + dSun.y, p.z + dSun.z);
      moon.position.set(p.x + dMoon.x, y0 + dMoon.y, p.z + dMoon.z);
      sun.material.opacity = (0.22 + 0.78 * (1 - s.dark)) * k;
      moon.material.opacity = (0.3 + 0.7 * s.dark) * k;
      halo.material.opacity = 0.55 * s.dark;
    };
  })();

  scene.add(group);
  const [bx0, bz0, bx1, bz1] = hyeonchungBox(l);
  let wait = 0, flowersLeft = 0, sway = 0;
  return {
    group,
    counts: group.userData.counts,
    tribute() { flowersLeft = P.flowers; flowers.visible = true; },
    update(p, dt = 0) {
      if (flowersLeft > 0) { if ((flowersLeft -= dt) <= 0) flowers.visible = false; else flowers.userData.rise(P.flowers - flowersLeft, flowersLeft); }
      if (group.visible) lights(p);
      if (group.visible && Math.hypot(p.x - l.x - l.gate.at[0], p.z - l.z - l.gate.at[1]) < 60) for (const ch of guards) ch.animate(dt, 0); // (they stand still: a breath, a blink)
      { const nearGate = group.visible && Math.hypot(p.x - l.x - l.gate.at[0], p.z - l.z - l.gate.at[1]) < 60; for (const ch of guards) ch.root.visible = nearGate; }
      if (flag && group.visible) { sway += dt; flag.userData.cloth.rotation.y = Math.sin(sway * 1.3) * 0.22 + Math.sin(sway * 3.1) * 0.06; }
      if ((wait -= dt) > 0) return;
      wait = 0.25;
      const far = Math.hypot(Math.max(l.x + bx0 - p.x, 0, p.x - l.x - bx1), Math.max(l.z + bz0 - p.z, 0, p.z - l.z - bz1)) > P.hide;
      group.visible = !far;
      if (!far) for (const t of group.userData.stoneTiles) { const d = Math.hypot(p.x - t.mid[0], p.z - t.mid[1]); t.near.visible = d < P.stonesNear; t.far.visible = !t.near.visible && d < P.stonesFar; }
    },
  };
}
