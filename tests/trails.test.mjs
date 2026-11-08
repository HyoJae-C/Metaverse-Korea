import test from 'node:test';
import assert from 'node:assert/strict';
import { TRAILS } from '../src/data/trails.js';
import { STAMPS } from '../src/data/stamps.js';
import { TrailLog, trailProgress, trailsWith } from '../src/core/trails.js';

const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const bookOf = (ids) => ({ has: (id) => ids.includes(id) });

test('every course stamp is a real stamp, and names and intros are in four languages', () => {
  const ids = new Set(STAMPS.map((s) => s.id));
  for (const t of TRAILS) {
    for (const id of t.stamps) assert.ok(ids.has(id), `${t.id}: ${id}`);
    for (const l of ['ko', 'en', 'ja', 'zh']) assert.ok(t.name[l] && t.intro[l], `${t.id} ${l}`);
    assert.ok(t.reward > 0);
  }
});

test('no City Wall course: the real one is the four great gates, and two of them are not on the map yet', () => {
  assert.equal(TRAILS.find((t) => t.id === 'citywall'), undefined);
  for (const id of ['sungnyemun', 'igansumun', 'heunginjimun']) assert.ok(STAMPS.some((s) => s.id === id), id + ' stays a stamp');
});

test('progress counts only stamps on this map; finishing pays once', () => {
  const t = { id: 'x', stamps: ['a', 'b', 'gone'] };
  const onMap = [{ id: 'a' }, { id: 'b' }];
  assert.deepEqual(trailProgress(t, onMap, bookOf(['a'])), { stops: ['a', 'b'], got: 1, all: 2, done: false });
  assert.equal(trailProgress(t, onMap, bookOf(['a', 'b'])).done, true);
  assert.equal(trailProgress({ id: 'y', stamps: ['gone'] }, onMap, bookOf([])).done, false);
  assert.deepEqual(trailsWith([t], 'b').map((x) => x.id), ['x']);
  const store = mem();
  const log = new TrailLog(store);
  assert.equal(log.finish('x'), true);
  assert.equal(log.finish('x'), false);
  assert.equal(new TrailLog(store).has('x'), true);
});
