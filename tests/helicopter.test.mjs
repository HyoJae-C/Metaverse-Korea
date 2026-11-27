import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// The operators' helicopter (core/helicopter.js, game/helicopter.js): the
// chat codes, the flight in from far away, the slow landing and the line in
// the operator's state that others draw it from.
const {
  HELI, LANDED_AT, LEAVE_LEN, FLY, SEATS, heliCode, heliAt, heliPose, encodeHeli, parseHeli, findPad,
  seatAt, craftUnder, encodeCrewed, encodeRider, parseRider, heliMsg, parseHeliMsg,
} = await import('../src/core/helicopter.js');

test('chat codes: /헬기 calls it, /헬기보내기 sends it off', () => {
  assert.equal(heliCode('헬기'), 'call');
  assert.equal(heliCode(' Heli '), 'call');
  assert.equal(heliCode('헬리콥터'), 'call');
  assert.equal(heliCode('헬기보내기'), 'off');
  assert.equal(heliCode('드론쇼'), null);
  assert.equal(heliCode(null), null);
});

test('it comes from far away and high up, and never jumps', () => {
  const a = heliAt(0);
  assert.ok(a.d >= 350 && a.y >= 55, `starts ${a.d} m out, ${a.y} m up`);
  let prev = a;
  for (let t = 0.1; t <= LANDED_AT + 20; t += 0.1) {
    const p = heliAt(t);
    assert.ok(p.d <= prev.d + 1e-9, `closer all the way in (t=${t.toFixed(1)})`);
    assert.ok(p.y <= prev.y + 1e-9, `lower all the way down (t=${t.toFixed(1)})`);
    assert.ok(Math.hypot(p.d - prev.d, p.y - prev.y) < 5, `no jump at t=${t.toFixed(1)}`);
    prev = p;
  }
  assert.equal(prev.phase, 'landed');
  assert.equal(prev.y, 0);
  assert.equal(prev.rotor, 0); // the blades have stopped
});

test('the landing is slow: straight down, under 2.5 m/s, and soft at the skids', () => {
  let fastest = 0;
  for (let t = HELI.cruise; t < LANDED_AT; t += 0.1) {
    const p = heliAt(t), q = heliAt(t + 0.1);
    assert.equal(p.d, 0);
    fastest = Math.max(fastest, (p.y - q.y) / 0.1);
  }
  assert.ok(fastest < 2.5, `fastest ${fastest.toFixed(2)} m/s`);
  const last = heliAt(LANDED_AT - 1).y;
  assert.ok(last < 0.2, `${last.toFixed(2)} m up one second before touching down`);
  assert.ok(HELI.descend >= 12);
});

test('the wind on the ground only blows when it is low with the blades turning', () => {
  assert.equal(heliAt(0).wash, 0);
  assert.equal(heliAt(HELI.cruise).wash, 0); // 20 m up
  assert.ok(heliAt(LANDED_AT - 2).wash > 0.9);
  assert.equal(heliAt(LANDED_AT + HELI.spinDown + 1).wash, 0);
});

test('sent away: blades up, lift off, on past the spot and gone', () => {
  const go = LANDED_AT + 60;
  assert.equal(heliAt(go + 0.1, go).phase, 'spinup');
  assert.equal(heliAt(go + HELI.spinUp - 0.1, go).y, 0);
  const up = heliAt(go + HELI.spinUp + HELI.lift, go);
  assert.ok(Math.abs(up.y - HELI.hover) < 0.5 && Math.abs(up.d) < 1);
  const out = heliAt(go + LEAVE_LEN - 0.1, go);
  assert.ok(out.d < -350 && out.y > 55, 'far off on the other side');
  assert.equal(heliAt(go + LEAVE_LEN, go), null);
  // Sent away while still on its way in: it lands first.
  assert.equal(heliAt(10, 5).phase, 'cruise');
  assert.equal(heliAt(LANDED_AT + 1, 5).phase, 'spinup');
});

test('the state line: round trip, and nonsense is refused', () => {
  const h = { x: 12.34, z: -56.78, y: 1.2, dir: 135, t0: 1795000000, t1: null };
  const back = parseHeli(encodeHeli(h));
  assert.deepEqual(back, { x: 12.3, z: -56.8, y: 1.2, dir: 135, t0: 1795000000, t1: null });
  assert.equal(parseHeli(encodeHeli({ ...h, t1: 1795000100 })).t1, 1795000100);
  for (const bad of [null, 5, '', '1,2,3', '1,2,3,4,5,x', '9e9,0,0,0,5,0', '0,0,0,0,0,0', 'a'.repeat(200)]) assert.equal(parseHeli(bad), null);
});

