import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { inPoly, trailNear } from '../src/core/skypark-ground.js';
import { bukhanHeight, padRing } from '../src/core/bukhan-ground.js';
import { createBukhansanWalk, SUMMIT_R, climbPace, CLIMB } from '../src/game/bukhansan-walk.js';
import { BUKHAN, OFFSET, EXITS } from '../scripts/build-bukhansan.mjs';
import { summitOpen, woodColor, BUKHAN_PARK } from '../src/game/bukhansan-park.js';
import { SUMMIT, ringGeometry } from '../src/game/bukhansan-summit.js';
import { VIEW } from '../src/game/bukhansan-view.js';

// Bukhansan (북한산), the Baegundae course from Bukhansan Ui Station
// (scripts/build-bukhansan.mjs): at 1/4 on its real place, the mountain its
// height above the station at 1/4, the way on its OSM line and walkable, the
// made-up things marked.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const bh = read('districts/bukhansan.json');
const view = read('bukhansan-view.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/bukhansan-osm.json', import.meta.url), 'utf8'));
const dist = region.districts.find((d) => d.id === 'bukhansan');
const [ox, oz] = dist.offset;
const l = bh.landmarks.find((q) => q.type === 'bukhansan');
const L = ([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; };
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const real = osm.legs.flatMap((g) => g.ways.map((w) => w.p.map(L)));
const onOsm = (x, z) => Math.min(...real.map((p) => lineDist(x, z, p)));
const pad = (k) => l.pads.find((p) => p.k === k);

test('on its real place: Bukhansan Ui Station at the anchor, its exits on OSM and off the road', () => {
  assert.deepEqual(dist.offset, OFFSET);
  const [sx, sz] = L(osm.spots.station.at);
  assert.ok(Math.hypot(sx, sz) < 1, 'the station is the district\'s (0, 0)');
  const st = region.subway.stations.find((s) => s.id === 'bukhansan-ui-station');
  assert.ok(st, 'the station is on the subway');
  assert.equal(st.exits.length, osm.exits.length);
  const road = bh.roads[0];
  for (const e of osm.exits) {
    const [x, z] = L(e.at), mine = st.exits.find((q) => q.n === e.n);
    assert.ok(mine, `exit ${e.n}`);
    const [mx, mz] = [mine.at[0] - ox, mine.at[1] - oz];
    assert.ok(Math.hypot(mx - x, mz - z) < 15, `exit ${e.n} is ${Math.hypot(mx - x, mz - z).toFixed(1)} m from OSM`);
    assert.ok(lineDist(mx, mz, road.p) > road.w / 2, `exit ${e.n} is off the road`);
    assert.ok(!inPoly(mx, mz, l.foot), `exit ${e.n} is off the mountain`);
  }
  assert.deepEqual(st.exits, EXITS.map(({ n, at, ry }) => ({ n, at, ry })));
});

test('the way is on its OSM line (within 1 m), the open ways only, from the station to the top', () => {
  assert.deepEqual(l.trails.map((t) => t.k), ['road', 'path', 'path', 'path', 'steps']);
  for (const t of l.trails) for (const [x, z] of t.p) assert.ok(onOsm(x, z) < 1, `${t.k} at ${x}, ${z} is ${onOsm(x, z).toFixed(1)} m off OSM`);
  for (const [x, z] of bh.roads[0].p) assert.ok(onOsm(x, z) < 1.5, `the road in town at ${x}, ${z}`);
  // one line, end to end
  for (let i = 1; i < l.trails.length; i++) {
    const a = l.trails[i - 1].p.at(-1), b = l.trails[i].p[0];
    assert.ok(Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.3 && Math.abs(a[2] - b[2]) < 0.15, `stretch ${i} starts where ${i - 1} ends`);
  }
  const end = l.trails.at(-1).p.at(-1);
  assert.ok(Math.hypot(end[0] - l.summit.at[0], end[1] - l.summit.at[1]) < pad('peak').r, 'the steps end on the top');
  const [px, pz] = L(osm.peaks.find((p) => p.name.includes('백운대')).at);
  assert.ok(Math.hypot(l.summit.at[0] - px, l.summit.at[1] - pz) < 1, 'the top is OSM\'s Baegundae');
  for (const [k, spot] of [['center', 'center'], ['haru', 'haru'], ['gate', 'gate']]) {
    const [x, z] = L(osm.spots[spot].at);
    assert.ok(Math.hypot(pad(k).at[0] - x, pad(k).at[1] - z) < 15, `${k} is ${Math.hypot(pad(k).at[0] - x, pad(k).at[1] - z).toFixed(1)} m from its OSM spot`);
  }
});

test('the mountain: its height above the station at 1/4, walkable all the way, 0 at its foot', () => {
  assert.ok(Math.abs(l.summit.y - 191.9) < 0.3, `Baegundae ${l.summit.y} m over the station (835.6 m, the station at about 68 m, at 1/4)`);
  assert.equal(bukhanHeight(l, ...l.summit.at), l.summit.y);
  for (const [name, y] of [['인수봉', 185.7], ['만경대', 183.1]]) {
    const p = l.peaks.find((q) => q.name === name);
    assert.ok(Math.abs(p.y - y) < 0.5 && p.y < l.summit.y, `${name} ${p.y} m, under Baegundae`);
    assert.ok(Math.abs(bukhanHeight(l, ...p.at) - p.y) < 3, `${name}'s ground reaches it`);
  }
  let worst = 0;
  for (const [x, z] of l.foot) worst = Math.max(worst, bukhanHeight(l, x, z));
  assert.ok(worst < 0.5, `the foot meets the ground (${worst.toFixed(2)} m)`);
  for (const t of l.trails) {
    const max = (t.k === 'steps' ? BUKHAN.stairMax : t.k === 'road' ? BUKHAN.roadMax : BUKHAN.pathMax) + 0.06; // (with rounding)
    assert.ok(max < (t.k === 'steps' ? 0.67 : 0.4));
    for (let i = 0; i < t.p.length; i++) {
      let j = i + 1, d = 0;
      while (j < t.p.length && (d += Math.hypot(t.p[j][0] - t.p[j - 1][0], t.p[j][1] - t.p[j - 1][1])) < 3) j++;
      if (j >= t.p.length) break;
      const g = Math.abs(t.p[j][2] - t.p[i][2]) / d;
      assert.ok(g < max, `${t.k} climbs ${(Math.atan(g) * 180 / Math.PI).toFixed(0)}° at ${t.p[i]}`);
    }
    for (let i = 1; i < t.p.length; i++) assert.ok(t.p[i][2] >= t.p[i - 1][2] - 0.6, `${t.k} keeps going up at ${t.p[i]}`);
  }
});

test('the stops are level, on the way, and the ground under the way is the way', () => {
  assert.deepEqual(l.pads.map((p) => p.k), ['center', 'haru', 'hut', 'gate', 'peak']);
  for (const p of l.pads) {
    for (const [x, z] of [p.at, ...padRing(p, 8).map(([a, b]) => [p.at[0] + (a - p.at[0]) * 0.9, p.at[1] + (b - p.at[1]) * 0.9])]) assert.equal(bukhanHeight(l, x, z), p.y, `${p.k} is level`);
    const n = Math.min(...l.trails.map((t) => trailNear(t, p.at[0], p.at[1]).d));
    assert.ok(n < p.r, `${p.k} is on the way (${n.toFixed(1)} m)`);
    assert.ok(inPoly(p.at[0], p.at[1], l.foot), `${p.k} is on the mountain`);
  }
  let worst = 0;
  for (const t of l.trails) for (const [x, z, y] of t.p) worst = Math.max(worst, Math.abs(bukhanHeight(l, x, z) - y));
  assert.ok(worst < 0.8, `standing on the way you are at its height (worst ${worst.toFixed(2)} m)`);
});

test('made-up things are listed; the hut and the centre stay plain until there are photos', () => {
  for (const what of ['outline', 'lift', 'climb', 'summit steps', 'level places', 'Baegun Hut', 'Information Center']) assert.ok(bh.meta.approx.some((a) => a.what.includes(what) && a.why), what);
  assert.ok(inPoly(l.hut.at[0], l.hut.at[1], l.foot) && inPoly(l.office.at[0], l.office.at[1], l.foot));
});

test('the walk: decks on the way and the stops, height on the mountain, the view\'s button at the flag only', () => {
  const decks = [];
  const landmarks = bh.landmarks.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz }));
  const walk = createBukhansanWalk({ landmarks, collision: { addDeck: (p) => decks.push(p) }, text: (k) => k });
  assert.equal(decks.length, l.pads.length + l.trails.reduce((n, t) => n + t.p.length - 1, 0));
  const t = l.trails[2], mid = t.p[Math.floor(t.p.length / 2)];
  assert.ok(Math.abs(walk.y(mid[0] + ox, mid[1] + oz) - mid[2]) < 0.8, 'on the path at its height');
  assert.equal(walk.y(ox + 300, oz + 300), 0);
  const [sx, sz] = walk.summit;
  assert.deepEqual(walk.acts({ x: sx + 1, z: sz }).map((a) => a.key), ['bukhan-view']);
  assert.deepEqual(walk.acts({ x: sx + SUMMIT_R + 1, z: sz }), []);
  assert.equal(walk.group, null, 'nothing is built until you come near');
  assert.deepEqual(createBukhansanWalk({ landmarks: [] }).acts({ x: 0, z: 0 }), []);
});

