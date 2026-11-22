// Home decorating: pieces can't be put down on top of each other or on
// you, and a first home starts with a few basics that all fit the room.
import test from 'node:test';
import assert from 'node:assert/strict';
import { furnitureById, furnitureCollider, pieceBlocked, starterLayout } from '../src/core/furniture.js';

test('a piece on top of another is blocked; apart, or a rug, is not', () => {
  const bed = { id: 'bed', x: 0, z: 0, ry: 0 };
  assert.equal(pieceBlocked({ id: 'sofa', x: 0.3, z: 0.2, ry: 0 }, [bed]), true);
  assert.equal(pieceBlocked({ id: 'sofa', x: 3, z: 0, ry: 0 }, [bed]), false);
  assert.equal(pieceBlocked({ id: 'rug', x: 0, z: 0, ry: 0 }, [bed]), false); // rugs go under things
  assert.equal(pieceBlocked(bed, [bed, { id: 'rug', x: 0, z: 0, ry: 0 }]), false);
  // Rotated: a 1.8 m sofa turned 90° next to the bed fits side by side.
  assert.equal(pieceBlocked({ id: 'sofa', x: 1.3, z: 0, ry: Math.PI / 2 }, [bed]), false);
  assert.equal(pieceBlocked({ id: 'sofa', x: 1.3, z: 0, ry: 0 }, [bed]), true);
});

test('a piece where you stand is blocked', () => {
  assert.equal(pieceBlocked({ id: 'table', x: 0, z: 0, ry: 0 }, [], { x: 0.5, z: 0 }), true);
  assert.equal(pieceBlocked({ id: 'table', x: 0, z: 0, ry: 0 }, [], { x: 2, z: 0 }), false);
});

test('the starter room fits the apartment, overlaps nothing and keeps the door clear', () => {
  const w = 14, d = 11;
  const items = starterLayout(w, d);
  assert.ok(items.length >= 6);
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, 'one of each');
  for (const it of items) {
    assert.ok(furnitureById(it.id) && !furnitureById(it.id).item, it.id + ' is a free basic');
    assert.equal(pieceBlocked(it, items), false, it.id + ' overlaps');
    const c = furnitureCollider(it);
    for (const [x, z] of c?.p || []) {
      assert.ok(Math.abs(x) <= w / 2 && Math.abs(z) <= d / 2, it.id + ' inside the room');
      assert.ok(z < d / 2 - 2.5, it.id + ' clear of the door');
    }
  }
});

test('the Euljiro furniture shops: every new piece is an item, sold in exactly one shop, with a receipt-ready price', async () => {
  const { readFileSync } = await import('node:fs');
  const { SHOP_FURNITURE_IDS, FURNITURE } = await import('../src/core/furniture.js');
  const { ITEMS } = await import('../src/core/inventory.js');
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  const shops = stores.filter((s) => ['eulji-somok', 'eulji-sarangbang', 'eulji-retro', 'eulji-sound', 'saebyeok-living', 'saebyeok-bedroom', 'gyeol-wood', 'kkotjam-beds', 'teheran-appliances'].includes(s.id));
  assert.equal(shops.length, 9);
  const sold = shops.flatMap((s) => s.products);
  assert.equal(sold.length, SHOP_FURNITURE_IDS.length);
  for (const [id] of SHOP_FURNITURE_IDS) {
    assert.ok(FURNITURE.find((f) => f.id === id && f.item === id), id);
    assert.ok(ITEMS[id]?.furniture, id);
    const p = sold.filter((q) => q.furniture === id);
    assert.equal(p.length, 1, id);
    assert.ok(p[0].price > 0 && p[0].name.en && p[0].name.ko && p[0].desc.en, id);
  }
});

test('the free basics are the worn ones', () => {
  for (const id of ['bed', 'sofa', 'chair', 'table', 'desk', 'shelf', 'tv', 'lamp', 'plant', 'rug']) {
    const f = furnitureById(id);
    assert.ok(f && !f.item, id + ' stays free');
    assert.match(f.name.ko, /낡은|삐걱|흔들|시든|닳은/, id);
  }
});

test('each furniture shop sells three pieces', async () => {
  const { readFileSync } = await import('node:fs');
  const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
  for (const s of stores.filter((st) => st.products?.some((p) => p.furniture?.startsWith('f-')))) assert.equal(s.products.length, 3, s.id);
});

