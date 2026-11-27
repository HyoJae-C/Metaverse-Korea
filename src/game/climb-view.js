// Climbing on the gym's real wall (ui/activity-ui.js ClimbUI): while you
// play, your character is on the wall panel you stood in front of, and its
// hands and feet really go onto the holds (two-bone IK on the model's arm
// and leg bones, after the normal clip each frame; nothing changes in the
// character code).
//
// The climb is a boulder problem you read, as in a real gym: the holds of
// your colour are set up both sides of a line, a start hold for each hand
// (marked with tape) and one wide TOP hold. Hands take turns. Each move the
// reaching hand may go to a hold one step above the other hand, or stretch
// to one two steps above when the setter put one there, and holds differ:
// a jug is big (easy to catch, rests your grip), an edge is plain, a crimp
// is small (hard to catch, tires you). So the quick line and the safe line
// are different, and which you take decides what your other hand finds
// next. A ring closes on each hold you could go for: press Reach as it
// closes for the lit one, or tap a hold itself.
//
// The camera turns with your drag, as everywhere else in the game, so no
// hold stays hidden behind the chibi's big head; the holds you can go for
// also show through. Loaded with the climbing panel (game/arcade.js), so
// none of this is in the first download.
import * as THREE from 'three';
import { freeSpace, applyView, restoreView } from './arcade-cam.js';

// The chibi's head is far wider than its shoulders and its arms are short,
// so hands over the head would vanish behind it: the hands hold on out to
// the sides, a little below and above the shoulders, where they show.
const SWAY = 0.14; // the line wanders this far either way (m)
const WIDE = 0.27; // each hand this far to its side of the line (m)
const STEP = 0.2; // metres between the levels holds are set on
const FIRST = 0.95; // the start holds' height up the wall (m)
const OUT = 0.1; // holds stand this far out from the wall's middle (m)
const HIP = 0.3; // the body hangs this far out from the wall (m)
const MOVE = 0.55; // one reach: hand, body, then the feet (s)
const DROP_G = 18; // falling off (m/s², a little quicker than real so the panel's timer fits)
const LAND = 1.3; // you land this far out from the wall's foot (clear of its collision box)
const FOV = 50;
const CAM = { yaw: 0.7, pitch: 0.3, dist: 7.6, k: 0.5, look: 1.15, maxYaw: 1.15 }; // the view as a climb starts (the game's camera angles; k: its distance to ours)
const HEAD_UP = -0.35; // the head tips back to look up the wall (rad)
const PICK = 46; // a tap this close to a hold on the screen (px) goes for it
// When each limb moves during a reach (fractions of MOVE): the reaching
// hand first, then the body, then the foot on that side, then the other.
const WIN = { mover: [0, 0.42], other: [0.32, 0.62], body: [0.06, 0.55], footM: [0.36, 0.62], footO: [0.52, 0.8] };

// Hold types: size (how it is drawn), window (× the grade's timing window),
// gain (grip when you catch it) and drain (× the grade's drain while a
// hand is on it).
export const HOLD_TYPES = {
  jug: { size: 1.45, window: 1.5, gain: 0.05, drain: 0.55 },
  edge: { size: 1, window: 1, gain: 0, drain: 1 },
  crimp: { size: 0.6, window: 0.65, gain: -0.03, drain: 1.3 },
  top: { size: 1, window: 1.5, gain: 0, drain: 0.5 },
};
export const LONG_WINDOW = 0.75; // a stretch two steps up: a tighter catch

const holdGeo = new THREE.DodecahedronGeometry(0.085, 0).scale(1, 1, 0.6);
const footGeo = new THREE.DodecahedronGeometry(0.035, 0).scale(1, 0.7, 0.6);
const chipMat = new THREE.MeshLambertMaterial({ color: '#a79f90' }); // (foot chips: plain, so the route's own holds stand out)
const tapeGeo = new THREE.PlaneGeometry(0.035, 0.13);
const tapeMat = new THREE.MeshBasicMaterial({ color: '#fbfaf6' });
const ringGeo = new THREE.RingGeometry(0.86, 1, 40);
const dotGeo = new THREE.CircleGeometry(1, 20);

const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const span = (t, [a, b]) => ease((t - a) / (b - a));

