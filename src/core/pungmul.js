// A pungmul troupe (풍물패) of 19 on Olympic Park's Peace Plaza: flags,
// the taepyeongso and the nabal, kkwaenggwari, jing, janggu and buk, the
// sogo dancers and the sangmo players whirling the long ribbons on their
// hats (상모 돌리기), and four comic characters (잡색). Costumes, instruments
// and moves: core/pungmul-props.js.
//
// The performance is one 142-second routine (진풀이) that loops:
//   march   (원진)     the whole troupe walks one big circle in a column
//   coil    (멍석말이) the leader winds the column into a tight spiral
//   uncoil  (풀기)     and it unwinds back out onto the circle
//   pan     (판굿)     the musicians stand round the edge facing in while the
//                      sangmo dancers turn in two rings in the middle, the
//                      rings spinning in turn like a wave (연풍대)
// There is no fence: pungmul is a crowd's play, and you can walk in among
// them (they walk through you).
//
// Performance: 19 animated people is a lot, so they are built only the
// first time you come near (a few per frame), drawn only within NEAR, and
// animated less often the further away or when off screen.
//
//   const pm = new PungmulTroupe(scene, [x, z]);
//   pm.update(dt, me, camera);   // each frame on the street
import * as THREE from 'three';
import { createCharacter } from './character.js';
import { randomLook } from '../data/appearance.js';
import { makeSangmoHat, makeGokkal, makeGat, makeFurHat, makeBun, makeGaksiMask, makeBupo, makeRibbon, makeTaepyeongso, makeNabal, makeSashes, makeJanggu, makeBuk, makeGun, makeFlag, sangmoSpin, BEAT } from './pungmul-props.js';

// Who plays what (Yozi's list), front of the column to the back.
export const PUNGMUL_ROLES = [
  { id: 'flag', ko: '기수', n: 1 },
  { id: 'horn', ko: '태평소·나발', n: 1 },
  { id: 'kkwaenggwari', ko: '꽹과리', n: 2 },
  { id: 'jing', ko: '징', n: 1 },
  { id: 'janggu', ko: '장구', n: 3 },
  { id: 'buk', ko: '북', n: 2 },
  { id: 'sogo', ko: '소고·상모춤', n: 7 },
  { id: 'japsaek', ko: '잡색', n: 2 },
];
// (A quarter of Yozi's first list of 75, every part still there: the full
// troupe was too many ribbons and too heavy on phones.)
// One entry per person in column order: { role, k (index within the role) }.
export const TROUPE = PUNGMUL_ROLES.flatMap((r) => Array.from({ length: r.n }, (_, k) => ({ role: r.id, k })));
export const TROUPE_N = TROUPE.length;
// The pan formation's groups: musicians round the edge, the sangmo dancers
// in two rings, the comic characters in the middle.
const MUSICIANS = new Set(['flag', 'horn', 'kkwaenggwari', 'jing', 'janggu', 'buk']);
export const SPINNERS = new Set(['sogo', 'sangmo']); // the ribbon hats

// The circle's centre in Olympic Park's own metres (districts/olympic-park.json):
// the open middle of the Peace Plaza, east of the Peace Gate and west of
// the skate park.
export const PLAZA_SPOT = [1104, 292];
export const NEAR = 120; // metres: closer than this, they perform
const BUILD = 140; // ... and are first built when you come this close
export const RADIUS = 17; // the big circle
const GAP = 1.4; // metres between people in the column on the circle
const GAP_COIL = 0.95; // ... and tighter as it winds up
const SPEED = 1.3; // m/s round the circle
const BAND_GAP = 1.6; // metres between the musicians in the pan's arc
const COIL_STEP = 1.5; // metres between the turns of the spiral
const COIL_IN = 1.2; // the spiral's inner end
const COIL_OUT = 6.8; // ... and outer end, after a short curve in from the circle

