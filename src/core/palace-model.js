// Gyeongbokgung's inner palace (map "landmarks" in districts/gyeongbokgung.json):
// the way in through the gates and the throne hall's courtyard.
//   palacegate  Heungnyemun / Geunjeongmun: a hipped gate with three passages
//   yeongjegyo  the palace stream (금천) with Yeongjegyo bridge across it
//   cloister    the roofed corridors (회랑) round Geunjeongjeon's courtyard
//   throne      Geunjeongjeon: the two-tier terrace (월대), the two-storey hall
//   rankstones  the officials' rank stones (품계석) either side of the path
//   palacehalls every other hall and gate, from the real map, merged into one
//   amisan      the terraced garden behind Gyotaejeon with its brick chimneys
//   hexpavilion Hyangwonjeong, the two-storey hexagonal pavilion on its pond
// Each model is merged into a few meshes (one per material), so a whole
// courtyard costs a handful of draw calls. Visual only: collision comes
// from the map's blockers. l.s scales a building (default 1).
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { curvedRoof } from './hanok.js';
import { mergeStatic } from './bukchon-models.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const C = {
  stone: '#d6cdb8', stoneDark: '#b1a690', stoneLight: '#e4ddcc', post: '#a8392b', door: '#7a2c22', wall: '#efe6d2',
  beam: '#2f8a68', beamBlue: '#3f6f9a', beamRed: '#b2402f', bracket: '#2a6f5a', water: '#5b9fc4', bronze: '#5f6a55', gold: '#d4a73a',
  roof: new THREE.Color('#474c55'), roofEnd: new THREE.Color('#8a3a2c'),
};
const tileMat = new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, side: THREE.DoubleSide });
function tiles(g, w, d, h, y, o, x = 0, z = 0, ry = 0) {
  const geos = curvedRoof(w, d, h, { color: C.roof, end: C.roofEnd, ...o });
  for (const geo of o.noRidge ? geos.slice(0, 1) : geos) { // (noRidge: the king's and queen's halls have no ridge, 무량각)
    const m = new THREE.Mesh(geo, tileMat);
    m.position.set(x, y, z);
    m.rotation.y = ry;
    g.add(m);
  }
}
// The painted band under the eaves: a green beam, a thin red line, and the
// bracket sets (공포) as a deeper dark-green course.
function band(g, w, d, y) {
  box(g, w + 0.4, 0.7, d + 0.4, 0, y + 0.35, 0, C.beam);
  box(g, w + 0.5, 0.18, d + 0.5, 0, y + 0.05, 0, C.beamRed);
  box(g, w + 1.4, 0.8, d + 1.4, 0, y + 1.1, 0, C.bracket);
  box(g, w + 2.0, 0.3, d + 2.0, 0, y + 1.6, 0, C.beamBlue);
}
// A hall's body: posts all round, red lattice doors set in behind the front
// row, plastered walls at the back and the ends.
function body(g, w, d, H, y, bays = 5) {
  const hw = w / 2, hd = d / 2;
  box(g, w - 1.2, H, d - 1.2, 0, y + H / 2, 0, C.wall);
  box(g, w - 1.4, H * 0.82, 0.2, 0, y + H * 0.41, hd - 0.55, C.door);
  for (let i = 0; i <= bays; i++) {
    const x = -hw + (i * w) / bays;
    for (const z of [-hd, hd]) box(g, 0.75, H, 0.75, x, y + H / 2, z, C.post);
    box(g, 0.08, H * 0.82, 0.1, x * 0.97, y + H * 0.41, hd - 0.4, C.gold); // the door frames' lines
  }
  for (let i = 1; i < Math.round(d / 4); i++) for (const x of [-hw, hw]) box(g, 0.75, H, 0.75, x, y + H / 2, -hd + (i * d) / Math.round(d / 4), C.post);
}
// A stone railing (난간) along a line, posts every ~2 m.
function railing(g, x0, z0, x1, z1, y, h = 0.9) {
  const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(1, Math.round(len / 2));
  const seg = new THREE.Group();
  box(seg, len, 0.18, 0.22, 0, y + h, 0, C.stoneLight);
  box(seg, len, 0.12, 0.16, 0, y + 0.3, 0, C.stoneLight);
  for (let i = 0; i <= n; i++) box(seg, 0.28, h + 0.15, 0.28, -len / 2 + (i * len) / n, y + (h + 0.15) / 2, 0, C.stoneLight);
  seg.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  seg.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
  g.add(seg);
}
// A stone guardian (서수) crouching on a pedestal.
function beast(g, x, y, z, ry = 0, s = 1) {
  const b = new THREE.Group();
  box(b, 0.9 * s, 0.5 * s, 1.2 * s, 0, 0.25 * s, 0, C.stoneDark);
  box(b, 0.7 * s, 0.7 * s, 1.0 * s, 0, 0.85 * s, -0.05 * s, C.stone);
  box(b, 0.6 * s, 0.55 * s, 0.6 * s, 0, 1.35 * s, 0.35 * s, C.stone);
  box(b, 0.2 * s, 0.25 * s, 0.2 * s, 0.18 * s, 1.7 * s, 0.4 * s, C.stone);
  box(b, 0.2 * s, 0.25 * s, 0.2 * s, -0.18 * s, 1.7 * s, 0.4 * s, C.stone);
  b.position.set(x, y, z);
  b.rotation.y = ry;
  g.add(b);
}

