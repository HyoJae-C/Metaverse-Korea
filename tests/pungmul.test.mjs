import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PUNGMUL_ROLES, TROUPE, TROUPE_N, ROUTINE, CYCLE, BLEND, RADIUS, PLAZA_SPOT, COIL_LEN, troupeSpot, routinePart, pathAt, yeonpungdae, activityOf, SPINNERS, SPIN_EVERY } from '../src/core/pungmul.js';
import { sangmoSpin, SPIN, SPIN_MODE, PUNGMUL_MOVES, PUNGMUL_HANDS } from '../src/core/pungmul-props.js';
import { FOLK_DANCES } from '../src/core/folk-dance.js';
import { MODELS } from '../src/data/appearance.js';
import { CollisionMap } from '../src/core/collision.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/olympic-park.json', import.meta.url)));

test('the troupe is a quarter of Yozi\'s list of 75, every part kept, in order', () => {
  const want = { flag: 1, horn: 1, kkwaenggwari: 2, jing: 1, janggu: 3, buk: 2, sogo: 7, japsaek: 2 };
  assert.deepEqual(Object.fromEntries(PUNGMUL_ROLES.map((r) => [r.id, r.n])), want);
  assert.equal(TROUPE_N, 19);
  assert.equal(TROUPE.filter((p) => SPINNERS.has(p.role)).length, 7, 'the sogo dancers whirl the ribbons');
  // the flags lead the column, the horns right behind
  assert.deepEqual(TROUPE.slice(0, 2).map((p) => p.role), ['flag', 'horn']);
});

test('every part has a move and its hands are set (no stray fan-dance fans)', () => {
  assert.ok(MODELS.includes('hanbok-pungmul'));
  for (const who of TROUPE) {
    const a = activityOf(who);
    assert.ok(FOLK_DANCES[a], a + ' is a folk move');
    assert.ok(PUNGMUL_MOVES[a]);
    assert.ok(PUNGMUL_HANDS[a], a + ' has its hand props (or empty hands)');
  }
  // the moves keep a beat: same pose one bar later, and the legs really step
  for (const [k, f] of Object.entries(PUNGMUL_MOVES)) {
    const a = f(3), b = f(3 + 4);
    assert.ok(Math.abs(a.legL[0] - b.legL[0]) < 1e-9, k);
    assert.ok(Math.min(...[0, 0.25, 0.5, 0.75].map((t) => f(t).legL[0])) < -0.2, k + ' lifts a knee');
  }
});

test('the sangmo spins on the beat, flat and then side to side', () => {
  assert.ok(Math.abs(sangmoSpin(SPIN).yaw - Math.PI * 2) < 1e-9, 'one turn per spin');
  assert.equal(sangmoSpin(1).tilt, 0, 'flat at first');
  const side = [...Array(40)].map((_, i) => sangmoSpin(SPIN_MODE + 0.6 + i * 0.1).tilt);
  assert.ok(Math.max(...side) > 0.5 && Math.min(...side) < -0.5, 'leans both ways in the second mode');
  assert.ok(side.every((t) => Math.abs(t) <= 0.85 + 1e-9));
});

test('the routine runs march, coil, uncoil and pan, then round again', () => {
  assert.deepEqual(ROUTINE.map((p) => p.name), ['march', 'coil', 'uncoil', 'pan']);
  assert.equal(CYCLE, 142);
  assert.equal(routinePart(0).part, 'march');
  assert.equal(routinePart(40).part, 'coil');
  assert.equal(routinePart(80).part, 'uncoil');
  assert.equal(routinePart(110).part, 'pan');
  assert.equal(routinePart(CYCLE + 1).part, 'march');
});

test('nobody jumps: each person walks smoothly through the whole routine, at a believable pace', () => {
  const dt = 0.05;
  let worst = 0;
  for (let i = 0; i < TROUPE_N; i++) {
    let [px, pz] = troupeSpot(i, -dt);
    for (let t = 0; t <= CYCLE + 1; t += dt) {
      const [x, z] = troupeSpot(i, t);
      worst = Math.max(worst, Math.hypot(x - px, z - pz) / dt);
      px = x; pz = z;
    }
  }
  assert.ok(worst < 4.5, `fastest anyone moves: ${worst.toFixed(2)} m/s`);
});

test('the column winds into a tight spiral (멍석말이) and the pan has rings', () => {
  assert.ok(COIL_LEN > 70, 'the spiral is long enough to take most of the column');
  const coilEnd = ROUTINE[0].len + ROUTINE[1].len - 0.01;
  const r = TROUPE.map((_, i) => Math.hypot(...troupeSpot(i, coilEnd).slice(0, 2)));
  assert.ok(r[0] < 3, 'the leader reaches the middle');
  assert.ok(r.filter((x) => x < 9).length > TROUPE_N * 0.7, 'most of the troupe is coiled up inside 9 m');
  // on the circle the column is evenly spaced, a step and a half apart
  const m = TROUPE.map((_, i) => troupeSpot(i, 20));
  for (let i = 1; i < TROUPE_N; i++) assert.ok(Math.abs(Math.hypot(m[i][0] - m[i - 1][0], m[i][1] - m[i - 1][1]) - 1.4) < 0.05);
  // the pan: musicians round the edge facing in, the comic characters in the middle
  const tPan = CYCLE - ROUTINE[3].len + BLEND + 2;
  TROUPE.forEach((who, i) => {
    const [x, z, face] = troupeSpot(i, tPan), d = Math.hypot(x, z);
    if (['flag', 'horn', 'kkwaenggwari', 'jing', 'janggu', 'buk'].includes(who.role)) {
      assert.ok(Math.abs(d - (RADIUS - 1)) < 0.01);
      assert.ok(Math.cos(face - Math.atan2(-x, -z)) > 0.99, 'facing the middle');
    } else if (who.role === 'japsaek') assert.ok(d < 3);
    else assert.ok(d > 4 && d < 12, who.role + ' in a ring');
  });
  // the spinning jumps run round the rings as a wave
  const spins = TROUPE.map((_, i) => yeonpungdae(i, BLEND + 0.5).turn);
  assert.ok(spins.some((s) => s > 0) && spins.some((s, i) => s === 0 && SPINNERS.has(TROUPE[i].role)));
  assert.equal(yeonpungdae(0, BLEND + 0.5).turn, 0, 'the flag bearers don\'t spin');
  assert.ok(SPIN_EVERY > 3);
});

test('the whole show fits the open middle of the Peace Plaza, clear of the gate, the pool and the skate park', () => {
  const solid = new CollisionMap(map.buildings.concat(map.blockers));
  const plaza = map.areas.find((a) => a.k === 'plaza').p;
  const [x0, z0] = plaza[0], [x1, z1] = plaza[2];
  for (let t = 0; t < CYCLE; t += 0.5) {
    for (let i = 0; i < TROUPE_N; i++) {
      const [x, z] = troupeSpot(i, t), wx = PLAZA_SPOT[0] + x, wz = PLAZA_SPOT[1] + z;
      assert.ok(wx > x0 + 2 && wx < x1 - 2 && wz > z0 + 2 && wz < z1 - 2, 'on the plaza');
      assert.ok(!solid.blocked(wx, wz, 2), `person ${i} at ${t}s walks into something`);
    }
  }
  // and the circle is well away from the basketball court and the skate park
  const court = map.landmarks.find((l) => l.type === 'basketball');
  assert.ok(court.x - PLAZA_SPOT[0] > RADIUS + 25);
  assert.ok(Math.hypot(...pathAt(-1000)) - RADIUS < 1e-9);
});