export const ROUTINE = [
  { name: 'march', len: 34 },
  { name: 'coil', len: 46 },
  { name: 'uncoil', len: 24 },
  { name: 'pan', len: 38 },
];
export const CYCLE = ROUTINE.reduce((s, p) => s + p.len, 0);
export const BLEND = 12; // seconds to walk from the circle into the pan's rings, and back out
const smooth = (k) => { const c = Math.max(0, Math.min(1, k)); return c * c * (3 - 2 * c); };
const lerp = (a, b, k) => a + (b - a) * k;

// The column's path, by distance s from where it leaves the circle: on the
// circle for s < 0 (anticlockwise seen from above, angle s / RADIUS), then a
// short curve in to the outer end of the spiral, and the spiral winding in.
// Returns [x, z] in metres from the centre.
const spiralTurns = (COIL_OUT - COIL_IN) / COIL_STEP;
const spiralPts = (() => {
  // sampled finely, by arc length (an Archimedean spiral, then the lead-in)
  const pts = [[0, RADIUS]];
  const lead = 1.2; // radians of turning to come in from the circle to the spiral
  const total = lead + spiralTurns * Math.PI * 2;
  for (let a = 0.02; a <= total + 1e-9; a += 0.02) {
    const r = a < lead ? lerp(RADIUS, COIL_OUT, smooth(a / lead)) : COIL_OUT - ((a - lead) / (Math.PI * 2)) * COIL_STEP;
    pts.push([Math.sin(a) * r, Math.cos(a) * r]);
  }
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, acc, len: acc[acc.length - 1] };
})();
export const COIL_LEN = spiralPts.len;
// The leader walks the whole path in, reaching the middle as the coil ends.
const COIL_SPEED = (COIL_LEN - 0.5) / ROUTINE[1].len;
export function pathAt(s) {
  if (s <= 0) { const a = s / RADIUS; return [Math.sin(a) * RADIUS, Math.cos(a) * RADIUS]; }
  const { pts, acc } = spiralPts;
  if (s >= acc[acc.length - 1]) return pts[pts.length - 1];
  let lo = 0, hi = acc.length - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (acc[m] <= s) lo = m; else hi = m; }
  const k = (s - acc[lo]) / (acc[hi] - acc[lo] || 1);
  return [lerp(pts[lo][0], pts[hi][0], k), lerp(pts[lo][1], pts[hi][1], k)];
}

// Which part of the routine is on at time t: { index, part, prev, u (0..1
// through it), at (seconds into it) }.
export function routinePart(t) {
  let at = ((t % CYCLE) + CYCLE) % CYCLE, i = 0;
  while (at >= ROUTINE[i].len) { at -= ROUTINE[i].len; i++; }
  return { index: i, part: ROUTINE[i].name, prev: ROUTINE[(i + ROUTINE.length - 1) % ROUTINE.length].name, at, u: at / ROUTINE[i].len };
}

