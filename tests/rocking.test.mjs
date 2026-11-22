// Rocking chairs (game/rocking.js): the chair rolls on its rockers, and the
// person in it goes with it.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { rollOffset, createRocking } from '../src/game/rocking.js';
import { furnitureSeats } from '../src/core/furniture.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} vs ${b}`);

test('a rocking chair seat says it rocks; other chairs do not', () => {
  const [s] = furnitureSeats({ id: 'f-rocking', x: 1, z: 2, ry: 0.5 });
  assert.ok(s.rock && s.rock.r > 0 && s.rock.y > 0);
  assert.equal(furnitureSeats({ id: 'f-wood-bench', x: 0, z: 0, ry: 0 }).some((q) => q.rock), false);
});

test('rolling, not sliding: the rockers stay on the floor at every angle', () => {
  const r = 1.2, y = 1.22;
  for (const a of [-0.13, -0.05, 0, 0.07, 0.13]) {
    const [ty, tz] = rollOffset(a, r, y);
    // The rockers' centre, tipped about the floor point and moved: right
    // above the floor at its own height, moved along by the arc rolled.
    near(y * Math.cos(a) + ty, y);
    near(y * Math.sin(a) + tz, r * a);
  }
});

test('sitting in one: Rock tips the chair and the person together, standing up puts both back', () => {
  const mesh = new THREE.Group();
  new THREE.Scene().add(mesh);
  const piece = { id: 'f-rocking', x: 0, z: 0, ry: 0, mesh };
  const [seat] = furnitureSeats(piece);
  const root = new THREE.Group();
  root.position.set(seat.x, 0.45, seat.z);
  let rig = [0, 0, 0];
  const me = { root, setRock: (rx, y, z) => { rig = [rx, y, z]; } };
  let seated = seat, sent = 0;
  const rock = createRocking({ interior: { seats: [seat] }, get seated() { return seated; }, me, others: { players: new Map() }, t: (k) => k, resend: () => { sent++; } });
  assert.equal(rock.action().key, 'rock-on');
  rock.action().run();
  assert.equal(rock.action().key, 'rock-off');
  const st = {}; rock.state(st); assert.equal(st.rk, 1);
  let most = 0;
  for (let i = 0; i < 300; i++) { rock.tick(1 / 60); most = Math.max(most, Math.abs(mesh.rotation.x)); near(rig[0], mesh.rotation.x); }
  assert.ok(most > 0.08 && most < 0.2, `tips ${most}`);
  seated = null;
  rock.stop();
  assert.equal(mesh.rotation.x, 0); assert.equal(rig[0], 0); assert.equal(rig[1], 0);
  assert.ok(sent >= 2);
});
