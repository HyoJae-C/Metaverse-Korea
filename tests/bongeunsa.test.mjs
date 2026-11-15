// Bongeunsa (scripts/bongeunsa-layout.mjs, core/bongeunsa-model.js): on its
// real spot, the whole temple at 37.5% (Yozi 2026-11-15; before, only
// Daeungjeon, Beopwangru and Jinyeomun were), the Maitreya Buddha at 50%, nothing on a street or in another
// hall, and none of it in the first download.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import { BES, SCALE, BUDDHA_H, NUDGE, EXTRA, TERRACE, halls, corners, overlap } from '../scripts/bongeunsa-layout.mjs';
import { terraceHeight } from '../src/core/temple-terrace.js';
import { BONGEUNSA, TEHERAN, YEONGDONG, ASEM, lineDist, TEMPLE } from '../scripts/build-samseong.mjs';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const district = region.districts.find((d) => d.id === 'samseong');
const map = read(district.map);
const [ox, oz] = district.offset;
const temple = map.landmarks.find((l) => l.type === 'bongeunsa');
const buddha = map.landmarks.find((l) => l.type === 'maitreya');
const H = halls();
const world = ([x, z]) => [x + ox, z + oz];

test('Bongeunsa: the whole temple at 37.5% (the OpenStreetMap outlines grown 1.5 times), every hall on its spot', () => {
  assert.ok(temple && buddha, 'both landmarks on the map');
  for (const [n, h] of Object.entries(H)) {
    const moved = Math.hypot(h.x - h.osm[0], h.z - h.osm[1]);
    if (h.extra) assert.ok(moved < 0.01 || (moved < 8 && NUDGE[n]?.why), `${n} (from the guide map) moved ${moved.toFixed(1)} m, and says why`);
    else assert.ok(moved < 0.01, `${n} on its real spot: at one scale nothing has to step aside (moved ${moved.toFixed(1)} m)`);
  }
  // Daeungjeon real 24 × 22 m: 9 × 8 m at 37.5% (OSM outline × 1.5).
  assert.equal(SCALE, 1.5);
  assert.ok(H.대웅전.w > 8.5 && H.대웅전.w < 9.8 && H.대웅전.d > 7.6 && H.대웅전.d < 8.8, `Daeungjeon ${H.대웅전.w.toFixed(1)} × ${H.대웅전.d.toFixed(1)}`);
  assert.ok(H.판전.w > 6 && H.판전.w < 7.2, `Panjeon 37.5% too (${H.판전.w.toFixed(1)} m)`);
  // A courtyard is left between Daeungjeon and Beopwangru for the lanterns and the pagoda.
  const [, , , cd] = temple.canopy;
  assert.ok(cd >= 9, `courtyard ${cd} m deep`);
  // Every hall inside the real grounds.
  for (const [n, h] of Object.entries(H)) assert.ok(inPolygon(h.x, h.z, BES.grounds), `${n} inside the grounds`);
});

test('Bongeunsa: no hall on another or on a street, Jinyeomun open in the middle', () => {
  const list = Object.entries(H);
  for (let i = 0; i < list.length; i++) for (let k = i + 1; k < list.length; k++) {
    assert.ok(!overlap(corners(list[i][1], 0.35), corners(list[k][1], 0.35)), `${list[i][0]} and ${list[k][0]} apart`);
  }
  const walls = map.buildings.filter((b) => b.custom && b.p.every(([x, z]) => inPolygon(...world([x, z]), BES.grounds) || lineDist([x, z], BONGEUNSA.p) < 20));
  assert.ok(walls.length >= 14, `${walls.length} hall walls`);
  for (const b of walls) for (const q of b.p) {
    for (const r of [BONGEUNSA, TEHERAN, YEONGDONG, ASEM]) assert.ok(lineDist(q, r.p) > r.w / 2, `a hall corner ${q} off the street`);
  }
  // You walk in through Jinyeomun: its middle is clear of every wall.
  const [gx, gz] = [temple.x + temple.halls.find((h) => h[6] === '眞如門')[0], temple.z + temple.halls.find((h) => h[6] === '眞如門')[1]];
  for (const b of map.buildings) assert.ok(!inPolygon(gx, gz, b.p), 'the gate\'s middle bay is open');
  // Iljumun stands off Bongeunsa-ro's pavement.
  const il = [temple.x + temple.iljumun[0], temple.z + temple.iljumun[1]];
  assert.ok(lineDist(il, BONGEUNSA.p) - BONGEUNSA.w / 2 >= 1, 'Iljumun off the street');
});

test('the Maitreya Buddha: 50% of the real 23 m, facing south-east down its plaza, the woods off it', () => {
  assert.equal(BUDDHA_H, 11.5);
  assert.equal(buddha.h, 11.5);
  assert.ok(Number.isFinite(buddha.clear) && buddha.clear >= 6, 'the trees keep off the plaza');
  // West of Daeungjeon, up the hill; faces south-east down its plaza (Yozi's aerial photo), towards the courtyard.
  const dx = buddha.x - (temple.x + temple.halls[0][0]), dz = buddha.z - (temple.z + temple.halls[0][1]);
  assert.ok(dx < -15 && Math.abs(dz) < 8, 'west of Daeungjeon, about level with it');
  assert.ok(buddha.ry > 0.65 && buddha.ry < 1.1, `faces south-east (${buddha.ry})`);
  // The niche wall wraps round behind it (a U open to the front).
  assert.ok(Math.min(...buddha.wall.map((q) => q[1])) < -3 && buddha.wall[0][1] > 0 && buddha.wall.at(-1)[1] > 0);
  // You can't walk into its base.
  assert.ok(map.blockers.some((b) => inPolygon(buddha.x, buddha.z, b.p)));
});

