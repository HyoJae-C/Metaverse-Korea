// Seoul Forest decor (map "landmarks", placed by scripts/build-seongsu.mjs):
// a round rose garden, park benches you can sit on, a round paved plaza, and
// ice cream sculptures. The sculptures are Yozi's own designs (3D models in
// public/models/icecream, meshopt-compressed), loaded once and shared.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { matCache } from './three-kit.js';
import { bakeColors } from './merge-static.js';

const mat = matCache();

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
const BENCH_W = 2.2; // long enough for three people (BENCH_SEATS)
const BENCH_SEATS = [-0.66, 0, 0.66];
function bench(g) {
  const wood = mat('#b5794a'), iron = mat('#4d4a46');
  const add = (sx, sy, sz, x, y, z, m) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), m);
    b.position.set(x, y, z);
    g.add(b);
  };
  for (const z of [-0.14, 0, 0.14]) add(BENCH_W, 0.05, 0.12, 0, BENCH_SEAT_H, z, wood); // seat slats
  for (const y of [0.62, 0.8]) add(BENCH_W, 0.12, 0.05, 0, y, -0.25, wood); // backrest
  for (const x of [-(BENCH_W / 2 - 0.12), BENCH_W / 2 - 0.12]) {
    add(0.07, BENCH_SEAT_H, 0.5, x, BENCH_SEAT_H / 2, 0, iron); // legs
    add(0.07, 0.5, 0.06, x, 0.68, -0.25, iron); // back posts
    add(0.07, 0.05, 0.42, x, 0.62, 0.02, iron); // arm rests
  }
}
// Where people sit on the benches: three places each, standing up in front.
export function benchSeats(list = []) {
  const out = [];
  for (const l of list) {
    if (l.type !== 'bench') continue;
    const c = Math.cos(l.ry || 0), s = Math.sin(l.ry || 0);
    const at = (lx, lz) => [l.x + lx * c + lz * s, l.z - lx * s + lz * c];
    for (const lx of BENCH_SEATS) {
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
    if (d < (l.reach || 1.8) && d < bd) { bd = d; best = l; } // reach: further for one up on a fountain
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
  const n = Math.round(H.deck * 7); // railing posts, about 0.9 m apart
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

// An avenue of tall, slim metasequoias in autumn orange (l.trees: [x, z] map
// positions), like Seoul Forest's tree tunnels.
export function avenue(g, l) {
  const spots = l.trees || [];
  if (!spots.length) return;
  const trunk = new THREE.CylinderGeometry(0.22, 0.34, 4, 6).translate(0, 2, 0);
  const crown = new THREE.ConeGeometry(1.5, 9, 8).translate(0, 7.4, 0);
  const trunks = new THREE.InstancedMesh(trunk, mat('#7a5240'), spots.length);
  const crowns = new THREE.InstancedMesh(crown, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), spots.length);
  const oranges = ['#e8892b', '#d9771f', '#f0a23a', '#c9661a', '#f2b046'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  spots.forEach(([x, z], i) => {
    const s = 0.9 + ((i * 37) % 10) / 40;
    m4.compose(v.set(x, 0, z), q.setFromAxisAngle(up, i * 1.3), sc.set(s, s, s));
    trunks.setMatrixAt(i, m4);
    crowns.setMatrixAt(i, m4);
    crowns.setColorAt(i, oranges[(i * 7) % oranges.length]);
  });
  g.add(trunks, crowns);
}

// A butterfly greenhouse (l.w × l.d, door l.door wide in the -z wall): a
// white frame with glass walls and a glass gable roof, planters of leafy
// plants and flowers round the inside, and butterflies fluttering about.
// Returns a tick (time in seconds) that flies them.
function greenhouse(g, l) {
  const w = l.w || 14, d = l.d || 10, door = l.door || 2.6, H = 3.6, roofH = 2.2;
  const frame = mat('#f6f7f2');
  const glass = new THREE.MeshLambertMaterial({ color: '#d8f1ee', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide });
  const add = (geo, m, x, y, z, noShadow) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); if (noShadow) o.userData.noShadow = true; g.add(o); return o; };
  // floor: pale stone tiles
  add(new THREE.BoxGeometry(w, 0.08, d), mat('#e4ddd0'), 0, 0.04, 0, true);
  // posts round the walls, every ~2 m, and beams along the tops
  const postGeo = new THREE.BoxGeometry(0.12, H, 0.12);
  const nx = Math.round(w / 2), nz = Math.round(d / 2);
  for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) {
    const x = -w / 2 + (w * i) / nx;
    if (sz < 0 && Math.abs(x) < door / 2 - 0.05) continue; // (the doorway)
    add(postGeo, frame, x, H / 2, (sz * d) / 2);
  }
  for (let k = 1; k < nz; k++) for (const sx of [-1, 1]) add(postGeo, frame, (sx * w) / 2, H / 2, -d / 2 + (d * k) / nz);
  for (const sz of [-1, 1]) add(new THREE.BoxGeometry(w, 0.14, 0.14), frame, 0, H, (sz * d) / 2);
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(0.14, 0.14, d), frame, (sx * w) / 2, H, 0);
  // glass walls (the front one in two halves either side of the door, and a glass panel over it)
  add(new THREE.PlaneGeometry(w, H), glass, 0, H / 2, d / 2, true);
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(d, H), glass, (sx * w) / 2, H / 2, 0, true).rotation.y = Math.PI / 2;
  const side = (w - door) / 2;
  for (const sx of [-1, 1]) add(new THREE.PlaneGeometry(side, H), glass, sx * (door / 2 + side / 2), H / 2, -d / 2, true);
  add(new THREE.PlaneGeometry(door, H - 2.6), glass, 0, 2.6 + (H - 2.6) / 2, -d / 2, true);
  add(new THREE.BoxGeometry(door + 0.2, 0.14, 0.16), frame, 0, 2.6, -d / 2); // door lintel
  // gable roof along x: two glass slopes, end triangles, rafters and a ridge
  const slope = Math.hypot(d / 2, roofH), tilt = Math.atan2(roofH, d / 2);
  for (const sz of [-1, 1]) {
    const r = add(new THREE.PlaneGeometry(w, slope), glass, 0, H + roofH / 2, (sz * d) / 4, true);
    r.rotation.x = -sz * (Math.PI / 2 - tilt); // from the eave up to the ridge
  }
  const tri = new THREE.BufferGeometry();
  tri.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, -d / 2, 0, 0, d / 2, 0, roofH, 0], 3));
  tri.computeVertexNormals();
  for (const sx of [-1, 1]) add(tri, glass, (sx * w) / 2, H, 0, true);
  add(new THREE.BoxGeometry(w + 0.2, 0.16, 0.16), frame, 0, H + roofH, 0); // ridge
  for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) {
    const raf = add(new THREE.BoxGeometry(0.1, 0.1, slope), frame, -w / 2 + (w * i) / nx, H + roofH / 2, (sz * d) / 4);
    raf.rotation.x = sz * tilt;
  }
  // planters along the walls inside: soil boxes, leafy plants, flowers
  const leaf = new THREE.IcosahedronGeometry(0.45, 0), frond = new THREE.ConeGeometry(0.35, 1.4, 5);
  const bloomGeo = new THREE.IcosahedronGeometry(0.13, 0);
  const plants = [];
  const bed = (x, z, sx, sz) => {
    add(new THREE.BoxGeometry(sx, 0.4, sz), mat('#9a6a45'), x, 0.2, z);
    add(new THREE.BoxGeometry(sx - 0.1, 0.05, sz - 0.1), mat('#5b4030'), x, 0.41, z, true);
    const n = Math.max(2, Math.round((sx * sz) / 0.7));
    for (let i = 0; i < n; i++) {
      const u = ((i * 0.618) % 1) - 0.5, v = ((i * 0.381 + 0.17) % 1) - 0.5;
      plants.push([x + u * (sx - 0.4), z + v * (sz - 0.4), i]);
    }
  };
  bed(0, d / 2 - 0.7, w - 1.2, 1); // back wall
  bed(0, 0.6, 3.2, 2); // centre bed, where the statue used to stand
  for (const sx of [-1, 1]) bed((sx * (w / 2 - 0.7)), 0.3, 1, d - 2.6); // side walls
  for (const sx of [-1, 1]) bed(sx * (door / 2 + side / 2 + 0.2), -d / 2 + 0.7, side - 1.2, 0.9); // either side of the door
  const leaves = new THREE.InstancedMesh(leaf, new THREE.MeshLambertMaterial({ color: '#ffffff' }), plants.length);
  const fronds = new THREE.InstancedMesh(frond, mat('#3f8f4a'), plants.length);
  const blooms = new THREE.InstancedMesh(bloomGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), plants.length * 2);
  const greens = ['#4f9e4a', '#6fbf5a', '#3f8a52', '#7cc46e'].map((c) => new THREE.Color(c));
  const flowers = ['#ff6f91', '#ffd166', '#c9a6f0', '#ff9f43', '#ffffff'].map((c) => new THREE.Color(c));
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  plants.forEach(([x, z, i], k) => {
    const s = 0.8 + ((i * 7) % 5) / 8;
    m4.compose(v.set(x, 0.75 * s, z), q.setFromAxisAngle(up, i), sc.set(s, s, s));
    leaves.setMatrixAt(k, m4);
    leaves.setColorAt(k, greens[k % greens.length]);
    m4.compose(v.set(x + 0.15, 0.9 * s + 0.2, z - 0.1), q.setFromAxisAngle(sc.set(0.3, 0, 1).normalize(), 0.35), sc.set(s, s, s));
    fronds.setMatrixAt(k, m4);
    for (let b = 0; b < 2; b++) {
      m4.makeTranslation(x + (b ? 0.3 : -0.25) * s, (1.05 + b * 0.15) * s, z + (b ? -0.2 : 0.25) * s);
      blooms.setMatrixAt(k * 2 + b, m4);
      blooms.setColorAt(k * 2 + b, flowers[(k + b * 2) % flowers.length]);
    }
  });
  g.add(leaves, fronds, blooms);
  // Butterflies: two wings each, flapping, on slow looping paths inside.
  // One instanced mesh for all the wings and one for the bodies (two draw
  // calls, not 42); each frame a stand-in group per butterfly is posed and
  // its wings' matrices copied over.
  const wingGeo = new THREE.CircleGeometry(0.16, 6).translate(0.15, 0, 0);
  const colors = ['#ffb627', '#5ec8f2', '#ff6fae', '#ffffff', '#b38cf2', '#ff8a3d'];
  const N = 14;
  const wingMesh = new THREE.InstancedMesh(wingGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide }), N * 2);
  const bodyMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.04, 0.2), mat('#2b2230'), N);
  wingMesh.userData.noShadow = bodyMesh.userData.noShadow = true;
  wingMesh.userData.noSplit = bodyMesh.userData.noSplit = true;
  const flock = [];
  const tint = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const b = new THREE.Object3D();
    const wings = [-1, 1].map((sx) => { const wg = new THREE.Object3D(); wg.scale.x = sx; b.add(wg); return wg; });
    for (let k = 0; k < 2; k++) wingMesh.setColorAt(i * 2 + k, tint.set(colors[i % colors.length]));
    flock.push({ b, wings, cx: ((i * 0.37) % 1 - 0.5) * (w - 3), cz: ((i * 0.61) % 1 - 0.5) * (d - 3), rx: 0.8 + (i % 4) * 0.4, rz: 0.6 + (i % 3) * 0.4, y: 1.2 + (i % 5) * 0.35, sp: 0.35 + (i % 4) * 0.12, ph: i * 1.7 });
  }
  const fly = (t) => {
    flock.forEach((f, i) => {
      const a = t * f.sp + f.ph;
      const x = f.cx + Math.cos(a) * f.rx, z = f.cz + Math.sin(a * 1.3) * f.rz;
      f.b.position.set(x, f.y + Math.sin(a * 2.1) * 0.25, z);
      f.b.rotation.y = Math.atan2(-Math.sin(a) * f.rx, Math.cos(a * 1.3) * 1.3 * f.rz);
      const flap = Math.sin(t * 14 + f.ph) * 0.9;
      f.wings[0].rotation.z = flap; f.wings[1].rotation.z = -flap;
      f.b.updateMatrixWorld(true);
      bodyMesh.setMatrixAt(i, f.b.matrixWorld);
      wingMesh.setMatrixAt(i * 2, f.wings[0].matrixWorld);
      wingMesh.setMatrixAt(i * 2 + 1, f.wings[1].matrixWorld);
    });
    wingMesh.instanceMatrix.needsUpdate = bodyMesh.instanceMatrix.needsUpdate = true;
  };
  fly(0);
  // (they stay inside the glass: bounds as big as the greenhouse)
  for (const m of [wingMesh, bodyMesh]) { m.computeBoundingSphere(); m.boundingSphere.radius = Math.hypot(w, d, H) / 2; m.boundingSphere.center.set(0, H / 2, 0); }
  g.add(wingMesh, bodyMesh);
  bakeColors(g); // frame, beds and plants: a mesh or two, not ~70 (the glass and the butterflies stay as they are)
  return fly;
}

