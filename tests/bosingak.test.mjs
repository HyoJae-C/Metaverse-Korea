import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { BOSINGAK, BOSINGAK_TEXT, BOSINGAK_CARD, newYearStroke, newYearRinging, nearBell, strikePose, bellGain, BELL_HOUSE } from '../src/data/bosingak.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

test('Bosingak stands on the south side of Jongno, by Cheonggyecheon-ro, near its real spot', () => {
  const jongno = map.roads.find((r) => r.n?.en === 'Jong-ro');
  const sejong = map.roads.find((r) => r.n?.en === 'Sejong-daero');
  const [x, z] = BOSINGAK.at;
  const south = jongno.p[0][1] + jongno.w / 2;
  assert.ok(BOSINGAK.base[1] > south, 'its base is south of Jongno');
  assert.ok(x > sejong.p[0][0], 'east of Sejong-daero');
  assert.ok(BOSINGAK.plaza[1] >= south - 0.01, 'its square starts at the street');
  // Cheonggyecheon-ro's north edge below the square, all the way across
  const cg = map.roads.filter((r) => r.n?.en === 'Cheonggyecheon-ro');
  const edgeZ = (px) => Math.min(...cg.flatMap((r) => r.p.slice(1).map(([x1, z1], i) => {
    const [x0, z0] = r.p[i];
    return px >= Math.min(x0, x1) && px <= Math.max(x0, x1) ? z0 + ((px - x0) / (x1 - x0)) * (z1 - z0) - r.w / 2 : Infinity;
  })));
  const off = region.districts.find((d) => d.id === BOSINGAK.district).offset;
  for (const px of [BOSINGAK.plaza[0], BOSINGAK.plaza[2], ...BOSINGAK.ring.at.slice(0, 1)]) assert.ok(BOSINGAK.plaza[3] <= edgeZ(px), 'its square stops at Cheonggyecheon-ro');
  const [rx, rz] = toGame(BOSINGAK.real.lat, BOSINGAK.real.lon);
  assert.ok(Math.hypot(off[0] + x - rx, off[1] + z - rz) <= 15, 'within 15 m of the real pavilion');
  assert.ok(map.landmarks.some((l) => l.type === 'bosingak' && l.x === x && l.z === z));
  assert.ok(map.pois.some((p) => p.name.ko === '보신각' && p.x === x && p.z === z));
});

test('its base is a blocker, nothing else stands on its square, and the ringing spot is free', () => {
  const [x0, z0, x1, z1] = BOSINGAK.base;
  assert.ok(map.blockers.some((b) => b.p.length === 4 && b.p.every(([x, z]) => (x === x0 || x === x1) && (z === z0 || z === z1))));
  const [px0, pz0, px1, pz1] = BOSINGAK.plaza;
  for (const b of map.buildings) {
    const cx = b.p.reduce((s, q) => s + q[0], 0) / b.p.length, cz = b.p.reduce((s, q) => s + q[1], 0) / b.p.length;
    assert.ok(!(cx > px0 && cx < px1 && cz > pz0 && cz < pz1), 'a building on the square');
  }
  const [rx, rz] = BOSINGAK.ring.at;
  for (const b of [...map.blockers, ...map.buildings]) assert.ok(!inPoly(rx, rz, b.p), 'ringing spot inside something');
  assert.ok(rz - BOSINGAK.ring.r < z1 + 4.5 && rz > z1, 'in front of the base');
});

test('ringing works from in front of the steps, in world metres', () => {
  const off = region.districts.find((d) => d.id === BOSINGAK.district).offset;
  const [rx, rz] = BOSINGAK.ring.at;
  assert.equal(nearBell(off[0] + rx, off[1] + rz, off), true);
  assert.equal(nearBell(off[0] + rx, off[1] + rz + 10, off), false);
  assert.equal(nearBell(rx, rz, null), false);
});