// Where person i is in formation `name`, `at` seconds into it: [x, z, face]
// (face: the way they look, or null to look the way they walk).
export function slot(name, i, at) {
  if (name === 'march') {
    const sL = SPEED * (at - ROUTINE[0].len); // reaching the way in (s = 0) at the end
    return [...pathAt(sL - i * GAP), null];
  }
  if (name === 'coil') {
    const gap = lerp(GAP, GAP_COIL, Math.min(1, at / ROUTINE[1].len)); // closing up steadily as it winds
    return [...pathAt(COIL_SPEED * at - i * gap), null];
  }
  if (name === 'uncoil') {
    // the spiral opens out (풀기) into the big circle again, turning as it goes
    const k = smooth(at / ROUTINE[2].len);
    const [cx, cz] = slot('coil', i, ROUTINE[1].len);
    const [rx, rz] = pathAt(SPEED * at - UNCOIL_AT - i * GAP);
    return [lerp(cx, rx, k), lerp(cz, rz, k), null];
  }
  // pan
  const who = TROUPE[i];
  if (MUSICIANS.has(who.role)) {
    // the band in a wide arc on one side, facing in, so the far side is
    // open to watch the dancers
    const n = TROUPE.filter((p) => MUSICIANS.has(p.role)).length, r = RADIUS - 1;
    const a = PAN_TURN + (i - (n - 1) / 2) * (BAND_GAP / r) + 0.15 * Math.sin(at * 0.1);
    return [Math.sin(a) * r, Math.cos(a) * r, a + Math.PI]; // facing in
  }
  if (who.role === 'japsaek') {
    const a = PAN_TURN + (who.k / 4) * Math.PI * 2 + at * 0.3, r = 2 + 0.6 * Math.sin(at * 0.8 + who.k);
    return [Math.sin(a) * r, Math.cos(a) * r, a]; // facing out to the crowd
  }
  const j = spinnerIndex(i), inner = j >= OUTER_N;
  const n = inner ? SPINNER_N - OUTER_N : OUTER_N, k = inner ? j - OUTER_N : j;
  const dir = inner ? 1 : -1, r = inner ? 5.5 : 10.5;
  const a = PAN_TURN + (k / n) * Math.PI * 2 + dir * at * (inner ? 0.2 : 0.12);
  return [Math.sin(a) * r, Math.cos(a) * r, null];
}
const spinnerIdx = TROUPE.map((p, i) => (SPINNERS.has(p.role) ? i : -1)).filter((i) => i >= 0);
const SPINNER_N = spinnerIdx.length;
const OUTER_N = Math.round(SPINNER_N * 0.58); // 24 of 41 in the outer ring
const spinnerOf = new Map(spinnerIdx.map((i, j) => [i, j]));
const spinnerIndex = (i) => spinnerOf.get(i) ?? -1;

// The spinning jump (연풍대) in the pan: every SPIN_EVERY seconds a wave of
// turns runs round each ring. Returns the turn (radians, 0..2π) and the hop
// height for person i, `at` seconds into the pan.
export const SPIN_EVERY = 6;
const SPIN_LEN = 1.1;
export function yeonpungdae(i, at) {
  const j = spinnerIndex(i);
  if (j < 0 || at < BLEND) return { turn: 0, hop: 0 };
  const inner = j >= OUTER_N, k = inner ? j - OUTER_N : j, n = inner ? SPINNER_N - OUTER_N : OUTER_N;
  const c = (at - BLEND - (k / n) * 1.6 - (inner ? 3 : 0)) % SPIN_EVERY;
  if (c < 0 || c > SPIN_LEN) return { turn: 0, hop: 0 };
  const u = c / SPIN_LEN;
  return { turn: smooth(u) * Math.PI * 2, hop: Math.sin(u * Math.PI) * 0.35 };
}

// Where person i is at time t: [x, z, face|null], blending between
// formations where they change shape (into and out of the pan).
export function troupeSpot(i, t) {
  const P = routinePart(t);
  const [x, z, f] = slot(P.part, i, P.at);
  const blends = P.part === 'pan' || P.prev === 'pan';
  if (!blends || P.at >= BLEND) return [x, z, f];
  const prevLen = ROUTINE[(P.index + ROUTINE.length - 1) % ROUTINE.length].len;
  const [px, pz, pf] = slot(P.prev, i, prevLen + P.at); // the last formation, carrying on
  const k = smooth(P.at / BLEND);
  return [lerp(px, x, k), lerp(pz, z, k), f ?? pf ?? null];
}

