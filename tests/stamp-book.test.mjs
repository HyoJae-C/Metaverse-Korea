import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StampBook, availableStamps, STAMP_REWARD } from '../src/core/stamp-book.js';
import { STAMPS } from '../src/data/stamps.js';

const memory = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };

test('each stamp pays once and remembers the day', () => {
  const st = memory();
  const b = new StampBook(st);
  const day = new Date(2026, 10, 5, 12).getTime();
  assert.equal(b.stamp('namsan', day), true);
  assert.equal(b.stamp('namsan', day), false);
  assert.equal(b.date('namsan'), '2026-11-05');
  const again = new StampBook(st);
  assert.ok(again.has('namsan'));
  assert.equal(again.count(STAMPS), 1);
  assert.equal(STAMP_REWARD, 10000);
});

test('a broken save starts empty', () => {
  const st = memory();
  st.setItem('mk.stamps', '{oops');
  assert.equal(new StampBook(st).count(STAMPS), 0);
});

test('a stand beside a shop only exists once the shop does', () => {
  const ids = availableStamps(STAMPS, (id) => id !== 'national-museum').map((s) => s.id);
  assert.ok(!ids.includes('museum'));
  assert.equal(ids.length, STAMPS.length - 1);
});

test('stamp entries are complete and unique', () => {
  const seen = new Set();
  for (const s of STAMPS) {
    assert.ok(!seen.has(s.id), s.id); seen.add(s.id);
    assert.ok(s.place.store || s.place.at, s.id);
    for (const l of ['ko', 'en', 'ja', 'zh']) { assert.ok(s.name[l], s.id + l); assert.ok(s.gu[l], s.id + l); }
    assert.match(s.color, /^#[0-9a-f]{6}$/);
    assert.ok(['circle', 'square'].includes(s.shape));
  }
});

test('the Namsan stamp stands on the summit plaza, inside the cable car room', async () => {
  const { roomSpots } = await import('../src/core/stamp-stands.js');
  const { cableFloor, CC } = await import('../src/core/cablecar.js');
  const [spot] = roomSpots(STAMPS, 'namsan-sky-cable');
  assert.equal(spot.stamp.id, 'namsan');
  assert.equal(cableFloor(spot.x, spot.z), CC.top);
  assert.ok(Math.abs(spot.x) < CC.w / 2 - 1.5, 'inside the railings');
});

test('the stamp note follows STAMP_ORDER, which names only real stamps once', async () => {
  const { STAMP_ORDER } = await import('../src/core/stamp-book.js');
  const ids = new Set(STAMPS.map((s) => s.id));
  for (const id of STAMP_ORDER) assert.ok(ids.has(id), `${id} in STAMP_ORDER is not a stamp`);
  assert.equal(new Set(STAMP_ORDER).size, STAMP_ORDER.length);
  const list = availableStamps(STAMPS, () => true).map((s) => s.id);
  assert.deepEqual(list.slice(0, STAMP_ORDER.length).filter((id) => STAMP_ORDER.includes(id)), STAMP_ORDER.filter((id) => list.includes(id)));
  assert.equal(list[0], 'gyeongbokgung'); // Jongno first (Yozi)
});
