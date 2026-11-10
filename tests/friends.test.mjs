import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALL, Inbox, LocalFriends, convKey, cleanBody, whereIs } from '../src/core/friends.js';

const memory = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) };
};

test('a message belongs to the friend I talk with, or to All friends', () => {
  assert.equal(convKey({ from: 'a', to: 'b' }, 'a'), 'b');
  assert.equal(convKey({ from: 'b', to: 'a' }, 'a'), 'b');
  assert.equal(convKey({ from: 'b', to: null }, 'a'), ALL);
  assert.equal(cleanBody('  hi\nthere  '), 'hi there');
  assert.equal(cleanBody('x'.repeat(300)).length, 200);
});

test('inbox merges history and live messages once, oldest first, and counts unread', () => {
  const box = new Inbox('me');
  box.add([{ id: 2, from: 'f', to: 'me', body: 'b', at: '2026-01-01T00:00:02Z' }]);
  box.add({ id: 1, from: 'me', to: 'f', body: 'a', at: '2026-01-01T00:00:01Z' });
  assert.equal(box.add({ id: 2, from: 'f', to: 'me', body: 'b', at: '2026-01-01T00:00:02Z' }).length, 0);
  assert.deepEqual(box.messages('f').map((m) => m.id), [1, 2]);
  assert.equal(box.unread('f'), 1); // my own line is never unread
  const marks = box.markRead('f');
  assert.equal(box.unread('f'), 0);
  const again = new Inbox('me', marks);
  again.add({ id: 2, from: 'f', to: 'me', body: 'b', at: '2026-01-01T00:00:02Z' });
  again.add({ id: 3, from: 'g', to: null, body: 'c', at: '2026-01-01T00:00:03Z' });
  assert.equal(again.unread('f'), 0);
  assert.equal(again.totalUnread(), 1);
});

test('local friends: request, accept, chat and All friends', async () => {
  const storage = memory();
  const a = new LocalFriends('A', 'Mina', storage);
  const b = new LocalFriends('B', 'Joon', storage);
  const c = new LocalFriends('C', 'Sora', storage);
  assert.equal(await a.add('nobody'), 'notfound');
  assert.equal(await a.add('mina'), 'self');
  assert.equal(await a.add('joon'), 'requested');
  assert.deepEqual((await b.list()).incoming, [{ uid: 'A', name: 'Mina' }]);
  assert.equal((await a.send('B', 'hi')).error, 'notfriend'); // not until accepted
  assert.equal(await b.accept('A'), 'friends');
  assert.deepEqual((await a.list()).friends, [{ uid: 'B', name: 'Joon' }]);

  assert.ok((await a.send('B', 'hello')).message);
  assert.ok((await b.send('A', 'hey!')).message);
  assert.ok((await a.send(ALL, 'to all my friends')).message);
  assert.deepEqual((await b.history('A')).map((m) => m.body), ['hello', 'hey!']);
  assert.deepEqual((await b.history(ALL)).map((m) => m.body), ['to all my friends']);
  // Not a friend: can't read either chat.
  assert.deepEqual(await c.history('A'), []);
  assert.deepEqual(await c.history(ALL), []);
  assert.equal((await c.send(ALL, 'x')).error, 'nofriends');

  // Unfriend hides the chat on both sides.
  assert.equal(await b.remove('A'), 'ok');
  assert.deepEqual(await a.history('B'), []);
  assert.deepEqual((await a.list()).friends, []);
  for (const x of [a, b, c]) x.close();
});

test('a friend request sender is placed as the screen sees it', () => {
  const me = { x: 0, z: 0 }, ahead = { x: 0, z: -1 }; // camera looking down -z
  assert.deepEqual(whereIs(me, { x: 1, z: 2 }, ahead), { m: 2, dir: 'near' });
  assert.deepEqual(whereIs(me, { x: 0, z: -10 }, ahead), { m: 10, dir: 'ahead' });
  assert.deepEqual(whereIs(me, { x: 0, z: 12 }, ahead), { m: 12, dir: 'behind' });
  assert.deepEqual(whereIs(me, { x: 8, z: -1 }, ahead), { m: 8, dir: 'right' });
  assert.deepEqual(whereIs(me, { x: -8, z: 1 }, ahead), { m: 8, dir: 'left' });
  // Turned to face +x: what was on the right is now ahead.
  assert.equal(whereIs(me, { x: 8, z: 0 }, { x: 3, z: 0 }).dir, 'ahead');
  assert.equal(whereIs(me, { x: 0, z: 8 }, { x: 1, z: 0 }).dir, 'right');
});