// A name board in gold-framed navy with Chinese characters (勤政殿…).
function nameBoard(han, w, h) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 96;
  const x = c.getContext('2d');
  x.fillStyle = '#1d2a3a'; x.fillRect(0, 0, 256, 96);
  x.strokeStyle = '#d4a73a'; x.lineWidth = 8; x.strokeRect(4, 4, 248, 88);
  x.fillStyle = '#f2e6c4'; x.font = `bold ${han.length > 3 ? 46 : 58}px serif`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(han, 128, 50);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex }));
}

export const PALACE_BUILD = {
  // Gwanghwamun: a dressed-stone base with three arched passages (the
  // middle one, the king's, the tallest) and a two-storey wooden gate tower
  // with a hipped roof on each storey. About half the real gate's size
  // (31 m wide), on a palace site at a quarter. l.w: the base's width.
  gwanghwamun(g, l) {
    const W = l.w || 17.4, D = 7, B = 4.4, hw = W / 2;
    const mid = 1.5, side = [3.0, 5.2]; // the openings: |x| < 1.5, 3.0 < |x| < 5.2
    for (const sx of [-1, 1]) {
      box(g, hw - side[1], B, D, sx * (side[1] + hw) / 2, B / 2, 0, C.stone); // outer block
      box(g, side[0] - mid, B, D, sx * (mid + side[0]) / 2, B / 2, 0, C.stone); // pier between the arches
      box(g, side[1] - side[0], B - 2.6, D, sx * (side[0] + side[1]) / 2, 2.6 + (B - 2.6) / 2, 0, C.stone); // over the side arch
      box(g, side[1] - side[0] + 0.3, 0.25, D + 0.1, sx * (side[0] + side[1]) / 2, 2.6, 0, C.stoneDark); // its arch band
    }
    box(g, mid * 2, B - 3.2, D, 0, 3.2 + (B - 3.2) / 2, 0, C.stone); // over the middle arch
    box(g, mid * 2 + 0.3, 0.25, D + 0.1, 0, 3.2, 0, C.stoneDark);
    for (let y = 0.9; y < B - 0.3; y += 0.75) box(g, W + 0.04, 0.05, D + 0.04, 0, y, 0, C.stoneDark); // courses of stone
    box(g, W + 0.6, 0.35, D + 0.6, 0, B + 0.17, 0, C.stoneDark);
    for (const sx of [-1, 1]) railing(g, sx * (hw - 0.2), -D / 2 + 0.2, sx * (hw - 0.2), D / 2 - 0.2, B + 0.35, 0.6);
    // The tower: a lower storey under a skirt roof and an upper storey under
    // the main roof. Drawn at half its height (TOWER), so the gate keeps the
    // real one's shape: the stone base a quarter as high as it is wide, the
    // whole gate about two thirds (Yozi, 2026-11-10: it stood like a tower).
    const y1 = B + 0.35, TOWER = 0.5;
    const t = new THREE.Group();
    t.position.y = y1;
    t.scale.y = TOWER;
    g.add(t);
    body(t, 12, 4.6, 2.6, 0, 5);
    band(t, 12, 4.6, 2.6);
    tiles(t, 16.5, 8.6, 1.6, 2.6 + 1.75, { hip: true, lift: 0.8, seg: 6, rows: 2, ridgeEnds: false });
    const y2 = 2.6 + 1.75 + 0.9;
    body(t, 9.5, 3.4, 1.9, y2, 5);
    band(t, 9.5, 3.4, y2 + 1.9);
    tiles(t, 15, 8.4, 3.0, y2 + 1.9 + 1.75, { hip: true, lift: 1.1, seg: 6, rows: 3 });
    mergeStatic(g);
    const sign = nameBoard('光化門', 1.9, 0.75);
    sign.position.set(0, y1 + (y2 + 1.4) * TOWER, 1.75);
    g.add(sign);
  },
  // A palace gate with three passages under one hipped roof: the middle one
  // taller (the king's), the side ones for officials. l.w: width, l.d: depth.
  palacegate(g, l) {
    const s = l.s || 1, w = (l.w || 22) * s, d = (l.d || 8) * s, H = 6.5 * s, hw = w / 2, hd = d / 2;
    box(g, w + 3, 0.5, d + 3, 0, 0.25, 0, C.stone);
    box(g, w + 2, 0.25, d + 2, 0, 0.62, 0, C.stoneDark);
    const xs = [-hw, -hw / 3, hw / 3, hw];
    for (const x of xs) for (const z of [-hd, 0, hd]) box(g, 0.8 * s, H, 0.8 * s, x, 0.75 + H / 2, z, C.post);
    // Open red doors folded against the middle row of posts.
    for (let i = 0; i < 3; i++) {
      const x0 = xs[i], x1 = xs[i + 1], bw = x1 - x0;
      for (const sx of [x0 + 0.5, x1 - 0.5]) box(g, 0.15, H - 1.4, bw / 2 - 0.4, sx, 0.75 + (H - 1.4) / 2, -bw / 4 + 0.2, C.door);
    }
    box(g, w, 1.1 * s, 0.4, 0, 0.75 + H - 0.55 * s, -hd, C.wall); // the plastered strips over the doors
    box(g, w, 1.1 * s, 0.4, 0, 0.75 + H - 0.55 * s, hd, C.wall);
    band(g, w, d, 0.75 + H);
    tiles(g, w + 7 * s, d + 7 * s, 4.2 * s, 0.75 + H + 1.75, { hip: true, lift: 1.4 * s, seg: 6, rows: 3 });
    mergeStatic(g);
    if (l.name?.han) for (const z of [hd + 1.25, -hd - 1.25]) {
      const sign = nameBoard(l.name.han, 3.4 * s, 1.3 * s);
      sign.position.set(0, 0.75 + H + 1.1, z);
      if (z < 0) sign.rotation.y = Math.PI;
      g.add(sign);
    }
  },
  // The palace stream (금천) across the court, sunk between dressed-stone
  // banks, and Yeongjegyo: a wide stone bridge with railings and a stone
  // guardian at each corner (they keep evil from crossing the water).
  // l.w: the stream's length (x), l.bridge: the bridge's width.
  yeongjegyo(g, l) {
    const W = l.w || 84, bw = l.bridge || 14, ch = l.ch || 5, L = ch + 4;
    box(g, W, 0.1, ch, 0, -0.9, 0, C.water);
    for (const z of [-ch / 2, ch / 2]) for (const sx of [-1, 1]) {
      const len = W / 2 - bw / 2;
      box(g, len, 1.0, 0.4, sx * (bw / 2 + len / 2), -0.45, z, C.stoneDark); // the banks
      box(g, len, 0.12, 0.7, sx * (bw / 2 + len / 2), 0.06, z + Math.sign(z) * 0.15, C.stoneLight); // their coping
    }
    // The deck: a gentle hump in three steps, and the arches underneath.
    box(g, bw, 0.4, L, 0, 0.2, 0, C.stone);
    box(g, bw - 1, 0.25, L - 3, 0, 0.5, 0, C.stone);
    box(g, bw - 2, 0.2, L - 5.4, 0, 0.72, 0, C.stoneLight);
    for (const x of [-bw / 3, 0, bw / 3]) box(g, bw / 3 - 1.2, 0.8, ch + 0.2, x, -0.55, 0, '#3f5f6e'); // the dark arches
    box(g, 2.2, 0.06, L - 0.4, 0, 0.84, 0, C.stoneDark); // the king's middle strip
    for (const sx of [-1, 1]) {
      railing(g, sx * (bw / 2 - 0.3), -L / 2 + 0.6, sx * (bw / 2 - 0.3), L / 2 - 0.6, 0.4);
      for (const sz of [-1, 1]) beast(g, sx * (bw / 2 + 1.0), 0, sz * (ch / 2 + 1.0), sz > 0 ? Math.PI : 0, 1.1);
    }
    mergeStatic(g);
  },
  // The corridors round the courtyard: a stone floor, a back wall, red posts
  // every few metres on the open (inner) side, and a long tiled roof. l.p:
  // runs of [x0, z0, x1, z1, inward] in the landmark's metres (inward: which
  // side the court is, +1 or -1 across the run's direction); l.d: depth.
  cloister(g, l) {
    const H = l.h || 4.2; // (l.h: the posts' height; the halls' yards use lower corridors, 행각)
    for (const [x0, z0, x1, z1, inward, d] of l.runs) {
      const D = d || l.d || 6; // (each run may have its own depth)
      const len = Math.hypot(x1 - x0, z1 - z0);
      const seg = new THREE.Group();
      const n = Math.max(2, Math.round(len / 3.2));
      box(seg, len, 0.45, D, 0, 0.22, 0, C.stone); // the floor
      box(seg, len, H, 0.5, 0, 0.45 + H / 2, -inward * (D / 2 - 0.25), C.wall); // the back wall
      box(seg, len, 0.9, 0.55, 0, 0.45 + 0.45, -inward * (D / 2 - 0.25), C.post); // its red dado
      for (let i = 0; i <= n; i++) {
        const x = -len / 2 + (i * len) / n;
        box(seg, 0.5, H, 0.5, x, 0.45 + H / 2, inward * (D / 2 - 0.4), C.post); // the open side
        box(seg, 0.45, H, 0.45, x, 0.45 + H / 2, -inward * (D / 2 - 0.7), C.post);
      }
      box(seg, len, 0.5, 0.5, 0, 0.45 + H + 0.1, inward * (D / 2 - 0.4), C.beam);
      box(seg, len, 0.14, 0.55, 0, 0.45 + H - 0.2, inward * (D / 2 - 0.4), C.beamRed);
      tiles(seg, len + 1.5, D + Math.min(2.6, D), Math.min(2.0, 0.4 + D * 0.5), 0.45 + H + 0.35, { hip: false, lift: 0.4, seg: Math.max(4, Math.round(len / 8)), rows: 2, ridgeEnds: false });
      seg.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
      seg.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      g.add(seg);
    }
    mergeStatic(g);
  },
  // Geunjeongjeon (근정전), the throne hall: two stone terraces with
  // railings and guardians, steps with the carved dragon slab in the middle
  // (답도), bronze fire-water vats (드므), and the two-storey hall with a
  // roof on each storey. l.hs scales the hall; l.t1 / l.t2 size the terraces.
  throne(g, l) {
    const s = l.hs || 1; // the hall's scale (the terraces: l.t1, l.t2 as [w, d])
    const T1 = { w: l.t1?.[0] || 56 * s, d: l.t1?.[1] || 40 * s, h: 1.5 * s }, T2 = { w: l.t2?.[0] || 46 * s, d: l.t2?.[1] || 32 * s, h: 1.5 * s };
    const y1 = T1.h, y2 = T1.h + T2.h;
    box(g, T1.w, T1.h, T1.d, 0, T1.h / 2, 0, C.stone);
    box(g, T1.w + 0.3, 0.15, T1.d + 0.3, 0, T1.h - 0.05, 0, C.stoneDark);
    const zT = -(T1.d - T2.d) / 4; // the upper terrace sits towards the back
    box(g, T2.w, T2.h, T2.d, 0, y1 + T2.h / 2, zT, C.stone);
    box(g, T2.w + 0.3, 0.15, T2.d + 0.3, 0, y2 - 0.05, zT, C.stoneDark);
    for (const [T, y, z0] of [[T1, y1, 0], [T2, y2, zT]]) {
      const hw = T.w / 2 - 0.3, hd = T.d / 2 - 0.3;
      railing(g, -hw, z0 - hd, hw, z0 - hd, y);
      for (const sx of [-1, 1]) railing(g, sx * hw, z0 - hd, sx * hw, z0 + hd, y);
      for (const sx of [-1, 1]) railing(g, sx * hw, z0 + hd, sx * 5.4 * s, z0 + hd, y); // the front, open at the steps
      for (const sx of [-1, 1]) beast(g, sx * hw, y, z0 + hd, Math.PI * 0.25 * -sx, 0.4 + 0.4 * s);
    }
    // Front steps on both terraces, with the dragon slab between two flights.
    const steps = (z, y0, h) => {
      const n = Math.max(3, Math.round(h / 0.3));
      for (let i = 0; i < n; i++) for (const sx of [-1, 1]) box(g, 2.6 * s, h / n, 0.5, sx * 2.6 * s, y0 + (i + 0.5) * (h / n), z + (n - i - 0.5) * 0.5, C.stone);
      const slab = box(g, 2.6 * s, 0.25, n * 0.55, 0, y0 + h / 2, z + n * 0.25, C.stoneLight);
      slab.rotation.x = Math.atan2(h, n * 0.5);
    };
    steps(T1.d / 2, 0, T1.h);
    steps(zT + T2.d / 2, y1, T2.h);
    // Bronze vats and incense burners on the upper terrace.
    for (const sx of [-1, 1]) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(0.9 * s, 0.7 * s, 1.0 * s, 10), mat(C.bronze));
      v.position.set(sx * (T2.w / 2 - 1.2), y2 + 0.5 * s, zT + T2.d / 2 - 1.2);
      g.add(v);
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.5 * s, 0.6 * s, 1.4 * s, 8), mat(C.bronze));
      b.position.set(sx * 3.2 * s, y2 + 0.7 * s, zT + T2.d / 2 - 0.9);
      g.add(b);
    }
    // The hall: a tall lower storey under a skirt roof, a shorter upper storey
    // and the great hipped roof on top.
    const W1 = 30 * s, D1 = 20 * s, H1 = 8.5 * s, zH = zT - 0.6;
    const hall = new THREE.Group();
    box(hall, W1 + 2, 0.5, D1 + 2, 0, y2 + 0.25, 0, C.stoneDark);
    body(hall, W1, D1, H1, y2 + 0.5, 5);
    band(hall, W1, D1, y2 + 0.5 + H1);
    const yR1 = y2 + 0.5 + H1 + 1.75;
    tiles(hall, W1 + 6 * s, D1 + 6 * s, 3.0 * s, yR1, { hip: true, lift: 1.2 * s, seg: 6, rows: 2, ridgeEnds: false });
    const W2 = W1 - 6 * s, D2 = D1 - 6 * s, H2 = 4.2 * s, y3 = yR1 + 1.6 * s;
    body(hall, W2, D2, H2, y3, 5);
    band(hall, W2, D2, y3 + H2);
    tiles(hall, W2 + 9 * s, D2 + 9 * s, 6.2 * s, y3 + H2 + 1.75, { hip: true, lift: 1.8 * s, seg: 7, rows: 3 });
    hall.position.z = zH;
    g.add(hall);
    mergeStatic(g);
    const sign = nameBoard('勤政殿', 4.8 * s, 1.8 * s); // the name board between the two roofs
    sign.position.set(0, y3 + H2 * 0.55, zH + D2 / 2 + 0.6);
    g.add(sign);
  },
  // The rank stones (품계석): two rows down the courtyard either side of the
  // middle path, first rank nearest the hall. l.rows, l.gap, l.off (offset of
  // each row from the path), running south from the landmark's spot.
  rankstones(g, l) {
    const rows = l.rows || 12, gap = l.gap || 1.7, X = l.off || 6;
    box(g, 2.4, 0.12, rows * gap + 3, 0, 0.06, (rows - 1) * gap / 2, C.stoneLight); // the raised middle path (삼도)
    for (let i = 0; i < rows; i++) for (const sx of [-1, 1]) {
      box(g, 0.5, 0.16, 0.36, sx * X, 0.08, i * gap, C.stoneDark); // (half the real stones' size, like the halls)
      box(g, 0.34, 0.4, 0.22, sx * X, 0.36, i * gap, C.stone);
    }
    mergeStatic(g);
  },
  // Every other building of the palace, from the real map
  // (scripts/build-gyeongbokgung.mjs): l.halls = [[x, z, w, d, ry, kind,
  // han]] in the landmark's metres, w × d the footprint as drawn (30% of the
  // real one), kind 'h' a hall (walls, doors, a hipped roof), 'n' a hall
  // with no ridge (the king's and queen's), 'g' a gate (posts and a roof
  // you walk under), 'r' a plain block (walls and a roof) where a real
  // building was left out. Heights are half the real ones (l.v scales them). All
  // of it is merged into a few meshes, so 150 buildings cost a handful of
  // draw calls.
  palacehalls(g, l) {
    const V = l.v || 1, boards = [];
    for (const [x, z, w, d, ry, kind = 'h', han] of l.halls) {
      const h = new THREE.Group();
      if (kind === 'r') { // a plain block where a real building was left out: walls and a big roof only
        const k = Math.min(w, d), B = 0.35, H = Math.min(3.2, Math.max(2, 1.2 + k * 0.25)) * V, e = Math.min(1.4, Math.max(0.5, k * 0.18 + 0.3));
        box(h, w + 0.5, B, d + 0.5, 0, B / 2, 0, C.stone);
        box(h, w, H, d, 0, B + H / 2, 0, C.wall);
        box(h, w + 0.04, 0.5 * V, d + 0.04, 0, B + 0.25 * V, 0, C.post); // the red dado
        box(h, w + 0.3, 0.3 * V, d + 0.3, 0, B + H + 0.15 * V, 0, C.beam);
        tiles(h, w + 2 * e, d + 2 * e, Math.max(1, Math.min(3, k * 0.45)) * V, B + H + 0.3 * V, { hip: true, lift: Math.min(0.8, 0.2 + k * 0.08), seg: 4, rows: 1 });
        h.position.set(x, 0, z);
        h.rotation.y = ry;
        g.add(h);
        continue;
      }
      const gate = kind === 'g', k = Math.min(w, d);
      const B = Math.min(0.6, 0.25 + k * 0.05), H = (gate ? Math.max(2.4, 1.6 + k * 0.25) : Math.min(4, Math.max(2.1, 1.1 + d * 0.3))) * V;
      const post = Math.min(0.45, Math.max(0.22, k * 0.07)), e = Math.min(1.6, Math.max(0.55, d * 0.22 + 0.35));
      box(h, w + 0.7, B, d + 0.7, 0, B / 2, 0, C.stone);
      if (!gate) {
        box(h, w - post, H, d - post, 0, B + H / 2, 0, C.wall);
        box(h, w - post * 2, H * 0.8, 0.08, 0, B + H * 0.4, d / 2 - post / 2 + 0.03, C.door); // the doors along the front
        box(h, w - post, 0.5 * V, d - post + 0.02, 0, B + 0.25 * V, 0, C.post); // the red dado
      } else box(h, w - post, 0.6 * V, 0.2, 0, B + H - 0.3 * V, 0, C.wall);
      const nx = Math.max(1, Math.round(w / 1.7));
      for (let i = 0; i <= nx; i++) for (const sz of gate ? [-1, 0, 1] : [-1, 1]) box(h, post, H, post, -w / 2 + (i * w) / nx, B + H / 2, (sz * d) / 2, C.post);
      box(h, w + 0.25, 0.32 * V, d + 0.25, 0, B + H + 0.16 * V, 0, C.beam);
      box(h, w + 0.6, 0.3 * V, d + 0.6, 0, B + H + 0.47 * V, 0, C.bracket);
      tiles(h, w + 2 * e, d + 2 * e, Math.max(1, Math.min(3.4, d * 0.5)) * V, B + H + 0.62 * V, { hip: true, lift: Math.min(0.9, 0.25 + k * 0.1), seg: k > 4 ? 6 : 4, rows: 2, ridgeEnds: k > 3, noRidge: kind === 'n' });
      h.position.set(x, 0, z);
      h.rotation.y = ry;
      g.add(h);
      if (han) boards.push([han, x, z, w, d, ry, B + H * 0.88]);
    }
    mergeStatic(g);
    for (const [han, x, z, w, d, ry, y] of boards) { // name boards on the main halls (one draw call each)
      const bw = Math.min(2.4, w * 0.35), sign = nameBoard(han, bw, bw * 0.38);
      sign.position.set(x + Math.sin(ry) * (d / 2 + 0.12), y, z + Math.cos(ry) * (d / 2 + 0.12));
      sign.rotation.y = ry;
      g.add(sign);
    }
  },
  // Amisan (아미산): four stepped flower terraces behind Gyotaejeon with the
  // hexagonal red-brick chimneys of the queen's under-floor heating.
  amisan(g, l) {
    const w = l.w || 16;
    for (let i = 0; i < 4; i++) {
      box(g, w, 0.45, 2.4, 0, 0.22 + i * 0.45, -i * 2.4, C.stoneDark);
      for (let k = 0; k < 6; k++) box(g, 0.8, 0.35, 0.8, -w / 2 + 1.5 + (k * (w - 3)) / 5, 0.62 + i * 0.45, -i * 2.4 + 0.4, ['#e58aa3', '#f2c14e', '#d9534f', '#9bc26a'][(i + k) % 4]); // flowers
    }
    for (const x of [-4.5, -1.5, 1.5, 4.5]) {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.65, 3.4, 6), mat('#b5523b'));
      c.position.set(x, 1.8 + 1.35, -6.6);
      g.add(c);
      box(g, 1.5, 0.35, 1.5, x, 1.8 + 3.05, -6.6, '#4a4f57');
    }
    mergeStatic(g);
  },
  // Hyangwonjeong (향원정): a small two-storey hexagonal pavilion on an
  // island in its pond, Chwihyanggyo bridge to the north shore.
  hexpavilion(g, l) {
    const s = l.s || 1, r = 1.9 * s;
    const isle = new THREE.Mesh(new THREE.CylinderGeometry(r + 1.6, r + 1.9, 0.6, 12), mat(C.stone));
    isle.position.y = 0.1;
    g.add(isle);
    const post = (y, h) => { for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; box(g, 0.22, h, 0.22, Math.sin(a) * r, y + h / 2, Math.cos(a) * r, C.post); } };
    const floor = (y, rr, c) => { const f = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.18, 6), mat(c)); f.position.y = y; g.add(f); };
    post(0.4, 1.8); floor(2.2, r + 0.3, C.door); post(2.3, 1.5);
    floor(3.9, r + 0.3, C.beam);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r + 1.3, 1.9, 6), mat('#474c55'));
    roof.position.y = 4.9;
    g.add(roof);
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 6), mat(C.gold));
    tip.position.y = 5.95;
    g.add(tip);
    // Chwihyanggyo: a wooden bridge north to the shore (l.bridge: its length).
    const L = l.bridge || 6;
    box(g, 1.3, 0.15, L, 0, 0.55, -(r + 1.4 + L / 2), '#8a5a3a');
    for (const sx of [-1, 1]) box(g, 0.08, 0.5, L, sx * 0.62, 0.85, -(r + 1.4 + L / 2), C.post);
    mergeStatic(g);
  },
};