// Two-bone IK, by aiming: the upper bone turns so the elbow (knee) lands
// where the triangle shoulder-elbow-target puts it, bent towards the pole;
// then the lower bone turns so the hand (foot) points at the target.
const _S = new THREE.Vector3(), _E = new THREE.Vector3(), _H = new THREE.Vector3(), _E2 = new THREE.Vector3(), _T = new THREE.Vector3();
const _dir = new THREE.Vector3(), _perp = new THREE.Vector3(), _f = new THREE.Vector3(), _t = new THREE.Vector3();
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _wq = new THREE.Quaternion();
function turnTo(bone, from, to) {
  _q.setFromUnitVectors(_f.copy(from).normalize(), _t.copy(to).normalize());
  bone.parent.getWorldQuaternion(_pq);
  bone.getWorldQuaternion(_wq).premultiply(_q);
  bone.quaternion.copy(_pq.invert().multiply(_wq));
  bone.updateMatrixWorld(true);
}
export function reachIK(upper, lower, end, target, pole) {
  upper.getWorldPosition(_S); lower.getWorldPosition(_E); end.getWorldPosition(_H);
  const a = _S.distanceTo(_E), b = _E.distanceTo(_H);
  if (a < 1e-5 || b < 1e-5) return;
  _dir.subVectors(target, _S);
  const d = THREE.MathUtils.clamp(_dir.length(), Math.abs(a - b) + 1e-4, (a + b) * 0.999);
  _dir.normalize();
  const cosA = THREE.MathUtils.clamp((a * a + d * d - b * b) / (2 * a * d), -1, 1), sinA = Math.sqrt(1 - cosA * cosA);
  _perp.subVectors(pole, _S);
  _perp.addScaledVector(_dir, -_perp.dot(_dir));
  if (_perp.lengthSq() < 1e-8) _perp.set(0, -1, 0).addScaledVector(_dir, -_dir.y);
  _perp.normalize();
  _E2.copy(_S).addScaledVector(_dir, a * cosA).addScaledVector(_perp, a * sinA);
  turnTo(upper, _E.sub(_S), _E2.sub(_S));
  lower.getWorldPosition(_E); end.getWorldPosition(_H);
  _T.copy(_S).addScaledVector(_dir, d); // (out of reach: as far as the arm goes)
  turnTo(lower, _H.sub(_E), _T.sub(_E));
}


// The problem a grade sets, the same every visit: { n (the top's level),
// holds: [{ side 'A' (left) | 'B' (right), level, type }], line(level) → the
// line's u }. Both hands start on jugs at level 0. Each side has a hold on
// at least one of any two levels in a row, so there is always a next hold in
// reach; harder grades have fewer jugs and more crimps. levels: how many
// fit the wall.
export function climbProblem(route, levels = 99) {
  let s = [...route.id].reduce((a, ch) => a * 31 + ch.charCodeAt(0), 11) >>> 0;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const g = Math.max(0, Number(route.id.slice(1)) || 0); // v0..v5
  const n = Math.max(4, Math.min(levels, route.holds + 2));
  const ph = rnd() * 6, amp = SWAY * (0.5 + g * 0.1);
  const line = (k) => Math.sin(ph + k * 0.4) * amp * Math.min(1, k / 2);
  const type = () => { const r = rnd(); return r < 0.5 - g * 0.06 ? 'jug' : r < 0.9 - g * 0.07 ? 'edge' : 'crimp'; };
  const holds = [{ side: 'A', level: 0, type: 'jug' }, { side: 'B', level: 0, type: 'jug' }];
  for (const side of ['A', 'B']) {
    let gap = false;
    for (let k = 1; k < n; k++) {
      const skip = !gap && rnd() < 0.3;
      gap = skip;
      if (!skip) holds.push({ side, level: k, type: type() });
    }
  }
  return { n, holds, line };
}
const holdOn = (P, side, level) => (level >= P.n ? { side, level: P.n, type: 'top' } : P.holds.find((h) => h.side === side && h.level === level));
// Where a hold is on the wall { u, v }.
export const holdAt = (P, h) => ({ u: P.line(h.level) + (h.side === 'A' ? -WIDE : WIDE), v: FIRST + h.level * STEP });

