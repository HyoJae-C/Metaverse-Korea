import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, applySnapshot, pickNewer } from '../src/core/cloud-save.js';

function fakeStorage(init = {}) {
  const m = new Map(Object.entries(init));
  return {
    get length() { return m.size; },
    key: (i) => [...m.keys()][i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

test('snapshot takes only game keys', () => {
  const s = fakeStorage({ 'mk.wallet': '{"coins":5}', 'mk.items': '["tandem"]', mkauth: 'secret', other: 'x' });
  assert.deepEqual(snapshot(s), { 'mk.wallet': '{"coins":5}', 'mk.items': '["tandem"]' });
});

test('applySnapshot writes only game keys', () => {
  const s = fakeStorage();
  applySnapshot({ 'mk.wallet': '{"coins":9}', mkauth: 'nope', 'mk.bad': 5 }, s);
  assert.equal(s.getItem('mk.wallet'), '{"coins":9}');
  assert.equal(s.getItem('mkauth'), null);
  assert.equal(s.getItem('mk.bad'), null);
});

test('the newer copy wins; a fresh device takes the cloud copy', () => {
  const a = { 'mk.wallet': '1' }, b = { 'mk.wallet': '2' };
  assert.equal(pickNewer(100, 200, a, b), 'remote');
  assert.equal(pickNewer(300, 200, a, b), 'local');
  assert.equal(pickNewer(0, 200, {}, b), 'remote');
  assert.equal(pickNewer(100, 0, a, {}), 'local');
  assert.equal(pickNewer(100, 200, a, { ...a }), 'same');
});
