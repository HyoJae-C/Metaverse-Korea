import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  PARK, RAMPS, RAILS, PARK_SPEED, POP, COMBO_GAP, parkGround, railNear, inPark, parkBlockers,
  TRICKS, pickTrick, trickPose, airTime, Skater, bankPoints, TIER_DUR, TIER_AIR, tierFor, GRIND_MAX,
} from '../src/core/skatepark.js';
import { RIDE_TYPES } from '../src/core/bike-garage.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));

// Ride in a straight line along x at speed v, from x0 for `secs`, tapping
// Trick at the times in `taps`. Returns the heights and all events.
// `wall`: x you can't ride past (the wall behind a quarter pipe's deck).
function ride(sk, { x0, z, v, secs, taps = [], dt = 1 / 60, wall = -Infinity }) {
  const ys = [], events = [];
  let x = x0;
  for (let t = 0; t < secs; t += dt) {
    if (taps.some((tt) => tt >= t && tt < t + dt)) sk.tap();
    x = Math.max(wall, x + v * dt);
    const r = sk.step(dt, parkGround(x, z), railNear(x, z));
    ys.push(r.y);
    events.push(...r.events);
  }
  return { ys, events, x };
}

test('skate park: flat pad, ramps rise, the kicker ends in a lip', () => {
  assert.equal(parkGround(0, -25).y, 0);
  const qp = RAMPS.find((r) => r.id === 'qp-west');
  assert.ok(parkGround(qp.u0 - 1, 0).y > 0 && parkGround(qp.u0 - 6, 0).y > parkGround(qp.u0 - 3, 0).y);
  assert.equal(parkGround(qp.u0 - qp.len, 0).y, qp.h);
  assert.equal(parkGround(qp.u0 - qp.len - qp.deck + 0.2, 0).y, qp.h, 'a flat deck on top');
  assert.ok(qp.h >= 3 && qp.deck >= 3);
  const k = RAMPS.find((r) => r.id === 'kicker-west'), kz = (k.z0 + k.z1) / 2;
  assert.ok(parkGround(k.u0 + k.len - 0.05, kz).y > 1.5);
  assert.equal(parkGround(k.u0 + k.len + 0.05, kz).y, 0, 'straight down behind the lip');
  assert.equal(parkGround(0, 0).y, RAMPS.find((r) => r.id === 'funbox').h);
  for (const r of RAMPS) assert.ok(Math.abs(r.u0 || 0) <= PARK.hx && Math.abs(r.z0) <= PARK.hz && Math.abs(r.z1) <= PARK.hz, r.id);
  for (const r of RAILS) assert.ok(inPark(...r.a) && inPark(...r.b), r.id);
  assert.ok(PARK.hx * 2 >= 88 && PARK.hz * 2 >= 60, 'a bigger pad');
  // The quarter pipes' walls stand behind their decks, inside the fence.
  for (const r of RAMPS.filter((x) => x.kind === 'quarter')) assert.ok(Math.abs(r.u0 + r.dir * (r.len + r.deck)) < PARK.hx - 0.6, r.id);
});

// Kicker-west: its lane and the seconds from x = -28 to its lip.
const KW = RAMPS.find((r) => r.id === 'kicker-west'), KZ = (KW.z0 + KW.z1) / 2, LIP_AT = (KW.u0 + KW.len + 28) / PARK_SPEED;
const QP_WALL_X = (() => { const r = RAMPS.find((x) => x.id === 'qp-west'); return r.u0 - r.len - r.deck; })();

test('skate park: riding off the kicker flies and lands; a pop at the lip flies further', () => {
  const plain = ride(new Skater('skate'), { x0: -28, z: KZ, v: PARK_SPEED, secs: 2.8 });
  const peak = Math.max(...plain.ys);
  assert.ok(peak > KW.h + 0.4, `thrown above the lip (${peak.toFixed(2)})`);
  assert.equal(plain.ys.at(-1), 0, 'back on the ground');
  const popped = ride(new Skater('skate'), { x0: -28, z: KZ, v: PARK_SPEED, secs: 4, taps: [LIP_AT - 0.05] });
  assert.ok(Math.max(...popped.ys) > peak + 0.4);
  const trick = popped.events.find((e) => e.kind === 'trick');
  assert.ok(trick && trick.trick.pts >= 250, 'big air, big trick');
  assert.ok(!popped.events.some((e) => e.kind === 'bail'));
  assert.ok(popped.events.some((e) => e.kind === 'land' && e.total > 0), 'combo counted after landing');
});

