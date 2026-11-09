// Performances at Gyeongbokgung (district offsets from region.json):
//  - 부채춤: twenty dancers in hanbok doing the fan dance in the front court
//    just inside Gwanghwamun, in two rings turning opposite ways.
//  - 북청사자놀음: the Bukcheong lion dance troupe (fourteen people, two
//    lions) on the square near King Sejong's statue (core/bukcheong.js).
//  - 줄타기: a tightrope master crossing a rope beside the lion dance.
//  - 수문장: gate guards in front of Gwanghwamun, with lines when greeted.
//  - 어가 행렬: the king, a eunuch with his parasol and four court ladies
//    walking from stop to stop round the palace, pausing for photos.
//  - 관람객: visitors (many in rented hanbok) already about the courts,
//    taking photos, clapping, waving to friends (PALACE_VISITORS).
// No fence round the fan dance: an unseen ring keeps visitors out of it
// (main.js makes it a blocker) and a note asks them to step back.
// They only move while you're near (like the busking crowd).
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import { DANCER_CHIMAS } from '../data/skirts.js';
import { makeNpc, say } from './npcs.js';
import { BukcheongTroupe } from './bukcheong.js';
import { hanbokById } from '../data/hanbok.js';

const NEAR = 110; // metres: closer than this, they perform

// The fan dance is a group dance (군무): the formation matters, so an
// unseen ring keeps visitors this far from its centre (main.js makes it a
// blocker). Closer than FAN_NOTE to the centre, a note asks for a few steps back.
export const FAN_KEEP = 10;
export const FAN_NOTE = FAN_KEEP + 2.5;
// A circle as a polygon (for the collision map).
export function ringPoly(x, z, r, n = 24) {
  return Array.from({ length: n }, (_, i) => [x + Math.sin((i / n) * Math.PI * 2) * r, z + Math.cos((i / n) * Math.PI * 2) * r]);
}

// The royal procession (어가 행렬): the king with a eunuch holding his
// parasol, and court ladies before and behind, walking round the throne
// hall's court. Stops and the paths between them, in the palace district's
// metres (x east, z south; Gwanghwamun at (0, 0)). The palace's gates are
// drawn at 30% of their real width, too narrow for the procession two
// abreast, so the king keeps to Geunjeongjeon's court: in from Geunjeongmun
// up the raised middle path between the rank stones to the throne hall's
// steps, and along the court's sides. Every path keeps clear of the
// corridors, the terraces and the fan dance.
export const ROYAL_ROUTE = {
  stops: [
    [3, -56], // 0 just inside Geunjeongmun
    [3.4, -63], // 1 between the rank stones, before Geunjeongjeon's steps
    [-5.5, -58], [12.5, -58], // 2, 3 the court's west and east sides
  ],
  links: [[0, 1], [0, 2], [0, 3]],
};
// Visitors standing about the courts, in the palace district's metres:
// [x, z, ry, look] (look: a rented hanbok set, or null for everyday
// clothes). They pose for photos in front of each gate and the throne hall.
export const PALACE_VISITORS = [
  [-6, -21, Math.PI, 'pink'], [-4.8, -21.6, Math.PI * 0.9, null], // the front court, Heungnyemun behind them
  [12, -12, -2.6, 'mint'],
  [-6, -36, Math.PI * 0.2, 'yellow'], [-4.6, -36.8, Math.PI * 0.3, 'baji'], // by the stream, west of Yeongjegyo
  [12, -44, -2.4, null],
  [-2.5, -60, -0.4, 'pink'], [9.5, -62, 0.5, 'yellow'], [8.2, -57, 2.8, null], // the throne hall's court, beside the rank stones
  [0, -164, Math.PI, 'mint'], [7, -164.5, Math.PI * 1.1, null], // the shore of Hyangwonjeong's pond
  [-3, -119, 2.2, 'yellow'], // beside Amisan's chimneys
];
const VISITOR_LOOKS = { // the hanbok shop's own rental sets (data/hanbok.js)
  pink: { ...hanbokById('pink-navy').wear, hairStyle: 'bun' },
  mint: { ...hanbokById('mint-pink').wear, hairStyle: 'long' },
  yellow: { ...hanbokById('yellow-red').wear, hairStyle: 'pony' },
  baji: { ...hanbokById('baji-blue').wear, hairStyle: 'short' },
};
const VISITOR_MOVES = ['clap', 'wave', 'cheer', 'bow'];
export const ROYAL_PAUSE = 10; // seconds standing still at each stop (for photos)
const ROYAL_SPEED = 1.8; // m/s, an unhurried walk, like the people on the streets (core/npcs.js)
// Who walks where: metres behind the front of the procession, and to the
// side (+ is the left-hand side, looking the way they walk). Front to back:
// a guard on each flank; the king (left) and the queen (right); the bearer
// of the red parasol held over the king and the bearer of the ceremonial
// fan; the eunuch and the senior court lady (상궁); two court ladies.
const ROW = 0.65;
export const ROYAL_ORDER = [
  { who: 'guard', back: 0, side: 1.9 }, { who: 'guard', back: 0, side: -1.9 },
  { who: 'king', back: 0.9, side: ROW }, { who: 'queen', back: 0.9, side: -ROW },
  { who: 'parasol', back: 2.3, side: ROW }, { who: 'fan', back: 2.3, side: -ROW },
  { who: 'eunuch', back: 3.7, side: ROW }, { who: 'sanggung', back: 3.7, side: -ROW },
  { who: 'lady', back: 5.1, side: ROW }, { who: 'lady', back: 5.1, side: -ROW },
];
// Once in a long while the last court lady trips: she falls flat on her
// face, lies there a moment, gets up, looks round flustered, and hurries
// after the others. tripPose(t): her pose t seconds into the trip.
export const TRIP_EVERY = [40, 80]; // seconds of walking between trips
export const TRIP_RUN = 3.6; // m/s, hurrying back to her place
export function tripPose(t) {
  const ease = (k) => k * k * (3 - 2 * k);
  if (t < 0.35) { const k = ease(t / 0.35); return { phase: 'fall', flip: 1.4 * k, tuck: 4.3 * k }; }
  if (t < 1.4) return { phase: 'down', flip: 1.4, tuck: 4.3 };
  if (t < 1.9) { const k = 1 - ease((t - 1.4) / 0.5); return { phase: 'up', flip: 1.4 * k, tuck: 4.3 * k }; }
  if (t < 3.4) return { phase: 'fluster', flip: 0, tuck: 0, look: Math.sin((t - 1.9) * 7) * 0.6 };
  return { phase: 'hurry', flip: 0, tuck: 0 };
}

