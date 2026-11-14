// The lantern festival on a sunken stream (core/stream.js), loosely after the
// lantern festivals held on Cheonggyecheon: big hanji lantern figures standing
// in the water, rows of cheongsachorong (청사초롱) along the railings, strings
// of round lanterns across the channel, glowing lanterns under the bridges,
// a tunnel of coloured light arches over one walkway, a wall of tile panels
// showing the real painting of King Jeongjo's royal procession, and a wish lantern corner at the east end
// where small lanterns float down and gather.
//
// By day everything is bright and colourful and only the lanterns under the
// bridges, in the shade, look lit; after dark (weather.js glowAtNight) the
// paper figures light up from inside in their own colours.
// All designs here are original, except the procession painting (credited below).
//
// Map data, on a stream (u along the channel from its west end, v across it):
//   "lanterns": {
//     "figures": [{ "u": 66, "v": 0, "kind": "carp", "ry": 0.4, "color": "#e8452c" }],
//                   // kind: carp | tiger | lotus | moon
//     "strings": [20, 45],     // u of each string of lanterns across the channel
//     "railing": 8,            // metres between cheongsachorong on the railings
//     "bridges": true,         // glowing lanterns under every bridge
//     "tunnel": { "from": 332, "to": 388, "side": 1 },  // a light tunnel over a walkway
//     "mural": { "from": 242, "to": 336, "side": -1 },  // the royal procession tiles on a wall
//     "wish": { "from": 410, "to": 480 }  // where wish lanterns are floated; they gather at `to` (default: the east end)
//   }
//
// Wish lanterns: anyone down by the water can float one (a colour and a wish
// from a fixed list, so it reads in every language and needs no moderation).
// It drifts east at the same pace for everyone. Yours is sent with your
// player state (`wl`) while it floats, so people nearby and people who
// arrive later see it too. A few lanterns float by on their own, from the
// clock, so the stream is never empty.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { mergeStatic } from './merge-static.js';
import { canvasTex } from './three-kit.js';
import { glowAtNight } from './weather.js';

export const WISH = { price: 5000, speed: 0.3, every: 25, life: 600, max: 72, cooldown: 8 };
export const WISH_COLORS = ['#ff6b6b', '#ffb347', '#ffe066', '#7bd389', '#7ab8ff', '#c39bff', '#ff8fc7'];
// The wishes, by index (sent as a number, shown in each viewer's language).
export const WISHES = [
  { en: 'Safe travels to everyone I love', ko: '사랑하는 사람들 모두 안전하게 여행하기를', ja: '大切な人みんなが無事に旅できますように', zh: '愿我爱的人旅途平安' },
  { en: 'I will visit Korea for real!', ko: '진짜 한국에 꼭 가 볼 거예요!', ja: '本当に韓国に行けますように！', zh: '我一定要真的去一趟韩国！' },
  { en: 'Good health for my family', ko: '우리 가족 모두 건강하기를', ja: '家族みんなが元気でいられますように', zh: '愿家人身体健康' },
  { en: 'Pass my exams', ko: '시험에 꼭 합격하기를', ja: '試験に合格しますように', zh: '考试顺利通过' },
  { en: 'Meet the love of my life', ko: '운명의 사랑을 만나기를', ja: '運命の人に出会えますように', zh: '遇见命中注定的人' },
  { en: 'Lots of luck this year', ko: '올해 행운이 가득하기를', ja: '今年は幸運がいっぱいありますように', zh: '今年好运连连' },
  { en: 'Friends forever', ko: '친구들과 영원히 함께하기를', ja: 'ずっと友だちでいられますように', zh: '友谊天长地久' },
  { en: 'Speak Korean well', ko: '한국어를 잘하게 되기를', ja: '韓国語が上手になりますように', zh: '韩语越说越好' },
];

const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const halfWater = (s) => (s.water || 8) / 2;

// ---------- wish lanterns (pure) ----------
// The wish corner: from `lanterns.wish.from` to `lanterns.wish.to` (the east
// end of the stream unless the stream runs on past the festival).
export const wishTo = (s) => Math.min(s.len, s.lanterns?.wish?.to ?? s.len);
export const wishFrom = (s) => s.lanterns?.wish?.from ?? Math.max(4, wishTo(s) - 100);
const hash = (str) => {
  let h = 2166136261;
  for (const ch of String(str)) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16; // mix, so ids a1, a2… land far apart
  return (h >>> 0) / 4294967296;
};
// A lantern: { id, c (colour index), w (wish index), u0, v, t0 (s) }.
// It drifts east and comes to rest in the crowd of lanterns by the east end,
// bobs there and fades out WISH.life seconds after it was floated.
// Where it is at time t (seconds), or null before or after its life.
export function lanternAt(s, L, t) {
  const age = t - L.t0;
  if (age < 0 || age > WISH.life) return null;
  const ww = halfWater(s), k = hash(L.id);
  const stop = wishTo(s) - 2.5 - k * 16; // where it comes to rest
  const travel = Math.max(0, stop - L.u0) / WISH.speed;
  const moving = age < travel;
  const u = moving ? L.u0 + age * WISH.speed : Math.max(L.u0, stop);
  // Drifting it sways gently; at rest it spreads across the water.
  const rest = (hash(L.id + 'v') * 2 - 1) * (ww - 0.6);
  const settle = moving ? 0 : Math.min(1, (age - travel) / 12);
  const v = L.v + (rest - L.v) * settle + Math.sin(age * 0.3 + L.u0) * (moving ? 0.25 : 0.06);
  return { u, v, y: Math.sin(age * 1.7 + L.v * 3) * 0.04, age, left: WISH.life - age, moving };
}