test('skate park: an ollie on flat ground is a small trick, and the combo counts once you roll on', () => {
  const sk = new Skater('skate');
  const r = ride(sk, { x0: -10, z: -25, v: 0, secs: 0.1 + POP * 2 / 15 + COMBO_GAP + 0.2, taps: [0.05] });
  const trick = r.events.find((e) => e.kind === 'trick');
  assert.ok(trick && trick.trick.pts < 250 && trick.trick.types.includes('skate'));
  const land = r.events.find((e) => e.kind === 'land');
  assert.equal(land?.total, trick.pts);
  // Every ride type has a flat-ground trick and a big one.
  for (const type of RIDE_TYPES) {
    assert.ok(pickTrick(type, airTime(0, POP)), type);
    assert.ok(pickTrick(type, 1.7).pts >= 650, type);
  }
});

test('skate park: every ride has five tricks in each of four air tiers, picked by air time', () => {
  for (const type of RIDE_TYPES) {
    for (let tier = 1; tier <= 4; tier++) {
      const list = TRICKS.filter((k) => k.tier === tier && k.types.includes(type));
      assert.equal(list.length, 5, `${type} tier ${tier}`);
      const air = TIER_AIR[tier] + 0.01;
      assert.ok(TIER_DUR[tier] <= TIER_AIR[tier], 'a trick fits the air its tier needs');
      assert.equal(tierFor(air), tier);
      // The five take turns.
      assert.deepEqual([0, 1, 2, 3, 4, 5].map((n) => pickTrick(type, air, n).id), [...list, list[0]].map((k) => k.id));
    }
  }
  for (let tier = 2; tier <= 4; tier++) {
    const lo = Math.max(...TRICKS.filter((k) => k.tier === tier - 1).map((k) => k.pts));
    const hi = Math.min(...TRICKS.filter((k) => k.tier === tier).map((k) => k.pts));
    assert.ok(hi > lo, `tier ${tier} pays more than tier ${tier - 1}`);
  }
  assert.equal(pickTrick('skate', 0.2), null, 'too little air');
});

test('skate park: flat pops are low, kickers middle or high, a pop high up a quarter pipe is huge', () => {
  const tierOf = (r) => r.events.find((e) => e.kind === 'trick')?.trick.tier;
  assert.equal(tierOf(ride(new Skater('skate'), { x0: -10, z: -25, v: 0, secs: 1, taps: [0.05] })), 1);
  assert.equal(tierOf(ride(new Skater('skate'), { x0: -28, z: KZ, v: PARK_SPEED, secs: 4, taps: [LIP_AT - 0.05] })), 3);
  // Up the west quarter pipe from x = -14 (its toe is 17 m away).
  const qp = (tap) => ride(new Skater('bike'), { x0: -14, z: 0, v: -PARK_SPEED, secs: 5, taps: [tap], wall: QP_WALL_X });
  assert.equal(tierOf(qp(2.0)), 3, 'low on the ramp');
  const high = qp(2.15);
  assert.equal(tierOf(high), 4, 'high on the ramp');
  assert.ok(!high.events.some((e) => e.kind === 'bail'));
  // Huge air: about 1.5 times the old ~1.2 s.
  let air = 0, best = 0;
  const sk = new Skater('bike');
  for (let t = 0, x = -14; t < 5; t += 1 / 60) {
    if (t >= 2.4 && t < 2.4 + 1 / 60) sk.tap();
    x = Math.max(QP_WALL_X, x - PARK_SPEED / 60);
    sk.step(1 / 60, parkGround(x, 0), null);
    air = sk.air ? air + 1 / 60 : 0; best = Math.max(best, air);
  }
  assert.ok(best > 1.6 && best < 2.1, `air ${best.toFixed(2)} s`);
});

test('skate park: up a quarter pipe you go straight up and come back down', () => {
  const sk = new Skater('bike');
  const r = ride(sk, { x0: -26, z: 0, v: -PARK_SPEED, secs: 2.2, wall: QP_WALL_X });
  assert.ok(r.ys.some((y) => y > 3.4), 'above the coping');
  assert.ok(sk.vert || !sk.air);
});

