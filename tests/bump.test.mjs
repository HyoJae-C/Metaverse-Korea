import test from 'node:test';
import assert from 'node:assert/strict';
import { Knock, collide, Contacts, touching, wobble, BUMP_DEFAULTS } from '../src/core/bump.js';
import { DuckRide, DUCK_BUMP } from '../src/core/duck-boat.js';

test('no touch, no push', () => {
  const k = new Knock();
  const r = collide({ x: 0, z: 0 }, [{ x: 5, z: 0 }], k);
  assert.equal(r.hit, null);
  assert.equal(r.dx, 0);
  assert.equal(k.active, false);
});

test('overlap pushes me away, half each against a moving one, all of it against a fixed one', () => {
  const k = new Knock();
  const r = collide({ x: 0, z: 0 }, [{ x: 1.2, z: 0 }], k, { radius: 1 });
  assert.ok(Math.abs(r.dx + 0.4) < 1e-9, 'half of 0.8 overlap, to -x');
  assert.ok(k.vx < 0 && Math.abs(k.vz) < 1e-9);
  const k2 = new Knock();
  const r2 = collide({ x: 0, z: 0 }, [{ x: 1.2, z: 0, fixed: true }], k2, { radius: 1 });
  assert.ok(Math.abs(r2.dx + 0.8) < 1e-9);
});

test('ramming harder kicks harder, capped', () => {
  const o = { radius: 1, minKick: 1, maxKick: 5, bounce: 1 };
  const slow = new Knock(o), fast = new Knock(o), crazy = new Knock(o);
  collide({ x: 0, z: 0, vx: 1 }, [{ x: 1.9, z: 0 }], slow, o);
  collide({ x: 0, z: 0, vx: 4 }, [{ x: 1.9, z: 0 }], fast, o);
  collide({ x: 0, z: 0, vx: 99 }, [{ x: 1.9, z: 0 }], crazy, o);
  assert.ok(-fast.vx > -slow.vx);
  assert.equal(-crazy.vx, 5);
  // The one being rammed (standing still) gets the same shove the other way.
  const hitee = new Knock(o);
  collide({ x: 1.9, z: 0 }, [{ x: 0, z: 0, vx: 4 }], hitee, o);
  assert.ok(Math.abs(hitee.vx + fast.vx) < 1e-9);
});

test('push is not stacked frame after frame while still touching', () => {
  const k = new Knock();
  for (let i = 0; i < 10; i++) collide({ x: 0, z: 0 }, [{ x: 1, z: 0 }], k);
  assert.equal(-k.vx, BUMP_DEFAULTS.minKick);
});

test('the slide dies away', () => {
  const k = new Knock({ damping: 3 });
  k.push(1, 0, 4);
  let x = 0;
  for (let i = 0; i < 300; i++) x += k.step(1 / 60)[0];
  assert.ok(x > 1 && x < 1.5, `slid ${x}`);
  assert.equal(k.active, false);
});

test('glancing blow spins, head-on does not', () => {
  const head = new Knock();
  collide({ x: 0, z: 0, ry: 0 }, [{ x: 0, z: -1.5 }], head);
  assert.equal(head.spin, 0);
  const side = new Knock();
  collide({ x: 0, z: 0, ry: 0, vx: 3 }, [{ x: 1.5, z: 0 }], side);
  assert.notEqual(side.spin, 0);
});

test('contacts fire once per meeting', () => {
  const c = new Contacts();
  assert.deepEqual(c.update([[0, 1]]), [[0, 1]]);
  assert.deepEqual(c.update([[1, 0]]), []);
  assert.deepEqual(c.update([]), []);
  assert.deepEqual(c.update([[0, 1]]), [[0, 1]]);
});

test('touching finds the close pairs', () => {
  assert.deepEqual(touching([{ x: 0, z: 0 }, { x: 2, z: 0 }, { x: 9, z: 0 }], { radius: 1 }), [[0, 1]]);
});

test('wobble starts at zero and settles', () => {
  assert.equal(wobble(-1), 0);
  assert.equal(wobble(0), 0);
  assert.ok(Math.abs(wobble(2)) < 0.001);
});

test('duck boats at the dock do not touch each other', () => {
  const homes = [0, 1, 2, 3].map((i) => ({ x: 7.6 + i * 2.6, z: -5.7 }));
  assert.deepEqual(touching(homes, DUCK_BUMP), []);
});

test('two duck boats driven into each other bounce apart and stay on the water', () => {
  const a = new DuckRide({ x: 0, z: -20 }), b = new DuckRide({ x: 3, z: -20 });
  a.ry = -Math.PI / 2; b.ry = Math.PI / 2; // facing each other
  let bumped = false;
  for (let i = 0; i < 120; i++) {
    const dt = 1 / 60;
    a.steer(1, 0, dt); b.steer(-1, 0, dt);
    const ha = a.bump([{ x: b.x, z: b.z, vx: b.vx, vz: b.vz }]);
    const hb = b.bump([{ x: a.x, z: a.z, vx: a.vx, vz: a.vz }]);
    if (ha || hb) bumped = true;
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1.5, 'never sink into each other');
  }
  assert.ok(bumped);
  // Let go of the sticks: they slide apart.
  for (let i = 0; i < 30; i++) { a.steer(0, 0, 1 / 60); b.steer(0, 0, 1 / 60); }
  assert.ok(b.x - a.x > 2);
});

test('a parked boat does not move, the driver bounces off', () => {
  const a = new DuckRide({ x: 0, z: -20 });
  a.ry = -Math.PI / 2;
  let hit = null;
  for (let i = 0; i < 90 && !hit; i++) { a.steer(1, 0, 1 / 60); hit = a.bump([{ x: 2.5, z: -20, fixed: true }]); }
  assert.ok(hit);
  assert.ok(a.x <= 0.5 + 1e-9);
  assert.ok(a.knock.vx < 0);
});