// The next stop: a random neighbour, not straight back unless it's a dead end.
export function nextStop(route, at, prev, rand = Math.random) {
  const near = route.links.filter((l) => l.includes(at)).map((l) => (l[0] === at ? l[1] : l[0]));
  const ahead = near.filter((n) => n !== prev);
  const list = ahead.length ? ahead : near;
  return list[Math.floor(rand() * list.length) % list.length];
}
const mats = {};
const mat = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
const ball = (r, c, x, y, z, sx = 1, sy = 1, sz = 1) => {
  const o = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), mat(c));
  o.position.set(x, y, z); o.scale.set(sx, sy, sz);
  return o;
};

// 줄타기 rig: an A-frame trestle at each end and the rope between, along x.
const ROPE = { len: 11, h: 2.6 };
function makeRopeRig() {
  const g = new THREE.Group();
  const wood = mat('#8a5a34');
  for (const sx of [-1, 1]) {
    for (const lean of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, ROPE.h + 0.5, 8), wood);
      leg.position.set(sx * ROPE.len / 2, (ROPE.h + 0.3) / 2, 0);
      leg.rotation.x = lean * 0.32;
      g.add(leg);
    }
    const stake = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.4, 6), mat('#e6dccb'));
    stake.position.set(sx * (ROPE.len / 2 + 1.1), ROPE.h / 2, 0);
    stake.rotation.z = sx * 0.85; // guy rope down to the ground
    g.add(stake);
  }
  const line = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, ROPE.len, 6), mat('#b89a6a'));
  line.rotation.z = Math.PI / 2;
  line.position.y = ROPE.h;
  g.add(line);
  return g;
}

function performer(scene, look, activity, mask) {
  const ch = createCharacter({ ...randomLook(), ...look });
  if (mask) ch.setMascot(mask);
  ch.activity(activity);
  scene.add(ch.root);
  return ch;
}

// Twenty fan dancers, black hair up in a bun and red lips, each in her own
// chima colour; the jeogori (tops) take turns.
const TOPS = ['hanbok-pink', 'hanbok-yellow', 'hanbok-mint'];
export const FAN_LOOKS = Object.keys(DANCER_CHIMAS).map((skirt, i) => ({ model: TOPS[i % 3], skirt, tee: null, hair: 'black', dye: 'black', hairStyle: 'bun', lip: 'scarlet' }));
const FAN_N = FAN_LOOKS.length;