// Where the circle stands as the uncoiling ends (UNCOIL_AT), and how far the
// pan's formation is turned (PAN_TURN): chosen once so the walks into and
// out of the pan are as short as they can be.
let UNCOIL_AT = 0, PAN_TURN = 0;
{
  const worst = (f) => { let w = 0; for (let i = 0; i < TROUPE_N; i++) w = Math.max(w, f(i)); return w; };
  const d = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
  const L = ROUTINE.map((p) => p.len);
  let best = Infinity, pick = [0, 0];
  for (let u = 0; u < 2 * Math.PI * RADIUS; u += 2) {
    UNCOIL_AT = u;
    for (let a = 0; a < Math.PI * 2; a += 0.05) {
      PAN_TURN = a;
      const into = worst((i) => d(slot('uncoil', i, L[2] + BLEND), slot('pan', i, BLEND)));
      const outOf = worst((i) => d(slot('pan', i, L[3] + BLEND), slot('march', i, BLEND)));
      if (into + outOf < best) { best = into + outOf; pick = [u, a]; }
    }
  }
  [UNCOIL_AT, PAN_TURN] = pick;
}
const turnTo = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// Looks and costumes. Everyone in the white pungmul clothes with the three
// sashes except the comic characters.
const PLAYER = { model: 'hanbok-pungmul', tee: null, hair: 'black', dye: 'black', hairStyle: 'short', skirt: null };
const JAPSAEK = [
  { name: 'yangban', look: { model: 'hanbok-durumagi-white', tee: null, hair: 'black', dye: 'black' } }, // 양반: a gat and a folding fan
  { name: 'gaksi', look: { model: 'hanbok-pink', skirt: 'chima-red', tee: null, hair: 'black', dye: 'black', hairStyle: 'bun' } }, // 각시: the bride's mask
  { name: 'posu', look: { model: 'hanbok-baji-navy', tee: null, hair: 'black', dye: 'black' } }, // 포수: the hunter with a fur hat and a gun
  { name: 'halmi', look: { model: 'hanbok-baji-ivory', tee: null, hair: 'ash', dye: 'silver' } }, // 할미: the granny
];
export function activityOf({ role, k }) {
  if (role === 'horn') return k ? 'pm_nabal' : 'pm_taepyeongso';
  return 'pm_' + (role === 'kkwaenggwari' ? 'kkwaenggwari' : role);
}
function dress(who) {
  const { role, k } = who;
  const jap = role === 'japsaek' ? JAPSAEK[k % JAPSAEK.length] : null;
  const ch = createCharacter({ ...randomLook(), ...(jap ? jap.look : PLAYER) });
  const fx = {};
  if (jap) {
    if (jap.name === 'yangban') ch.addProp('head', makeGat());
    if (jap.name === 'gaksi') ch.setMascot(makeGaksiMask());
    if (jap.name === 'posu') { ch.addProp('head', makeFurHat()); ch.addProp('body', makeGun()); }
    if (jap.name === 'halmi') ch.addProp('head', makeBun());
  } else {
    ch.addProp('body', makeSashes());
    if (SPINNERS.has(role)) {
      ch.addProp('head', makeSangmoHat());
      fx.ribbon = makeRibbon();
      ch.addProp('head', fx.ribbon);
    } else if (role === 'kkwaenggwari') {
      ch.addProp('head', makeSangmoHat());
      fx.bupo = makeBupo();
      ch.addProp('head', fx.bupo);
    } else ch.addProp('head', makeGokkal());
    if (role === 'horn') ch.addProp('head', k ? makeNabal() : makeTaepyeongso());
    if (role === 'janggu') ch.addProp('body', makeJanggu());
    if (role === 'buk') ch.addProp('body', makeBuk());
    if (role === 'flag') { fx.flag = makeFlag(k === 0 ? 'nonggi' : k === 1 ? 'yeonggi-blue' : 'yeonggi-red'); ch.addProp('body', fx.flag); }
  }
  ch.activity(activityOf(who));
  return { ch, fx, who, acc: 0, phase: (who.k * 0.37) % 1 };
}

// Turn off cast shadows; true once the model has loaded (and so is done).
function noShadows(root) {
  let skinned = false;
  root.traverse((o) => { if (o.isMesh) { o.castShadow = false; skinned ||= o.isSkinnedMesh; } });
  return skinned;
}
const _sphere = new THREE.Sphere(new THREE.Vector3(), 2.5);
const _frustum = new THREE.Frustum(), _pv = new THREE.Matrix4();