test('the New Year: 33 strokes from midnight KST, 1 January only', () => {
  const kstMidnight = Date.UTC(2026, 11, 31, 15, 0, 0); // 2027-01-01 00:00 KST
  assert.equal(newYearStroke(kstMidnight - 1000), -1);
  assert.equal(newYearStroke(kstMidnight), 0);
  assert.equal(newYearStroke(kstMidnight + 15000), 1);
  assert.equal(newYearStroke(kstMidnight + 32 * 15000 + 500), 32);
  assert.equal(newYearStroke(kstMidnight + 33 * 15000), -1);
  assert.equal(newYearStroke(Date.UTC(2026, 10, 9, 15, 0, 0)), -1); // another midnight
  const seen = new Set();
  for (let t = kstMidnight; t < kstMidnight + 20 * 60e3; t += 1000) seen.add(newYearStroke(t));
  seen.delete(-1);
  assert.equal(seen.size, BOSINGAK.newYear.strikes);
});

test('and again at noon on 1 January, the bell keeper out a little before and after', () => {
  const noon = Date.UTC(2027, 0, 1, 3, 0, 0); // 12:00 KST
  assert.deepEqual(newYearRinging(noon - 60e3), { start: noon, stroke: -1, keeper: true });
  assert.equal(newYearStroke(noon + 15500), 1);
  assert.equal(newYearRinging(noon + 33 * 15000 + 30e3).stroke, -1); // done, still bowing
  assert.equal(newYearRinging(noon + 33 * 15000 + 61e3), null);
  assert.equal(newYearRinging(noon - 3 * 60e3), null);
  // Just before midnight on 31 December he is already out for next year's.
  const mid = Date.UTC(2026, 11, 31, 15);
  assert.equal(newYearRinging(mid - 90e3).start, mid);
  assert.equal(newYearRinging(Date.UTC(2026, 10, 9, 3)), null); // an ordinary noon
});

test("a ring by hand carries a few metres; the New Year's ringings carry along Jongno", () => {
  const { ring, ceremony } = BOSINGAK.hear;
  assert.ok(ring <= 25 && ceremony >= 400);
  assert.equal(bellGain(0, ring), 1);
  assert.equal(bellGain(ring, ring), 0);
  assert.equal(bellGain(60, ring), 0);
  assert.ok(bellGain(300, ceremony) > 0);
});

test('the people on the square stand on the paving, off the base, the steps and Jongno', () => {
  const [px0, pz0, px1, pz1] = BOSINGAK.plaza, [bx0, bz0, bx1, bz1] = BOSINGAK.base;
  assert.ok(BOSINGAK.people.length >= 3 && BOSINGAK.people.length <= 6);
  for (const [x, z] of BOSINGAK.people) {
    assert.ok(x > px0 && x < px1 && z > pz0 && z < pz1);
    assert.ok(!(x > bx0 - 1 && x < bx1 + 1 && z > bz0 - 1 && z < bz1 + 1));
    assert.ok(Math.hypot(x - BOSINGAK.ring.at[0], z - BOSINGAK.ring.at[1]) > BOSINGAK.ring.r + 1, 'in the way of the bell');
  }
  const [kx, kz] = BOSINGAK.keeper.at; // the keeper stands on the upper floor, inside the posts
  assert.ok(Math.abs(kx - BOSINGAK.at[0]) < BELL_HOUSE.w / 2 - 0.8 && Math.abs(kz - BOSINGAK.at[1]) < BELL_HOUSE.d / 2 - 0.8);
});

test('the striker draws back, hits, and the bell hums after', () => {
  assert.deepEqual(strikePose(-1), { pull: 0, shake: 0 });
  assert.ok(strikePose(0.9).pull > 0.99);
  assert.ok(strikePose(1.15).pull < 0.01 && strikePose(1.2).shake > 0.9);
  assert.equal(strikePose(7).shake, 0);
});

test('its words are in Korean, English, Japanese and Chinese', () => {
  const { keeper, ...rest } = BOSINGAK_TEXT;
  for (const t of [...Object.values(rest), ...Object.values(keeper), BOSINGAK_CARD.text]) for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(t[k], k);
  for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(BOSINGAK_TEXT.rang[k].includes('{c}'));
});
