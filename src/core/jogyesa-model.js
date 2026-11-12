// Jogyesa's models (src/data/jogyesa.js): Daeungjeon, Geungnakjeon, Iljumun
// with the Four Heavenly Kings, the pagoda tree, the white pine, the sarira
// pagoda, the baby Buddha, the stele and the lantern canopy over the yard.
// Loaded when the city is built (core/landmarks.js "jogyesa"). Everything
// that never moves is merged into a mesh per material; the canopy's
// lanterns are one InstancedMesh. Visual only: collision comes from the
// map's blockers (scripts/build-jogyesa.mjs).
import * as THREE from 'three';
import { matCache, addBox } from './three-kit.js';
import { tiles, band, body, nameBoard } from './palace-model.js';
import { mergeStatic } from './bukchon-models.js';
import { JOGYESA as J } from '../data/jogyesa.js';

const mat = matCache({ flatShading: true });
const box = (g, sx, sy, sz, x, y, z, c) => addBox(g, mat, sx, sy, sz, x, y, z, c);
const C = {
  stone: '#d6cdb8', stoneDark: '#b1a690', granite: '#c9c6bf', bark: '#5a4636', leaf: '#5f9a4a', leafDark: '#4c8040',
  pineBark: '#e6e2d6', pineLeaf: '#3f6b3a', gold: '#d9ac3e', skin: '#e9c9a1', post: '#a8392b', rope: '#6b5a48',
};
// Lotus lantern colours in rows, so the canopy reads as stripes from above
// (pink and white with red and yellow, as in the satellite view).
export const CANOPY_COLORS = ['#ff8fb1', '#fff4ea', '#ff6f91', '#ffd84d', '#fff4ea', '#ff8fb1', '#ef4f5f', '#fff4ea'];

const cyl = (g, rt, rb, h, x, y, z, c, seg = 8) => {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(c));
  m.position.set(x, y, z);
  g.add(m);
  return m;
};
const blob = (g, r, x, y, z, c, sy = 0.8) => {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat(c));
  m.position.set(x, y, z);
  m.scale.y = sy;
  g.add(m);
  return m;
};

// A temple hall on a stone plinth, front (doors, steps, name board) at +z.
function hall(g, h, han) {
  const { w, d, plinth: P, eave: E, bays } = h;
  box(g, w + 2.6, P, d + 2.6, 0, P / 2, 0, C.stone);
  box(g, w + 2.8, 0.12, d + 2.8, 0, P - 0.06, 0, C.stoneDark);
  for (const x of bays > 5 ? [-w * 0.32, 0, w * 0.32] : [0]) { // steps up to the doors
    const n = Math.max(2, Math.round(P / 0.2));
    for (let i = 0; i < n; i++) box(g, 2.4, P * (1 - i / n), 0.35, x, (P * (1 - i / n)) / 2, d / 2 + 1.3 + (n - i) * 0.35, C.stone);
  }
  body(g, w, d, E, P, bays);
  band(g, w, d, P + E);
  const roofH = Math.max(2.2, h.ridge - P - E - 1.75);
  tiles(g, w + 5.5, d + 5, roofH, P + E + 1.75, { hip: true, lift: 1.1, seg: 6, rows: 3 });
  const board = nameBoard(han, Math.min(3.2, w * 0.22), 1.1);
  board.position.set(0, P + E + 0.75, d / 2 + 0.95);
  g.add(board);
  return board;
}