// The fan dance (부채춤): a 30-second routine that loops. Each part blends
// in from the last over FAN_BLEND seconds. Positions are metres from the
// dance's centre; ry is the way a dancer faces (0 = +z, towards Heungnyemun
// and the visitors coming in).
//   rings:  two rings turning opposite ways, opening and closing
//   flower: all gather in close as a five-petal flower (꽃) that turns and blooms
//   line:   one long row facing the visitors, a wave running down the fans
//   circle: one big circle facing in, closing to the middle and opening out
export const FAN_BLEND = 2;
export const FAN_ROUTINE = [
  { name: 'rings', len: 8 },
  { name: 'flower', len: 7 },
  { name: 'line', len: 8 },
  { name: 'circle', len: 7 },
];
export const FAN_CYCLE = FAN_ROUTINE.reduce((s, p) => s + p.len, 0);
const RINGS = [{ n: 8, r: 3.2, dir: 1 }, { n: 12, r: 6.4, dir: -1 }];
// Slot i of a formation at time t (u: 0..1 through its part): [x, z, ry].
export function fanSlot(name, i, t, u = 0) {
  if (name === 'rings') {
    const ring = i < RINGS[0].n ? RINGS[0] : RINGS[1], k = i < RINGS[0].n ? i : i - RINGS[0].n;
    const a = ring.dir * t * 0.12 + (k / ring.n) * Math.PI * 2, r = ring.r + 0.8 * Math.sin(t * 0.25);
    return [Math.sin(a) * r, Math.cos(a) * r, a];
  }
  if (name === 'flower') {
    const petal = i % 5, j = Math.floor(i / 5); // 5 petals of 4, from the middle out
    const bloom = 0.85 + 0.15 * Math.sin(u * Math.PI * 2);
    const a = t * 0.2 + (petal / 5) * Math.PI * 2 + (j % 2 ? 0.18 : -0.18) * (j / 3); // petals widen at the tip
    const r = (1.1 + j * 1.45) * bloom;
    return [Math.sin(a) * r, Math.cos(a) * r, a];
  }
  if (name === 'line') {
    const x = (i - (FAN_N - 1) / 2) * 0.88;
    return [x, Math.sin(t * 2.6 - i * 0.55) * 0.35, 0];
  }
  // circle: facing in, closing to the middle in the part's middle
  const a = (i / FAN_N) * Math.PI * 2 + t * 0.05, r = 6.5 - 3.6 * Math.sin(u * Math.PI);
  return [Math.sin(a) * r, Math.cos(a) * r, a + Math.PI];
}
// Which part of the routine is on at time t: { part, prev, u, k, start }
// (k: 0..1 through the blend in from prev).
export function fanPart(t) {
  let at = ((t % FAN_CYCLE) + FAN_CYCLE) % FAN_CYCLE, i = 0;
  while (at >= FAN_ROUTINE[i].len) { at -= FAN_ROUTINE[i].len; i++; }
  const part = FAN_ROUTINE[i], prev = FAN_ROUTINE[(i + FAN_ROUTINE.length - 1) % FAN_ROUTINE.length];
  const b = Math.min(1, at / FAN_BLEND), k = b * b * (3 - 2 * b);
  return { index: i, part: part.name, prev: prev.name, prevLen: prev.len, u: at / part.len, k, start: t - at };
}
// Who takes which slot of the next formation: each dancer to the nearest
// free slot (closest pairs first), so they don't all cross the floor.
export function assignSlots(from, to) {
  const pairs = [];
  for (let d = 0; d < from.length; d++) for (let s = 0; s < to.length; s++) pairs.push([Math.hypot(from[d][0] - to[s][0], from[d][1] - to[s][1]), d, s]);
  pairs.sort((a, b) => a[0] - b[0]);
  const slotOf = new Array(from.length).fill(-1), taken = new Set();
  for (const [, d, s] of pairs) if (slotOf[d] < 0 && !taken.has(s)) { slotOf[d] = s; taken.add(s); }
  return slotOf;
}
const turnTo = (a, b, k) => a + (Math.atan2(Math.sin(b - a), Math.cos(b - a))) * k;

// Gate guards (수문장) in front of Gwanghwamun: a red robe, a black
// brimmed hat with a red tassel and a spear. Tap to hear a line.
const GUARD_LINES = [
  ['어서 오시오! 여기는 광화문이오.', 'eoseo osio! yeogineun gwanghwamunieyo.', 'Welcome! This is Gwanghwamun.'],
  ['문 안 앞마당에서 부채춤 공연이 한창이오.', 'mun an apmadangeseo buchaechum gongyeoni hanchangio.', 'The fan dance is on in the court just inside.'],
  ['영제교를 건너 근정전에 가 보시오. 임금님이 행차하신다오.', 'yeongjegyoreul geonneo geunjeongjeone ga bosio. imgeumnimi haengchahasindao.', 'Cross Yeongjegyo to Geunjeongjeon. The king walks there!'],
  ['광장에서는 북청사자놀음이 한창이오.', 'gwangjangeseoneun bukcheongsajanoleumi hanchangio.', 'The Bukcheong lion dance is on in the square.'],
  ['수상한 자는 들이지 않소. 그대는 괜찮소!', 'susanghan janeun deuriji anso. geudaeneun gwaenchanso!', 'No suspicious folk allowed. You are fine!'],
  ['한복을 입으면 궁궐이 더 잘 어울린다오.', 'hanbogeul ibeumyeon gunggwori deo jal eoullindao.', 'The palace suits you even better in hanbok.'],
];
// A gat (갓): the black horsehair hat with a wide brim.
function gatHat() {
  const g = new THREE.Group();
  const black = mat('#1d1b22');
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.025, 22), black);
  brim.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.19, 0.32, 16), black);
  crown.position.y = 0.47;
  g.add(brim, crown);
  return g;
}
function guardHat() {
  const g = new THREE.Group();
  const black = mat('#1d1b22');
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.035, 20), black);
  brim.position.y = 0.3;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 0.26, 16), black);
  crown.position.y = 0.44;
  g.add(brim, crown, ball(0.07, '#d23a3a', 0, 0.6, 0), ball(0.1, '#d23a3a', 0, 0.53, 0, 1.2, 0.5, 1.2));
  return g;
}
function guardRobe() {
  const g = new THREE.Group();
  const robe = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.3, 0.46, 14), mat('#c8463c'));
  robe.position.y = 0.38;
  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.24, 0.05, 14), mat('#1d1b22'));
  belt.position.y = 0.46;
  const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.26, 0.2, 14), mat('#2f3c66'));
  vest.position.y = 0.55;
  g.add(robe, belt, vest);
  return g;
}

