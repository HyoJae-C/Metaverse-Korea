import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOSINGAK, BOSINGAK_TEXT, BOSINGAK_CARD, newYearStroke, nearBell, strikePose } from '../src/data/bosingak.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) c = !c; } return c; };

test('Bosingak stands on the north side of Jongno, east of Sejong-daero', () => {
  const jongno = map.roads.find((r) => r.n?.en === 'Jong-ro');
  const sejong = map.roads.find((r) => r.n?.en === 'Sejong-daero');
  const [x, z] = BOSINGAK.at;
  assert.ok(z < jongno.p[0][1] - jongno.w / 2, 'north of Jongno');
  assert.ok(x > sejong.p[0][0], 'east of Sejong-daero');
  assert.ok(BOSINGAK.plaza[3] <= jongno.p[0][1] - jongno.w / 2 + 0.01, 'its square stops at the street');
  assert.ok(map.landmarks.some((l) => l.type === 'bosingak' && l.x === x && l.z === z));
  assert.ok(map.pois.some((p) => p.name.ko === '보신각'));
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

test('the striker draws back, hits, and the bell hums after', () => {
  assert.deepEqual(strikePose(-1), { pull: 0, shake: 0 });
  assert.ok(strikePose(0.9).pull > 0.99);
  assert.ok(strikePose(1.15).pull < 0.01 && strikePose(1.2).shake > 0.9);
  assert.equal(strikePose(7).shake, 0);
});

test('its words are in Korean, English, Japanese and Chinese', () => {
  for (const t of [...Object.values(BOSINGAK_TEXT), BOSINGAK_CARD.text]) for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(t[k], k);
  for (const k of ['en', 'ko', 'ja', 'zh']) assert.ok(BOSINGAK_TEXT.rang[k].includes('{c}'));
});
