// The climb on the gym's real wall (game/climb-view.js): the problem you
// read, its poses and the two-bone IK that puts hands and feet on the holds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { climbProblem, climbStart, climbOptions, climbMove, climbTopped, climbPose, climbDrain, HOLD_TYPES, reachIK } from '../src/game/climb-view.js';
import { CLIMB_ROUTES } from '../src/core/activities.js';

const M = { shoulder: 0.62, arm: 0.3, leg: 0.32 };
// Every state you can get into on a problem.
function states(P) {
  const seen = new Map(), todo = [climbStart()];
  while (todo.length) {
    const st = todo.pop(), key = `${st.a},${st.b},${st.mover}`;
    if (seen.has(key)) continue;
    seen.set(key, st);
    if (!climbTopped(P, st)) for (const o of climbOptions(P, st)) todo.push(climbMove(st, o));
  }
  return [...seen.values()];
}

test('every problem: taped jugs to start, always a next hold in reach, and it tops out', () => {
  for (const r of CLIMB_ROUTES) {
    const P = climbProblem(r, 14);
    assert.deepEqual(climbProblem(r, 14).holds, P.holds, `${r.id}: the same every visit`);
    assert.deepEqual(P.holds.filter((h) => h.level === 0).map((h) => h.type), ['jug', 'jug'], `${r.id}: both hands start on jugs`);
    assert.ok(P.holds.every((h) => h.level < P.n), `${r.id}: the top is the only hold at the top`);
    const all = states(P);
    assert.ok(all.some((st) => climbTopped(P, st)), `${r.id}: can be topped`);
    for (const st of all) {
      if (climbTopped(P, st)) continue;
      const opts = climbOptions(P, st);
      assert.ok(opts.length >= 1 && opts.length <= 2, `${r.id} ${st.a},${st.b}: ${opts.length} holds to go for`);
      assert.ok(opts.every((o) => o.side === st.mover), `${r.id}: the reaching hand's own side`);
      assert.ok(opts.every((o) => o.window > 0 && (!o.long || o.window < HOLD_TYPES[o.type].window)), `${r.id}: a long reach is a tighter catch`);
    }
  }
});

test('every pose on every problem: hands out beside the head and within a chibi\'s reach, feet under the hips', () => {
  for (const r of CLIMB_ROUTES) {
    const P = climbProblem(r, 14);
    for (const st of states(P)) {
      const p = climbPose(P, st, M, st.mover === 'A' ? 'B' : 'A');
      assert.ok(p.hands[1].u - p.hands[0].u > 0.42, `${r.id} ${st.a},${st.b}: hands apart`);
      assert.ok(Math.abs(p.hands[0].v - p.hands[1].v) <= 0.4 + 1e-9, `${r.id} ${st.a},${st.b}: hands at most two steps apart`);
      for (const h of p.hands) {
        const du = Math.abs(h.u - p.body.u) - 0.12, dv = h.v - (p.body.v + M.shoulder);
        assert.ok(Math.hypot(du, dv) < M.arm + 0.04, `${r.id} ${st.a},${st.b}: hand in reach (${Math.hypot(du, dv).toFixed(2)})`);
      }
      assert.ok(p.feet.every((f) => f.v < p.body.v + M.leg), `${r.id}: feet under the hips`);
      if (climbTopped(P, st)) assert.equal(p.hands[0].v, p.hands[1].v, `${r.id}: both hands on the top hold`);
    }
  }
});

test('reading matters: harder grades have fewer jugs, crimps tire you, jugs rest you', () => {
  const share = (r, type) => { const P = climbProblem(r, 14); return P.holds.filter((h) => h.type === type).length / P.holds.length; };
  assert.ok(share(CLIMB_ROUTES[0], 'jug') > share(CLIMB_ROUTES[5], 'jug'));
  assert.ok(share(CLIMB_ROUTES[5], 'crimp') > share(CLIMB_ROUTES[0], 'crimp'));
  assert.ok(HOLD_TYPES.jug.drain < 1 && HOLD_TYPES.crimp.drain > 1 && HOLD_TYPES.jug.window > HOLD_TYPES.crimp.window);
  const P = climbProblem(CLIMB_ROUTES[0], 14);
  assert.ok(climbDrain(P, climbStart()) < 1, 'resting on the start jugs');
  // Somewhere on every grade from V1 there is a real choice: two holds lit.
  for (const r of CLIMB_ROUTES.slice(1)) assert.ok(states(climbProblem(r, 14)).some((st) => climbOptions(climbProblem(r, 14), st).length === 2), `${r.id}: a choice`);
  // A low wall still gets a whole problem.
  assert.equal(climbProblem(CLIMB_ROUTES[5], 6).n, 6);
});

test('two-bone IK puts the end of the chain on a target in reach', () => {
  const root = new THREE.Group(), up = new THREE.Bone(), low = new THREE.Bone(), end = new THREE.Bone();
  root.add(up); up.add(low); low.add(end);
  up.position.set(0, 1, 0); low.position.set(0, -0.15, 0); end.position.set(0, -0.15, 0);
  root.rotation.y = Math.PI; root.scale.setScalar(1.3); // (turned and scaled, like the model)
  root.updateMatrixWorld(true);
  for (const t of [[0.1, 1.2, -0.2], [-0.2, 1.1, 0.1], [0, 1.5, 0], [0.1, 1.5, -0.2]]) { // (the shoulder is at 1.3, the arm 0.39 long)
    const target = new THREE.Vector3(...t);
    reachIK(up, low, end, target, new THREE.Vector3(0.5, 0.5, 0.5));
    root.updateMatrixWorld(true);
    const at = end.getWorldPosition(new THREE.Vector3());
    assert.ok(at.distanceTo(target) < 1e-3, `reached ${t} (off by ${at.distanceTo(target)})`);
  }
  // Out of reach: the arm points straight at it, as far as it goes.
  const far = new THREE.Vector3(0, 3, 0);
  reachIK(up, low, end, far, new THREE.Vector3(0.5, 0.5, 0.5));
  root.updateMatrixWorld(true);
  const s = up.getWorldPosition(new THREE.Vector3()), e = end.getWorldPosition(new THREE.Vector3());
  assert.ok(e.y > s.y + 0.3 * 1.3 * 0.99 - 1e-3, 'stretched up towards it');
});