// A round pond (l.r) with a stone rim, lily pads, and a tiered fountain in
// the middle whose jets bob up and down. Returns its tick.
function pond(g, l) {
  const r = l.r || 5.5;
  const water = new THREE.Mesh(new THREE.CircleGeometry(r, 40).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#69bfe6' }));
  water.position.y = 0.12;
  water.userData.noShadow = true;
  g.add(water);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r + 0.15, 0.3, 6, 40), mat('#cfc7b8'));
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = 0.8;
  rim.position.y = 0.22;
  g.add(rim);
  const pad = new THREE.CircleGeometry(0.35, 10, 0.4, Math.PI * 2 - 0.8).rotateX(-Math.PI / 2);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.3, d = r * (0.55 + ((i * 0.37) % 0.35));
    const p = new THREE.Mesh(pad, mat('#4f9e4a'));
    p.position.set(Math.cos(a) * d, 0.14, Math.sin(a) * d);
    p.rotation.y = i;
    p.userData.noShadow = true;
    g.add(p);
    if (i % 3 === 0) { const f = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), mat('#ffb3c7')); f.position.set(p.position.x, 0.22, p.position.z); g.add(f); }
  }
  // fountain: a basin on a column, a smaller bowl on top
  const stone = mat('#e8e2d6');
  const tier = (rad, h, y) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad * 0.85, h, 20), stone); c.position.y = y; g.add(c); };
  tier(1.5, 0.4, 0.3);
  // statue mode: a wide plinth carries a sculpture (added as its own landmark)
  if (l.statue) { tier(0.55, 0.85, 0.85); tier(0.85, 0.15, 1.24); }
  else { tier(0.35, 1.0, 0.9); tier(0.8, 0.25, 1.45); tier(0.15, 0.6, 1.85); }
  const jetMat = new THREE.MeshLambertMaterial({ color: '#dff4ff', transparent: true, opacity: 0.7, depthWrite: false });
  let top = null;
  if (!l.statue) {
    top = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.2, 8, 1, true).translate(0, 0.6, 0), jetMat);
    top.position.y = 2.1;
    top.userData.noShadow = true;
    g.add(top);
  }
  const arcs = [];
  for (let i = 0; i < 6; i++) { // little arcs falling from the bowl into the basin
    const a = (i / 6) * Math.PI * 2;
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 4, 10, Math.PI / 2), jetMat);
    arc.position.set(Math.cos(a) * (l.statue ? 1.2 : 0.8), l.statue ? 0.75 : 1.15, Math.sin(a) * (l.statue ? 1.2 : 0.8));
    arc.rotation.y = -a;
    arc.userData.noShadow = true;
    g.add(arc);
    arcs.push(arc);
  }
  const ripple = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.75, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.5, depthWrite: false }));
  ripple.position.y = 0.14;
  ripple.userData.noShadow = true;
  g.add(ripple);
  bakeColors(g, [top]); // rim, pads and fountain tiers: one mesh (the water jets and ripple stay)
  return (t) => {
    if (top) top.scale.y = 0.85 + Math.sin(t * 3) * 0.15;
    const k = (t * 0.5) % 1;
    ripple.scale.setScalar(1 + k * 1.6);
    ripple.material.opacity = 0.5 * (1 - k);
  };
}

