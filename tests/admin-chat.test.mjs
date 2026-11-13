import test from 'node:test';
import assert from 'node:assert/strict';
import { MAX_ROOMS, chatLine, chatRooms, roomPlace } from '../src/admin/chat-panel.js';

test('listens to the street and every shop someone is in', () => {
  assert.deepEqual(chatRooms('another-seoul', ['street', 'ongi-cafe', 'ongi-cafe', '']), ['another-seoul', 'another-seoul-ongi-cafe']);
  assert.deepEqual(chatRooms('another-seoul', ['a'], ['b', 'a']), ['another-seoul', 'another-seoul-a', 'another-seoul-b']);
});

test('never opens more than MAX_ROOMS channels', () => {
  const many = Array.from({ length: 200 }, (_, i) => 's' + i);
  const rooms = chatRooms('r', many);
  assert.equal(rooms.length, MAX_ROOMS);
  assert.equal(rooms[0], 'r');
});

test('room names map back to places', () => {
  assert.equal(roomPlace('another-seoul', 'another-seoul'), 'street');
  assert.equal(roomPlace('another-seoul', 'another-seoul-pool-hall'), 'pool-hall');
});

test('chat lines are cleaned text, never empty', () => {
  assert.deepEqual(chatLine({ t: ' hi\u0000there ', n: 'Mina' }), { name: 'Mina', text: 'hi there' });
  assert.deepEqual(chatLine({ t: 'yo' }), { name: '?', text: 'yo' });
  assert.equal(chatLine({ t: '   ' }), null);
  assert.equal(chatLine(null), null);
  assert.equal(chatLine({ t: 'x'.repeat(500) }).text.length, 200);
});

test('log rows become lines with their place and account', async () => {
  const { logLine, sameLine } = await import('../src/admin/chat-panel.js');
  const l = logLine('another-seoul', { id: 7, at: '2026-11-08T10:00:00Z', room: 'another-seoul-ongi', net_id: 'p1', uid: 'u1', name: 'Mina', msg: 'hi', guest: false, banned: true });
  assert.equal(l.place, 'ongi');
  assert.equal(l.uid, 'u1');
  assert.equal(l.banned, true);
  // The same line heard live a few seconds later is not shown twice.
  assert.ok(sameLine(l, { id: 'p1', text: 'hi', at: l.at + 3000 }));
  assert.ok(!sameLine(l, { id: 'p1', text: 'hi', at: l.at + 60000 }));
  assert.ok(!sameLine(l, { id: 'p2', text: 'hi', at: l.at }));
});

test('the size line warns early when the log fills faster than planned', async () => {
  const { sizeReport, FREE_DB } = await import('../src/admin/chat-panel.js');
  const now = Date.parse('2026-11-08T00:00:00Z');
  const old = '2026-10-01T00:00:00Z';
  // 1,000 lines a day at 300 bytes: about 26 MB at 90 days.
  assert.equal(sizeReport({ rows: 7000, bytes: 2100000, week: 7000, oldest: old, db_bytes: 50e6 }, now).level, 'ok');
  // 10,000 a day: about 260 MB at 90 days, over 30 % of the free plan.
  assert.equal(sizeReport({ rows: 70000, bytes: 21000000, week: 70000, oldest: old, db_bytes: 80e6 }, now).level, 'warn');
  assert.equal(sizeReport({ rows: 10, bytes: 3000, week: 10, oldest: old, db_bytes: FREE_DB * 0.9 }, now).level, 'alert');
  // A log one day old counts its pace per day, not per week.
  assert.equal(sizeReport({ rows: 20000, bytes: 6e6, week: 20000, oldest: '2026-11-07T00:00:00Z', db_bytes: 50e6 }, now).level, 'warn');
  assert.match(sizeReport({ rows: 0, bytes: 0, week: 0, db_bytes: 0 }, now).text, /0 lines/);
});

import { KINDS, allLine, placeLabel } from '../src/admin/chat-panel.js';

test('every kind of chat becomes a line with the right place', () => {
  const base = { ref: 7, at: '2026-11-13T04:45:37.150308+00:00', uid: 'u1', name: 'Bob', msg: 'hi', guest: false, banned: false, state: '' };
  const friend = allLine('seoul', { ...base, kind: 'friend', to_uid: 'u2', to_name: 'Cat' });
  assert.equal(placeLabel(friend), '👥 → Cat');
  assert.equal(friend.atRaw, base.at, 'exact server time kept for "load older"');
  assert.equal(placeLabel(allLine('seoul', { ...base, kind: 'friend', to_uid: null, to_name: null })), '👥 → All friends');
  assert.equal(placeLabel(allLine('seoul', { ...base, kind: 'lock', place: 'heart' })), '🔒 Love lock');
  assert.equal(placeLabel(allLine('seoul', { ...base, kind: 'board', place: 'ask' })), '📮 Inquiry board');
  assert.equal(placeLabel(allLine('seoul', { ...base, kind: 'board', place: 'free' })), '📋 Free board');
  assert.equal(placeLabel(allLine('seoul', { ...base, kind: 'room', place: 'seoul' })), '🚶 Street');
  assert.equal(placeLabel(allLine('seoul', { ...base, kind: 'room', place: 'seoul-ongi-cafe' }), (p) => 'In ' + p), '🏠 ongi-cafe');
  assert.equal(allLine('seoul', { ...base, kind: 'lock', state: 'hidden' }).state, 'hidden');
});

test('the confession room is not a kind the operator page can show', () => {
  assert.deepEqual(Object.keys(KINDS).sort(), ['all', 'board', 'friend', 'lock', 'room']);
});

test('every chat function the operator page calls exists in the SQL', async () => {
  const { readFileSync } = await import('node:fs');
  const sql = readFileSync(new URL('../supabase/043_ops_all_chat.sql', import.meta.url), 'utf8');
  const panel = readFileSync(new URL('../src/admin/chat-panel.js', import.meta.url), 'utf8');
  for (const fn of ['ops_all_chat', 'ops_set_lock_hidden']) {
    assert.ok(panel.includes(`'${fn}'`), fn + ' used');
    assert.match(sql, new RegExp(`function public\\.${fn}\\(`), fn + ' defined');
  }
  assert.match(sql, /grant execute on function public\.room_chat_log\(text, text, text\) to authenticated/);
  assert.doesNotMatch(sql, /realtime\.send/, 'logging adds no realtime messages');
});
