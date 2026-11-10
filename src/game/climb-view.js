// Climbing on the gym's real wall (ui/activity-ui.js ClimbUI): while you
// play, your character is on the wall panel you stood in front of, and its
// hands and feet really go onto the route's holds. Each reach moves one hand
// up to the next hold, the body follows and the feet step up after it; a
// slip is a hand that misses and comes back; when the grip runs out you drop
// onto the mat, and at the top both hands match on the last hold before you
// jump down. The limbs are put on the holds with two-bone IK on the model's
// arm and leg bones, after the normal clip each frame (nothing changes in
// the character code). The ring that closes on the next hold is in the
// world too. Loaded with the climbing panel (game/arcade.js), so none of
// this is in the first download.
import * as THREE from 'three';
import { freeSpace, applyView, restoreView } from './arcade-cam.js';

// The chibi's head is far wider than its shoulders and its arms are short,
// so hands over the head would vanish behind it: the hands hold on out to
// the sides, a little below and above the shoulders, where they show.
const DRIFT = 0.25; // the route's x 0..1 sways the line this many metres
const WIDE = 0.27; // each hand this far to its side of the line (m)
const STEP = 0.2; // metres between holds up the route (one hand over the other)
const FIRST = 0.95; // the start holds' height up the wall (m)
const OUT = 0.1; // holds stand this far out from the wall's middle (m)
const HIP = 0.3; // the body hangs this far out from the wall (m)
const MOVE = 0.55; // one reach: hand, body, then the feet (s)
const DROP_G = 18; // falling off (m/s², a little quicker than real so the panel's timer fits)
const LAND = 1.3; // you land this far out from the wall's foot (clear of its collision box)
const FOV = 50, SHOWN = 2.4; // at least this many metres across the wall on a narrow screen
const CAM = { side: 1.7, up: 0.95, back: 2.8, look: 0.7 }; // the camera from your hips (m)
const HEAD_UP = -0.35; // the head tips back to look up the wall (rad)
// When each limb moves during a reach (fractions of MOVE): the reaching
// hand first, then the body, then the foot on that side, then the other.
const WIN = { mover: [0, 0.42], other: [0.32, 0.62], body: [0.06, 0.55], footM: [0.36, 0.62], footO: [0.52, 0.8] };

const holdGeo = new THREE.DodecahedronGeometry(0.085, 0).scale(1, 1, 0.6);
const footGeo = new THREE.DodecahedronGeometry(0.05, 0).scale(1, 0.7, 0.6);
const ringGeo = new THREE.RingGeometry(0.86, 1, 40);
const ringMat = new THREE.MeshBasicMaterial({ color: '#2b2b2e', transparent: true, opacity: 0.85, depthTest: false, side: THREE.DoubleSide });

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

// The route on the wall, in wall units { u across (m from the panel's
// middle), v up the wall's face (m) }: the poses of a climb, one per hold
// reached. Hands A (the one on the left, -x) and B (right) start on two
// holds side by side; each reach moves B to the odd holds (on the right of
// the line) and A to the even ones, and the top is a wide jug both hands
// end on. hold: where the reaching hand goes (pose 0: A's start hold, and
// start: B's); body: where the hips go; feet: the two footholds.
// M: the model's sizes { shoulder (m above the feet), arm, leg }.
export function climbPoses(holds, M) {
  const n = holds.length, line = (i) => (holds[i][0] - 0.5) * DRIFT;
  const at = holds.map((_, i) => ({ u: line(i) + (i % 2 ? WIDE : -WIDE), v: FIRST + i * STEP }));
  const top = { u: line(n - 1), v: FIRST + (n - 1) * STEP };
  at[n - 1] = { u: top.u + ((n - 1) % 2 ? WIDE : -WIDE), v: top.v };
  const startB = { u: line(0) + WIDE, v: FIRST };
  const out = [];
  let a = at[0], b = startB;
  for (let i = 0; i < n; i++) {
    let mover = null;
    if (i > 0) { mover = i % 2 ? 'B' : 'A'; if (mover === 'A') a = at[i]; else b = at[i]; }
    if (i === n - 1 && i > 0) { a = { u: top.u - WIDE, v: top.v }; b = { u: top.u + WIDE, v: top.v }; }
    const bu = (a.u + b.u) / 2, bv = Math.max(0.12, (a.v + b.v) / 2 - M.shoulder - 0.02);
    const fv = bv + M.leg * 0.32;
    const up = (side) => (mover === side ? 0.1 : 0);
    out.push({
      hold: at[i], start: i === 0 ? startB : null, top: i === n - 1 ? top : null, mover, hands: [a, b], body: { u: bu, v: bv },
      feet: [{ u: bu - 0.13, v: fv + up('A') }, { u: bu + 0.13, v: fv + up('B') }],
    });
  }
  return out;
}