// Iljumun: one row of posts across the way in, a side bay at each end with
// lattice walls where two of the Heavenly Kings stand, a tiled roof. Built
// with its long way along x and the road side at +z.
function gate(g, I) {
  const hw = I.w / 2, hd = I.d / 2, H = I.h - 2.6;
  for (const x of [-hw, -hw + I.bay, hw - I.bay, hw]) for (const z of [-hd + 0.3, hd - 0.3]) box(g, 0.55, H, 0.55, x, H / 2, z, C.post);
  for (const sx of [-1, 1]) {
    const x = sx * (hw - I.bay / 2);
    box(g, 0.12, H * 0.85, I.d - 0.6, sx * hw, H * 0.43, 0, '#7a2c22'); // the outer wall
    box(g, I.bay, 0.35, I.d - 0.6, x, 0.18, 0, C.stone); // the kings' platform
  }
  band(g, I.w - 0.6, I.d - 0.6, H);
  tiles(g, I.w + 3, I.d + 3.2, 1.6, H + 1.75, { hip: true, lift: 0.8, seg: 5, rows: 2 });
  const board = nameBoard('曹溪寺', 2.3, 0.85);
  board.position.set(0, H + 0.9, hd + 0.75);
  g.add(board);
  const back = board.clone();
  back.position.z = -hd - 0.75;
  back.rotation.y = Math.PI;
  g.add(back);
}

// A Heavenly King: a big armoured guardian on a plinth, about 2.6 m tall,
// facing +z, with what he holds (a pagoda, a lute, a sword or a dragon).
function king(k) {
  const g = new THREE.Group();
  box(g, 0.9, 0.3, 0.8, 0, 0.15, 0, C.stoneDark);
  cyl(g, 0.38, 0.5, 1.2, 0, 0.9, 0, k.color, 8); // robe
  box(g, 0.9, 0.75, 0.55, 0, 1.85, 0, k.color); // armoured chest
  box(g, 0.95, 0.12, 0.6, 0, 1.5, 0, C.gold); // belt
  box(g, 1.25, 0.22, 0.5, 0, 2.2, 0, C.gold); // shoulder guards
  blob(g, 0.3, 0, 2.55, 0.02, C.skin, 1.05); // head
  box(g, 0.34, 0.08, 0.04, 0, 2.62, 0.27, '#2a1d17'); // fierce brows
  cyl(g, 0.2, 0.28, 0.3, 0, 2.9, 0, C.gold, 6); // crown
  for (const sx of [-1, 1]) box(g, 0.22, 0.75, 0.22, sx * 0.6, 1.75, 0.15, k.color); // arms
  const hand = [0.6, 1.4, 0.35];
  if (k.holds === 'pagoda') { box(g, 0.24, 0.24, 0.24, ...hand, C.gold); cyl(g, 0.02, 0.1, 0.25, hand[0], hand[1] + 0.25, hand[2], C.gold, 6); } else if (k.holds === 'lute') box(g, 0.3, 0.8, 0.12, 0, 1.6, 0.42, '#8a5a2b');
  else if (k.holds === 'sword') box(g, 0.08, 1.2, 0.05, hand[0], 1.95, hand[2], '#c9ced6');
  else { const d = cyl(g, 0.07, 0.07, 1.1, hand[0], 1.85, hand[2], '#2f8a68', 6); d.rotation.z = 0.5; blob(g, 0.13, 0.9, 2.35, hand[2], '#d4a73a'); }
  g.position.set(k.x, 0.35, k.z);
  g.rotation.y = k.ry;
  return g;
}

// The pagoda tree (회화나무): a thick old trunk that splits into big limbs,
// and a wide, loose crown that rises up through the canopy.
function pagodaTree(T) {
  const g = new THREE.Group();
  cyl(g, 0.55, 0.8, 4.5, 0, 2.25, 0, C.bark, 9);
  for (const [a, lean, len] of [[0.3, 0.55, 4.5], [2.4, 0.6, 4], [4.3, 0.5, 4.4]]) {
    const limb = cyl(g, 0.22, 0.42, len, 0, 0, 0, C.bark, 7);
    limb.position.set(Math.cos(a) * Math.sin(lean) * len / 2, 4.3 + Math.cos(lean) * len / 2, Math.sin(a) * Math.sin(lean) * len / 2);
    limb.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
  }
  const r = T.r;
  for (const [x, y, z, s, c] of [[0, T.h - 2.5, 0, 1, C.leaf], [r * 0.55, T.h - 3.8, 0.8, 0.8, C.leafDark], [-r * 0.5, T.h - 3.5, -0.6, 0.85, C.leaf], [0.6, T.h - 4, -r * 0.5, 0.75, C.leafDark], [-0.4, T.h - 4.2, r * 0.5, 0.75, C.leaf], [0, T.h - 1, 0, 0.6, C.leafDark]]) blob(g, r * 0.55 * s, x, y, z, c, 0.6);
  g.position.set(T.x, 0, T.z);
  return g;
}