test('Bongeunsa is loaded when the city is built, not in the first download', () => {
  const src = readFileSync(new URL('../src/core/landmarks.js', import.meta.url), 'utf8');
  assert.match(src, /import\('\.\/bongeunsa-model\.js'\)/);
  assert.doesNotMatch(src, /^import .*bongeunsa-model/m);
  const main = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
  assert.doesNotMatch(main, /bongeunsa-model/);
});

test('the Buddha\'s plaza is clear of every hall', () => {
  const c = Math.cos(buddha.ry), s = Math.sin(buddha.ry), [pw, pl, pc] = buddha.plaza;
  const plaza = [[-pw / 2, pc - pl / 2], [pw / 2, pc - pl / 2], [pw / 2, pc + pl / 2], [-pw / 2, pc + pl / 2]].map(([u, v]) => world([buddha.x + u * c + v * s, buddha.z - u * s + v * c]));
  for (const [n, h] of Object.entries(H)) assert.ok(!overlap(plaza, corners(h, 0.35)), `${n} off the plaza`);
});

test('the wooded hill behind the temple keeps off the halls and the Buddha\'s plaza', () => {
  assert.ok(temple.hills.length >= 6, `${temple.hills.length} mounds`);
  for (const [hx, hz, r, h] of temple.hills) {
    assert.ok(h >= 3 && h <= 7.5, `mound ${h} m high`);
    const [wx, wz] = world([temple.x + hx, temple.z + hz]);
    for (const [n, hl] of Object.entries(H)) {
      assert.ok(Math.min(...corners(hl, 0).map(([x, z]) => Math.hypot(x - wx, z - wz))) > r, `a mound off ${n}`);
    }
    assert.ok(Math.hypot(wx - (buddha.x + ox), wz - (buddha.z + oz)) > r + 4, 'a mound off the Buddha');
  }
});

test('the Maitreya Buddha stands up on a terrace, reached by its stairs (Yozi 2026-11-15)', () => {
  assert.equal(buddha.lift, TERRACE.h);
  assert.ok(TERRACE.h >= 2, 'clearly higher than the yards');
  const [pw, pl, pc] = buddha.plaza, front = pc + pl / 2, [sw, run] = buddha.stairs;
  const at = (u, v) => [Math.cos(buddha.ry) * u + Math.sin(buddha.ry) * v, -Math.sin(buddha.ry) * u + Math.cos(buddha.ry) * v]; // (plaza frame -> landmark offset)
  assert.equal(terraceHeight(buddha, ...at(0, 2)), TERRACE.h, 'the plaza in front of the statue');
  assert.equal(terraceHeight(buddha, ...at(pw / 2 - 0.2, front - 0.2)), TERRACE.h, 'its corner');
  const mid = terraceHeight(buddha, ...at(0, front + run / 2));
  assert.ok(Math.abs(mid - TERRACE.h / 2) < 0.01, `half way down the stairs (${mid})`);
  assert.equal(terraceHeight(buddha, ...at(0, front + run + 0.3)), 0, 'the foot of the stairs');
  assert.equal(terraceHeight(buddha, ...at(pw / 2 + 0.6, 0)), 0, 'beside the terrace');
  // You can't step up its side: the edge is walled off, except the stairs.
  const blocked = (u, v) => { const [dx, dz] = at(u, v); return map.blockers.some((b) => inPolygon(buddha.x + dx, buddha.z + dz, b.p)); };
  assert.ok(blocked(pw / 2 + 0.2, 0) && blocked(-pw / 2 - 0.2, 0), 'the sides');
  assert.ok(blocked(sw / 2 + 0.6, front + 0.2), 'the front beside the stairs');
  assert.ok(blocked(sw / 2 + 0.2, front + run / 2), 'the stairs\' side');
  assert.ok(!blocked(0, front + 0.2) && !blocked(0, front + run / 2), 'the stairs are open');
});

test('Bongeunsa by its own guide map: the halls OSM had no outline for, two halls in OSM\'s one outline', () => {
  for (const n of Object.keys(EXTRA)) assert.ok(H[n], n);
  assert.ok(H.향적원 && H.보우당 && H.연회다원 && !H.종루, 'OSM\'s 보우당 split in two; its 종루 is the tea house');
  assert.ok(temple.bell && temple.bell2, 'the bell pavilion (18) and the bell house (19)');
  assert.equal(temple.halls.length, Object.keys(H).length - 1, 'every hall drawn (Beopwangru on its own)');
  assert.ok(!TEMPLE.landmarks.some((l) => /문화회관/.test(JSON.stringify(l))), '25 봉은문화회관 left out (Yozi)');
});