// A small themed flower garden (l.kind: tulip, sunflower, hydrangea or
// lavender): a round plot of l.r with a low hedge round it, a paved path
// straight across (local z, the sign's side), and the flowers in the two
// halves either side.
const FLOWER_KINDS = {
  tulip: { gap: 0.55, colors: ['#e8243c', '#ffd23f', '#ff7aa8', '#fff6ea', '#ff8a3d', '#c04be0'] },
  sunflower: { gap: 1.05, colors: ['#ffc928', '#ffb400', '#ffd84d'] },
  hydrangea: { gap: 1.35, colors: ['#6f9cf2', '#9b7ee8', '#f29ac7', '#7fc3f0', '#c7a6f5'] },
  lavender: { gap: 0.6, colors: ['#8e6fd6', '#a487e3', '#7b5cc9'] },
};
function flowergarden(g, l) {
  const R = l.r || 8, PATH = 0.9;
  const K = FLOWER_KINDS[l.kind] || FLOWER_KINDS.tulip;
  const soil = new THREE.Mesh(new THREE.CircleGeometry(R, 40).rotateX(-Math.PI / 2), mat(l.kind === 'lavender' ? '#a58a6a' : '#7a5a40'));
  soil.position.y = 0.05;
  soil.userData.noShadow = true;
  g.add(soil);
  const path = new THREE.Mesh(new THREE.PlaneGeometry(PATH * 2, R * 2 + 1).rotateX(-Math.PI / 2), mat('#e6d8c0'));
  path.position.y = 0.07;
  path.userData.noShadow = true;
  g.add(path);
  // the hedge ring, open where the path goes through
  const gapA = Math.asin(Math.min(1, (PATH + 0.3) / R));
  for (const a0 of [Math.PI / 2 + gapA, -Math.PI / 2 + gapA]) {
    const hedge = new THREE.Mesh(new THREE.TorusGeometry(R, 0.32, 5, 30, Math.PI - gapA * 2), mat('#4f8f45'));
    hedge.rotation.set(Math.PI / 2, 0, a0);
    hedge.scale.z = 1.6;
    hedge.position.y = 0.3;
    g.add(hedge);
  }
  // planting spots on a grid inside the circle, off the path
  const spots = [];
  for (let x = -R + 0.8; x <= R - 0.8; x += K.gap) {
    if (Math.abs(x) < PATH + 0.45) continue;
    for (let z = -R + 0.8; z <= R - 0.8; z += l.kind === 'lavender' ? K.gap * 0.7 : K.gap) {
      const jx = l.kind === 'lavender' ? 0 : ((Math.sin(x * 12.9 + z * 7.3) * 43758.5) % 1) * 0.12;
      if (Math.hypot(x, z) < R - 0.7) spots.push([x + jx, z, spots.length]);
    }
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(1, 1, 1), c = new THREE.Color();
  const inst = (geo, material, n) => { const m = new THREE.InstancedMesh(geo, material, n); m.userData.noShadow = n > 200; g.add(m); return m; };
  const white = () => new THREE.MeshLambertMaterial({ color: '#ffffff' });
  const n = spots.length;
  // colour by patch: stripes across for tulips, patches for hydrangeas
  const colorAt = (x, z, i) => K.colors[(l.kind === 'tulip' ? Math.floor((x + R) / (K.gap * 3)) : l.kind === 'hydrangea' ? Math.floor((x + R) / 3) + Math.floor((z + R) / 3) : i) % K.colors.length];
  if (l.kind === 'sunflower') {
    const stems = inst(new THREE.CylinderGeometry(0.05, 0.06, 1, 5).translate(0, 0.5, 0), mat('#4f8f3a'), n);
    const leaves = inst(new THREE.IcosahedronGeometry(0.3, 0), mat('#5fa046'), n);
    const petals = inst(new THREE.CylinderGeometry(0.42, 0.42, 0.06, 12).rotateX(Math.PI / 2), white(), n);
    const disc = inst(new THREE.CylinderGeometry(0.2, 0.2, 0.08, 10).rotateX(Math.PI / 2), mat('#6b4423'), n);
    spots.forEach(([x, z, i], k) => {
      const h = 1.5 + ((i * 7) % 5) * 0.15;
      m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, h, 1)); stems.setMatrixAt(k, m4);
      m4.compose(v.set(x, h * 0.45, z), q.identity(), sc.set(1, 0.5, 1)); leaves.setMatrixAt(k, m4);
      q.setFromAxisAngle(v.set(1, 0, 0), -0.25);
      m4.compose(v.set(x, h, z + 0.05), q, sc.set(1, 1, 1)); petals.setMatrixAt(k, m4); petals.setColorAt(k, c.set(colorAt(x, z, i)));
      m4.compose(v.set(x, h, z + 0.09), q, sc.set(1, 1, 1)); disc.setMatrixAt(k, m4);
    });
  } else if (l.kind === 'hydrangea') {
    const bush = inst(new THREE.IcosahedronGeometry(0.55, 0), mat('#4f8f45'), n);
    const blooms = inst(new THREE.IcosahedronGeometry(0.3, 1), white(), n * 4);
    spots.forEach(([x, z, i], k) => {
      const s = 0.9 + ((i * 7) % 4) * 0.08;
      m4.compose(v.set(x, 0.5 * s, z), q.identity(), sc.set(s, s * 0.85, s)); bush.setMatrixAt(k, m4);
      for (let b = 0; b < 4; b++) {
        const a = b * 1.7 + i;
        m4.compose(v.set(x + Math.cos(a) * 0.3 * s, (0.75 + (b === 0 ? 0.2 : 0)) * s, z + Math.sin(a) * 0.3 * s), q.identity(), sc.set(s, s, s));
        blooms.setMatrixAt(k * 4 + b, m4);
        blooms.setColorAt(k * 4 + b, c.set(colorAt(x, z, i)).offsetHSL(0, 0, (b - 1.5) * 0.03));
      }
    });
  } else if (l.kind === 'lavender') {
    const clump = inst(new THREE.IcosahedronGeometry(0.3, 0), mat('#8fae84'), n);
    const spikes = inst(new THREE.ConeGeometry(0.06, 0.45, 5).translate(0, 0.22, 0), white(), n * 3);
    spots.forEach(([x, z, i], k) => {
      m4.compose(v.set(x, 0.22, z), q.identity(), sc.set(1, 0.8, 1)); clump.setMatrixAt(k, m4);
      for (let b = 0; b < 3; b++) {
        q.setFromAxisAngle(v.set(Math.cos(b * 2.1), 0, Math.sin(b * 2.1)), 0.18);
        m4.compose(v.set(x + Math.cos(b * 2.1 + i) * 0.1, 0.4, z + Math.sin(b * 2.1 + i) * 0.1), q, sc.set(1, 1, 1));
        spikes.setMatrixAt(k * 3 + b, m4);
        spikes.setColorAt(k * 3 + b, c.set(colorAt(x, z, i + b)));
      }
    });
  } else { // tulips
    const stems = inst(new THREE.CylinderGeometry(0.025, 0.025, 0.45, 4).translate(0, 0.22, 0), mat('#4f9e3f'), n);
    const leaf = inst(new THREE.ConeGeometry(0.08, 0.3, 4).translate(0, 0.15, 0), mat('#5fae4a'), n);
    const cups = inst(new THREE.CylinderGeometry(0.11, 0.06, 0.18, 6).translate(0, 0.09, 0), white(), n);
    spots.forEach(([x, z, i], k) => {
      m4.compose(v.set(x, 0, z), q.identity(), sc.set(1, 1, 1)); stems.setMatrixAt(k, m4);
      q.setFromAxisAngle(v.set(0, 0, 1), 0.3);
      m4.compose(v.set(x + 0.05, 0.02, z), q, sc.set(1, 1, 1)); leaf.setMatrixAt(k, m4);
      m4.compose(v.set(x, 0.45, z), q.identity(), sc.set(1, 1, 1)); cups.setMatrixAt(k, m4); cups.setColorAt(k, c.set(colorAt(x, z, i)));
    });
  }
}

