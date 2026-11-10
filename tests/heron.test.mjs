import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { heronAt, heronWater, heronPlan, flyTime, HERON } from '../src/core/heron.js';
import { CollisionMap } from '../src/core/collision.js';
import { frameOf } from '../src/core/stream.js';

const g = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const s = g.streams[0];
const ww = s.water / 2, D = s.depth;
const t0 = 1_800_000_000; // any wall-clock time

test('Cheonggyecheon has a heron', () => assert.ok(s.heron));

test('it only ever stands in the water: clear of the stones, the bridges and the reeds', () => {
  for (let t = t0; t < t0 + HERON.cycle * 60; t += 0.7) {
    const h = heronAt(s, t);
    if (h.state === 'fly') continue;
    assert.equal(h.y, -D - 0.3);
    assert.ok(Math.abs(h.v) <= ww - 1.5, `v ${h.v}`);
    assert.ok(h.u > 10 && h.u < s.len - 8, `u ${h.u}`);
    for (const st of s.stones) assert.ok(Math.abs(h.u - st.u) > 4, `on the stones at ${h.u}`);
    for (const b of s.bridges) assert.ok(Math.abs(h.u - b.u) > b.w / 2 + 10, `under ${b.name.en} at ${h.u}`);
  }
});

test('the same heron for everyone: it only depends on the clock', () => {
  assert.deepEqual(heronAt(s, t0 + 12.3), heronAt(s, t0 + 12.3));
  assert.deepEqual(heronPlan(s, 42), heronPlan(s, 42));
  assert.ok(heronWater(s).length >= 3);
});

test('each flight leaves from where it stood and lands where it stands next', () => {
  for (let k = 0; k < 40; k++) {
    const t = Math.ceil(t0 / HERON.cycle + k) * HERON.cycle; // the start of a cycle
    const fly = flyTime(s, Math.floor(t / HERON.cycle) - 1);
    const before = heronAt(s, t - fly - 0.01), lift = heronAt(s, t - fly + 0.01);
    const land = heronAt(s, t - 0.01), after = heronAt(s, t + 0.01);
    assert.equal(before.state === 'fly', false);
    assert.equal(lift.state, 'fly');
    assert.ok(Math.hypot(lift.u - before.u, lift.v - before.v) < 0.1);
    assert.ok(Math.hypot(land.u - after.u, land.v - after.v) < 0.1 && Math.abs(land.y - after.y) < 0.1);
    assert.ok(fly / HERON.cycle < 0.7); // most of the time it is standing
  }
});

test('in flight it clears the bridges, stays near the stream and misses the buildings', () => {
  const walls = new CollisionMap(g.buildings);
  let top = 0, speed = 0, prev = null;
  for (let t = t0; t < t0 + HERON.cycle * 80; t += 0.1) {
    const h = heronAt(s, t);
    if (h.state !== 'fly') { prev = null; continue; }
    // Below street level it must be inside the channel, over the water or the banks.
    if (h.y < 0.5) assert.ok(Math.abs(h.v) < s.w / 2 - 1 && h.u > 1 && h.u < s.len - 1, `${h.u},${h.y},${h.v}`);
    for (const b of s.bridges) if (Math.abs(h.u - b.u) < b.w / 2 + 1 && Math.abs(h.v) < s.w / 2 + 1) assert.ok(h.y > 1.5, `through ${b.name.en}: ${h.u},${h.y}`);
    assert.ok(Math.abs(h.v) < 34, `wandered off: v ${h.v}`);
    assert.ok(!walls.blocked(...frameOf(s).toWorld(h.u, h.v), 0.5), `into a building at ${h.u},${h.v}`);
    top = Math.max(top, h.y);
    if (prev) speed = Math.max(speed, Math.hypot(h.u - prev.u, h.y - prev.y, h.v - prev.v) / 0.1);
    prev = h;
  }
  assert.ok(top > 5 && top < 12, `top ${top}`);
  assert.ok(speed < 14, `top speed ${speed}`); // a heron (about 10 m/s), not a jet
});