export function createClimbView(game, stationOf) {
  let on = null;
  const P = new THREE.Vector3(), Q = new THREE.Vector3();

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

  function start(panel, route, holds) {
    stop();
    const st = stationOf(), scene = game.interior?.scene, me = game.me;
    if (!st || st.wall == null || !scene || !me) return false;
    on = { st, scene, panel, route, space: {}, fov: game.camera.fov, interior: game.interior, cos: Math.cos(st.lean || 0), sin: Math.sin(st.lean || 0), from: me.root.position.clone(), ry: me.root.rotation.y, meshes: [], anim: null, at: 0, ring: null, phase: 0, camY: null };
    me.root.rotation.y = st.ry;
    on.bones = bonesOf(me.root);
    on.poses = climbPoses(holds, on.bones?.size || { shoulder: 0.62, arm: 0.3, leg: 0.32 });
    // The route's holds, and a little foothold under each foot spot.
    const mat = new THREE.MeshLambertMaterial({ color: route.color });
    on.mat = mat;
    on.poses.forEach((p, i) => {
      for (const at of [p.top || p.hold, p.start].filter(Boolean)) {
        const h = new THREE.Mesh(holdGeo, mat);
        wallAt(at.u, at.v, OUT, h.position);
        h.rotation.set(-(st.lean || 0), 0, p.top ? 0 : i * 1.3);
        if (p.top) h.scale.set(((WIDE + 0.12) * 2) / 0.17, 0.8, 1); // (the top: a wide jug for both hands)
        on.meshes.push(h);
      }
    });
    const spots = [];
    for (const p of on.poses) for (const f of p.feet) if (!spots.some((s) => Math.hypot(s.u - f.u, s.v - f.v) < 0.1)) spots.push(f);
    for (const f of spots) {
      const m = new THREE.Mesh(footGeo, mat);
      wallAt(f.u, f.v - 0.06, OUT - 0.02, m.position);
      m.rotation.set(-(st.lean || 0), 0, f.u * 5);
      on.meshes.push(m);
    }
    on.ring = new THREE.Mesh(ringGeo, ringMat);
    on.ring.renderOrder = 10;
    on.ring.rotation.x = -(st.lean || 0);
    on.meshes.push(on.ring);
    scene.add(...on.meshes);
    on.cur = snapshot(on.poses[0]);
    return true;
  }

  function stop() {
    if (!on) return;
    for (const m of on.meshes) m.removeFromParent();
    on.mat.dispose();
    restoreView(game.camera, on.fov);
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
    // The ring closing on the next hold.
    const next = on.poses[on.at + 1];
    on.ring.visible = !!next && !on.drop && !on.over;
    if (on.ring.visible) {
      const h = next.hold;
      wallAt(h.u, h.v, OUT + 0.08, on.ring.position);
      on.ring.scale.setScalar(0.11 + (1 - on.phase) * 0.42);
    }
    // The camera: out on the mat and off to one side (from straight behind,
    // the big chibi head hides the hands), following you up: towards the
    // room's middle, and left of the middle panel (the regular chalking up
    // on the mat stands on its right).
    const { camera } = game, r = root.position, side = st.x > -0.5 ? -1 : 1;
    on.camY = on.camY == null ? r.y : on.camY + (r.y - on.camY) * Math.min(1, dt * 5);
    camera.position.set(r.x + side * CAM.side, on.camY + CAM.up, r.z + CAM.back);
    camera.lookAt(r.x + side * 0.15, on.camY + CAM.look, r.z - 0.25);
    const sp = freeSpace(on.space, on.panel);
    const need = 2 * THREE.MathUtils.radToDeg(Math.atan((SHOWN / 2) / CAM.back / (sp.w / sp.h)));
    applyView(camera, Math.min(75, Math.max(FOV, need)), sp);
  }
  const _pole = new THREE.Vector3();

  return {
    get active() { return !!on; },
    get surface() { return game.canvas; }, // tap the world to reach
    start, stop, update,
    // phase: 0..1 through the ring's shrink.
    show(phase) { if (on) on.phase = phase; },
    // A reach: 'perfect' / 'good' moves up to hold `at`; 'slip' misses it.
    reach(res, at) {
      if (!on || on.drop) return;
      if (on.anim && !on.anim.slip) on.cur = snapshot(on.anim.to); // (a quick tap: finish the last move at once)
      if (res === 'slip') {
        const next = on.poses[on.at + 1];
        if (next) on.anim = { slip: true, t: 0, side: next.mover, to: next.hold };
        return;
      }
      const to = on.poses[Math.min(at, on.poses.length - 1)];
      on.anim = { t: 0, from: snapshot(on.cur), to, mover: to.mover };
      on.at = Math.min(at, on.poses.length - 1);
    },
    fall() { if (on && !on.drop) { on.over = true; dropOff(null); } },
    // At the top: both hands on the last hold for a moment, then jump down;
    // landed() once you are on the mat (the cheer).
    top(landed) {
      if (!on) return;
      on.over = true;
      const go = () => setTimeout(() => { if (on && !on.drop) dropOff(landed); }, 350);
      if (on.anim) on.anim.done = go; else go();
    },
  };
}
