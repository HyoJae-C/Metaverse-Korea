// Seoul Forest decor (map "landmarks", placed by scripts/build-seongsu.mjs):
// a round rose garden, park benches you can sit on, a round paved plaza, and
// ice cream sculptures. The sculptures are Yozi's own designs (3D models in
// public/models/icecream, meshopt-compressed), loaded once and shared.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));

// The flavours, for the "look" text next to a sculpture.
export const ICECREAM = {
  strawberry: { en: 'Strawberry', ko: '딸기', ja: 'いちご', zh: '草莓' },
  chocolate: { en: 'Chocolate', ko: '초코', ja: 'チョコ', zh: '巧克力' },
  'mint-chocolate': { en: 'Mint chocolate', ko: '민트 초코', ja: 'チョコミント', zh: '薄荷巧克力' },
  'soft-serve': { en: 'Soft serve', ko: '소프트 아이스크림', ja: 'ソフトクリーム', zh: '软冰淇淋' },
};
export const ICECREAM_TEXT = {
  look: { en: 'Look at the ice cream art', ko: '아이스크림 작품 보기', ja: 'アイスクリームのアートを見る', zh: '欣赏冰淇淋雕塑' },
  about: {
    en: '🍦 {name} ice cream · designed by Yozi. Find all four flavours around Seoul Forest!',
    ko: '🍦 {name} 아이스크림 · 디자인 Yozi. 서울숲 곳곳에서 네 가지 맛을 모두 찾아보세요!',
    ja: '🍦 {name}アイス · デザイン Yozi。ソウルの森で4つの味をぜんぶ探してみて！',
    zh: '🍦 {name}冰淇淋 · 设计 Yozi。在首尔林里找齐四种口味吧！',
  },
};

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
let loader = null;
const models = new Map(); // id -> Promise<THREE.Object3D | null>
function loadModel(id) {
  if (!models.has(id)) {
    loader ||= new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const lambert = new Map(); // the street's flat look: Lambert, same colours
    models.set(id, loader.loadAsync(`${BASE}models/icecream/${id}.glb`).then((g) => {
      g.scene.traverse((o) => {
        if (!o.isMesh) return;
        const m = o.material;
        if (!lambert.has(m)) lambert.set(m, new THREE.MeshLambertMaterial({ color: m.color, map: m.map }));
        o.material = lambert.get(m);
        o.castShadow = true;
        o.receiveShadow = true;
      });
      return g.scene;
    }).catch(() => null));
  }
  return models.get(id);
}

// An ice cream sculpture standing on its own pedestal (the model's 0.8 m
// base), l.s times the model's 2.8 m.
function icecream(g, l) {
  if (!ICECREAM[l.model]) return;
  g.scale.setScalar(l.s || 1);
  loadModel(l.model).then((scene) => { if (scene) g.add(scene.clone()); });
}

// A park bench facing +z (the sitter looks the way the group turns).
export const BENCH_SEAT_H = 0.42;
function bench(g) {
  const wood = mat('#b5794a'), iron = mat('#4d4a46');
  const add = (sx, sy, sz, x, y, z, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    g.add(b);
  };
  for (const z of [-0.14, 0, 0.14]) add(1.8, 0.05, 0.12, 0, BENCH_SEAT_H, z, wood); // seat slats
  for (const y of [0.62, 0.8]) add(1.8, 0.12, 0.05, 0, y, -0.25, wood); // backrest
  for (const x of [-0.78, 0.78]) {
    add(0.07, BENCH_SEAT_H, 0.5, x, BENCH_SEAT_H / 2, 0, iron); // legs
    add(0.07, 0.5, 0.06, x, 0.68, -0.25, iron); // back posts
    add(0.07, 0.05, 0.42, x, 0.62, 0.02, iron); // arm rests
  }
}
// Where people sit on the benches: two places each, standing up in front.
export function benchSeats(list = []) {
  const out = [];
  for (const l of list) {
    if (l.type !== 'bench') continue;
    const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0);
    const at = (lx, lz) => [l.x + lx * c + lz * s, l.z - lx * s + lz * c];
    for (const lx of [-0.45, 0.45]) {
      const [x, z] = at(lx, 0.02);
      out.push({ x, z, ry: l.ry || 0, stand: at(lx, 0.85), street: true });
    }
  }
  return out;
}
// The sculpture someone stands next to (for the "look" button).
export function sculptureNear(list = [], x, z) {
  let best = null, bd = Infinity;
  for (const l of list) {
    if (l.type !== 'icecream') continue;
    const d = Math.hypot(x - l.x, z - l.z) - (l.s || 1) * 0.7;
    if (d < 1.8 && d < bd) { bd = d; best = l; }
  }
  return best;
}