// The king's ikseongwan (익선관): a round black cap with two little wings
// standing up at the back; the gold dragon roundel (흉배) on his chest.
// The ceremonial fan (의장 부채) on a long pole: a round red fan with a gold
// rim and a gold sun in the middle.
function bannerFan() {
  const g = new THREE.Group();
  const pole = new THREE.Group();
  pole.position.set(-0.22, 0.35, 0.12);
  pole.rotation.x = 0.12;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.4, 6), mat('#a8141d'));
  stick.position.y = 1.2;
  const face = new THREE.Group();
  face.position.y = 2.65;
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.04, 22), mat('#e2b443'));
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.06, 22), mat('#d0232b'));
  const sun = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.07, 16), mat('#e2b443'));
  for (const m of [rim, disc, sun]) m.rotation.x = Math.PI / 2;
  face.add(rim, disc, sun);
  pole.add(stick, face);
  g.add(pole);
  return g;
}

// Snug on the head, the little wings tucked close at the back.
function ikseongwan() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.4, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#1d1b22'));
  cap.position.y = 0.12;
  cap.scale.set(0.92, 1, 0.98);
  g.add(cap, ball(0.4, '#1d1b22', 0, 0.13, -0.06, 0.94, 0.3, 1));
  for (const s of [-1, 1]) g.add(ball(0.075, '#1d1b22', 0.1 * s, 0.55, -0.24, 0.75, 1.15, 0.4));
  return g;
}
// A round gold-embroidered badge: a gold disc, a coloured centre and a ring
// of gold stitches; at (x, y, z) facing out along (nx, nz).
function badge(r, centre, x, y, z, ry = 0, tilt = 0) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(tilt, ry, 0, 'YXZ');
  const disc = new THREE.Mesh(new THREE.CircleGeometry(r, 18), mat('#e9bb3e'));
  const mid = new THREE.Mesh(new THREE.CircleGeometry(r * 0.58, 14), mat(centre));
  mid.position.z = 0.003;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, r * 0.07, 6, 18), mat('#ffd76a'));
  rim.position.z = 0.005;
  g.add(disc, mid, rim);
  for (let i = 0; i < 5; i++) { // the coiled dragon (or phoenix) in gold thread
    const a = (i / 5) * Math.PI * 2;
    const st = new THREE.Mesh(new THREE.CircleGeometry(r * 0.12, 8), mat('#ffd76a'));
    st.position.set(Math.sin(a) * r * 0.3, Math.cos(a) * r * 0.3, 0.006);
    g.add(st);
  }
  return g;
}
// The king's gold embroidery (금수): the dragon roundels (보) on his chest,
// back and both shoulders, and a gold-studded jade belt (옥대).
function kingEmbroidery() {
  const g = new THREE.Group();
  g.add(badge(0.12, '#c23a33', 0, 0.5, 0.262));
  g.add(badge(0.12, '#c23a33', 0, 0.5, -0.262, Math.PI));
  for (const s of [-1, 1]) g.add(badge(0.075, '#c23a33', 0.2 * s, 0.6, 0.02, s * Math.PI / 2, -0.9));
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.025, 6, 24), mat('#e9bb3e'));
  belt.rotation.x = Math.PI / 2 - 0.12;
  belt.position.set(0, 0.4, 0.02);
  g.add(belt);
  for (let i = 0; i < 8; i++) { // jade plaques on the belt
    const a = (i / 8) * Math.PI * 2;
    g.add(ball(0.03, '#9fd9b8', Math.sin(a) * 0.27, 0.4 + Math.cos(a) * 0.03, Math.cos(a) * 0.27 + 0.02, 1, 1, 0.5));
  }
  return g;
}
// The queen's: a gold phoenix roundel on her chest, gold-leaf (금박) bands
// round the jeogori's sleeves and two round the chima's hem (스란단).
function queenEmbroidery() {
  const g = new THREE.Group();
  g.add(badge(0.11, '#2f6b4a', 0, 0.52, 0.255));
  g.add(badge(0.11, '#2f6b4a', 0, 0.52, -0.255, Math.PI));
  for (const [r, y, h] of [[0.33, 0.16, 0.05], [0.3, 0.25, 0.035]]) {
    const band = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.01, h, 24, 1, true), mat('#e9bb3e'));
    band.material.side = THREE.DoubleSide;
    band.position.y = y;
    g.add(band);
    for (let i = 0; i < 16; i++) { // gold-leaf flowers stamped along the band
      const a = (i / 16) * Math.PI * 2;
      g.add(ball(0.018, '#ffd76a', Math.sin(a) * (r + 0.012), y, Math.cos(a) * (r + 0.012)));
    }
  }
  return g;
}
// The eunuch's samo (사모): a black cap with two flat wings out to the sides.
// Short wings, close to the cap.
function samo() {
  const g = new THREE.Group();
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.39, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat('#1d1b22'));
  cap.position.y = 0.12;
  cap.scale.set(0.92, 1, 0.98);
  g.add(cap);
  for (const s of [-1, 1]) {
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, 0.02), mat('#1d1b22'));
    wing.position.set(0.4 * s, 0.36, -0.2);
    g.add(wing);
  }
  return g;
}
// The queen's court hairdo (어여머리): a great wide ring of braided hair
// sitting on the head, gold trembling ornaments (떨잠) on the front and the
// sides, and a long gold hairpin (비녀) with red beads.
function queenHair() {
  const g = new THREE.Group();
  const hair = mat('#1d1b22');
  // the ring stands tipped well back, framing the head like a halo
  const halo = new THREE.Group();
  halo.position.set(0, 0.42, -0.12);
  halo.rotation.x = -0.75;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.14, 10, 24), hair);
  ring.scale.set(1.12, 1, 1);
  halo.add(ring);
  for (let i = 0; i < 14; i++) { // the braid's twists round the ring
    const a = (i / 14) * Math.PI * 2;
    halo.add(ball(0.075, '#2a2730', Math.sin(a) * 0.37, Math.cos(a) * 0.33, 0.06));
  }
  g.add(halo, ball(0.3, '#1d1b22', 0, 0.42, -0.08, 1.05, 0.55, 0.95));
  // 떨잠: gold discs with a jewel, one in front, one each side
  for (const [x, y, z, ry, gem] of [[0, 0.7, 0.12, 0, '#3a7bd5'], [-0.4, 0.55, 0.0, -1.0, '#c23a33'], [0.4, 0.55, 0.0, 1.0, '#c23a33']]) {
    const t = new THREE.Group();
    t.position.set(x, y, z);
    t.rotation.y = ry;
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.02, 14), mat('#e9bb3e'));
    disc.rotation.x = Math.PI / 2;
    t.add(disc, ball(0.035, gem, 0, 0, 0.02, 1, 1, 0.6));
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; t.add(ball(0.022, '#ffd76a', Math.sin(a) * 0.11, Math.cos(a) * 0.11, 0.01)); }
    g.add(t);
  }
  const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.05, 8), mat('#e9bb3e'));
  pin.rotation.z = Math.PI / 2;
  pin.position.set(0, 0.42, -0.3);
  g.add(pin, ball(0.055, '#c23a33', 0.54, 0.42, -0.3), ball(0.055, '#c23a33', -0.54, 0.42, -0.3));
  return g;
}
// The red royal parasol (홍양산) the eunuch holds up over the king ahead:
// a red silk canopy in two ruffled tiers on a tall red pole, a gold knob on top.
function parasol(lean = 0.5) {
  const g = new THREE.Group();
  const red = mat('#d0232b'), deep = mat('#a8141d');
  const pole = new THREE.Group();
  pole.position.set(0.22, 0.35, 0.12);
  pole.rotation.x = lean;
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 2.5, 6), deep);
  stick.position.y = 1.25;
  const top = new THREE.Group();
  top.position.y = 2.5;
  top.rotation.x = -lean;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.62, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2), red);
  dome.scale.y = 0.45;
  top.add(dome);
  // two tiers of ruffles hanging from the rim: little rounded folds
  for (const [r, y, h] of [[0.64, -0.08, 0.26], [0.7, -0.36, 0.34]]) {
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.04, h, 20, 1, true), r > 0.66 ? red : deep);
    skirt.material.side = THREE.DoubleSide;
    skirt.position.y = y;
    top.add(skirt);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      top.add(ball(0.09, '#d0232b', Math.sin(a) * (r + 0.03), y - h / 2, Math.cos(a) * (r + 0.03), 1, 0.7, 1));
    }
  }
  top.add(ball(0.07, '#e2b443', 0, 0.3, 0)); // the gold knob
  pole.add(stick, top);
  g.add(pole);
  return g;
}
export class PalaceShow {
  // fan: [x, z] centre of the fan dance; mask: [x, z] centre of the lion
  // dance ring; guards: [[x, z, ry], ...] gate guards; layer: name tags.
  // rope: [x, z] middle of the tightrope (runs along x).
  // procession: [x, z] the palace district's offset (ROYAL_ROUTE is in its metres).
  constructor(scene, { fan, mask, rope, guards = [], procession = null, visitors = null, layer = null, inside = () => true }) {
    this.layer = layer;
    this.inside = inside; // inside the palace wall? The fan dance and the procession are only there for those inside
    if (procession && layer) this.royal = this.makeProcession(scene, procession);
    if (rope) {
      const rig = makeRopeRig();
      rig.position.set(rope[0], 0, rope[1]);
      scene.add(rig);
      // the master: white robe (durumagi), a black gat, a fan
      const walker = performer(scene, { model: 'hanbok-durumagi-white', tee: null, hair: 'black', dye: 'black' }, 'rope');
      walker.addProp('head', gatHat());
      this.rope = { x: rope[0], z: rope[1], rig, walker };
    }
    this.fan = fan && {
      x: fan[0], z: fan[1],
      dancers: FAN_LOOKS.map((l) => performer(scene, l, 'fan')),
      part: -1, slotOf: FAN_LOOKS.map((_, i) => i), prevOf: FAN_LOOKS.map((_, i) => i),
    };
    this.mask = mask ? new BukcheongTroupe(scene, mask) : null;
    this.guards = layer ? guards.map(([x, z, ry]) => {
      const o = makeNpc(layer, '💂 수문장', { ...randomLook(), model: 'basic', pants: 'black', hair: 'black', dye: 'black', tee: null, hairStyle: 'short' });
      o.ch.addProp('head', guardHat());
      o.ch.addProp('body', guardRobe());
      o.ch.setHeld('spear');
      o.ch.root.position.set(x, 0, z);
      o.ch.root.rotation.y = ry;
      o.home = { x, z, ry };
      scene.add(o.ch.root);
      return o;
    }) : [];
    // Visitors: built the first time you walk in (visitors: the palace district's offset).
    this.visitorsAt = visitors;
    this.visitors = null;
    this.scene = scene;
    this.t = 0;
  }
  makeVisitors([ox, oz]) {
    return PALACE_VISITORS.map(([x, z, ry, k], i) => {
      const ch = performer(this.scene, k ? VISITOR_LOOKS[k] : {}, null);
      ch.root.position.set(x + ox, 0, z + oz);
      ch.root.rotation.y = ry;
      return { ch, next: 2 + ((i * 1.7) % 5) };
    });
  }
  updateVisitors(dt, me) {
    if (!this.visitors && this.inside()) this.visitors = this.makeVisitors(this.visitorsAt);
    if (!this.visitors) return;
    const on = this.inside();
    for (const v of this.visitors) {
      const near = on && Math.hypot(me.x - v.ch.root.position.x, me.z - v.ch.root.position.z) < NEAR;
      v.ch.root.visible = near;
      if (!near) continue;
      if ((v.next -= dt) <= 0) { v.ch.play(VISITOR_MOVES[Math.floor(Math.random() * VISITOR_MOVES.length)]); v.next = 4 + Math.random() * 6; }
      v.ch.animate(dt, 0);
    }
  }
  makeProcession(scene, [ox, oz]) {
    const stops = ROYAL_ROUTE.stops.map(([x, z]) => [x + ox, z + oz]);
    const lady = () => performer(scene, { model: 'hanbok-gungnyeo', skirt: 'chima-navy', tee: null, hair: 'black', dye: 'black', hairStyle: 'bun' }, null);
    const people = ROYAL_ORDER.map((o) => {
      let ch, npc = null;
      if (o.who === 'king') {
        npc = makeNpc(this.layer, '👑 임금님', { ...randomLook(), model: 'hanbok-gonryongpo', tee: null, hair: 'black', dye: 'black', hairStyle: 'short' });
        ch = npc.ch;
        ch.addProp('head', ikseongwan());
        ch.addProp('body', kingEmbroidery());
        scene.add(ch.root);
      } else if (o.who === 'eunuch') {
        ch = performer(scene, { model: 'hanbok-dallyeong', tee: null, hair: 'black', dye: 'black', hairStyle: 'short' }, null);
        ch.addProp('head', samo());
      } else if (o.who === 'parasol' || o.who === 'fan') {
        // the bearers: red robes and black gat
        ch = performer(scene, { model: 'hanbok-hongpo', tee: null, hair: 'black', dye: 'black', hairStyle: 'short' }, null);
        ch.addProp('head', gatHat());
        ch.addProp('body', o.who === 'parasol' ? parasol() : bannerFan());
      } else if (o.who === 'guard') {
        ch = performer(scene, { model: 'basic', pants: 'black', hair: 'black', dye: 'black', tee: null, hairStyle: 'short' }, null);
        ch.addProp('head', guardHat());
        ch.addProp('body', guardRobe());
        ch.setHeld('spear');
      } else if (o.who === 'sanggung') {
        ch = performer(scene, { model: 'hanbok-gungnyeo', skirt: 'chima-red', tee: null, hair: 'black', dye: 'black', hairStyle: 'bun' }, null);
      } else if (o.who === 'queen') {
        npc = makeNpc(this.layer, '👑 왕비', { ...randomLook(), model: 'hanbok-queen', skirt: 'chima-red', tee: null, hair: 'black', dye: 'black', hairStyle: 'bun', lip: 'cherry' });
        ch = npc.ch;
        ch.addProp('head', queenHair());
        ch.addProp('body', queenEmbroidery());
        scene.add(ch.root);
      } else ch = lady();
      return { ...o, ch, npc };
    });
    const [sx, sz] = stops[0];
    people.findLast((p) => p.who === 'lady').tripper = true;
    return { stops, people, at: 0, prev: -1, to: null, pause: 3, x: sx, z: sz, dir: [0, -1], trail: [[sx, sz], [sx, sz + 8]], waveT: 6 + Math.random() * 6, trip: null, tripWait: TRIP_EVERY[0] + Math.random() * (TRIP_EVERY[1] - TRIP_EVERY[0]) };
  }
  // Where the procession is now (for the debug hook and tests).
  royalSpot() { return this.royal && { x: this.royal.x, z: this.royal.z, stopped: this.royal.pause > 0 }; }
  // A point `back` metres behind the front, along the path it walked.
  trailAt(back) {
    const tr = this.royal.trail;
    let left = back;
    for (let i = tr.length - 1; i > 0; i--) {
      const [ax, az] = tr[i], [bx, bz] = tr[i - 1], d = Math.hypot(bx - ax, bz - az);
      if (d >= left) { const t = d ? left / d : 0; return { x: ax + (bx - ax) * t, z: az + (bz - az) * t, dx: ax - bx, dz: az - bz }; }
      left -= d;
    }
    const [x, z] = tr[0], [x1, z1] = tr[1] || tr[0];
    return { x, z, dx: x1 - x, dz: z1 - z };
  }
  updateRoyal(dt, me, camera, w, h, placeLabels) {
    const R = this.royal;
    let moving = false;
    if (R.pause > 0) {
      const was = R.pause;
      R.pause -= dt;
      // Arriving: the king waves to whoever is watching and the ladies and
      // the eunuch bow; then all stand still for the photos.
      if (was > ROYAL_PAUSE - 0.05 && R.pause <= ROYAL_PAUSE - 0.05) {
        for (const p of R.people) if (p.who !== 'guard') p.ch.play(p.who === 'king' || p.who === 'queen' ? 'wave' : 'bow');
      }
      if (R.pause <= 0) { R.to = nextStop(ROYAL_ROUTE, R.at, R.prev); R.prev = R.at; }
    } else {
      const [tx, tz] = R.stops[R.to], dx = tx - R.x, dz = tz - R.z, d = Math.hypot(dx, dz), step = ROYAL_SPEED * dt;
      if (d <= step) {
        R.x = tx; R.z = tz; R.at = R.to; R.pause = ROYAL_PAUSE + 0.01;
      } else { R.x += (dx / d) * step; R.z += (dz / d) * step; moving = true; }
      const last = R.trail[R.trail.length - 1];
      if (Math.hypot(R.x - last[0], R.z - last[1]) > 0.3) { R.trail.push([R.x, R.z]); if (R.trail.length > 80) R.trail.shift(); }
      // Now and then on the way, the king waves.
      if ((R.waveT -= dt) <= 0) { R.waveT = 8 + Math.random() * 8; R.people.find((p) => p.who === 'king').ch.wave(); }
      if (!R.trip && (R.tripWait -= dt) <= 0) {
        const ch = R.people.find((p) => p.tripper).ch;
        R.trip = { t: 0, x: ch.root.position.x, z: ch.root.position.z };
        R.tripWait = TRIP_EVERY[0] + Math.random() * (TRIP_EVERY[1] - TRIP_EVERY[0]);
      }
    }
    const on = Math.hypot(me.x - R.x, me.z - R.z) < NEAR && this.inside();
    for (const p of R.people) {
      p.ch.root.visible = on;
      if (!on) { if (p.npc) { p.npc.tag.style.display = 'none'; } continue; }
      const t = this.trailAt(p.back), len = Math.hypot(t.dx, t.dz) || 1, fx = t.dx / len, fz = t.dz / len;
      if (p.tripper && R.trip && this.updateTrip(dt, p, t.x + fz * p.side, t.z - fx * p.side, Math.atan2(fx, fz))) continue;
      p.ch.root.position.set(t.x + fz * p.side, 0, t.z - fx * p.side);
      if (moving) p.ch.root.rotation.y = turnTo(p.ch.root.rotation.y, Math.atan2(fx, fz), Math.min(1, dt * 6)); // turn corners smoothly
      p.ch.animate(dt, moving ? ROYAL_SPEED / 12 : 0); // the same walk as the street NPCs
      if (p.npc) placeLabels?.(p.npc, camera, w, h);
    }
  }
  // The court lady's trip (tripPose); false once she is back in her place.
  updateTrip(dt, p, hx, hz, hry) {
    const T = this.royal.trip, ch = p.ch, was = tripPose(T.t).phase;
    T.t += dt;
    const P = tripPose(T.t);
    ch.setTrick(P.flip ? { flip: P.flip, tuck: P.tuck } : null);
    if (P.phase === 'fluster' && was !== 'fluster') { T.ry = ch.root.rotation.y; ch.play('shrug'); }
    if (P.phase !== 'hurry') {
      ch.root.position.set(T.x, 0, T.z);
      if (P.phase === 'fluster') ch.root.rotation.y = T.ry + P.look;
      ch.animate(dt, 0);
      return true;
    }
    // hurrying after the others, back to her place
    const dx = hx - T.x, dz = hz - T.z, d = Math.hypot(dx, dz), step = TRIP_RUN * dt;
    if (d <= step + 0.05) { this.royal.trip = null; return false; }
    T.x += (dx / d) * step; T.z += (dz / d) * step;
    ch.root.position.set(T.x, 0, T.z);
    ch.root.rotation.y = turnTo(ch.root.rotation.y, Math.atan2(dx, dz), Math.min(1, dt * 8));
    ch.animate(dt, 0.6);
    return true;
  }
  // The gate guard you're next to, if any.
  nearGuard(x, z) {
    return this.guards.find((o) => Math.hypot(x - o.home.x, z - o.home.z) < 2.8) || null;
  }
  greet(o, x, z) {
    o.ch.root.rotation.y = Math.atan2(x - o.home.x, z - o.home.z);
    o.talkT = 5;
    o.ch.play('bow');
    say(o, this.layer, GUARD_LINES[Math.floor(Math.random() * GUARD_LINES.length)]);
  }
  // Where the performers are (for the debug hook / camera).
  spots() { return { fan: this.fan && [this.fan.x, this.fan.z], mask: this.mask && this.mask.spot() }; }
  update(dt, me, camera, w, h, placeLabels) {
    this.t += dt;
    const t = this.t;
    if (this.royal) this.updateRoyal(dt, me, camera, w, h, placeLabels);
    for (const o of this.guards) {
      const on = Math.hypot(me.x - o.home.x, me.z - o.home.z) < NEAR;
      o.ch.root.visible = on;
      if (!on) { o.tag.style.display = 'none'; if (o.bubble) o.bubble.style.display = 'none'; continue; }
      if (o.talkT > 0 && (o.talkT -= dt) <= 0) o.ch.root.rotation.y = o.home.ry; // back to attention
      o.ch.animate(dt, 0);
      placeLabels?.(o, camera, w, h);
    }
    if (this.rope) {
      const { x, z, walker } = this.rope;
      const on = Math.hypot(me.x - x, me.z - z) < NEAR;
      walker.root.visible = on;
      if (on) {
        // Across and back along the rope, turning at each end.
        const span = ROPE.len / 2 - 0.8, per = 14, c = (t % (per * 2)) / per; // 0..2
        const k = c < 1 ? c : 2 - c, u = k * k * (3 - 2 * k);
        walker.root.position.set(x - span + u * span * 2, ROPE.h - 0.02, z);
        walker.root.rotation.y = c < 1 ? Math.PI / 2 : -Math.PI / 2;
        walker.animate(dt, 0);
      }
    }
    if (this.fan) this.updateFan(dt, me, t);
    if (this.visitorsAt) this.updateVisitors(dt, me);
    this.mask?.update(dt, me);
  }
  // The fan dance: the routine's parts in turn (FAN_ROUTINE), each blending
  // in from the last. At the start of each part every dancer is given the
  // nearest free place in the new formation.
  updateFan(dt, me, t) {
    const F = this.fan, P = fanPart(t);
    if (P.index !== F.part) {
      const tEnd = P.start + FAN_BLEND;
      const from = F.dancers.map((_, d) => fanSlot(P.prev, F.slotOf[d], tEnd, 1));
      const to = F.dancers.map((_, s) => fanSlot(P.part, s, tEnd, FAN_BLEND / FAN_ROUTINE[P.index].len));
      F.prevOf = F.slotOf;
      F.slotOf = F.part < 0 ? F.slotOf : assignSlots(from, to);
      F.part = P.index;
    }
    const on = Math.hypot(me.x - F.x, me.z - F.z) < NEAR && this.inside();
    F.dancers.forEach((ch, d) => {
      ch.root.visible = on;
      if (!on) return;
      let [x, z, ry] = fanSlot(P.part, F.slotOf[d], t, P.u);
      if (P.k < 1) {
        const [px, pz, pry] = fanSlot(P.prev, F.prevOf[d], t, 1);
        x = px + (x - px) * P.k; z = pz + (z - pz) * P.k; ry = turnTo(pry, ry, P.k);
      }
      ch.root.position.set(F.x + x, 0, F.z + z);
      ch.root.rotation.y = ry;
      ch.animate(dt, 0);
    });
  }
  // Close to the fan dance (but outside the unseen ring): ask to step back.
  nearFan(x, z) { return !!this.fan && Math.hypot(x - this.fan.x, z - this.fan.z) < FAN_NOTE; }
  hideLabels() {
    for (const o of this.guards) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
    for (const p of this.royal?.people || []) if (p.npc) for (const el of [p.npc.tag, p.npc.bubble]) if (el) el.style.display = 'none';
  }
}