// The lanterns that float down on their own: one every WISH.every seconds
// from the start of the wish corner, the same for everyone.
export function ambientLanterns(s, t) {
  const out = [], from = wishFrom(s);
  for (let k = Math.floor((t - WISH.life) / WISH.every); k <= Math.floor(t / WISH.every); k++) {
    const r = rng(k * 2654435761);
    const L = { id: 'a' + k, c: Math.floor(r() * WISH_COLORS.length), w: Math.floor(r() * WISHES.length), u0: from + r() * 6, v: (r() * 2 - 1) * (halfWater(s) - 1), t0: k * WISH.every };
    if (lanternAt(s, L, t)) out.push(L);
  }
  return out;
}

// Over the wire: "id|c|w|u0|v|t0". Another player's lantern is untrusted:
// anything malformed or impossible is dropped.
export const encodeLantern = (L) => `${L.id}|${L.c}|${L.w}|${L.u0.toFixed(1)}|${L.v.toFixed(2)}|${Math.round(L.t0)}`;
export function decodeLantern(str, s, now) {
  if (typeof str !== 'string' || str.length > 60) return null;
  const [id, c, w, u0, v, t0] = str.split('|');
  const L = { id: String(id), c: +c, w: +w, u0: +u0, v: +v, t0: +t0 };
  if (!/^[a-z0-9]{1,16}$/i.test(L.id)) return null;
  if (!Number.isInteger(L.c) || L.c < 0 || L.c >= WISH_COLORS.length || !Number.isInteger(L.w) || L.w < 0 || L.w >= WISHES.length) return null;
  if (!(L.u0 >= wishFrom(s) - 2 && L.u0 <= wishTo(s)) || !(Math.abs(L.v) <= halfWater(s)) || !Number.isFinite(L.t0)) return null;
  if (L.t0 > now + 60 || !lanternAt(s, L, Math.max(now, L.t0))) return null; // from the future, or long gone
  return L;
}

// Can someone at stream-frame (u, v), down by the water, float one here?
// On the walkway right next to the water, in the wish corner.
export function canFloat(s, u, v) {
  const ww = halfWater(s);
  return u >= wishFrom(s) && u < wishTo(s) - 4 && Math.abs(v) > ww && Math.abs(v) < ww + 2;
}

// ---------- 3D ----------
const mats = {};
const lam = (c, o = {}) => (mats['l' + c + JSON.stringify(o)] ||= new THREE.MeshLambertMaterial({ color: c, ...o }));
const glow = (c, o = {}) => (mats['g' + c + JSON.stringify(o)] ||= new THREE.MeshBasicMaterial({ color: c, ...o }));

// A lantern's paper: a soft glow towards the middle and the thin dark ribs
// of its frame.
const paper = (base, rib = 'rgba(80,40,20,0.35)', ribs = 8) => canvasTex(64, 64, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = g.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w * 0.7);
  r.addColorStop(0, 'rgba(255,255,230,0.55)'); r.addColorStop(1, 'rgba(255,255,230,0)');
  g.fillStyle = r; g.fillRect(0, 0, w, h);
  g.strokeStyle = rib; g.lineWidth = 1.5;
  for (let i = 0; i <= ribs; i++) { const x = (i / ribs) * w; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
});
const texMat = (tex, emissive = '#3a2a10') => new THREE.MeshLambertMaterial({ map: tex, emissive, emissiveIntensity: 0.6 });