// A round paved plaza (under the ice cream trio).
function parkplaza(g, l) {
  const r = l.r || 7;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), mat('#e3d6bf'));
  disc.position.y = 0.05;
  const rim = new THREE.Mesh(new THREE.RingGeometry(r - 0.35, r, 40).rotateX(-Math.PI / 2), mat('#c9b596'));
  rim.position.y = 0.055;
  disc.userData.noShadow = rim.userData.noShadow = true;
  g.add(disc, rim);
  flowerBorder(g, r + 0.6, 0, Math.PI * 2, 0.9, ['#ff8fab', '#ffd166', '#ffffff', '#c9a6f0']);
}

// Little round flower clumps along an arc (a border round the plaza).
function flowerBorder(g, r, a0, a1, gap, colors) {
  const n = Math.max(1, Math.round(((a1 - a0) * r) / gap));
  const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.28, 0), mat('#5f9e4f'), n);
  const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.16, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), n);
  const m4 = new THREE.Matrix4(), col = colors.map((c) => new THREE.Color(c));
  for (let i = 0; i < n; i++) {
    const a = a0 + ((a1 - a0) * (i + 0.5)) / n;
    m4.makeTranslation(Math.cos(a) * r, 0.22, Math.sin(a) * r);
    leaf.setMatrixAt(i, m4);
    m4.makeTranslation(Math.cos(a) * r, 0.46, Math.sin(a) * r);
    bloom.setMatrixAt(i, m4);
    bloom.setColorAt(i, col[i % col.length]);
  }
  g.add(leaf, bloom);
}

