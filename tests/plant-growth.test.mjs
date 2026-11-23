import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GROW_DAYS, PlantCare, growScale, isPlant } from '../src/core/plant-growth.js';
import { buildFurniture, isSmall } from '../src/core/furniture.js';
import { PLANT_IDS } from '../src/core/house-plants.js';
import { layoutMsg, parseVisitMsg } from '../src/game/home-visits.js';
import { ITEMS } from '../src/core/inventory.js';
import { GiftReceipts } from '../src/core/gift-receipts.js';
import { HOME_LEVELS } from '../src/core/home-stages.js';

const store = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('watering: once a day for each plant, and it shows the next day', () => {
  let day = '2026-11-21';
  const s = store(), c = new PlantCare(s, () => day);
  assert.equal(c.grown('plant-monstera'), 0);
  assert.equal(c.water('plant-monstera'), true);
  assert.equal(c.water('plant-monstera'), false, 'only once a day');
  assert.equal(c.days('plant-monstera'), 1);
  assert.equal(c.grown('plant-monstera'), 0, 'nothing shows on the day itself');
  assert.equal(c.water('plant-olive'), true, 'each plant has its own day');
  day = '2026-11-22';
  assert.equal(c.grown('plant-monstera'), 1, 'it shows the next day');
  assert.equal(c.wateredToday('plant-monstera'), false);
  day = '2026-11-30'; // days without water: it never wilts or shrinks
  assert.equal(c.grown('plant-monstera'), 1);
  assert.equal(c.water('plant-monstera'), true);
  assert.equal(new PlantCare(s, () => day).days('plant-monstera'), 2, 'kept in storage');
  assert.equal(c.water('plant'), false, 'the old wilted pot is not one of these');
  assert.equal(c.water('sofa'), false);
});

test('a broken save is ignored', () => {
  const s = store();
  s.setItem('mk.plants', JSON.stringify({ 'plant-olive': { n: 5, d: 'yesterday' }, sofa: { n: 3, d: '2026-11-21' }, 'plant-fern': { n: 4, d: '2026-11-20' } }));
  const c = new PlantCare(s, () => '2026-11-21');
  assert.equal(c.days('plant-olive'), 0);
  assert.equal(c.days('sofa'), 0);
  assert.equal(c.grown('plant-fern'), 4);
});

test('1% a watered day, up to twice the size (table plants: one and a half)', () => {
  assert.equal(growScale(0), 1);
  assert.equal(growScale(1), 1.01);
  assert.equal(growScale(30), 1.3);
  assert.equal(growScale(GROW_DAYS), 2);
  assert.equal(growScale(500), 2);
  assert.equal(growScale(50, { small: true }), 1.5);
  assert.equal(growScale(100, { small: true }), 1.5);
  assert.equal(growScale(100, { height: 1.7, room: 3.0 }), 3.0 / 1.7, 'not through the ceiling');
  assert.equal(growScale(100, { height: 1.7, room: 1 }), 1, 'never smaller than it was bought');
});

test('every botanic plant grows; fully grown, each fits under the lowest ceiling', () => {
  const low = Math.min(...HOME_LEVELS.map((l) => l.h));
  for (const [id] of PLANT_IDS) {
    assert.ok(isPlant(id), id);
    const h = new THREE.Box3().setFromObject(buildFurniture(id)).max.y;
    const s = growScale(GROW_DAYS, { small: isSmall(id), height: h, room: low - 0.12 });
    assert.ok(h * s <= low - 0.12 + 1e-9, `${id}: ${(h * s).toFixed(2)} m under ${low} m`);
    assert.ok(s >= 1.5 - 1e-9, `${id} still grows a good deal (${s.toFixed(2)})`);
  }
  assert.equal(isPlant('plant'), false);
});

test('visitors are told how far a plant has grown', () => {
  const lay = parseVisitMsg(layoutMsg([['plant-olive', 1, 2, 0, 0, 0, null, 37], ['bed', 0, 0, 0], ['plant-orchid', 1, 1, 0, 0.65, 0, null, 0]])).lay;
  assert.deepEqual(lay[0], ['plant-olive', 1, 2, 0, 0, 0, 0, 37]);
  assert.deepEqual(lay[1], ['bed', 0, 0, 0]);
  assert.deepEqual(lay[2], ['plant-orchid', 1, 1, 0, 0.65, 0]);
});

test('furniture received as a gift gets its receipt', async () => {
  assert.ok(ITEMS['plant-dragon'].furniture);
  const wallet = { server: true, flush: async () => true, client: { rpc: async (fn) => ({ data: fn === 'my_gifts' ? [{ item: 'plant-dragon', price: 600, op: 'op-1' }] : null }) } };
  const got = [], r = new GiftReceipts({ wallet, storage: store() });
  const n = await r.sync({ has: (id) => id === 'plant-dragon' }, { paid: () => 0, record: (...a) => got.push(a) }, ITEMS);
  assert.equal(n, 1);
  assert.deepEqual(got[0].slice(0, 3), ['plant-dragon', 600, 'op-1']);
});

test('wallpaper, floors and lamps received as a gift get their receipt too', async () => {
  const lamp = Object.keys(ITEMS).find((id) => ITEMS[id].lamp);
  const ids = ['wall-white', 'floor-marble', lamp];
  const rows = ids.map((item, i) => ({ item, price: 60000, op: 'op-' + i }));
  const wallet = { server: true, flush: async () => true, client: { rpc: async (fn) => ({ data: fn === 'my_gifts' ? rows : null }) } };
  const got = [], r = new GiftReceipts({ wallet, storage: store() });
  assert.equal(await r.sync({ has: (id) => ids.includes(id) }, { paid: () => 0, record: (...a) => got.push(a) }, ITEMS), 3);
  assert.deepEqual(got.map((a) => a[0]), ids);
});
