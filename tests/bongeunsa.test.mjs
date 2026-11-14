// Bongeunsa (scripts/bongeunsa-layout.mjs, core/bongeunsa-model.js): on its
// real spot at 1/4, the Maitreya Buddha at 50%, Daeungjeon, Beopwangru and
// Jinyeomun at 37.5% (Yozi 2026-11-12), nothing on a street or in another
// hall, and none of it in the first download.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import { BES, BIG, BUDDHA_H, halls, corners, overlap } from '../scripts/bongeunsa-layout.mjs';
import { BONGEUNSA, TEHERAN, YEONGDONG, ASEM, lineDist } from '../scripts/build-samseong.mjs';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const district = region.districts.find((d) => d.id === 'samseong');
const map = read(district.map);
const [ox, oz] = district.offset;
const temple = map.landmarks.find((l) => l.type === 'bongeunsa');
const buddha = map.landmarks.find((l) => l.type === 'maitreya');
const H = halls();
const world = ([x, z]) => [x + ox, z + oz];

test('Bongeunsa: the halls on their OpenStreetMap spots (1/4), the big three at 37.5%', () => {
  assert.ok(temple && buddha, 'both landmarks on the map');
  for (const [n, h] of Object.entries(H)) {
    const moved = Math.hypot(h.x - h.osm[0], h.z - h.osm[1]);
    assert.ok(moved <= 5, `${n} within 5 m of its real spot (moved ${moved.toFixed(1)} m)`);
  }
  // Daeungjeon real 24 × 22 m: 9 × 8 m at 37.5% (OSM outline × 1.5).
  assert.equal(BIG.대웅전, 1.5);
  assert.ok(H.대웅전.w > 8.5 && H.대웅전.w < 9.8 && H.대웅전.d > 7.6 && H.대웅전.d < 8.8, `Daeungjeon ${H.대웅전.w.toFixed(1)} × ${H.대웅전.d.toFixed(1)}`);
  assert.ok(H.판전.w < 5, 'Panjeon stays 1/4');
  // A courtyard is left between Daeungjeon and Beopwangru for the lanterns and the pagoda.
  const [, , , cd] = temple.canopy;
  assert.ok(cd >= 3.5, `courtyard ${cd} m deep`);
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
    assert.ok(h >= 3 && h <= 6, `mound ${h} m high`);
    const [wx, wz] = world([temple.x + hx, temple.z + hz]);
    for (const [n, hl] of Object.entries(H)) {
      assert.ok(Math.min(...corners(hl, 0).map(([x, z]) => Math.hypot(x - wx, z - wz))) > r, `a mound off ${n}`);
    }
    assert.ok(Math.hypot(wx - (buddha.x + ox), wz - (buddha.z + oz)) > r + 4, 'a mound off the Buddha');
  }
});
