import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { ROOM_SIZES } from '../src/core/interior.js';

// Mokdong Ice Rink (scripts/build-mokdong.mjs): the rink, the two stadiums
// and the two roads on their real places at 1/4 (OpenStreetMap), the door
// on open ground, what is made up marked as such.
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = read('region.json');
const md = read('districts/mokdong.json');
const { stores } = read('stores.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/mokdong-osm.json', import.meta.url), 'utf8'));
const [ox, oz] = region.districts.find((d) => d.id === 'mokdong').offset;
const rink = md.landmarks.find((l) => l.type === 'mokdongrink');
const W = (k) => osm.ways[k].p.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; });
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const ringDist = (x, z, p) => lineDist(x, z, [...p, p[0]]);
const inPoly = (x, z, p) => { let c = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; };
const B = (en) => md.buildings.find((b) => b.n?.en === en);

test('the rink and the stadiums are on their real outlines (OSM at 1/4, within 1 m)', () => {
  assert.match(osm.source, /OpenStreetMap/);
  const real = W('rink');
  for (const [x, z] of [...rink.hall, ...rink.lobby, ...B('Mokdong Ice Rink').p]) assert.ok(ringDist(x, z, real) < 1, `rink corner ${x}, ${z}`);
  for (const [en, k] of [['Mokdong Baseball Stadium', 'ballpark'], ['Mokdong Main Stadium', 'stadium']]) {
    const b = B(en), o = W(k);
    assert.ok(b && b.custom, `${en} is drawn by the site`);
    for (const [x, z] of b.p) assert.ok(ringDist(x, z, o) < 1, `${en} corner ${x}, ${z}`);
  }
  // the anchor (the middle of the ice hall) is the district's (0, 0)
  const cx = rink.hall.reduce((s, p) => s + p[0], 0) / rink.hall.length, cz = rink.hall.reduce((s, p) => s + p[1], 0) / rink.hall.length;
  assert.ok(Math.hypot(cx, cz) < 3, `the hall is round (0, 0): ${cx.toFixed(1)}, ${cz.toFixed(1)}`);
});

test('the hall is the real size at 1/4: about 17 by 25 m (real 68 by 100 m)', () => {
  const u = [Math.cos(rink.axis), Math.sin(rink.axis)], v = [-Math.sin(rink.axis), Math.cos(rink.axis)];
  const span = (d) => { const s = rink.hall.map(([x, z]) => x * d[0] + z * d[1]); return Math.max(...s) - Math.min(...s); };
  assert.ok(span(u) > 15 && span(u) < 19, `wide ${span(u).toFixed(1)}`);
  assert.ok(span(v) > 23 && span(v) < 28, `long ${span(v).toFixed(1)}`);
  // the room inside is a game room, bigger than the building on purpose
  assert.ok(ROOM_SIZES.icerink.w > span(v) && ROOM_SIZES.icerink.d > span(u));
});

test('the roads: Gukhoe-daero and Mokdongdong-ro within 10 m of the real ones', () => {
  const g = md.roads.find((r) => r.n.en === 'Gukhoe-daero'), d = md.roads.find((r) => r.n.en === 'Mokdongdong-ro');
  const gReal = ['gukhoeN', 'gukhoeMid', 'gukhoeS'].map(W), dReal = ['dongroW', 'dongro'].map(W);
  for (const [x, z] of g.p) assert.ok(Math.min(...gReal.map((p) => lineDist(x, z, p))) < 10, `Gukhoe-daero at ${x}, ${z}`);
  for (const [x, z] of d.p) assert.ok(Math.min(...dReal.map((p) => lineDist(x, z, p))) < 10, `Mokdongdong-ro at ${x}, ${z}`);
  assert.ok(md.meta.approx.some((a) => /Gukhoe-daero/.test(a.what)), 'one road for three carriageways is marked as made up');
});

test('nothing stands on a road or on another building', () => {
  for (const b of md.buildings) {
    for (const r of md.roads) for (const [x, z] of b.p) assert.ok(lineDist(x, z, r.p) > r.w / 2, `${b.n?.en} corner ${x}, ${z} is off ${r.n.en}`);
    for (const o of md.buildings) if (o !== b) for (const [x, z] of b.p) assert.ok(!inPoly(x, z, o.p), `${b.n?.en} corner ${x}, ${z} is outside ${o.n?.en}`);
  }
});

test('the door: in front of the lobby, on open ground, and where the store is', () => {
  const [dx, dz] = rink.door;
  const s = stores.find((x) => x.id === 'mokdong-ice-rink');
  assert.ok(s && s.workshop === 'icerink' && s.front === 'landmark');
  assert.ok(Math.hypot(s.at[0] - ox - dx, s.at[1] - oz - dz) < 0.2, 'the store is at the door');
  assert.ok(Math.abs(s.face - rink.face) < 0.01);
  for (const b of md.buildings) assert.ok(!inPoly(dx, dz, b.p), `the door is outside ${b.n?.en}`);
  for (const r of md.roads) assert.ok(lineDist(dx, dz, r.p) > r.w / 2 + 0.5, `the door is off ${r.n.en}`);
  const front = ringDist(dx, dz, rink.lobby);
  assert.ok(front > 1 && front < 3, `the door is ${front.toFixed(1)} m in front of the lobby`);
  assert.ok(md.areas.some((a) => inPoly(dx, dz, a.p)), 'the door is on the forecourt');
});

test('the Information Center is on the forecourt and marked as made up', () => {
  const info = stores.find((x) => x.id === 'info-mokdong');
  const b = md.buildings.find((x) => x.n === 'info');
  assert.ok(info);
  assert.ok(Math.hypot(info.at[0] - ox - rink.door[0], info.at[1] - oz - rink.door[1]) < 30, 'a short walk from the rink door');
  assert.ok(md.meta.approx.some((a) => /Information Center/.test(a.what)));
  assert.ok(b);
  for (const o of md.buildings) if (o !== b) for (const [x, z] of b.p) assert.ok(!inPoly(x, z, o.p));
});