// Figures face +x; their base is at y = 0 (the water's surface).
function carp(color = '#e8452c') {
  const g = new THREE.Group();
  const skin = canvasTex(128, 64, (x, w, h) => {
    x.fillStyle = '#fff6ea'; x.fillRect(0, 0, w, h);
    x.fillStyle = color;
    for (const [cx, cy, rx, ry] of [[30, 20, 22, 14], [70, 40, 26, 16], [104, 22, 16, 12]]) { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0.3, 0, Math.PI * 2); x.fill(); }
    x.strokeStyle = 'rgba(120,60,30,0.3)'; x.lineWidth = 1.2;
    for (let i = 0; i < 12; i++) for (let j = 0; j < 5; j++) { x.beginPath(); x.arc(i * 11 + (j % 2) * 5, j * 14, 6, 0.2, Math.PI - 0.2); x.stroke(); }
  });
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), texMat(skin));
  body.scale.set(1.9, 0.8, 0.62);
  g.add(body);
  const fin = lam(color, { side: THREE.DoubleSide, emissive: '#331100' });
  // Tail: two lobes in a V.
  for (const s of [-1, 1]) {
    const lobe = new THREE.Mesh(new THREE.ConeGeometry(0.55, 1.4, 4).scale(1, 1, 0.12), fin);
    lobe.position.set(-2.2, s * 0.45, 0);
    lobe.rotation.z = Math.PI / 2 + s * 0.55;
    g.add(lobe);
  }
  for (const s of [-1, 1]) { // pectoral fins
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.8, 4).scale(1, 1, 0.15), fin);
    f.position.set(0.7, -0.45, s * 0.55);
    f.rotation.set(s * 0.9, 0, 2.3);
    g.add(f);
  }
  const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 4).scale(1.6, 1, 0.12), fin);
  dorsal.position.set(-0.1, 0.85, 0);
  g.add(dorsal);
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 8), lam('#ffffff'));
    eye.position.set(1.45, 0.18, s * 0.38);
    g.add(eye);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), lam('#1d1d26'));
    pupil.position.set(1.53, 0.19, s * 0.45);
    g.add(pupil);
    const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.01, 0.5, 4), lam('#c98a3a'));
    whisker.position.set(1.85, -0.2, s * 0.18);
    whisker.rotation.set(s * 0.6, 0, 0.6);
    g.add(whisker);
  }
  const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.04, 6, 12), lam('#c0392b'));
  mouth.position.set(1.88, -0.05, 0);
  mouth.rotation.y = Math.PI / 2;
  g.add(mouth);
  // Leaping out of the water.
  const pose = new THREE.Group();
  g.position.y = 1.0;
  g.rotation.z = 0.45;
  pose.add(g);
  // Splash ring at the waterline.
  const splash = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.12, 6, 18).rotateX(Math.PI / 2), lam('#eef8fb', { transparent: true, opacity: 0.85 }));
  splash.position.set(-1.1, 0.05, 0);
  pose.add(splash);
  return pose;
}

function tiger() {
  const g = new THREE.Group();
  const fur = canvasTex(128, 64, (x, w, h) => {
    x.fillStyle = '#ff9a2e'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#2b1d16';
    for (let i = 0; i < 9; i++) {
      const cx = 8 + i * 14;
      x.beginPath(); x.moveTo(cx - 3, 0); x.quadraticCurveTo(cx + 6, h * 0.25, cx, h * 0.5); x.quadraticCurveTo(cx + 3, h * 0.25, cx + 3, 0); x.fill();
      x.beginPath(); x.moveTo(cx - 2, h); x.quadraticCurveTo(cx + 5, h * 0.75, cx + 1, h * 0.55); x.quadraticCurveTo(cx + 3, h * 0.8, cx + 4, h); x.fill();
    }
  });
  fur.wrapS = THREE.RepeatWrapping;
  const furM = texMat(fur, '#3a1a00');
  const white = lam('#fff7ea', { emissive: '#332a1a' }), dark = lam('#2b1d16');
  const ball = (r, x, y, z, m, sx = 1, sy = 1, sz = 1) => { const b = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), m); b.position.set(x, y, z); b.scale.set(sx, sy, sz); g.add(b); return b; };
  ball(0.9, -0.2, 1.0, 0, furM, 1.05, 1.15, 0.95); // sitting body
  ball(0.5, 0.35, 0.9, 0, white, 0.6, 1.1, 0.8); // white chest
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.0, 10), furM);
    leg.position.set(0.45, 0.5, s * 0.35);
    g.add(leg);
    ball(0.25, 0.6, 0.08, s * 0.35, white, 1.3, 0.6, 1); // paws
    ball(0.38, -0.6, 0.35, s * 0.6, furM, 1.4, 0.9, 0.9); // haunches
  }
  ball(0.72, 0.35, 2.25, 0, furM, 0.95, 0.9, 1.05); // head
  ball(0.34, 0.95, 2.05, 0, white, 0.8, 0.7, 1.1); // muzzle
  ball(0.09, 1.2, 2.18, 0, lam('#e86a7a')); // nose
  for (const s of [-1, 1]) {
    ball(0.12, 0.92, 2.42, s * 0.3, white);
    ball(0.07, 1.01, 2.43, s * 0.31, dark); // eyes
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.35, 8), furM);
    ear.position.set(0.25, 2.9, s * 0.45);
    ear.rotation.x = s * -0.35;
    g.add(ear);
    ball(0.1, 0.32, 2.84, s * 0.45, white, 1, 1.2, 0.5);
  }
  const tail = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.11, 8, 16, Math.PI * 1.2), furM);
  tail.position.set(-1.05, 0.55, 0.3);
  tail.rotation.set(Math.PI / 2, 0, 0.6);
  g.add(tail);
  // A round stone-coloured float under it.
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.5, 0.3, 18), lam('#d9cbb2'));
  base.position.y = -0.05;
  g.add(base);
  g.scale.setScalar(1.15);
  return g;
}