// The white pine (백송): several pale, mottled stems from low down and dark
// flat clusters of needles.
function whitePine(T) {
  const g = new THREE.Group();
  for (const [a, lean] of [[0.4, 0.25], [2.5, 0.3], [4.4, 0.22]]) {
    const s = cyl(g, 0.16, 0.3, T.h * 0.62, 0, 0, 0, C.pineBark, 7);
    s.position.set(Math.cos(a) * Math.sin(lean) * T.h * 0.31, T.h * 0.31 * Math.cos(lean), Math.sin(a) * Math.sin(lean) * T.h * 0.31);
    s.rotation.set(Math.sin(a) * lean, 0, -Math.cos(a) * lean);
    for (const k of [0.55, 0.8, 1]) blob(g, 1.5 * k + 0.5, Math.cos(a) * T.h * 0.34 * k, T.h * (0.42 + 0.36 * k), Math.sin(a) * T.h * 0.34 * k, C.pineLeaf, 0.5);
  }
  g.position.set(T.x, 0, T.z);
  return g;
}

// The octagonal ten-storey sarira pagoda (8각10층 진신사리탑) on its base.
function sarira(T) {
  const g = new THREE.Group();
  cyl(g, 1.45, 1.5, 0.35, 0, 0.18, 0, C.granite, 8);
  cyl(g, 1.05, 1.15, 0.7, 0, 0.7, 0, C.granite, 8);
  let y = 1.05, r = 0.7;
  const step = (T.h - 1.9) / 10;
  for (let i = 0; i < 10; i++) {
    cyl(g, r, r, step * 0.62, 0, y + step * 0.31, 0, C.granite, 8);
    cyl(g, r * 1.32, r * 1.38, step * 0.22, 0, y + step * 0.73, 0, C.stoneDark, 8); // the storey's roof
    y += step;
    r *= 0.93;
  }
  cyl(g, 0.04, 0.12, 0.85, 0, y + 0.42, 0, C.gold, 6); // the finial
  blob(g, 0.12, 0, y + 0.9, 0, C.gold, 1);
  g.position.set(T.x, 0, T.z);
  return g;
}

function babyBuddha(T) {
  const g = new THREE.Group();
  cyl(g, 0.7, 0.8, 0.6, 0, 0.3, 0, C.stone, 8);
  cyl(g, 0.55, 0.35, 0.25, 0, 0.72, 0, '#e98aa6', 8); // lotus
  cyl(g, 0.16, 0.22, 0.6, 0, 1.15, 0, C.gold, 8);
  blob(g, 0.17, 0, 1.6, 0, C.gold, 1);
  box(g, 0.06, 0.4, 0.06, 0.12, 1.65, 0.02, C.gold); // one hand pointing to the sky
  g.position.set(T.x, 0, T.z);
  return g;
}

function stele(T) {
  const g = new THREE.Group();
  box(g, 1.1, 0.4, 0.7, 0, 0.2, 0, C.stoneDark);
  box(g, 0.8, 1.7, 0.2, 0, 1.25, 0, C.granite);
  box(g, 0.95, 0.25, 0.32, 0, 2.2, 0, C.stoneDark);
  g.position.set(T.x, 0, T.z);
  return g;
}

// Where the canopy's lanterns hang: a grid over the yard, minus the spots
// where the pagoda tree's trunk and the sarira pagoda come up through it.
// Each slot: [x, z, row]. (Also where players' own lanterns will go.)
export function canopySlots(c = J.canopy) {
  const out = [];
  const holes = [[J.pagodaTree.x, J.pagodaTree.z, 1.4], [J.sarira.x, J.sarira.z, 2]];
  let row = 0;
  for (let z = c.z0; z <= c.z1 + 1e-6; z += c.gap, row++) {
    for (let x = c.x0; x <= c.x1 + 1e-6; x += c.gap) {
      if (holes.some(([hx, hz, r]) => Math.hypot(x - hx, z - hz) < r)) continue;
      out.push([x, z, row]);
    }
  }
  return out;
}

