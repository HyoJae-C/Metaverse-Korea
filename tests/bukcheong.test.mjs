import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TROUPE, TROUPE_PEOPLE, SLOTS, LION_RING, SICK_RING, CYCLE, SICK, UP, HOLD, SICK_SPOT, HEAL, REAR_SPOTS, REAR_EVERY, REAR_LEN, phaseAt, ROLE_LOOKS } from '../src/core/bukcheong.js';
import { FOLK_DANCES } from '../src/core/folk-dance.js';
import { pointInPoly } from '../src/core/collision.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
// main.js: the ring's centre, in the palace district's metres
const [cx, cz] = main.match(/mask: \[palaceAt\[0\] \+ (-?[\d.]+), palaceAt\[1\] \+ (-?[\d.]+)\]/).slice(1).map(Number);
const rope = main.match(/rope: \[palaceAt\[0\] - ([\d.]+), palaceAt\[1\] \+ ([\d.]+)\]/).slice(1).map(Number);

test('fourteen people: two lions of two, four musicians, the yangban and Kkoksoe, four more roles', () => {
  assert.equal(TROUPE_PEOPLE, 14);
  const n = (roles) => TROUPE.filter((r) => roles.includes(r.role)).reduce((s, r) => s + r.n, 0);
  assert.equal(n(['lion']), 2);
  assert.equal(n(['tungso', 'buk', 'janggu']), 4);
  assert.equal(n(['yangban', 'kkoksoe']), 2);
  assert.equal(n(['doctor', 'monk', 'hunchback', 'boy']), 4);
  // everyone but the lions has a place, a look and a dance
  for (const r of TROUPE.filter((r) => r.role !== 'lion')) {
    assert.equal(SLOTS[r.role].length, r.n, r.role);
    assert.ok(FOLK_DANCES[ROLE_LOOKS[r.role].dance], r.role + ' dance');
  }
});

test('the troupe stands on Gwanghwamun Square, outside the palace, clear of the statue and the tightrope', () => {
  const plaza = map.areas.find((a) => a.k === 'plaza').p;
  const all = [...Object.values(SLOTS).flat(), ...Object.values(HEAL), SICK_SPOT, ...REAR_SPOTS];
  for (let a = 0; a < Math.PI * 2; a += 0.2) all.push([Math.sin(a) * (SICK_RING + 1.2), Math.cos(a) * (SICK_RING + 1.2)]); // a lion's whole length round the wider ring
  for (const [x, z] of all) {
    const X = cx + x, Z = cz + z;
    assert.ok(pointInPoly(X, Z, plaza), `${X},${Z} is off the square`);
    assert.ok(Z > 20, 'south of the palace wall and the road in front of the gate');
    for (const b of map.blockers) assert.ok(!pointInPoly(X, Z, b.p), `${X},${Z} is inside a blocker`);
    // the tightrope runs 11 m along x, with guy ropes another metre each end
    assert.ok(Math.abs(X + rope[0]) > 7.5 || Math.abs(Z - rope[1]) > 2, `${X},${Z} is on the tightrope`);
  }
  // King Sejong's statue (and its information stone) stay out of the way
  const sejong = map.landmarks.find((l) => l.kind === 'king');
  for (const [x, z] of all) assert.ok(Math.hypot(cx + x - sejong.x, cz + z - sejong.z) > 9);
});

test('the round: dance, a lion falls ill, it springs up and both rear up for photos, then dance again', () => {
  assert.equal(phaseAt(0), 'dance');
  assert.equal(phaseAt(SICK - 0.1), 'dance');
  assert.equal(phaseAt(SICK + 1), 'sick');
  assert.equal(phaseAt(UP + 1), 'rear');
  assert.equal(phaseAt(UP + HOLD + 0.1), 'dance');
  assert.ok(SICK > 15 && UP - SICK >= 8 && HOLD >= 4 && CYCLE - UP - HOLD > 10);
  // while dancing, each lion rears up now and then, for a few seconds
  assert.ok(REAR_EVERY[0] > REAR_LEN && REAR_EVERY[1] < 20);
  // the healers kneel beside the sick lion, not on it, and the other lion
  // prowls a wider ring round them all
  for (const [x, z] of Object.values(HEAL)) {
    assert.ok(Math.hypot(x - SICK_SPOT[0], z - SICK_SPOT[1]) > 1.2);
    assert.ok(Math.hypot(x, z) < SICK_RING - 1.5);
  }
  assert.ok(SICK_RING > LION_RING);
  // the two rearing lions stand side by side, apart
  assert.ok(Math.hypot(REAR_SPOTS[0][0] - REAR_SPOTS[1][0], REAR_SPOTS[0][1] - REAR_SPOTS[1][1]) > 2.5);
});