function lotus(n = 3) {
  const g = new THREE.Group();
  const petalM = texMat(canvasTex(32, 64, (x, w, h) => {
    const gr = x.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#ff6fa8'); gr.addColorStop(1, '#fff0f6');
    x.fillStyle = gr; x.fillRect(0, 0, w, h);
  }), '#401020');
  const leafM = lam('#5fae5a', { side: THREE.DoubleSide });
  const petal = new THREE.SphereGeometry(0.5, 10, 8).scale(0.45, 1, 0.2).translate(0, 0.5, 0);
  const spots = [[0, 0, 1.15], [1.6, 0.9, 0.85], [1.2, -1.2, 0.7], [-1.4, -0.6, 0.6]].slice(0, n);
  for (const [x, z, sc] of spots) {
    const f = new THREE.Group();
    for (const [ring, k, tilt, r] of [[0, 8, 0.75, 0.32], [1, 6, 0.35, 0.18]]) {
      for (let i = 0; i < k; i++) {
        const a = (i / k) * Math.PI * 2 + ring * 0.3;
        const p = new THREE.Mesh(petal, petalM);
        p.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        p.rotation.set(0, -a + Math.PI / 2, 0);
        p.rotateX(tilt);
        f.add(p);
      }
    }
    const pod = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.25, 12), glow('#ffd24a'));
    pod.position.y = 0.35;
    f.add(pod);
    f.position.set(x, 0.05, z);
    f.scale.setScalar(sc * 1.6);
    g.add(f);
    const leaf = new THREE.Mesh(new THREE.CircleGeometry(0.9 * sc + 0.3, 18, 0.25, Math.PI * 2 - 0.5).rotateX(-Math.PI / 2), leafM);
    leaf.position.set(x + 0.5, 0.03, z - 0.3);
    g.add(leaf);
  }
  return g;
}

function moon() {
  const g = new THREE.Group();
  const face = canvasTex(128, 64, (x, w, h) => {
    x.fillStyle = '#fff3b0'; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(230,200,110,0.55)';
    for (const [cx, cy, r] of [[20, 20, 7], [54, 38, 10], [90, 18, 6], [110, 44, 8], [70, 12, 4]]) { x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2); x.fill(); }
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1.5, 28, 18), new THREE.MeshBasicMaterial({ map: face }));
  ball.position.y = 1.45;
  g.add(ball);
  // A little moon rabbit sitting on top with its rice-cake mallet.
  const fur = lam('#ffffff', { emissive: '#3a3a3a' });
  const b = (r, x, y, z, sx = 1, sy = 1, sz = 1, m = fur) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); g.add(o); return o; };
  b(0.32, -0.05, 3.2, 0, 1, 1.1, 0.9);
  b(0.24, 0.12, 3.62, 0);
  for (const s of [-1, 1]) {
    b(0.08, 0.1, 4.0, s * 0.1, 0.6, 2.4, 0.8);
    b(0.035, 0.33, 3.66, s * 0.1, 1, 1, 1, lam('#e05a7a'));
  }
  const mallet = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.55, 6), lam('#a0703a'));
  mallet.position.set(0.32, 3.3, 0.22);
  mallet.rotation.z = -0.7;
  g.add(mallet);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.26, 10), lam('#a0703a'));
  head.position.set(0.5, 3.5, 0.22);
  head.rotation.z = 0.87;
  g.add(head);
  return g;
}

export const FIGURES = { carp, tiger, lotus, moon };
export const FIGURE_KINDS = Object.keys(FIGURES);

// Cheongsachorong: a red silk body with blue bands top and bottom and a gold cap.
function corongParts() {
  return [
    [new THREE.CylinderGeometry(0.2, 0.2, 0.42, 10), texMat(paper('#d8322f', 'rgba(60,10,10,0.35)', 10), '#5a1008')],
    [new THREE.CylinderGeometry(0.21, 0.21, 0.09, 10).translate(0, 0.25, 0), lam('#2f5fb3')],
    [new THREE.CylinderGeometry(0.21, 0.21, 0.09, 10).translate(0, -0.25, 0), lam('#2f5fb3')],
    [new THREE.ConeGeometry(0.14, 0.16, 8).translate(0, 0.37, 0), lam('#d9a93a')],
    [new THREE.CylinderGeometry(0.015, 0.015, 0.3, 4).translate(0, -0.44, 0), lam('#d9a93a')], // tassel
  ];
}

// Several InstancedMeshes sharing the same matrices (one per part).
function instanced(parent, parts, mats4, colors = null) {
  const out = [];
  for (const [geo, m] of parts) {
    const im = new THREE.InstancedMesh(geo, m, mats4.length);
    mats4.forEach((M, i) => im.setMatrixAt(i, M));
    if (colors && m.userData.tint) colors.forEach((c, i) => im.setColorAt(i, new THREE.Color(c)));
    im.userData.noShadow = true;
    parent.add(im);
    out.push(im);
  }
  return out;
}