// A patch of wildflowers (l.r): little clumps in soft colours scattered
// over the grass, thicker in the middle, no hedge, nothing to trip on.
const MEADOW = ['#ff8fab', '#ffd166', '#ffffff', '#c9a6f0', '#ffb3c7', '#9ad0ff', '#ffe08a'];
function meadow(g, l) {
  const R = l.r || 6, spots = [];
  for (let i = 0; spots.length < R * R * 6 && i < R * R * 18; i++) {
    const h = (k) => { const v = Math.sin((i + 1) * (12.9898 + k * 4.1) + l.x * 0.7 + l.z * 1.3) * 43758.5453; return v - Math.floor(v); };
    const a = h(1) * Math.PI * 2, d = R * Math.sqrt(h(2)) * (0.6 + 0.4 * h(3));
    spots.push([Math.cos(a) * d, Math.sin(a) * d, h(4)]);
  }
  const n = spots.length;
  const leaf = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.2, 0), mat('#6fae55'), n);
  const bloom = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.15, 0), new THREE.MeshLambertMaterial({ color: '#ffffff' }), n);
  leaf.userData.noShadow = bloom.userData.noShadow = true;
  const m4 = new THREE.Matrix4(), c = new THREE.Color();
  spots.forEach(([x, z, h], i) => {
    const s = 0.8 + h * 0.5;
    m4.makeScale(s, s * 0.8, s).setPosition(x, 0.12 * s, z); leaf.setMatrixAt(i, m4);
    m4.makeScale(s, s, s).setPosition(x, (0.3 + h * 0.15) * s, z); bloom.setMatrixAt(i, m4);
    bloom.setColorAt(i, c.set(MEADOW[Math.floor(h * 997) % MEADOW.length]));
  });
  g.add(leaf, bloom);
}

