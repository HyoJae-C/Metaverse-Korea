// The climb on the gym's real wall (game/climb-view.js): the poses of a
// route and the two-bone IK that puts hands and feet on the holds.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { climbPoses, reachIK } from '../src/game/climb-view.js';
import { CLIMB_ROUTES, routeHolds } from '../src/core/activities.js';

const M = { shoulder: 0.62, arm: 0.3, leg: 0.32 };

test('every route: hands go hold by hold, alternating, out to the sides, both on the top jug', () => {
  for (const r of CLIMB_ROUTES) {
    const holds = routeHolds(r), poses = climbPoses(holds, M);
    assert.equal(poses.length, holds.length);
    assert.equal(poses[0].mover, null);
    assert.equal(poses[0].hands[0].v, poses[0].hands[1].v, `${r.id}: two start holds side by side`);
    for (let i = 1; i < poses.length; i++) {
      const p = poses[i], hand = p.hands[p.mover === 'B' ? 1 : 0];
      assert.deepEqual(hand, p.hold, `${r.id} ${i}: the reaching hand is on the new hold`);
      assert.ok(p.body.v > poses[i - 1].body.v - 1e-9, `${r.id} ${i}: the body goes up`);
      // Out beside the big head (A left, B right), and within a chibi's
      // short reach of the shoulders.
      assert.ok(p.hands[1].u - p.hands[0].u > 0.45, `${r.id} ${i}: hands apart`);
      for (const h of p.hands) {
        const du = Math.abs(h.u - p.body.u) - 0.12, dv = h.v - (p.body.v + M.shoulder);
        assert.ok(Math.hypot(du, dv) < M.arm + 0.04, `${r.id} ${i}: hand in reach (${Math.hypot(du, dv).toFixed(2)})`);
      }
      assert.ok(p.feet.every((f) => f.v < p.body.v + M.leg), `${r.id} ${i}: feet under the hips`);
    }
    const top = poses.at(-1);
    assert.equal(top.hands[0].v, top.hands[1].v, `${r.id}: both hands on the top jug`);
    assert.ok(top.top && Math.abs((top.hands[0].u + top.hands[1].u) / 2 - top.top.u) < 1e-9);
  }
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
