// A ride's camera never shows a rider's face cut open: the camera in your
// seat stays out of the other riders' heads (or that guest steps out of
// sight: park-riders.js), and the near plane is close enough that a face at
// the edge of the view isn't sliced away. Every ride, every seat, through a
// whole cycle.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { RIDES, RIDE_CYCLE, seatAt } from '../src/core/park-rides.js';
import { createRideCam, RIDE_NEAR, STREET_NEAR } from '../src/game/ride-cam.js';
import { headGap } from '../src/game/park-riders.js';

const HEAD_R = 0.42; // (a seated rider's head and hair)
const root = (s) => { const o = new THREE.Object3D(); o.rotation.order = 'ZYX'; o.position.set(s.x, s.y, s.z); o.rotation.set(s.pitch || 0, s.ry, s.roll || 0); return o; };

// Does the near plane's rectangle (the part of it on screen) cross a head
// at c (camera space)? Then the screen shows the inside of that head.
function cutByNear(cam, c) {
  const dz = -c.z - cam.near;
  if (Math.abs(dz) >= HEAD_R) return false;
  const r = Math.sqrt(HEAD_R * HEAD_R - dz * dz), hh = cam.near * Math.tan((cam.fov * Math.PI) / 360), hw = hh * cam.aspect;
  const qx = Math.max(0, Math.abs(c.x) - hw), qy = Math.max(0, Math.abs(c.y) - hh);
  return qx * qx + qy * qy < r * r;
}

for (const view of ['first', 'third']) test(`ride camera (${view}): no rider's head cut by the camera`, () => {
  const cam = new THREE.PerspectiveCamera(62, 900 / 640, STREET_NEAR, 2000), rc = createRideCam({ camera: cam });
  const c = new THREE.Vector3(), up = new THREE.Vector3();
  for (const kind of Object.keys(RIDES)) {
    const n = RIDES[kind].seats, C = RIDE_CYCLE[kind], T = C ? C.load + C.run + C.stop : 90;
    for (let me = 0; me < n; me++) {
      rc.reset();
      for (let t = 1000; t < 1000 + T; t += 0.2) {
        rc.update(0.2, seatAt(kind, me, t), view === 'first', false, kind === 'drop' ? 3.4 : kind === 'wheel' ? 3.8 : 0, 0, false);
        assert.equal(cam.near, RIDE_NEAR);
        cam.updateMatrixWorld();
        for (let o = 0; o < n; o++) {
          if (o === me && view === 'first') continue; // (your own body is hidden)
          const r = root(seatAt(kind, o, t));
          if (headGap(r, cam.position) < 0.5) {
            // Only from your seat, where the guest steps out of sight.
            assert.equal(view, 'first', `${kind} seat ${me}: camera in seat ${o}'s head (t ${t.toFixed(1)})`);
            continue;
          }
          const h = up.set(0, 1.15, 0).applyEuler(r.rotation).add(r.position);
          c.copy(h).applyMatrix4(cam.matrixWorldInverse);
          const sliced = cutByNear(cam, c);
          assert.ok(!sliced, `${kind} seat ${me} (${view}): seat ${o}'s face cut by the near plane (t ${t.toFixed(1)})`);
        }
      }
    }
  }
});

test('stepping off: the street\'s near plane again', () => {
  const cam = new THREE.PerspectiveCamera(62, 1, STREET_NEAR, 2000), rc = createRideCam({ camera: cam });
  rc.update(0.1, seatAt('flume', 0, 1000), true, false);
  assert.equal(cam.near, RIDE_NEAR);
  rc.off();
  assert.equal(cam.near, STREET_NEAR);
});

test('down the flume\'s drop the camera tips with the log', () => {
  let t = 1000; while (seatAt('flume', 0, t).pitch < 0.6) t += 0.05;
  const s = seatAt('flume', 0, t), cam = new THREE.PerspectiveCamera(), rc = createRideCam({ camera: cam });
  rc.update(1, s, true, false);
  const dir = cam.getWorldDirection(new THREE.Vector3());
  assert.ok(dir.y < -0.3, `looking down the drop (${dir.y.toFixed(2)})`);
});