// A paper figure lit from inside after dark: every part that already glows a
// little by day (its emissive) glows in its own colour at night. Materials
// are shared (lam's cache), so each is set up once, unless `own`: then the
// figure gets its own copies, to be lit on its own (setFigureGlow).
// → the glow entries (weather.js glowAtNight).
const glowSet = new WeakSet();
export const NIGHT_GLOW = 0.85;
export function lightUp(fig, own = false) {
  const copies = new Map(), out = [];
  fig.traverse((o) => {
    if (!o.isMesh) return;
    if (own && o.material) {
      if (!copies.has(o.material)) copies.set(o.material, o.material.clone());
      o.material = copies.get(o.material);
    }
    const m = o.material;
    if (!m?.emissive || glowSet.has(m)) return;
    glowSet.add(m);
    const e = m.emissive, day = (0.3 * e.r + 0.6 * e.g + 0.1 * e.b) * m.emissiveIntensity;
    if (day <= 0) return; // frames, eyes: stay dark
    if (m.map) { m.emissive.set('#ffffff'); m.emissiveMap = m.map; } // glows in its own painted colours
    else m.emissive.copy(m.color);
    const lum = m.map ? 0.85 : 0.3 * m.color.r + 0.6 * m.color.g + 0.1 * m.color.b;
    out.push(glowAtNight(m, NIGHT_GLOW, Math.min(NIGHT_GLOW, day / Math.max(0.05, lum)))); // the same look by day as before
  });
  return out;
}
// How bright a festival figure is at night: k × its usual glow (1: as usual;
// below 1 its paper darkens too, as if the light inside were out). `dark`:
// how dark it is (weather.js darkness()), so it never shows by day.
export function setFigureGlow(fig, k, dark = 1) {
  const shade = dark > 0.2 ? 1 - 0.85 * (1 - Math.min(1, k)) : 1;
  for (const e of fig.glow) e[1] = NIGHT_GLOW * k;
  for (const m of fig.mats) {
    m.userData.paper ||= m.color.clone();
    m.color.copy(m.userData.paper).multiplyScalar(shade);
  }
}
// The festival's figures in the water, for the lantern parade to light up
// one by one: [{ u (along the stream), glow, mats (all its own materials) }].
let festival = [];
export const festivalFigures = () => festival;