test('the view from the top: the real skyline all the way round, and real places only', () => {
  assert.equal(view.n, 720);
  for (const r of view.ridge) assert.equal(r.length, view.n);
  assert.equal(view.ridge.length, view.bands.length - 1);
  assert.ok(view.places.length >= 4);
  for (const p of view.places) assert.ok(p.az >= 0 && p.az < 360 && p.km > 0 && p.name?.en && p.name?.ko, JSON.stringify(p));
  assert.ok(view.places.some((p) => p.name.en.includes('Namsan')));
});

test('the steeper the way the slower you go: full pace on the flat and the stops, slowest on the steps', () => {
  assert.equal(climbPace(0), 1);
  assert.equal(climbPace(CLIMB.easy), 1);
  assert.ok(Math.abs(climbPace(CLIMB.path) - CLIMB.pathPace) < 1e-9 && climbPace(2) === CLIMB.stepsPace);
  for (let g = 0; g < 1; g += 0.02) assert.ok(climbPace(g + 0.02) <= climbPace(g), 'never faster on a steeper slope');
  const landmarks = bh.landmarks.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz }));
  const walk = createBukhansanWalk({ landmarks });
  const at = ([x, z]) => walk.pace({ x: x + ox, z: z + oz });
  assert.equal(at([10, 0]), 1, 'by the station');
  for (const p of l.pads) assert.equal(at(p.at), 1, `${p.k} is level`);
  const mid = (t) => t.p[Math.floor(t.p.length / 2)];
  const road = at(l.trails[0].p[20]), path = at(mid(l.trails[1])), steps = at(mid(l.trails[4]));
  assert.ok(road > 0.9, `the valley road's start ${road.toFixed(2)}`);
  assert.ok(path < 0.75 && path >= CLIMB.pathPace - 0.08, `the path to Harujae ${path.toFixed(2)}`);
  assert.ok(steps < path && steps >= CLIMB.stepsPace, `the steps ${steps.toFixed(2)}`);
  // how long the climb takes on foot (6.5 m/s on the flat)
  let s = 0;
  for (const t of l.trails) for (let i = 1; i < t.p.length; i++) s += Math.hypot(t.p[i][0] - t.p[i - 1][0], t.p[i][1] - t.p[i - 1][1]) / (6.5 * at([(t.p[i][0] + t.p[i - 1][0]) / 2, (t.p[i][1] + t.p[i - 1][1]) / 2]));
  console.log(`the climb on foot: ${Math.round(s)} s`);
  assert.ok(s > 180 && s < 300, `the climb takes ${Math.round(s)} s on foot`);
});