// state: { a, b (the levels the hands are on), mover ('A' | 'B', whose turn) }.
export const climbStart = () => ({ a: 0, b: 0, mover: 'B' });
// The holds the reaching hand can go for: one or two steps above the other
// hand, lowest first. [{ side, level, type, long, window (× the grade's),
// gain (grip for catching it) }]
export function climbOptions(P, st) {
  const other = st.mover === 'A' ? st.b : st.a, out = [];
  for (const d of [1, 2]) {
    const h = holdOn(P, st.mover, other + d);
    if (h && !out.some((o) => o.level === h.level)) out.push({ ...h, long: d === 2, window: HOLD_TYPES[h.type].window * (d === 2 ? LONG_WINDOW : 1), gain: HOLD_TYPES[h.type].gain });
  }
  return out;
}
export const climbMove = (st, opt) => ({ a: st.mover === 'A' ? opt.level : st.a, b: st.mover === 'B' ? opt.level : st.b, mover: st.mover === 'A' ? 'B' : 'A' });
// Topped: a hand on the top hold (the other then matches it).
export const climbTopped = (P, st) => st.a >= P.n || st.b >= P.n;
// How fast you tire on what the two hands hold (× the grade's drain).
export const climbDrain = (P, st) => [holdOn(P, 'A', st.a), holdOn(P, 'B', st.b)].reduce((s, h) => s + HOLD_TYPES[h?.type || 'edge'].drain, 0) / 2;

// The pose for a state, as wall points: hands A and B on their holds (both
// on the top hold once it is reached), the hips under them and the feet on
// the foot chips (footGrid), the foot under the hand that just moved a
// little higher. M: the model's sizes { shoulder (m above the feet), arm, leg }.
const footBase = (M) => FIRST - M.shoulder - 0.02 + M.leg * 0.32;
export function climbPose(P, st, M, moved = null) {
  const top = climbTopped(P, st);
  const [a, b] = top ? [{ side: 'A', level: P.n }, { side: 'B', level: P.n }].map((h) => holdAt(P, h)) : [holdAt(P, { side: 'A', level: st.a }), holdAt(P, { side: 'B', level: st.b })];
  const bu = (a.u + b.u) / 2, bv = Math.max(0.12, (a.v + b.v) / 2 - M.shoulder - 0.02);
  const fv = bv + M.leg * 0.32;
  return {
    hands: [a, b], body: { u: bu, v: bv },
    feet: [{ u: bu - 0.13, v: fv + (moved === 'A' ? STEP / 2 : 0) }, { u: bu + 0.13, v: fv + (moved === 'B' ? STEP / 2 : 0) }],
  };
}