test('others draw it at the same place; a clock that is behind sees the start', () => {
  const h = { x: 100, z: 50, y: 0, dir: 90, t0: 1000, t1: null };
  const p = heliPose(h, 1000);
  assert.ok(p.x > 100 + 350 && Math.abs(p.z - 50) < 1e-6, 'comes from +x (90°)');
  assert.ok(Math.abs(Math.sin(p.yaw) + 1) < 1e-9, 'nose toward the spot');
  assert.deepEqual(heliPose(h, 990), p);
  const down = heliPose(h, 1000 + LANDED_AT + 1);
  assert.ok(Math.abs(down.x - 100) < 1e-9 && down.y === 0);
});

test('the landing spot: in front of the operator first, clear of buildings', () => {
  const open = findPad(0, 0, 0, () => true);
  assert.ok(Math.abs(open.x) < 1e-9 && open.z === 8);
  const wall = findPad(0, 0, 0, (x, z) => z < 0); // everything ahead is blocked
  assert.ok(wall.z < 0);
  assert.equal(findPad(0, 0, 0, () => false), null);
  assert.ok(findPad(0, 0, 0, (x, z, r) => r >= HELI.pad));
});

test('seats: the pilot in front, two passengers side by side behind', () => {
  assert.equal(SEATS.riders.length, 2);
  assert.ok(SEATS.pilot[2] > SEATS.riders[0][2] + 0.8, 'the bench is behind the pilot');
  assert.ok(Math.abs(SEATS.riders[0][0] - SEATS.riders[1][0]) > 0.7, 'room for two');
  for (const s of [SEATS.pilot, ...SEATS.riders]) assert.ok(Math.abs(s[0]) < 0.8 && s[2] > -0.9 && s[2] < 1.9, 'inside the cabin');
  // Heading +x (yaw 90°): the nose is toward +x, its left toward -z.
  const [x, y, z] = seatAt([1, 0.5, 2], 10, 3, 20, Math.PI / 2);
  assert.ok(Math.abs(x - 12) < 1e-9 && Math.abs(y - 3.5) < 1e-9 && Math.abs(z - 19) < 1e-9);
  // The helicopter others draw under the pilot puts the pilot back on the pilot's seat.
  for (const yaw of [0, 1, -2.5]) {
    const [cx, cy, cz] = craftUnder(5, 40, -7, yaw);
    const back = seatAt(SEATS.pilot, cx, cy, cz, yaw);
    assert.ok(Math.hypot(back[0] - 5, back[1] - 40, back[2] + 7) < 1e-9);
  }
  assert.ok(FLY.top + SEATS.pilot[1] < 140, 'others draw people no higher than 140 m (core/players.js)');
});

test('flying it: the state line, and a passenger\'s', () => {
  assert.deepEqual(parseHeli(encodeCrewed(1, 0)), { crewed: true, rotor: 1, ground: 0 });
  assert.deepEqual(parseHeli(encodeCrewed(0.52, 12.34)), { crewed: true, rotor: 0.5, ground: 12.3 });
  assert.equal(parseHeli(encodeCrewed(7, -3)).rotor, 1);
  for (const bad of ['F', 'F,11,0', 'F,5', 'F,5,x', 'F,5,0,1']) assert.equal(parseHeli(bad), null);
  assert.deepEqual(parseRider(encodeRider('abc-123', 1)), { pilot: 'abc-123', slot: 1 });
  for (const bad of [null, '', 'abc', 'abc:2', 'a b:0']) assert.equal(parseRider(bad), null);
});

test('asking someone aboard: the messages', () => {
  assert.deepEqual(parseHeliMsg(heliMsg('invite', 'p1', 1)), { verb: 'invite', target: 'p1', slot: 1 });
  assert.deepEqual(parseHeliMsg(heliMsg('join', 'p1', 0)), { verb: 'join', target: 'p1', slot: 0 });
  assert.deepEqual(parseHeliMsg(heliMsg('end', 'p1')), { verb: 'end', target: 'p1', slot: null });
  for (const bad of ['heli:fly:p1', 'heli:invite:p1:2', 'sky:invite:p1', 'heli:invite']) assert.equal(parseHeliMsg(bad), null);
});

test('kept out of the first download, and out of main.js', () => {
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.ok(main.includes("import('./game/helicopter.js')"));
  assert.ok(!/^import .*game\/helicopter/m.test(main));
  const core = readFileSync(new URL('../src/core/helicopter.js', import.meta.url), 'utf8');
  assert.ok(!core.includes("from 'three'"), 'the chat only needs the codes');
});
