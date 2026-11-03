import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readIdentity, commitIdentity, nameLocked, modelLocked, daysLeft, LOCK_DAYS } from '../src/core/identity.js';

const DAY = 86400000;
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };

test('a first choice is saved and locked', () => {
  const t0 = 1_000_000;
  const id = commitIdentity(readIdentity(mem()), { name: ' 효재 ', model: 'mage' }, t0);
  assert.equal(id.name, '효재');
  assert.equal(id.model, 'mage');
  assert.ok(nameLocked(id, t0 + DAY));
  assert.ok(modelLocked(id, t0 + DAY));
  assert.equal(daysLeft(id.nameAt, t0 + DAY), LOCK_DAYS - 1);
});

test('a locked choice is kept; it frees up after the lock', () => {
  const t0 = 1_000_000;
  const id = commitIdentity(readIdentity(mem()), { name: 'A', model: 'mage' }, t0);
  const same = commitIdentity(id, { name: 'B', model: 'knight' }, t0 + 3 * DAY);
  assert.equal(same.name, 'A');
  assert.equal(same.model, 'mage');
  const later = commitIdentity(id, { name: 'B', model: 'knight' }, t0 + LOCK_DAYS * DAY + 1);
  assert.equal(later.name, 'B');
  assert.equal(later.model, 'knight');
  assert.ok(nameLocked(later, t0 + LOCK_DAYS * DAY + 2));
});

test('an empty name is never locked', () => {
  const id = commitIdentity(readIdentity(mem()), { name: '', model: 'mage' }, 5);
  assert.equal(nameLocked(id, 6), false);
  assert.equal(commitIdentity(id, { name: 'Neo', model: 'mage' }, 7).name, 'Neo');
});

test('a broken saved record means no lock', () => {
  const s = mem();
  s.setItem('mk.identity', '{oops');
  assert.deepEqual(readIdentity(s), { name: '', nameAt: 0, model: null, modelAt: 0 });
});
