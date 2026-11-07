import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PARK, RAMPS, RAILS, PARK_SPEED, POP, COMBO_GAP, parkGround, railNear, inPark, parkBlockers,
  TRICKS, pickTrick, trickPose, airTime, Skater, bankPoints, COIN_STEP, COIN_STEPS_PER_DAY, PTS_PER_COIN_STEP,
} from '../src/core/skatepark.js';
import { RIDE_TYPES } from '../src/core/bike-garage.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/seongsu/' + f, import.meta.url)));

// Ride in a straight line along x at speed v, from x0 for `secs`, tapping
// Trick at the times in `taps`. Returns the heights and all events.
function ride(sk, { x0, z, v, secs, taps = [], dt = 1 / 60 }) {
  const ys = [], events = [];
  let x = x0;
  for (let t = 0; t < secs; t += dt) {
    if (taps.some((tt) => tt >= t && tt < t + dt)) sk.tap();
    x += v * dt;
    const r = sk.step(dt, parkGround(x, z), railNear(x, z));
    ys.push(r.y);
    events.push(...r.events);
  }
  return { ys, events, x };
}

test('skate park: flat pad, ramps rise, the kicker ends in a lip', () => {
  assert.equal(parkGround(0, -18).y, 0);
  const qp = RAMPS.find((r) => r.id === 'qp-west');
  assert.ok(parkGround(qp.u0 - 1, 0).y > 0 && parkGround(qp.u0 - 6, 0).y > parkGround(qp.u0 - 3, 0).y);
  assert.equal(parkGround(qp.u0 - qp.len, 0).y, qp.h);
  const k = RAMPS.find((r) => r.id === 'kicker-west');
  assert.ok(parkGround(k.u0 + k.len - 0.05, 11).y > 0.9);
  assert.equal(parkGround(k.u0 + k.len + 0.05, 11).y, 0, 'straight down behind the lip');
  assert.equal(parkGround(0, 0).y, RAMPS.find((r) => r.id === 'funbox').h);
  for (const r of RAMPS) assert.ok(Math.abs(r.u0) <= PARK.hx && Math.abs(r.z0) <= PARK.hz && Math.abs(r.z1) <= PARK.hz, r.id);
  for (const r of RAILS) assert.ok(inPark(...r.a) && inPark(...r.b), r.id);
});

test('skate park: riding off the kicker flies and lands; a pop at the lip flies further', () => {
  const plain = ride(new Skater('skate'), { x0: -20, z: 11, v: PARK_SPEED, secs: 2.2 });
  const peak = Math.max(...plain.ys);
  assert.ok(peak > 1.05, `thrown above the lip (${peak.toFixed(2)})`);
  assert.equal(plain.ys.at(-1), 0, 'back on the ground');
  const lipAt = (-10.4 + 20) / PARK_SPEED; // seconds to the lip
  const popped = ride(new Skater('skate'), { x0: -20, z: 11, v: PARK_SPEED, secs: 3.6, taps: [lipAt - 0.05] });
  assert.ok(Math.max(...popped.ys) > peak + 0.4);
  const trick = popped.events.find((e) => e.kind === 'trick');
  assert.ok(trick && trick.trick.pts >= 250, 'big air, big trick');
  assert.ok(!popped.events.some((e) => e.kind === 'bail'));
  assert.ok(popped.events.some((e) => e.kind === 'land' && e.total > 0), 'combo counted after landing');
});

test('skate park: an ollie on flat ground is a small trick, and the combo counts once you roll on', () => {
  const sk = new Skater('skate');
  const r = ride(sk, { x0: -10, z: -18, v: 0, secs: 0.1 + POP * 2 / 15 + COMBO_GAP + 0.2, taps: [0.05] });
  const trick = r.events.find((e) => e.kind === 'trick');
  assert.ok(trick && trick.trick.pts < 250 && trick.trick.types.includes('skate'));
  const land = r.events.find((e) => e.kind === 'land');
  assert.equal(land?.total, trick.pts);
  // Every ride type has a flat-ground trick and a big one.
  for (const type of RIDE_TYPES) {
    assert.ok(pickTrick(type, airTime(0, POP)), type);
    assert.ok(pickTrick(type, 1.3).pts >= 280, type);
  }
});