// The rose garden (l.r, about 14 m): a round paved garden with two rings of
// rose beds cut by four paths, each bed its own colour, a rose arch at each
// of the four ways in, and a clipped hedge round the outside.
const ROSES = ['#e8243c', '#ff7aa8', '#ffd23f', '#fff6ea', '#ff8a5c', '#b78bea', '#d6246e', '#ffb3c7'];
function rosegarden(g, l) {
  const R = l.r || 14;
  const PATH = 1.3; // half the width of the cross paths
  const RINGS = [[3.2, 7.2], [10, R - 0.9]]; // inner and outer beds (radius from…to)
  const paving = new THREE.Mesh(new THREE.CircleGeometry(R, 56).rotateX(-Math.PI / 2), mat('#e6d8c0'));
  paving.position.y = 0.045;
  paving.userData.noShadow = true;
  g.add(paving);
  // Beds: dark soil sectors between the paths.
  const soil = mat('#7a5a40');
  const beds = [];
  RINGS.forEach(([r0, r1], ring) => {
    for (let q = 0; q < 4; q++) {
      const cut0 = Math.asin(Math.min(1, PATH / r0)), cut1 = Math.asin(Math.min(1, PATH / r1));
      const a0 = (q * Math.PI) / 2 + Math.max(cut0, cut1), a1 = ((q + 1) * Math.PI) / 2 - Math.max(cut0, cut1);
      // (laid flat, the ring's angle θ lands at (cos θ, -sin θ): start at -a1)
      const geo = new THREE.RingGeometry(r0, r1, 18, 1, -a1, a1 - a0).rotateX(-Math.PI / 2);
      const bed = new THREE.Mesh(geo, soil);
      bed.position.y = 0.09;
      bed.userData.noShadow = true;
      g.add(bed);
      beds.push({ r0, r1, a0, a1, color: ROSES[(ring * 4 + q * (ring ? 3 : 1)) % ROSES.length] });
    }
  });
  // Rose bushes in the beds: a leafy clump with three blooms on top.
  const spots = [];
  for (const b of beds) {
    for (let r = b.r0 + 0.55; r < b.r1 - 0.3; r += 0.95) {
      const n = Math.max(1, Math.floor(((b.a1 - b.a0) * r) / 0.95));
      for (let i = 0; i < n; i++) {
        const a = b.a0 + ((b.a1 - b.a0) * (i + 0.5)) / n + (r % 2) * 0.02;
        spots.push({ x: Math.cos(a) * r, z: Math.sin(a) * r, color: b.color, k: spots.length });
      }
    }
  }
  const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.42, 0), mat('#3f7f3a'), spots.length);
  const bloomGeo = new THREE.IcosahedronGeometry(0.17, 0);
  const blooms = new THREE.InstancedMesh(bloomGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), spots.length * 3);
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  const tint = new THREE.Color();
  spots.forEach((p, i) => {
    const s = 0.85 + ((i * 7) % 5) / 12;
    m4.compose(v.set(p.x, 0.42 * s, p.z), q4.identity(), sc.set(s, s * 0.9, s));
    bush.setMatrixAt(i, m4);
    for (let k = 0; k < 3; k++) {
      const a = k * 2.1 + i;
      m4.compose(v.set(p.x + Math.cos(a) * 0.22 * s, 0.72 * s + (k === 0 ? 0.1 : 0), p.z + Math.sin(a) * 0.22 * s), q4.identity(), sc.set(1, 1, 1));
      blooms.setMatrixAt(i * 3 + k, m4);
      blooms.setColorAt(i * 3 + k, tint.set(p.color).offsetHSL(0, 0, (k - 1) * 0.04));
    }
  });
  g.add(bush, blooms);
  // Rose arches over the four ways in, and the hedge between them.
  const archGeo = new THREE.TorusGeometry(1.5, 0.07, 6, 16, Math.PI);
  const post = mat('#f4f1ea');
  for (let q = 0; q < 4; q++) {
    const a = (q * Math.PI) / 2, ax = Math.cos(a) * (R - 0.3), az = Math.sin(a) * (R - 0.3);
    const arch = new THREE.Group();
    arch.position.set(ax, 0, az);
    arch.rotation.y = -a + Math.PI / 2; // spans across the path
    for (const s of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.3, 0.12), post);
      p.position.set(s * 1.5, 1.15, 0);
      arch.add(p);
    }
    const top = new THREE.Mesh(archGeo, post);
    top.position.y = 2.3;
    arch.add(top);
    // climbing roses on the arch
    const n = 14;
    const climb = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), n * 2);
    for (let i = 0; i < n; i++) {
      const t = (i / (n - 1)) * Math.PI;
      m4.makeTranslation(Math.cos(t) * 1.5, 2.3 + Math.sin(t) * 1.5, 0.05);
      climb.setMatrixAt(i, m4);
      climb.setColorAt(i, tint.set(i % 3 ? '#ff6f91' : '#fff6ea'));
      const h = (i / n) * 2.2;
      m4.makeTranslation((i % 2 ? 1 : -1) * 1.5, 0.2 + h, 0.08);
      climb.setMatrixAt(n + i, m4);
      climb.setColorAt(n + i, tint.set(i % 2 ? '#e8243c' : '#ff9eb5'));
    }
    arch.add(climb);
    g.add(arch);
  }
  const hedgeN = 72;
  const hedge = new THREE.InstancedMesh(new THREE.BoxGeometry(1.25, 0.8, 0.7), mat('#4f8f45'), hedgeN);
  let h = 0;
  for (let i = 0; i < hedgeN; i++) {
    const a = ((i + 0.5) / hedgeN) * Math.PI * 2;
    const nearWay = Math.min(...[0, 1, 2, 3, 4].map((q) => Math.abs(a - (q * Math.PI) / 2))) * R < 2.2;
    if (nearWay) continue;
    m4.compose(v.set(Math.cos(a) * (R + 0.2), 0.4, Math.sin(a) * (R + 0.2)), q4.setFromAxisAngle(sc.set(0, 1, 0), -a + Math.PI / 2), sc.set(1, 1, 1));
    hedge.setMatrixAt(h++, m4);
  }
  hedge.count = h;
  g.add(hedge);
}