export function createClimbView(game, stationOf) {
  let on = null;
  const P = new THREE.Vector3(), Q = new THREE.Vector3(), _pole = new THREE.Vector3(), _m = new THREE.Matrix4(), _e = new THREE.Euler(), _qq = new THREE.Quaternion(), _sc = new THREE.Vector3();

  // A point on the wall (u, v up its face, n out from its middle) in the room.
  const wallAt = (u, v, n, out = new THREE.Vector3()) => {
    const { st, cos, sin } = on;
    return out.set(st.x + u, v * cos - n * sin, st.wall + v * sin + n * cos);
  };

  // The model's bones, found by name once it has loaded (null until then).
  function bonesOf(root) {
    const g = (n) => root.getObjectByName(n);
    const b = { head: g('head'), armA: [g('upperarml'), g('lowerarml'), g('handl')], armB: [g('upperarmr'), g('lowerarmr'), g('handr')], legA: [g('upperlegl'), g('lowerlegl'), g('footl')], legB: [g('upperlegr'), g('lowerlegr'), g('footr')] };
    if (!b.head || [b.armA, b.armB, b.legA, b.legB].some((c) => c.some((x) => !x))) return null;
    // Which hand is on the left (-x) as you face the wall: that one is A.
    root.updateMatrixWorld(true);
    if (b.armA[2].getWorldPosition(P).x > b.armB[2].getWorldPosition(Q).x) [b.armA, b.armB, b.legA, b.legB] = [b.armB, b.armA, b.legB, b.legA];
    const len = (c) => c[0].getWorldPosition(P).distanceTo(c[1].getWorldPosition(Q)) + c[1].getWorldPosition(P).distanceTo(c[2].getWorldPosition(Q));
    const feet = root.getWorldPosition(new THREE.Vector3()).y;
    b.size = { shoulder: b.armA[0].getWorldPosition(P).y - feet, arm: len(b.armA), leg: len(b.legA) };
    return b;
  }

  // The current pose, interpolated: every limb and the body as wall points.
  const pt = (p) => ({ u: p.u, v: p.v });
  const snapshot = (pose) => ({ hands: pose.hands.map(pt), feet: pose.feet.map(pt), body: pt(pose.body) });
  function lerpPose(from, to, t, mover) {
    const lerp = (a, b, k) => ({ u: a.u + (b.u - a.u) * k, v: a.v + (b.v - a.v) * k, lift: Math.sin(Math.PI * k) * (Math.hypot(b.u - a.u, b.v - a.v) > 0.02 ? 1 : 0) });
    const hWin = (i) => (mover === (i ? 'B' : 'A') ? WIN.mover : WIN.other);
    const fWin = (i) => (mover === (i ? 'B' : 'A') ? WIN.footM : WIN.footO);
    return {
      hands: [0, 1].map((i) => lerp(from.hands[i], to.hands[i], span(t, hWin(i)))),
      feet: [0, 1].map((i) => lerp(from.feet[i], to.feet[i], span(t, fWin(i)))),
      body: lerp(from.body, to.body, span(t, WIN.body)),
    };
  }

  // Many of one shape in one draw call: place(i) → [u, v, n, scale, turn].
  function instanced(geo, mat, count, place) {
    const im = new THREE.InstancedMesh(geo, mat, count);
    for (let i = 0; i < count; i++) {
      const [u, v, n, sc, turn] = place(i);
      _m.compose(wallAt(u, v, n, P), _qq.setFromEuler(_e.set(-(on.st.lean || 0), 0, turn)), _sc.setScalar(sc));
      im.setMatrixAt(i, _m);
    }
    im.frustumCulled = false; // (its own bounds are the one shape at the origin)
    return im;
  }

  function start(panel, route) {
    stop();
    const st = stationOf(), scene = game.interior?.scene, me = game.me, cam = game.cam;
    if (!st || st.wall == null || !scene || !me) return false;
    on = { st, scene, panel, route, space: {}, fov: game.camera.fov, interior: game.interior, cos: Math.cos(st.lean || 0), sin: Math.sin(st.lean || 0), meshes: [], anim: null, phase: 0, sel: 0, camY: null, cam0: cam && { ...cam } };
    me.root.rotation.y = st.ry;
    on.bones = bonesOf(me.root);
    const M = (on.M = on.bones?.size || { shoulder: 0.62, arm: 0.3, leg: 0.32 });
    const prob = (on.prob = climbProblem(route, Math.floor(((st.top ?? 4) - 0.3 - FIRST) / STEP)));
    on.state = climbStart();
    // The holds, by type, in the grade's colour; the wide top hold; tape by
    // the start holds and the top; small plain foot chips up both sides of the line.
    const mat = (on.mat = new THREE.MeshLambertMaterial({ color: route.color }));
    for (const type of ['jug', 'edge', 'crimp']) {
      const list = prob.holds.filter((h) => h.type === type);
      if (list.length) on.meshes.push(instanced(holdGeo, mat, list.length, (i) => { const at = holdAt(prob, list[i]); return [at.u, at.v, OUT, HOLD_TYPES[type].size, i * 1.3]; }));
    }
    const topV = FIRST + prob.n * STEP, topU = prob.line(prob.n);
    const top = new THREE.Mesh(holdGeo, mat);
    wallAt(topU, topV, OUT, top.position);
    top.rotation.x = -(st.lean || 0);
    top.scale.set(((WIDE + 0.12) * 2) / 0.17, 0.9, 1.2);
    on.meshes.push(top);
    for (const [u, v, turn] of [[prob.line(0) - WIDE - 0.14, FIRST + 0.1, 0.5], [prob.line(0) + WIDE + 0.14, FIRST + 0.1, -0.5], [topU - 0.1, topV + 0.17, 0.4], [topU + 0.1, topV + 0.17, -0.4]]) {
      const t = new THREE.Mesh(tapeGeo, tapeMat);
      wallAt(u, v, 0.065, t.position);
      t.rotation.set(-(st.lean || 0), 0, turn);
      on.meshes.push(t);
    }
    const rows = prob.n * 2 + 2, base = footBase(M);
    on.meshes.push(instanced(footGeo, chipMat, rows * 2, (i) => { const j = i >> 1, v = base + j * (STEP / 2) - 0.05; return [prob.line((v - FIRST + M.shoulder) / STEP) + (i & 1 ? 0.13 : -0.13), v, OUT - 0.03, 1, i * 2.1]; }));
    // For each hold you could go for: a dot that shows through you, and the closing ring.
    on.marks = [0, 1].map(() => {
      const dot = new THREE.Mesh(dotGeo, new THREE.MeshBasicMaterial({ color: route.color, depthTest: false, transparent: true }));
      const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, side: THREE.DoubleSide }));
      dot.renderOrder = 9; ring.renderOrder = 10;
      dot.rotation.x = ring.rotation.x = -(st.lean || 0);
      on.meshes.push(dot, ring);
      return { dot, ring };
    });
    scene.add(...on.meshes);
    on.cur = snapshot(climbPose(prob, on.state, M));
    on.opts = climbOptions(prob, on.state);
    // The view: off to one side and a little above (towards the room's
    // middle; left of the middle panel, where no regular stands), yours to turn.
    if (cam) { cam.yaw = (st.x > -0.5 ? -1 : 1) * CAM.yaw; cam.pitch = CAM.pitch; cam.dist = CAM.dist; }
    return true;
  }

  function stop() {
    if (!on) return;
    for (const m of on.meshes) { m.removeFromParent(); m.dispose?.(); }
    for (const k of on.marks) { k.dot.material.dispose(); k.ring.material.dispose(); }
    on.mat.dispose();
    restoreView(game.camera, on.fov);
    if (on.cam0 && game.cam) Object.assign(game.cam, on.cam0);
    const me = game.me;
    if (me) {
      // Down on the mat in front of the wall (where you landed, or straight below).
      const x = on.drop ? on.drop.x : on.st.x + on.cur.body.u;
      me.root.position.set(x, 0, on.st.wall + LAND);
      me.root.rotation.y = on.st.ry;
      me.setTrick?.(null, 0);
    }
    on = null;
  }

  // Off the wall: a fall (the grip gave out) or the jump down from the top.
  function dropOff(then) {
    const r = game.me.root.position;
    on.drop = { t: 0, y0: r.y, z0: r.z, x: r.x, then, landed: false };
    on.anim = null;
  }

  // Each frame, after the normal camera (and after the character's clip).
  function update(dt = 1 / 60) {
    if (!on) return;
    if (game.interior !== on.interior) { stop(); return; }
    const me = game.me, root = me.root, { st } = on;
    let pose = on.cur;
    if (on.drop) {
      // Falling (or jumping) down to the mat, away from the wall, limbs free.
      const D = on.drop;
      D.t += dt;
      const y = Math.max(0, D.y0 - 0.5 * DROP_G * D.t * D.t), k = Math.min(1, D.t / 0.5);
      root.position.set(D.x, y, D.z0 + (st.wall + LAND - D.z0) * k);
      if (y === 0 && !D.landed) { D.landed = true; D.then?.(); }
      me.setTrick?.(null, y);
    } else {
      if (on.anim) {
        const A = on.anim;
        A.t += dt / MOVE;
        if (A.slip) {
          // The hand reaches most of the way, misses and comes back; the body sags.
          const s = Math.sin(Math.PI * Math.min(1, A.t * 1.1)), i = A.side === 'B' ? 1 : 0;
          pose = snapshot(on.cur);
          const h = on.cur.hands[i];
          pose.hands[i] = { u: h.u + (A.to.u - h.u) * 0.6 * s, v: h.v + (A.to.v - h.v) * 0.6 * s, lift: s };
          pose.body.v -= 0.05 * s;
        } else pose = lerpPose(A.from, A.to, Math.min(1, A.t), A.mover);
        if (A.t >= 1) { if (!A.slip) on.cur = snapshot(A.to); on.anim = null; pose = on.cur; if (A.done) A.done(); }
      }
      // The body hangs off the wall at its point; the limbs go to theirs.
      wallAt(pose.body.u, pose.body.v, HIP, root.position);
      root.rotation.y = st.ry;
      me.setTrick?.(null, root.position.y); // (the shadow stays on the mat)
      const B = on.bones || (on.bones = bonesOf(root)); // (the model may still have been loading at the start)
      if (B) {
        root.updateMatrixWorld(true);
        const side = (c) => (c === B.armA || c === B.legA ? -1 : 1);
        pose.hands.forEach((h, i) => {
          const c = i ? B.armB : B.armA;
          wallAt(h.u, h.v, OUT + 0.05 + (h.lift || 0) * 0.12, P);
          c[0].getWorldPosition(Q);
          reachIK(c[0], c[1], c[2], P, Q.add(_pole.set(side(c) * 0.35, -0.3, 0.3)));
        });
        pose.feet.forEach((f, i) => {
          const c = i ? B.legB : B.legA;
          wallAt(f.u, f.v, OUT + 0.06 + (f.lift || 0) * 0.08, P);
          c[0].getWorldPosition(Q);
          reachIK(c[0], c[1], c[2], P, Q.add(_pole.set(side(c) * 0.5, 0.1, 0.15)));
        });
        B.head.rotation.x += HEAD_UP; // (looking up the wall)
      }
    }
    // The holds you can go for: lit through you, a ring closing on each
    // (the one Reach goes for bright, the other faint).
    const live = !on.drop && !on.over;
    on.marks.forEach((k, i) => {
      const o = live ? on.opts[i] : null;
      k.dot.visible = k.ring.visible = !!o;
      if (!o) return;
      const at = holdAt(on.prob, o);
      wallAt(at.u, at.v, OUT + 0.07, k.dot.position);
      k.dot.scale.setScalar(0.07 * (o.type === 'top' ? 1.3 : HOLD_TYPES[o.type].size));
      k.dot.material.opacity = i === on.sel ? 1 : 0.75;
      wallAt(at.u, at.v, OUT + 0.08, k.ring.position);
      k.ring.scale.setScalar(0.11 + (1 - on.phase) * 0.42);
      k.ring.material.opacity = i === on.sel ? 0.95 : 0.35;
    });
    // The camera: round you where your drag puts it (the game's own yaw,
    // pitch and zoom), kept on the room's side of the wall, following you up.
    const { camera } = game, r = root.position, cam = game.cam || CAM;
    if (game.cam) cam.yaw = THREE.MathUtils.clamp(Math.atan2(Math.sin(cam.yaw), Math.cos(cam.yaw)), -CAM.maxYaw, CAM.maxYaw);
    on.camY = on.camY == null ? r.y : on.camY + (r.y - on.camY) * Math.min(1, dt * 5);
    const d = cam.dist * CAM.k, cp = Math.cos(cam.pitch);
    P.set(r.x, on.camY + CAM.look, r.z - 0.2);
    camera.position.set(P.x + Math.sin(cam.yaw) * cp * d, P.y + Math.sin(cam.pitch) * d, P.z + Math.cos(cam.yaw) * cp * d);
    camera.lookAt(P);
    applyView(camera, FOV, freeSpace(on.space, on.panel));
  }

  // The option nearest a point on the screen (px), or -1.
  function pick(x, y) {
    if (!on || on.drop || on.over) return -1;
    let best = -1, bd = PICK;
    game.camera.updateMatrixWorld();
    const rect = game.canvas.getBoundingClientRect();
    on.opts.forEach((o, i) => {
      P.copy(on.marks[i].dot.position).project(game.camera);
      const d = Math.hypot((P.x * 0.5 + 0.5) * rect.width + rect.left - x, (-P.y * 0.5 + 0.5) * rect.height + rect.top - y);
      if (P.z < 1 && d < bd) { bd = d; best = i; }
    });
    return best;
  }

  return {
    get active() { return !!on; },
    get surface() { return game.canvas; }, // tap a hold in the world to go for it
    start, stop, update, pick,
    // The problem's state for the panel: the holds you could go for now
    // (climbOptions), how fast your hands tire where they are, how far up (0..1).
    get options() { return on ? on.opts : []; },
    get drain() { return on ? climbDrain(on.prob, on.state) : 1; },
    get progress() { return on ? Math.min(1, Math.max(on.state.a, on.state.b) / on.prob.n) : 0; },
    get selected() { return on ? on.sel : 0; },
    select(i) { if (on && on.opts[i]) on.sel = i; },
    // phase: 0..1 through the rings' shrink.
    show(phase) { if (on) on.phase = phase; },
    // A reach for option i: 'perfect' / 'good' catches it, 'slip' misses.
    // True once the top is caught.
    reach(res, i) {
      const o = on?.opts[i];
      if (!on || on.drop || !o) return false;
      if (on.anim && !on.anim.slip) on.cur = snapshot(on.anim.to); // (a quick tap: finish the last move at once)
      const mover = on.state.mover;
      if (res === 'slip') { on.anim = { slip: true, t: 0, side: mover, to: holdAt(on.prob, o) }; return false; }
      on.state = climbMove(on.state, o);
      on.anim = { t: 0, from: snapshot(on.cur), to: climbPose(on.prob, on.state, on.M, mover), mover };
      on.opts = climbOptions(on.prob, on.state);
      on.sel = 0;
      return climbTopped(on.prob, on.state);
    },
    fall() { if (on && !on.drop) { on.over = true; dropOff(null); } },
    // At the top: both hands on the top hold for a moment, then jump down;
    // landed() once you are on the mat (the cheer).
    top(landed) {
      if (!on) return;
      on.over = true;
      const go = () => setTimeout(() => { if (on && !on.drop) dropOff(landed); }, 350);
      if (on.anim) on.anim.done = go; else go();
    },
  };
}