export function buildLanternFestival(g, s) {
  const conf = s.lanterns || {}, len = s.len, hw = s.w / 2, D = s.depth || 4;
  const root = new THREE.Group();
  root.name = 'lanterns';
  g.add(root);
  const M = (x, y, z, ry = 0, sc = 1) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry), new THREE.Vector3(sc, sc, sc));
  const decks = (s.bridges || []).map((b) => [b.u - b.w / 2 - 1, b.u + b.w / 2 + 1]);
  const onDeck = (u) => decks.some(([a, b]) => u > a && u < b);
  // Figures in the water, each with its own materials (lit one by one on parade nights).
  if (conf.figures?.length) festival = []; // (a stream without figures leaves them be)
  for (const f of conf.figures || []) {
    const make = FIGURES[f.kind];
    if (!make) continue;
    const m = make(f.color);
    m.position.set(f.u, -D - 0.3, f.v || 0);
    m.rotation.y = f.ry || 0;
    root.add(m);
    const glow = lightUp(m, true), mats = new Set();
    m.traverse((o) => { if (o.isMesh && o.material?.color) mats.add(o.material); });
    festival.push({ u: f.u, glow, mats: [...mats] });
  }
  // Cheongsachorong hanging from brackets on both railings, at street level.
  const step = conf.railing || 0;
  if (step) {
    const at = [], arms = [];
    for (const sd of [-1, 1]) {
      for (let u = step / 2; u < len; u += step) {
        if (onDeck(u)) continue;
        if ((s.stairs || []).some((st) => st.side === sd && u > Math.min(st.u, st.u + st.dir * 12) - 1 && u < Math.max(st.u, st.u + st.dir * 12) + 1)) continue;
        at.push(M(u, 1.05, sd * (hw - 0.75)));
        arms.push(M(u, 1.62, sd * (hw - 0.45)));
      }
    }
    instanced(root, corongParts(), at);
    instanced(root, [[new THREE.BoxGeometry(0.05, 0.05, 0.62), lam('#5d6470')], [new THREE.BoxGeometry(0.05, 0.6, 0.05).translate(0, -0.3, 0.31), lam('#5d6470')]], arms.map((m4, i) => {
      const sd = i < arms.length / 2 ? -1 : 1;
      return sd > 0 ? m4 : m4.clone().multiply(new THREE.Matrix4().makeRotationY(Math.PI));
    }));
  }
  // Strings of round lanterns across the channel, sagging in the middle.
  const balls = [], tints = [];
  const ropeM = lam('#4a4038');
  const palette = ['#ff5a5f', '#ff9f40', '#ffd93d', '#6bcB77', '#4d96ff', '#b983ff', '#ff7eb6'];
  for (const [k, u] of (conf.strings || []).entries()) {
    const y = (v) => 1.4 - 1.6 * (1 - (v / hw) ** 2);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const v0 = -hw + (i / n) * s.w, v1 = -hw + ((i + 1) / n) * s.w;
      const a = new THREE.Vector3(u, y(v0), v0), b = new THREE.Vector3(u, y(v1), v1);
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, a.distanceTo(b), 4), ropeM);
      seg.position.copy(a).add(b).multiplyScalar(0.5);
      seg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      seg.userData.noShadow = true;
      root.add(seg);
    }
    for (let v = -hw + 1.6; v <= hw - 1.5; v += 1.55) {
      balls.push(M(u, y(v) - 0.42, v, v, 0.9 + ((k + v) % 2 ? 0.15 : 0)));
      tints.push(palette[Math.abs(Math.round(v * 3 + k * 5)) % palette.length]);
    }
  }
  if (balls.length) {
    const ballM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    ballM.userData.tint = true;
    const ribM = lam('#6a4a2a');
    instanced(root, [
      [new THREE.SphereGeometry(0.3, 14, 10).scale(1, 0.85, 1), ballM],
      [new THREE.CylinderGeometry(0.13, 0.16, 0.08, 10).translate(0, 0.27, 0), ribM],
      [new THREE.CylinderGeometry(0.13, 0.1, 0.06, 10).translate(0, -0.27, 0), ribM],
      [new THREE.CylinderGeometry(0.01, 0.01, 0.2, 3).translate(0, 0.38, 0), ropeM],
    ], balls, tints);
  }
  // Under the bridges, in the shade: warm lanterns that look lit.
  if (conf.bridges) {
    const lit = [], litTints = [];
    for (const b of s.bridges || []) {
      const y = b.style === 'slab' ? -1.55 : -1.75;
      const ww = halfWater(s);
      for (let du = -b.w / 2 + 1; du <= b.w / 2 - 0.9; du += 1.6) {
        for (const v of b.style === 'slab' ? [-ww - 1.2, -ww / 2, ww / 2, ww + 1.2] : [-3.2, -1.1, 1.1, 3.2]) {
          lit.push(M(b.u + du, y, v, du));
          litTints.push(['#ffcf6b', '#ff9a5a', '#ffe9a8'][Math.abs(Math.round(du * 2 + v)) % 3]);
        }
      }
    }
    const litM = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    litM.userData.tint = true;
    instanced(root, [
      [new THREE.CylinderGeometry(0.22, 0.22, 0.5, 10), litM],
      [new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10).translate(0, 0.27, 0), lam('#7a2a1a')],
      [new THREE.CylinderGeometry(0.24, 0.24, 0.06, 10).translate(0, -0.27, 0), lam('#7a2a1a')],
      [new THREE.CylinderGeometry(0.01, 0.01, 0.6, 3).translate(0, 0.6, 0), ropeM],
    ], lit, litTints);
  }
  const ticks = [];
  if (conf.tunnel) ticks.push(lightTunnel(root, s, conf.tunnel));
  const keep = [];
  if (conf.mural) keep.push(procession(root, s, conf.mural));
  if (conf.wish) { // a sign at the start of the wish lantern corner, on both walkways
    for (const sd of [-1, 1]) {
      const sign = signPost(['소원등'], '#b03a2e');
      sign.position.set(wishFrom(s) - 1, -D, sd * (hw - 1.6));
      sign.rotation.y = sd > 0 ? Math.PI : 0;
      root.add(sign);
    }
  }
  mergeStatic(root, keep); // the still figures, ropes and signs: a mesh per colour (core/merge-static.js)
  return { root, tick: (t) => { for (const f of ticks) f(t); } };
}

// A tunnel of light: arches over a walkway, every 1.4 m, in colours that
// roll along it like a wave.
function lightTunnel(root, s, c) {
  const hw = s.w / 2, ww = halfWater(s), D = s.depth || 4, sd = c.side || 1;
  const v0 = ww + 0.45, v1 = hw - 0.45, r = (v1 - v0) / 2, vc = sd * (v0 + v1) / 2;
  const n = Math.max(1, Math.floor((c.to - c.from) / 1.4) + 1);
  const arch = new THREE.TorusGeometry(r, 0.08, 6, 20, Math.PI).rotateY(Math.PI / 2);
  const bulbs = new THREE.TorusGeometry(r - 0.12, 0.05, 4, 20, Math.PI).rotateY(Math.PI / 2);
  const mA = new THREE.MeshBasicMaterial({ color: '#ffffff' }), mB = new THREE.MeshBasicMaterial({ color: '#ffffff' });
  const ia = new THREE.InstancedMesh(arch, mA, n), ib = new THREE.InstancedMesh(bulbs, mB, n);
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < n; i++) {
    m4.makeTranslation(c.from + i * ((c.to - c.from) / Math.max(1, n - 1)), -D, vc);
    ia.setMatrixAt(i, m4); ib.setMatrixAt(i, m4);
  }
  for (const m of [ia, ib]) { m.userData.noShadow = true; root.add(m); }
  // The posts the arches stand on, on both sides of the walkway.
  const col = new THREE.Color();
  let last = -1;
  return (t) => {
    if (t - last < 1 / 20) return; // 20 colour updates a second is plenty
    last = t;
    for (let i = 0; i < n; i++) {
      const h = (i * 0.035 - t * 0.12) % 1;
      ia.setColorAt(i, col.setHSL((h + 1) % 1, 0.9, 0.6));
      ib.setColorAt(i, col.setHSL((h + 1.5) % 1, 0.8, 0.82));
    }
    ia.instanceColor.needsUpdate = true; ib.instanceColor.needsUpdate = true;
  };
}