test('skate park: pop onto a rail and you grind it', () => {
  const sk = new Skater('inline');
  const rail = RAILS.find((x) => x.id === 'rail-east');
  const r = ride(sk, { x0: rail.a[0] + 2, z: rail.a[1], v: 5, secs: 3.8, taps: [0.1] });
  assert.ok(r.events.some((e) => e.kind === 'grind' && e.start));
  assert.ok(r.events.filter((e) => e.kind === 'grind').length > 3, 'points while sliding');
  assert.equal(r.ys.at(-1), 0, 'off the end and down');
});

test('skate park: ride up the low ramp at a rail\'s start and you are on it', () => {
  const rail = RAILS.find((x) => x.id === 'rail-north');
  const up = RAMPS.find((x) => x.id === 'rail-north-up');
  assert.ok(Math.abs(up.h - rail.h) < 0.05 && up.u0 + up.len > rail.a[0], 'the ramp tops out at the rail');
  const sk = new Skater('bike');
  const r = ride(sk, { x0: up.u0 - 3, z: rail.a[1], v: 6, secs: 8 });
  const grinds = r.events.filter((e) => e.kind === 'grind');
  assert.ok(grinds[0]?.start, 'on the rail without a pop');
  assert.ok(!r.events.some((e) => e.kind === 'bail'));
  const land = r.events.find((e) => e.kind === 'land');
  assert.ok(land && land.total <= GRIND_MAX && land.mult === 1, `one grind is one combo entry (${land?.total})`);
});

test('skate park: a long grind is capped, and riding to and fro on a rail drops you off', () => {
  // Very slowly along the whole rail: still at most GRIND_MAX.
  const rail = RAILS.find((x) => x.id === 'rail-east');
  const slow = new Skater('bike');
  slow.air = true; slow.y = rail.h + 0.1; slow.vy = -0.5;
  let x = rail.a[0] + 0.5;
  for (let t = 0; t < 50; t += 1 / 60) { x += 0.3 / 60; slow.step(1 / 60, parkGround(x, rail.a[1]), railNear(x, rail.a[1])); }
  assert.equal(slow.combo.length, 1);
  assert.ok(slow.comboPts <= GRIND_MAX && slow.mult === 1, `${slow.comboPts} ×${slow.mult}`);
  // Turn back along it: off you go.
  const sk = new Skater('bike');
  sk.air = true; sk.y = rail.h + 0.1; sk.vy = -0.5;
  x = rail.a[0] + 5;
  for (let t = 0; t < 1; t += 1 / 60) { x += 3 / 60; sk.step(1 / 60, parkGround(x, rail.a[1]), railNear(x, rail.a[1])); }
  assert.ok(sk.grind);
  for (let t = 0; t < 0.5; t += 1 / 60) { x -= 3 / 60; sk.step(1 / 60, parkGround(x, rail.a[1]), railNear(x, rail.a[1])); }
  assert.ok(!sk.grind, 'dropped off when turning back');
  // The same rail or trick again doesn't raise the multiplier; a new one does.
  const c = new Skater('skate');
  c.used = ['grind:rail-east', 'grind:rail-east', 'tre', 'tre'];
  c.combo = [60, 30, 280, 140];
  assert.equal(c.mult, 2);
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

test('skate park: points add up for the day and keep the best combo (no coins)', () => {
  let s = null;
  for (let i = 0; i < 40; i++) s = bankPoints(s, '2026-11-07', 1000);
  assert.equal(s.pts, 40000);
  assert.equal(s.best, 1000);
  assert.ok(!('coins' in s) && !('paid' in s));
  const next = bankPoints(s, '2026-11-08', 300);
  assert.equal(next.pts, 300);
  assert.equal(next.best, 1000, 'best combo carries over');
});

test('skate park: on Olympic Park\'s Peace Plaza, with a way in from Olympic-ro', () => {
  const region = read('region.json');
  const d = region.districts.find((x) => x.id === 'olympic-park');
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
  assert.ok(map.pois.some((p) => p.name?.en === 'Olympic Park Skate Park'));
  // Nothing else solid on the pad (the lakes, the Peace Gate).
  for (const b of map.blockers) if (!want.some((w) => JSON.stringify(b.p) === JSON.stringify(w.p.map(([x, z]) => [Math.round(x * 10) / 10, Math.round(z * 10) / 10])))) for (const [x, z] of b.p) assert.ok(!inPark(x - lm.x, z - lm.z, 1), 'blocker in the park');
  assert.ok(map.landmarks.some((l) => l.type === 'peacegate') && map.landmarks.some((l) => l.type === 'lonetree'));
});
