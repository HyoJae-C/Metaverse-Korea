import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { toGame } from '../src/core/seoul-grid.js';
import { createSeonjeongneungNear } from '../src/game/seonjeongneung-near.js';

// Seonjeongneung (서울 선릉과 정릉, scripts/build-seonjeongneung.mjs): the
// grounds at 1/4 on OpenStreetMap's outline, what stands at the tombs at 50%
// on its real spot (Yozi 2026-11-24).
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url), 'utf8'));
const region = read('region.json');
const map = read('districts/seonjeongneung.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/seonjeongneung-osm.json', import.meta.url), 'utf8'));
const dist = region.districts.find((d) => d.id === 'seonjeongneung');
const [OX, OZ] = dist.offset;
const L = ([lat, lon]) => { const [x, z] = toGame(lat, lon); return [x - OX, z - OZ]; };
const ring = (p) => (p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1] ? p.slice(0, -1) : p);
const mid = (p) => [p.reduce((s, q) => s + q[0], 0) / p.length, p.reduce((s, q) => s + q[1], 0) / p.length];
const span = (p) => { let d = 0; for (const a of p) for (const b of p) d = Math.max(d, Math.hypot(a[0] - b[0], a[1] - b[1])); return d; };
const segD = (x, z, a, b) => { const dx = b[0] - a[0], dz = b[1] - a[1], t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); };
const lineD = (x, z, p) => p.slice(1).reduce((d, q, i) => Math.min(d, segD(x, z, p[i], q)), Infinity);
const inside = (p, x, z) => { let r = false; for (let i = 0, j = p.length - 1; i < p.length; j = i++) { const [xi, zi] = p[i], [xj, zj] = p[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) r = !r; } return r; };
const lms = (type) => map.landmarks.filter((l) => l.type === type);

test('Seonjeongneung sits on its real spot in Gangnam-gu, its main gate the (0, 0)', () => {
  assert.ok(dist, 'in region.json');
  const [x, z] = toGame(osm.entrance[0], osm.entrance[1]);
  assert.ok(Math.hypot(x - OX, z - OZ) < 1, 'the main gate by the ticket office on its OSM spot');
  const gu = read('seoul.json').gu.find((g) => g.id === 'gangnam');
  assert.ok(gu.districts.includes('seonjeongneung'));
  assert.ok(map.meta.enclosure?.poly?.length > 5, 'walled: the tombs are built when you walk in');
});

test('the grounds are OSM\'s outline less the streets round it (1/4)', () => {
  const raw = osm.outline.map(L);
  const area = (p) => Math.abs(p.reduce((s, q, i) => { const n = p[(i + 1) % p.length]; return s + q[0] * n[1] - n[0] * q[1]; }, 0) / 2);
  const park = map.areas.find((a) => a.k === 'park').p;
  assert.ok(area(park) / area(raw) > 0.88 && area(park) <= area(raw) + 1, `${Math.round(area(park))} of ${Math.round(area(raw))} m²`);
  const streets = [...osm.streets.map((s) => s.p.map(L)), osm.seolleungRo.map(L)];
  for (const [x, z] of park) {
    const onOsm = lineD(x, z, [...raw, raw[0]]) < 1;
    const byStreet = streets.some((s) => lineD(x, z, s) < 7);
    assert.ok(onOsm || byStreet, `outline point ${x},${z}: within 1 m of OSM, or cut back by a street`);
  }
});

test('the mounds, shrine halls and stele sheds are twice their 1/4 size (50%), on their real spots', () => {
  const tombs = lms('royaltomb');
  assert.equal(tombs.length, 3);
  for (const d of [osm.seolleung, osm.jeonghyeon, osm.jeongneung]) {
    const t = ring(d.tomb).map(L), c = mid(t);
    const l = tombs.find((q) => Math.hypot(q.x - c[0], q.z - c[1]) < 0.5);
    assert.ok(l, 'a tomb on its OSM mound');
    assert.ok(Math.abs(l.mound - span(t) * 2) < 0.6, `mound ${l.mound} m, OSM at 50% ${(span(t) * 2).toFixed(1)} m`);
  }
  const halls = lms('jeongjagak');
  assert.equal(halls.length, 2);
  for (const d of [osm.seolleung, osm.jeongneung]) {
    const p = ring(d.platform).map(L), c = mid(p);
    const l = halls.find((q) => Math.hypot(q.x - c[0], q.z - c[1]) < 1);
    assert.ok(l, 'a shrine hall on its OSM platform');
    assert.ok(Math.abs(Math.hypot(...l.base) - span(p) * 2) < 1, 'platform at 50%');
  }
  for (const d of [osm.seolleung, osm.jeongneung]) {
    const g = L(d.gate), l = lms('hongsalmun').find((q) => Math.hypot(q.x - g[0], q.z - g[1]) < 15);
    assert.ok(l, 'a red gate within 15 m of its OSM spot (60 m in Seoul)');
  }
  assert.equal(lms('bigak').length, 2);
});

test('the hills are fenced, keep off the shrine halls and stay inside the wall', () => {
  const park = map.areas.find((a) => a.k === 'park').p;
  for (const t of lms('royaltomb')) {
    const hill = t.hill.p.map(([x, z]) => [t.x + x, t.z + z]);
    assert.ok(map.blockers.some((b) => b.p.length === hill.length && Math.abs(b.p[0][0] - hill[0][0]) < 0.2), 'its hill is a blocker');
    for (const [x, z] of hill) assert.ok(inside(park, x, z), 'inside the grounds');
    for (const h of lms('jeongjagak')) assert.ok(!inside(hill, h.x, h.z), 'not over a shrine hall');
    assert.ok(t.hill.h <= 4, 'about half a 7 m hill');
  }
});

test('every path and the front of each hall can be walked to from the main gate', () => {
  const out = execFileSync(process.execPath, [new URL('../scripts/build-seonjeongneung.mjs', import.meta.url).pathname, '--check'], { encoding: 'utf8' });
  assert.match(out, /every gate, hall front, visitor spot and path point can be walked to/);
  assert.match(out, /clash: 'none'/);
});

test('made-up and moved things are written down', () => {
  const what = map.meta.approx.map((a) => a.what).join(' | ');
  for (const w of ['tomb hills', 'stone figures', 'Information Center']) assert.ok(what.includes(w), w);
  for (const n of map.meta.nudges) assert.ok(n.m <= 15 && n.why, `${n.what}: ${n.m} m`);
});

test('visitors stand at the tombs and walk the paths once you come near', () => {
  const added = [];
  const makeNpc = () => ({ tag: { style: {} }, ch: { root: { position: { set(x, y, z) { this.x = x; this.z = z; } }, rotation: {}, visible: true }, animate() {} } });
  const lmTombs = region.districts && map.landmarks.filter((l) => l.type === 'tombvisitors').map((l) => ({ ...l, x: l.x + OX, z: l.z + OZ }));
  const v = createSeonjeongneungNear({ landmarks: lmTombs, scene: { add: (o) => added.push(o) }, makeNpc });
  v.update({ x: OX + 500, z: OZ }, 0.1);
  assert.equal(added.length, 0, 'not made from far');
  const s = lmTombs[0].spots[0].at;
  v.update({ x: OX + s[0], z: OZ + s[1] }, 0.1);
  assert.ok(added.length >= 5, `${added.length} visitors`);
  const walker = v.list.find((q) => q.walk);
  const before = walker.n.ch.root.position.x;
  for (let i = 0; i < 20; i++) v.update({ x: OX + s[0], z: OZ + s[1] }, 0.25);
  assert.notEqual(walker.n.ch.root.position.x, before, 'the walkers walk');
});