// King Jeongjo's royal procession, after the long tiled wall painting on the
// real Cheonggyecheon: in 1795 the king travelled to Hwaseong in Suwon with
// his mother, Lady Hyegyeong, for her 60th birthday and to visit his father's
// tomb, and court painters recorded the procession in a banchado.
//
// The wall shows the real painting: "정조의 화성행차" (華城園幸班次圖, 덕수 2507)
// from the National Museum of Korea, released under KOGL Type 1 (공공누리
// 제1유형, free use with credit; the credit is on the sign's info panel).
// Page: https://www.emuseum.go.kr/detail?relicId=PS0100100100500250700000
// The museum shares the scroll in segments; public/museum/banchado.jpg holds
// ten of them, trimmed of the grey scan background and stacked one under the
// other. Each becomes a tile panel on the wall, in a stone frame.
export const BANCHADO = {
  url: 'museum/banchado.jpg',
  w: 1280, h: 2704,
  rows: [[0, 295], [295, 251], [546, 253], [799, 252], [1051, 294], [1345, 297], [1642, 295], [1937, 253], [2190, 294], [2484, 220]], // [y, height] of each segment
};
// Panels laid along a wall of length len: [start, width] for each, scaled to fit with a gap between.
export function banchadoPanels(len, h, gap = 0.16) {
  const want = BANCHADO.rows.map(([, rh]) => (h * BANCHADO.w) / rh);
  const k = (len - gap * (want.length - 1)) / want.reduce((a, b) => a + b, 0);
  let x = 0;
  return want.map((w) => { const p = [x, w * k]; x += w * k + gap; return p; });
}
const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || '/';
function procession(root, s, c) {
  const hw = s.w / 2, D = s.depth || 4, sd = c.side || -1;
  const len = c.to - c.from, h = 2.1;
  // Plain paper colour until the painting has loaded (it waits a few seconds
  // so it doesn't slow down the start of the game).
  const mat = new THREE.MeshLambertMaterial({ color: '#efe3c8' });
  if (typeof document !== 'undefined') {
    setTimeout(() => new THREE.TextureLoader().load(BASE + BANCHADO.url, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      mat.map = tex; mat.color.set('#ffffff'); mat.needsUpdate = true;
    }), 6000);
  }
  const geos = [];
  banchadoPanels(len, h).forEach(([x, w], i) => {
    const [ry, rh] = BANCHADO.rows[i];
    const g = new THREE.PlaneGeometry(w, h);
    const v0 = 1 - (ry + rh) / BANCHADO.h, v1 = 1 - ry / BANCHADO.h;
    const uv = g.attributes.uv;
    for (let j = 0; j < uv.count; j++) uv.setY(j, uv.getY(j) > 0.5 ? v1 : v0);
    if (sd > 0) { g.rotateY(Math.PI); g.translate(len - x - w / 2, 0, 0); } // face the water, still reading left to right
    else g.translate(x + w / 2, 0, 0);
    geos.push(g);
  });
  // One mesh for all the panels, kept out of mergeStatic: its picture loads
  // later, so the merge would see a plain material and throw the UVs away
  // (the wall went blank from 2026-11-09 until this was fixed).
  const wall = new THREE.Mesh(mergeGeometries(geos), mat);
  for (const g of geos) g.dispose();
  wall.name = 'banchado';
  wall.position.set(c.from, -D + 0.55 + h / 2, sd * (hw - 0.31));
  wall.userData.noShadow = true;
  root.add(wall);
  // A frame of dark stone round it, and between the panels.
  const frame = lam('#6f655a');
  for (const y of [-D + 0.5, -D + 0.6 + h]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(len + 0.3, 0.12, 0.1), frame);
    b.position.set(c.from + len / 2, y, sd * (hw - 0.33));
    root.add(b);
  }
  const joints = banchadoPanels(len, h).slice(1).map(([x]) => x - 0.08);
  for (const x of [-0.08, ...joints, len + 0.08]) {
    const j = new THREE.Mesh(new THREE.BoxGeometry(0.12, h + 0.1, 0.1), frame);
    j.position.set(c.from + (sd > 0 ? len - x : x), -D + 0.55 + h / 2, sd * (hw - 0.33));
    root.add(j);
  }
  // A small sign on a post at the start, on the walkway.
  const sign = signPost(['정조대왕', '화성행차']);
  sign.position.set(c.from - 1.5, -D, sd * (hw - 1.6));
  sign.rotation.y = sd > 0 ? Math.PI : 0;
  root.add(sign);
  return wall;
}
// A little sign on a post, in Korean (the action next to it explains it in
// the player's language).
function signPost(lines, color = '#7a4a2a') {
  const sign = new THREE.Group();
  const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), lam('#5d6470'));
  post.position.y = 0.5;
  sign.add(post);
  const board = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 0.05), lam(color));
  board.position.y = 1.15;
  board.rotation.x = -0.3;
  sign.add(board);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45), new THREE.MeshLambertMaterial({ map: canvasTex(128, 80, (g) => {
    g.fillStyle = '#f3e9d2'; g.fillRect(0, 0, 128, 80);
    g.fillStyle = '#3a2a1a'; g.font = 'bold 20px sans-serif'; g.textAlign = 'center';
    lines.forEach((l, i) => g.fillText(l, 64, lines.length === 1 ? 48 : 30 + i * 26));
  }) }));
  face.position.set(0, 1.15, 0.03);
  face.rotation.x = -0.3;
  sign.add(face);
  return sign;
}
// Where the mural's sign stands (stream frame), for the "read about it" action.
export function muralSign(s) {
  const c = s.lanterns?.mural;
  if (!c) return null;
  return { u: c.from - 1.5, v: (c.side || -1) * (s.w / 2 - 1.6), from: c.from, to: c.to, side: c.side || -1 };
}

