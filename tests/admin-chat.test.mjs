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