test('on the mountain you go on foot: you get off a bike or a car at its edge, a friend\'s seat is left alone', () => {
  const landmarks = bh.landmarks.map((q) => ({ ...q, x: q.x + ox, z: q.z + oz }));
  let riding = 1;
  const said = [];
  const walk = createBukhansanWalk({ landmarks, riding: () => riding, getOff: () => { riding = 0; }, toast: (m) => said.push(m), text: (k) => k });
  assert.equal(walk.on(ox, oz), false, 'the station is in town');
  for (const p of l.pads) assert.ok(walk.on(p.at[0] + ox, p.at[1] + oz), `${p.k} is on the mountain`);
  walk.update({ x: ox, z: oz }, 0.016);
  assert.equal(riding, 1, 'in town you ride');
  const [x, z] = l.trails[0].p[30];
  walk.update({ x: x + ox, z: z + oz }, 0.016);
  assert.equal(riding, 0);
  assert.deepEqual(said, ['bukhan.noRide']);
  riding = 3;
  walk.update({ x: x + ox, z: z + oz }, 0.016);
  assert.equal(riding, 3);
});

test('the top is drawn its own way only above the gate: it opens as you climb the steps', () => {
  const gate = pad('gate'), hut = pad('hut');
  assert.equal(summitOpen(gate.y, gate.y), 0, 'at the gate: the street as usual');
  assert.equal(summitOpen(hut.y, gate.y), 0);
  assert.equal(summitOpen(l.summit.y, gate.y), 1, 'at the top: all of it');
  const steps = l.trails.at(-1).p;
  for (let i = 1; i < steps.length; i++) assert.ok(summitOpen(steps[i][2], gate.y) >= summitOpen(steps[i - 1][2], gate.y), 'more of it the higher you are');
  // the sea of clouds lies under every stop you can stand on up there, and over the valleys
  const seaY = l.summit.y - SUMMIT.seaUnder;
  assert.ok(seaY < hut.y - 20 && seaY > pad('haru').y - 10, `the clouds at ${seaY.toFixed(0)} m`);
  for (const name of ['인수봉', '만경대']) assert.ok(l.peaks.find((q) => q.name === name).y > seaY + 40, `${name} stands out of the clouds`);
  // looking down past the sea's rim you see the far country, not the ground: the ring reaches lower than the rim
  const rim = Math.atan(SUMMIT.seaUnder / SUMMIT.seaR) * 180 / Math.PI;
  assert.ok(rim < -SUMMIT.low * SUMMIT.tall - 3, `the sea's rim is ${rim.toFixed(1)}° down, the ring goes to ${(-SUMMIT.low * SUMMIT.tall).toFixed(1)}°`);
  assert.ok(SUMMIT.ring < 2000 && SUMMIT.seaR < SUMMIT.ring, 'inside what the camera sees');
  assert.ok(BUKHAN_PARK.lift > 0 && BUKHAN_PARK.lift <= 0.4, 'the haze pulls back past the peaks next door, not over the city');
});