test('long sofas and benches seat two, beds lie two, cushions sit on the floor', async () => {
  const { furnitureSeats } = await import('../src/core/furniture.js');
  const n = (id) => furnitureSeats({ id, x: 0, z: 0, ry: 0 });
  for (const id of ['sofa', 'f-retro-sofa', 'f-modular', 'f-wood-bench']) assert.equal(n(id).length, 2, id);
  for (const id of ['bed', 'f-fabric-bed', 'f-flower-bed', 'f-cloud-bed', 'f-bear-bed']) { assert.equal(n(id).length, 2, id); assert.ok(n(id).every((s) => s.lie && s.bed), id); }
  assert.ok(n('f-bangseok').length === 2 && n('f-bangseok').every((s) => s.mat && s.cushion));
  for (const id of ['chair', 'f-steel-stool', 'f-beanbag', 'f-rocking']) assert.equal(n(id).length, 1, id);
  for (const id of ['table', 'f-najeon']) assert.equal(n(id).length, 0, id);
  // Turned a quarter: the two places stay side by side along the piece.
  const [a, b] = furnitureSeats({ id: 'sofa', x: 5, z: 5, ry: Math.PI / 2 });
  assert.ok(Math.abs(a.x - b.x) < 1e-9 && Math.abs(Math.abs(a.z - b.z) - 0.9) < 1e-9);
});

test('a piece set down right against you is refused, so you can always walk away', async () => {
  const { pieceBlocked, WHO_R } = await import('../src/core/furniture.js');
  assert.ok(WHO_R > 0.35); // more than a player's radius
  const stool = { id: 'f-steel-stool', x: 0, z: 0, ry: 0 }; // 0.4 × 0.4
  assert.ok(pieceBlocked(stool, [], { x: 0.55, z: 0 }), 'touching the player');
  assert.ok(!pieceBlocked(stool, [], { x: 0.75, z: 0 }), 'a step away');
});

test('both places on a bed against a wall can be reached from one side', async () => {
  const { furnitureSeats, furnitureById } = await import('../src/core/furniture.js');
  for (const id of ['bed', 'f-fabric-bed', 'f-flower-bed', 'f-cloud-bed', 'f-bear-bed']) {
    const [w, d] = furnitureById(id).size;
    const seats = furnitureSeats({ id, x: 0, z: 0, ry: 0 });
    const side = { x: w / 2 + 0.5, z: 0.3 }; // standing beside it (the other side is the wall)
    for (const s of seats) assert.ok(Math.hypot(side.x - s.x, side.z - s.z) - (s.reach || 0) < 1.3, id); // (main.js nearestSeat: 1.3 m)
    for (const s of seats) assert.ok(s.stand[1] > d / 2, id + ': get up at the foot');
  }
});

test('small things stand on a table, go with it, and only bump into things on the same top', async () => {
  const { topUnder, ridersOf, placeRiders, pieceBlocked, furnitureCollider, isSmall, TOPS } = await import('../src/core/furniture.js');
  const table = { id: 'table', x: 2, z: 1, ry: 0 };
  const lamp = { id: 'lamp-moon', x: 2.2, z: 1.1, ry: 0 };
  assert.ok(isSmall('lamp-moon') && !isSmall('bed'));
  assert.equal(topUnder(lamp, [table]).y, TOPS.table);
  assert.equal(topUnder({ ...lamp, x: 4 }, [table]), null, 'off the table: the floor');
  assert.equal(topUnder({ id: 'f-najeon', x: 2, z: 1, ry: 0 }, [table]), null, 'a wardrobe never goes on a table');
  lamp.y = TOPS.table;
  assert.ok(!pieceBlocked(lamp, [table]), 'on the table, not in its way');
  assert.equal(furnitureCollider(lamp), null, 'the table blocks you, not the lamp on it');
  const bear = { id: 'plush-bear-small', x: 2.25, z: 1.1, ry: 0, y: TOPS.table };
  assert.ok(pieceBlocked(bear, [table, lamp]), 'two things in one spot on the table');
  // Turn the table a quarter: the lamp turns with it.
  const riders = ridersOf(table, [table, lamp]);
  assert.equal(riders.length, 1);
  table.ry = Math.PI / 2;
  placeRiders(table, riders);
  assert.ok(Math.abs(lamp.x - 2.1) < 1e-9 && Math.abs(lamp.z - 0.8) < 1e-9, `${lamp.x},${lamp.z}`);
});

test('a lamp switched off dims its glow', async () => {
  const { buildFurniture } = await import('../src/core/furniture.js');
  const colors = (g) => { const out = []; g.traverse((o) => { if (o.isMesh && o.material.isMeshBasicMaterial) out.push(o.material.color.getHex()); }); return out; };
  const on = colors(buildFurniture('lamp-moon')), off = colors(buildFurniture('lamp-moon', { off: true }));
  assert.ok(on.length && on.length === off.length);
  assert.ok(off.every((c, i) => c < on[i]));
  assert.deepEqual(colors(buildFurniture('lamp-moon')), on, 'the shared glow materials are untouched');
});