// The deer meadow (l.p: the paddock's corners, map metres): a low wooden
// rail fence round it and a hay rack. The deer (core/forest-deer.js) are
// loaded the first time the fence is drawn on screen, so nobody downloads
// them who never comes near Seoul Forest.
function deerpen(g, l) {
  const pts = l.p.map(([x, z]) => [x - l.x, z - l.z]); // (the group sits at l.x, l.z)
  const wood = mat('#a8774f'), posts = [], rails = [];
  for (let i = 0; i < pts.length; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % pts.length];
    const len = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(len / 2.4));
    for (let k = 0; k < n; k++) posts.push([x1 + ((x2 - x1) * k) / n, z1 + ((z2 - z1) * k) / n]);
    rails.push([(x1 + x2) / 2, (z1 + z2) / 2, len, Math.atan2(-(z2 - z1), x2 - x1)]);
  }
  const post = new THREE.InstancedMesh(new THREE.BoxGeometry(0.14, 1.1, 0.14).translate(0, 0.55, 0), wood, posts.length);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  posts.forEach(([x, z], i) => post.setMatrixAt(i, m4.makeTranslation(x, 0, z)));
  const rail = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.09, 0.06), wood, rails.length * 2);
  rails.forEach(([x, z, len, ry], i) => {
    q.setFromAxisAngle(up, ry);
    for (const [k, y] of [[0, 0.5], [1, 0.95]]) rail.setMatrixAt(i * 2 + k, m4.compose(v.set(x, y, z), q, sc.set(len, 1, 1)));
  });
  post.userData.noSplit = true; // (its onBeforeRender below brings the deer)
  g.add(post, rail);
  // a hay rack in the middle
  const rack = new THREE.Group();
  const add = (geo, color, x, y, z) => { const m = new THREE.Mesh(geo, mat(color)); m.position.set(x, y, z); rack.add(m); return m; };
  add(new THREE.BoxGeometry(1.8, 0.5, 0.7), '#e6c76a', 0, 0.7, 0);
  add(new THREE.ConeGeometry(1.4, 0.6, 4).rotateY(Math.PI / 4), '#8a5a3a', 0, 1.55, 0).scale.set(1, 1, 0.55);
  for (const s of [-1, 1]) add(new THREE.BoxGeometry(0.1, 1.3, 0.1), '#8a5a3a', 0.85 * s, 0.65, 0);
  g.add(rack);
  // the deer, once the fence first comes on screen
  const ref = { tick: null };
  let asked = false;
  post.onBeforeRender = () => {
    if (asked) return;
    asked = true;
    import('./forest-deer.js').then((m) => { ref.tick = m.addDeer(g, pts, l.deer || 4); }).catch(() => {});
  };
  return (t) => ref.tick?.(t);
}
// The still ones are baked into one mesh each (core/merge-static.js): a bench
// was 11 draw calls, Seoul Forest's ~40 benches, beds and lawns ~600 from
// the station. Ice cream (its model arrives later) and the ones that move
// (greenhouse, pond, deer) stay as they are.
const baked = (f) => (g, l) => { const t = f(g, l); bakeColors(g); return t; };
export const PARK_BUILD = { icecream, bench: baked(bench), parkplaza: baked(parkplaza), rosegarden: baked(rosegarden), hill: baked(hill), greenhouse, pond, flowergarden: baked(flowergarden), meadow: baked(meadow), deerpen };