test('the far country stands where it is: north of the top is north in the picture', () => {
  const R = 100, g = ringGeometry(R, 10, 8, 2), pos = g.getAttribute('position'), uv = g.getAttribute('uv');
  // column 2 of 8 = bearing 90° = east (+x), a quarter of the way along the strip
  assert.ok(Math.abs(pos.getX(2) - R) < 1e-6 && Math.abs(pos.getZ(2)) < 1e-6 && uv.getX(2) === 0.25);
  assert.ok(Math.abs(pos.getZ(0) + R) < 1e-6, 'bearing 0 is north (-z)');
  // Insubong's own bearing in the picture's data matches where the game has it
  const insu = l.peaks.find((q) => q.name === '인수봉'), b = (Math.atan2(insu.at[0] - l.summit.at[0], -(insu.at[1] - l.summit.at[1])) * 180 / Math.PI + 360) % 360;
  assert.ok(Math.abs(b - view.places.find((q) => q.k === 'insubong').az) < 2, `Insubong at ${b.toFixed(1)}°`);
  // level in the picture is level on the ring
  const rows = 2, top = 3 * 9 - 1;
  assert.ok(uv.getY(top) <= 1 && uv.getY(0) >= 0 && uv.getY(0) === (SUMMIT.low - VIEW.bottom) / (VIEW.top - VIEW.bottom));
  assert.equal(rows, 2);
});

test('the far woods are one mass: clumps in the wood\'s greens or the season\'s colour, never mud', () => {
  let green = 0;
  for (let n = 0; n < 400; n++) { const c = woodColor(n, 0.5); assert.ok(c.r >= 0 && c.g > 0.02 && c.g <= 1, `a colour (${c.getHexString()})`); if (c.g > c.r) green++; }
  assert.ok(green > 200, `most clumps stay green (${green} of 400)`);
  assert.ok(BUKHAN_PARK.woodFrom >= 12, 'by the way you still walk among trees');
});