export class PungmulTroupe {
  // at: [x, z] the centre of the circle (world metres).
  constructor(scene, [x, z], { lowSpec = false } = {}) {
    Object.assign(this, { scene, x, z });
    this.near = lowSpec ? 90 : NEAR;
    this.people = null; // built when you first come near
    this.building = 0;
    this.t = 0;
    this.frame = 0;
  }
  // Where the circle is (for the debug hook and tests).
  spot() { return [this.x, this.z]; }
  // Close enough to see the show (for a hello toast).
  watching(x, z, more = 0) { return Math.hypot(x - this.x, z - this.z) < RADIUS + 12 + more; }
  _buildSome(n) {
    this.people ||= [];
    for (let i = 0; i < n && this.people.length < TROUPE_N; i++) {
      const p = dress(TROUPE[this.people.length]);
      p.ch.root.visible = false;
      this.scene.add(p.ch.root);
      this.people.push(p);
    }
  }
  update(dt, me, camera) {
    this.t += dt;
    this.frame++;
    const d = Math.hypot(me.x - this.x, me.z - this.z);
    // Built a few people a frame, so coming near doesn't stall the game.
    if (d < BUILD && (!this.people || this.people.length < TROUPE_N)) this._buildSome(6);
    if (!this.people) return;
    const on = d < this.near;
    if (!on) { if (this.shown) for (const p of this.people) p.ch.root.visible = false; this.shown = false; return; }
    this.shown = true;
    if (camera) { _pv.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); _frustum.setFromProjectionMatrix(_pv); }
    const clock = performance.now() / 1000; // the beat the moves keep (folk-dance.js)
    const P = routinePart(this.t);
    for (let i = 0; i < this.people.length; i++) {
      const p = this.people[i], { ch, fx } = p, root = ch.root;
      root.visible = true;
      const [x, z, face] = troupeSpot(i, this.t);
      const wx = this.x + x, wz = this.z + z;
      // which way they walk: from where they were a moment ago
      const ox = root.position.x, oz = root.position.z, moved = Math.hypot(wx - ox, wz - oz);
      root.position.set(wx, 0, wz);
      const want = face ?? (moved > 0.004 ? Math.atan2(wx - ox, wz - oz) : root.rotation.y);
      root.rotation.y = moved > 2 ? want : turnTo(root.rotation.y, want, Math.min(1, dt * 5));
      // The spinning jump in the pan.
      if (SPINNERS.has(p.who.role)) {
        const Y = P.part === 'pan' ? yeonpungdae(i, P.at) : { turn: 0, hop: 0 };
        if (Y.turn || p.spun) { ch.setTrick(Y.turn ? { spin: Y.turn } : null, Y.hop); p.spun = !!Y.turn; }
        root.position.y = Y.hop;
      }
      // Animated every frame up close and on screen, less often further away.
      _sphere.center.set(wx, 1, wz);
      const seen = !camera || _frustum.intersectsSphere(_sphere);
      const dd = Math.hypot(me.x - wx, me.z - wz);
      const every = !seen ? 8 : dd < 30 ? 1 : dd < 60 ? 2 : 3;
      // No cast shadows (the round blob under each is enough): 19 more
      // people in the shadow pass would cost as much again.
      if (!p.flat && (this.frame + i) % 20 === 0) p.flat = noShadows(root);
      p.acc += dt;
      if ((this.frame + i) % every === 0) { ch.animate(p.acc, 0); p.acc = 0; }
      if (!seen) continue;
      // The hats: the ribbon whirls with the head, the feather flips on the beat.
      if (fx.ribbon) {
        const S = sangmoSpin(clock);
        fx.ribbon.userData.spin.rotation.y = -S.yaw;
        fx.ribbon.rotation.z = S.tilt;
      }
      if (fx.bupo) {
        fx.bupo.rotation.y = -(clock / (BEAT * 2)) * Math.PI * 2;
        fx.bupo.userData.stalk.rotation.x = 0.7 + 0.5 * Math.sin((clock / BEAT) * Math.PI * 2);
      }
      if (fx.flag) fx.flag.userData.cloth.rotation.y = 0.35 * Math.sin(clock * 1.7 + i);
    }
  }
}