// A grassy hill (l.r across, l.h high) with wooden stairs up its slope on
// the side the group faces (+z) to a look-out deck on top. You walk on it:
// hillY gives the ground height, so the whole slope can be climbed.
const HILL = { r: 13, h: 4, top: 3.2, deck: 2.8 };
function hillShape(l) {
  return { r: l.r || HILL.r, h: l.h || HILL.h, top: l.top || HILL.top, deck: l.deck || HILL.deck };
}
// Height of the hill's grass at distance d from its middle: flat on top,
// a smooth slope down to the ground at r.
function hillAt(H, d) {
  if (d >= H.r) return 0;
  if (d <= H.top) return H.h;
  return H.h * 0.5 * (1 + Math.cos((Math.PI * (d - H.top)) / (H.r - H.top)));
}
export function hillY(list = [], x, z) {
  for (const l of list) {
    if (l.type !== 'hill') continue;
    const H = hillShape(l), d = Math.hypot(x - l.x, z - l.z);
    if (d >= H.r) continue;
    return d < H.deck ? H.h + 0.12 : hillAt(H, d); // (the deck's boards sit a little higher)
  }
  return 0;
}
function hill(g, l) {
  const H = hillShape(l);
  g.add(new THREE.Mesh(hillGeometry(H), mat('#93cf78'))); // the mound
  // Wooden stairs straight up the slope on the +z side, from the foot to the deck.
  const wood = mat('#b98352'), dark = mat('#8a5a36');
  const STEP = 0.55;
  for (let d = H.r - 0.2; d > H.deck; d -= STEP) {
    const y = hillAt(H, d);
    const step = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, STEP + 0.04), wood);
    step.position.set(0, y - 0.06, d); // (top flush with the slope: you walk on it)
    g.add(step);
    const riser = new THREE.Mesh(new THREE.BoxGeometry(2.2, Math.max(0.05, hillAt(H, d - STEP) - y) + 0.12, 0.08), dark);
    riser.position.set(0, (y + hillAt(H, d - STEP)) / 2 + 0.04, d - STEP / 2);
    g.add(riser);
  }
  // Hand rails: posts either side every few steps, a rail along their tops.
  const posts = [];
  for (let d = H.r - 0.4; d > H.deck; d -= 1.4) posts.push([d, hillAt(H, d)]);
  for (const sx of [-1.2, 1.2]) {
    posts.forEach(([d, y], i) => {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.9, 0.1), dark);
      post.position.set(sx, y + 0.45, d);
      g.add(post);
      const next = posts[i + 1];
      if (!next) return;
      const len = Math.hypot(d - next[0], y - next[1]);
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, len), wood);
      rail.position.set(sx, (y + next[1]) / 2 + 0.9, (d + next[0]) / 2);
      rail.rotation.x = Math.atan2(next[1] - y, d - next[0]);
      g.add(rail);
    });
  }
  // The look-out deck on top: round boards, a railing with a gap for the stairs.
  const deck = new THREE.Mesh(new THREE.CylinderGeometry(H.deck, H.deck, 0.3, 24), wood);
  deck.position.y = H.h - 0.03;
  g.add(deck);
  const n = 20;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(Math.sin(a)) > 0.92 && Math.sin(a) > 0) continue; // the way to the stairs (+z)
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1), dark);
    post.position.set(Math.cos(a) * (H.deck - 0.1), H.h + 0.6, Math.sin(a) * (H.deck - 0.1));
    g.add(post);
  }
  const top = new THREE.Mesh(new THREE.TorusGeometry(H.deck - 0.1, 0.05, 4, 32, Math.PI * 2 - 0.85), wood);
  top.rotation.x = Math.PI / 2;
  top.rotation.z = Math.PI / 2 + 0.425; // the opening over the stairs
  top.position.y = H.h + 1.1;
  g.add(top);
  // A few flowers on the slope.
  flowerBorder(g, H.r - 2.5, Math.PI * 0.62, Math.PI * 2.38, 1.6, ['#ffd166', '#ff8fab', '#ffffff']);
  g.children.at(-1).position.y = hillAt(H, H.r - 2.5);
  g.children.at(-2).position.y = hillAt(H, H.r - 2.5);
}
// The mound: rings of vertices following hillAt, so the slope is smooth.
function hillGeometry(H) {
  const rings = 14, segs = 48, pos = [], idx = [];
  pos.push(0, H.h, 0);
  for (let k = 1; k <= rings; k++) {
    const d = (k / rings) * H.r;
    for (let i = 0; i < segs; i++) {
      const a = (i / segs) * Math.PI * 2;
      pos.push(Math.cos(a) * d, hillAt(H, d) + 0.02, Math.sin(a) * d);
    }
  }
  for (let i = 0; i < segs; i++) idx.push(0, 1 + ((i + 1) % segs), 1 + i);
  for (let k = 1; k < rings; k++) {
    const a0 = 1 + (k - 1) * segs, a1 = 1 + k * segs;
    for (let i = 0; i < segs; i++) {
      const j = (i + 1) % segs;
      idx.push(a0 + i, a0 + j, a1 + i, a0 + j, a1 + j, a1 + i);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(idx);
  out.computeVertexNormals();
  return out;
}

export const PARK_BUILD = { icecream, bench, parkplaza, rosegarden, hill };