// The floating wish lanterns: a little square paper lantern on a wooden
// float, glowing in its colour. One InstancedMesh per part, refilled each frame.
export class WishLanterns {
  constructor(g, s, F = null) { // F: a bending stream's frame (core/stream.js frameOf)
    this.s = s;
    this.F = F;
    this.mine = []; // { L, name }: ours and other players'
    const n = WISH.max;
    const body = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    this.parts = [
      new THREE.InstancedMesh(new THREE.BoxGeometry(0.44, 0.46, 0.44).translate(0, 0.36, 0), body, n),
      new THREE.InstancedMesh(new THREE.BoxGeometry(0.62, 0.1, 0.62).translate(0, 0.05, 0), lam('#9a6a3a'), n),
      new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.05, 0.5).translate(0, 0.61, 0), lam('#6a4a2a'), n),
      new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.05, 0.5).translate(0, 0.13, 0), lam('#6a4a2a'), n),
    ];
    for (const p of this.parts) { p.count = 0; p.userData.noShadow = true; p.userData.mover = true; p.frustumCulled = false; g.add(p); }
    this.y = -(s.depth || 4) - 0.3;
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.p = new THREE.Vector3(); this.sc = new THREE.Vector3(1, 1, 1); this.up = new THREE.Vector3(0, 1, 0); this.col = new THREE.Color();
  }
  // Add one (ours or someone else's); the same id again is ignored.
  add(L, name = '') {
    if (this.mine.some((m) => m.L.id === L.id)) return false;
    this.mine.push({ L, name });
    if (this.mine.length > WISH.max / 2) this.mine.shift();
    return true;
  }
  // Every lantern on the water now: { L, at, name }.
  list(t) {
    const out = [];
    this.mine = this.mine.filter((m) => lanternAt(this.s, m.L, t) || m.L.t0 > t);
    for (const m of this.mine) { const at = lanternAt(this.s, m.L, t); if (at) out.push({ L: m.L, at, name: m.name }); }
    for (const L of ambientLanterns(this.s, t)) out.push({ L, at: lanternAt(this.s, L, t), name: '' });
    return out.slice(0, WISH.max);
  }
  tick(t) {
    const all = this.list(t);
    all.forEach(({ L, at }, i) => {
      const fade = Math.min(1, at.left / 3, at.age / 1.5);
      let yaw = at.age * 0.2 + L.v;
      if (this.F) {
        const [x, z] = this.F.toWorld(at.u, at.v);
        this.p.set(x, this.y + at.y, z);
        yaw -= this.F.angAt(at.u);
      } else this.p.set(at.u, this.y + at.y, at.v);
      this.q.setFromAxisAngle(this.up, yaw);
      this.sc.setScalar(Math.max(0.01, fade));
      this.m4.compose(this.p, this.q, this.sc);
      for (const part of this.parts) part.setMatrixAt(i, this.m4);
      this.parts[0].setColorAt(i, this.col.set(WISH_COLORS[L.c]));
    });
    for (const part of this.parts) {
      part.count = all.length;
      part.instanceMatrix.needsUpdate = true;
    }
    if (this.parts[0].instanceColor) this.parts[0].instanceColor.needsUpdate = true;
    return all;
  }
}