function canopy(g, ox, oz) {
  const c = J.canopy, slots = canopySlots(c);
  const lant = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.3, 0).scale(1, 0.82, 1), new THREE.MeshBasicMaterial({ color: '#ffffff' }), slots.length);
  const tag = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.1, 0.32), new THREE.MeshBasicMaterial({ color: '#fdfaf2', side: THREE.DoubleSide }), slots.length);
  const m4 = new THREE.Matrix4(), col = new THREE.Color();
  slots.forEach(([x, z, row], i) => {
    const sag = 0.12 * Math.sin(((x - c.x0) / (c.x1 - c.x0)) * Math.PI * 4) ** 2; // the lines dip between the poles
    m4.makeTranslation(x - ox, c.y - 0.35 - sag, z - oz);
    lant.setMatrixAt(i, m4);
    m4.makeTranslation(x - ox, c.y - 0.82 - sag, z - oz);
    tag.setMatrixAt(i, m4);
    lant.setColorAt(i, col.set(CANOPY_COLORS[row % CANOPY_COLORS.length]));
  });
  // The lines the lanterns hang from (one per row) and the poles holding them up.
  const rows = Math.round((c.z1 - c.z0) / c.gap) + 1;
  for (let r = 0; r < rows; r++) box(g, c.x1 - c.x0 + 1, 0.03, 0.03, (c.x0 + c.x1) / 2 - ox, c.y, c.z0 + r * c.gap - oz, C.rope);
  for (const z of [c.z0 - 0.3, c.z1 + 0.3]) box(g, c.x1 - c.x0 + 1, 0.05, 0.05, (c.x0 + c.x1) / 2 - ox, c.y + 0.05, z - oz, C.rope);
  for (let x = c.x0; x <= c.x1 + 0.1; x += (c.x1 - c.x0) / 4) for (const z of [c.z0 - 0.3, c.z1 + 0.3]) box(g, 0.14, c.y + 0.2, 0.14, x - ox, (c.y + 0.2) / 2, z - oz, '#4b4038');
  mergeStatic(g); // the lines and poles (before the lanterns go in: it would bake instanced meshes too)
  for (const m of [lant, tag]) { m.userData.noShadow = true; g.add(m); }
  lant.name = 'jogyesa-canopy'; // (game/lantern-parade.js lights it up row by row)
  return lant;
}

export function buildJogyesa(g) {
  const D = J.daeungjeon, ox = D.x, oz = D.z;
  const at = (o, x, z, ry = 0) => { o.position.set(x - ox, o.position.y, z - oz); o.rotation.y = ry; g.add(o); return o; };
  const sub = (fn, ...a) => { const o = fn(...a); o.position.x -= ox; o.position.z -= oz; g.add(o); return o; };
  const dg = at(new THREE.Group(), D.x, D.z);
  hall(dg, D, '大雄殿');
  const G = J.geungnakjeon;
  const gg = at(new THREE.Group(), G.x, G.z, Math.PI / 2); // its front faces east, onto the yard
  hall(gg, { ...G, w: G.d, d: G.w }, '極樂殿');
  const I = J.iljumun;
  gate(at(new THREE.Group(), I.x, I.z, Math.PI / 2), I); // road side (+z) to the east
  for (const k of J.kings) sub(king, k);
  sub(pagodaTree, J.pagodaTree);
  sub(whitePine, J.whitePine);
  sub(sarira, J.sarira);
  sub(babyBuddha, J.babyBuddha);
  sub(stele, J.stele);
  mergeStatic(g); // (before the canopy: it would bake the instanced lanterns too)
  const cg = new THREE.Group();
  g.userData.canopy = canopy(cg, ox, oz);
  g.add(cg);
  return g;
}