test('skate park: up a quarter pipe you go straight up and come back down', () => {
  const sk = new Skater('bike');
  const r = ride(sk, { x0: -18, z: 0, v: -PARK_SPEED, secs: 1.4 });
  assert.ok(r.ys.some((y) => y > 2.2), 'above the coping');
  assert.ok(sk.vert || !sk.air);
});

test('skate park: pop along a rail and you grind it', () => {
  const sk = new Skater('inline');
  const rail = RAILS.find((x) => x.id === 'rail-north');
  const r = ride(sk, { x0: rail.a[0] - 1, z: rail.a[1], v: 5, secs: 5, taps: [0.1] });
  assert.ok(r.events.some((e) => e.kind === 'grind' && e.start));
  assert.ok(r.events.filter((e) => e.kind === 'grind').length > 3, 'points while sliding');
  assert.equal(r.ys.at(-1), 0, 'off the end and down');
});

test('skate park: landing mid-trick is a bail and loses the combo', () => {
  const sk = new Skater('skate');
  sk.combo = [500]; sk.used = ['tre'];
  sk.air = true; sk.y = 0.01; sk.vy = -1;
  sk.trick = { id: 'mctwist', t: 0.1 };
  const { events } = sk.step(1 / 60, { y: 0, s: 0, r: null });
  assert.equal(events[0].kind, 'bail');
  assert.equal(sk.combo.length, 0);
});

test('skate park: trick poses end where they started (no one lands sideways)', () => {
  for (const k of TRICKS) {
    const end = trickPose(k.id, k.dur);
    for (const key of ['spin', 'flip', 'rideRoll', 'rideSpin']) {
      const a = end[key] % (Math.PI * 2);
      const ok = Math.abs(a) < 1e-6 || Math.abs(Math.abs(a) - Math.PI * 2) < 1e-6 || (key === 'rideSpin' && Math.abs(Math.abs(a) - Math.PI) < 1e-6);
      assert.ok(ok, `${k.id}.${key} = ${a}`);
    }
    assert.ok(Math.abs(end.roll) < 1e-6 && Math.abs(end.tuck) < 1e-6, k.id);
    assert.equal(trickPose(k.id, k.dur + 0.01), null);
  }
});

test('skate park: points pay a few coins a day', () => {
  let s = null, coins = 0;
  for (let i = 0; i < 40; i++) { const r = bankPoints(s, '2026-11-07', 1000); s = r.saved; coins += r.coins; }
  assert.equal(coins, COIN_STEP * COIN_STEPS_PER_DAY);
  assert.equal(s.best, 1000);
  const next = bankPoints(s, '2026-11-08', PTS_PER_COIN_STEP);
  assert.equal(next.coins, COIN_STEP);
  assert.equal(next.saved.best, PTS_PER_COIN_STEP);
});

test('skate park: on the Hongdae map, open ground south of the main road, with a way in', () => {
  const region = read('region.json');
  const d = region.districts.find((x) => x.id === 'hongdae');
  const map = read(d.map);
  const lm = map.landmarks.find((l) => l.type === 'skatepark');
  assert.ok(lm);
  const inside = (x, z, p) => {
    let c = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; }
    return c;
  };
  // No building on the pad.
  for (const b of map.buildings) for (const [x, z] of b.p) assert.ok(!inPark(x - lm.x, z - lm.z, 1), 'building in the park');
  // The fence is in the map's blockers, and the gate is open.
  const want = parkBlockers(lm.x, lm.z);
  for (const w of want) assert.ok(map.blockers.some((b) => JSON.stringify(b.p) === JSON.stringify(w.p.map(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10]))));
  const gx = lm.x + (PARK.gate[0] + PARK.gate[1]) / 2, gz = lm.z - PARK.hz - 0.2;
  assert.ok(!map.blockers.some((b) => inside(gx, gz, b.p)), 'gate open');
  // A walkway from the main road reaches the gate.
  const path = map.roads.find((r) => r.k === 'walk' && r.p.some(([x, z]) => Math.abs(z - (lm.z - PARK.hz)) < 0.5));
  assert.ok(path && Math.abs(path.p[0][0] - gx) <= (PARK.gate[1] - PARK.gate[0]) / 2);
  assert.ok(map.pois.some((p) => p.name?.en === 'Hongdae Skate Park'));
});
