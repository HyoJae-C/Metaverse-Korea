import { test } from 'node:test';
import assert from 'node:assert/strict';
import { snapshot, applySnapshot, pickNewer, takenOver, CloudSave } from '../src/core/cloud-save.js';

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

test('after switching accounts on a device, the account save wins', () => {
  const a = { 'mk.coins': '5' }, b = { 'mk.coins': '90' };
  assert.equal(pickNewer(300, 200, a, b, true), 'remote');
  assert.equal(pickNewer(300, 0, a, {}, true), 'local'); // a new account has no save yet
});

test('a save written by another device since ours counts as taken over', () => {
  const mine = '2026-11-06T07:00:00.000Z';
  assert.equal(takenOver({ updated_at: '2026-11-06T07:00:00+00:00', data: {} }, mine, 'a'), false); // same version
  assert.equal(takenOver({ updated_at: '2026-11-06T07:00:09.000Z', data: { 'mkcloud.device': 'a' } }, mine, 'a'), false); // our own newer write
  assert.equal(takenOver({ updated_at: '2026-11-06T07:00:09.000Z', data: { 'mkcloud.device': 'b' } }, mine, 'a'), true);
  assert.equal(takenOver({ updated_at: '2026-11-06T07:00:09.000Z', data: {} }, mine, 'a'), true); // an older app version
  assert.equal(takenOver(null, mine, 'a'), false);
});

// A tiny stand-in for the Supabase table: one row per user, and update()
// only matches when updated_at is equal, like the real filter.
function fakeTable(row = null) {
  const db = { row, writes: 0 };
  const query = (op, payload) => {
    const filters = {};
    const q = {
      eq(k, v) { filters[k] = v; return q; },
      select() { return q; },
      maybeSingle() { return Promise.resolve({ data: db.row && { ...db.row }, error: null }); },
      then(res, rej) {
        let out = { data: null, error: null };
        if (op === 'update') {
          const hit = db.row && Date.parse(db.row.updated_at) === Date.parse(filters.updated_at);
          if (hit) { db.row = { ...db.row, ...payload }; db.writes++; }
          out = { data: hit ? [{ updated_at: db.row.updated_at }] : [], error: null };
        } else if (op === 'insert') {
          if (db.row) out = { data: null, error: { code: '23505' } };
          else { db.row = { ...payload }; db.writes++; }
        }
        return Promise.resolve(out).then(res, rej);
      },
    };
    return q;
  };
  db.client = { from: () => ({ select: () => query('select'), update: (p) => query('update', p), insert: (p) => query('insert', p) }) };
  return db;
}

function withLocalStorage(fn) {
  const prev = globalThis.localStorage;
  globalThis.localStorage = fakeStorage({ 'mk.wallet': '{"coins":5}' });
  return Promise.resolve(fn()).finally(() => { globalThis.localStorage = prev; });
}

test('saving goes through while nobody else has written', () => withLocalStorage(async () => {
  const db = fakeTable({ user_id: 'u', updated_at: '2026-11-06T07:00:00.000Z', data: {} });
  const cs = new CloudSave({});
  Object.assign(cs, { client: db.client, user: { id: 'u' }, version: db.row.updated_at });
  assert.equal(await cs._upload(), true);
  assert.equal(await cs._upload({ 'mk.wallet': '{"coins":6}' }), true);
  assert.equal(db.writes, 2);
  assert.equal(db.row.data['mk.wallet'], '{"coins":6}');
  assert.equal(db.row.data['mkcloud.device'], cs.device);
}));

test('when another device saved first, this one stops instead of overwriting', () => withLocalStorage(async () => {
  const db = fakeTable({ user_id: 'u', updated_at: '2026-11-06T07:00:00.000Z', data: {} });
  const cs = new CloudSave({});
  Object.assign(cs, { client: db.client, user: { id: 'u' }, version: db.row.updated_at });
  let told = 0;
  cs.onElsewhere(() => told++);
  // The phone opens the game and claims the save.
  db.row = { user_id: 'u', updated_at: '2026-11-06T07:05:00.000Z', data: { 'mk.wallet': '{"coins":50}', 'mkcloud.device': 'phone' } };
  assert.equal(await cs._upload({ 'mk.wallet': '{"coins":6}' }), false);
  assert.equal(db.row.data['mk.wallet'], '{"coins":50}'); // the phone's progress is kept
  assert.equal(told, 1);
  assert.equal(cs.parked, true);
  assert.equal(localStorage.getItem('mkcloud.at'), '0'); // reloading here loads the account's save
  assert.equal(await cs._upload(), false); // and nothing more is sent
  assert.equal(db.writes, 0);
}));

test('a first save on a new account is inserted', () => withLocalStorage(async () => {
  const db = fakeTable(null);
  const cs = new CloudSave({});
  Object.assign(cs, { client: db.client, user: { id: 'u' } });
  assert.equal(await cs._upload(), true);
  assert.equal(db.row.data['mk.wallet'], '{"coins":5}');
}));

test('a save that arrives after the game started here is taken, never overwritten', () => withLocalStorage(async () => {
  // The laptop kept last night's copy; the phone saved today's progress.
  const db = fakeTable({ user_id: 'u', updated_at: '2026-11-11T08:52:00.000Z', data: { 'mk.wallet': '{"coins":50}', 'mk.stamps': '{"drone-show":1}', 'mkcloud.device': 'phone' } });
  const cs = new CloudSave({});
  Object.assign(cs, { client: db.client, user: { id: 'u' }, late: true });
  localStorage.setItem('mkcloud.uid', 'u');
  localStorage.setItem('mkcloud.at', String(Date.parse('2026-11-11T11:00:00.000Z'))); // touched while waiting
  let stale = 0, elsewhere = 0;
  cs.onStale(() => stale++);
  cs.onElsewhere(() => elsewhere++);
  await cs._lateSave({ ...db.row }, snapshot(), 'u');
  assert.equal(db.writes, 0); // the phone's progress stays
  assert.equal(localStorage.getItem('mk.stamps'), '{"drone-show":1}'); // and is here for the reload
  assert.equal(localStorage.getItem('mkcloud.at'), '0');
  assert.equal(stale, 1);
  assert.equal(elsewhere, 0);
  assert.equal(await cs._upload(), false); // nothing more is sent from the old game
}));

test('a late save that matches this device just carries on', () => withLocalStorage(async () => {
  const db = fakeTable({ user_id: 'u', updated_at: '2026-11-11T08:52:00.000Z', data: { 'mk.wallet': '{"coins":5}', 'mkcloud.device': 'old' } });
  const cs = new CloudSave({});
  Object.assign(cs, { client: db.client, user: { id: 'u' }, late: true });
  let stale = 0;
  cs.onStale(() => stale++);
  await cs._lateSave({ ...db.row }, snapshot(), 'u');
  assert.equal(stale, 0);
  assert.equal(cs.late, false);
  assert.equal(db.row.data['mkcloud.device'], cs.device); // claimed for this device
}));
