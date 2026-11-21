import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { firstStopSpot, startList, startSpot, busiestStart, ANY } from '../src/game/first-stop.js';
import { TRIP_ROUTES } from '../src/core/quests.js';
import { EN } from '../src/i18n/en.js';

const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; };
const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));

// Yozi 2026-11-21: Bukchon's lanes branch right away and first-timers got
// lost, so new players start on Gwanghwamun Square instead (wide and open,
// the gate straight ahead), with the first trip on to Bukchon.
test('new players start on Gwanghwamun Square just south of the gate, facing it, unless they pick another start', () => {
  const f = firstStopSpot(region);
  assert.equal(f.k, 'tour');
  assert.equal(f.district, 'gyeongbokgung');
  assert.equal(f.trip, 'toBukchon');
  const off = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
  const gb = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
  const [lx, lz] = [f.x - off[0], f.z - off[1]];
  const gate = gb.landmarks.find((l) => l.type === 'gwanghwamun');
  const square = gb.pois.find((p) => p.name?.en === 'Gwanghwamun Square');
  const plaza = gb.areas.find((a) => a.k === 'plaza' && !a.cg && inPoly(square.x, square.z, a.p));
  assert.ok(inPoly(lx, lz, plaza.p), 'on the square');
  const toGate = lz - gate.z;
  assert.ok(toGate > gate.clear && toGate < 60, `a short walk south of the gate (${toGate.toFixed(0)} m)`);
  assert.ok(Math.abs(lx - gate.x) < 10, 'in line with the gate');
  assert.ok(!gb.buildings.some((b) => inPoly(lx, lz, b.p)), 'not inside a building');
  assert.ok(Math.abs(Math.sin(f.ry)) < 0.4 && Math.cos(f.ry) < 0, 'facing north, at the gate (turned a little east: the welcome guide stands to the left)');
});

test('the start screen offers sights, shopping, an outing, a quiet walk and a city stroll by Cheonggyecheon, each with a spot, a trip and words', () => {
  assert.deepEqual(startList(region).map((s) => s.k), ['tour', 'shop', 'activity', 'heal', 'stream']);
  for (const s of startList(region)) {
    const sp = startSpot(region, s.k);
    assert.ok(sp, s.k);
    assert.ok(s.icon, s.k + ' icon');
    if (sp.square) continue; // beside the square guide, with the square's own trip
    assert.ok([sp.x, sp.z, sp.ry].every(Number.isFinite), s.k);
    assert.ok(TRIP_ROUTES.includes(sp.trip), s.k + ' trip');
  }
  for (const k of [...startList(region).map((s) => s.k), ANY, 'where']) assert.ok(EN['start.' + k], 'start.' + k);
  assert.equal(startSpot(region, 'shop').square, true);
});

// Yozi 2026-11-15: Cheonggyecheon instead of Seoul Station (little to do
// there). Temples stay optional: no start sends new players to one.
test('the city stroll starts on Cheonggye Plaza at the head of the stream, facing down it, a short walk from a station', () => {
  const s = startSpot(region, 'stream');
  assert.equal(s.district, 'gyeongbokgung');
  const off = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
  const gb = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
  const [lx, lz] = [s.x - off[0], s.z - off[1]];
  const plaza = gb.areas.find((a) => a.cg && a.k === 'plaza' && a.p.some(([x, z]) => Math.abs(x - 28) < 20 && Math.abs(z - 187) < 25));
  let inside = false;
  for (let i = 0, j = plaza.p.length - 1; i < plaza.p.length; j = i++) {
    const [xi, zi] = plaza.p[i], [xj, zj] = plaza.p[j];
    if ((zi > lz) !== (zj > lz) && lx < ((xj - xi) * (lz - zi)) / (zj - zi) + xi) inside = !inside;
  }
  assert.ok(inside, 'on the plaza');
  const head = gb.streams.find((q) => q.id === 'cheonggyecheon').at;
  assert.ok(Math.hypot(lx - head[0], lz - head[1]) < 10, 'by the head of the stream');
  assert.ok(Math.abs(Math.sin(s.ry) - 1) < 0.01, 'facing east, down the stream');
  const near = Math.min(...region.subway.stations.flatMap((st) => st.exits.map((e) => Math.hypot(e.at[0] - s.x, e.at[1] - s.z))));
  assert.ok(near < 100, `a station within 100 m (${near.toFixed(0)} m)`);
  for (const q of startList(region)) assert.ok(!/jogyesa|bongeunsa|temple/i.test(q.district + ' ' + q.k), q.k + ' is not a temple');
});

test('"anywhere" goes where most people are; nobody about, any start at random', () => {
  const keys = ['tour', 'shop', 'activity', 'heal'];
  assert.equal(busiestStart(keys, [0, 3, 1, 0]), 'shop');
  assert.equal(busiestStart(keys, [2, 0, 5, 5], () => 0), 'activity');
  assert.equal(busiestStart(keys, [2, 0, 5, 5], () => 0.99), 'heal');
  assert.equal(busiestStart(keys, null, () => 0.5), 'activity');
  assert.equal(busiestStart([], [1]), null);
});

test('without starts, everyone starts at the square as before', () => {
  assert.equal(firstStopSpot({ spawn: {} }), null);
  assert.equal(startSpot({ spawn: { starts: [{ k: 'x', district: 'nowhere', at: [0, 0] }] }, districts: [] }, 'x'), null);
  assert.equal(firstStopSpot(null), null);
});
