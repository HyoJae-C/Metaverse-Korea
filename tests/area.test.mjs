import test from 'node:test';
import assert from 'node:assert/strict';
import { cellKey } from '../src/net/area.js';

test('cell keys group nearby positions and split far ones', () => {
  assert.equal(cellKey('seongsu', 200, 10, 10), 'seongsu@0,0');
  assert.equal(cellKey('seongsu', 200, 199, -1), 'seongsu@0,-1');
  assert.equal(cellKey('seongsu', 200, -201, 450), 'seongsu@-2,2');
});

import { groupKey, CROWD_CAP } from '../src/net/area.js';
import { sendRate } from '../src/net/rate.js';

test('crowd groups get channels of their own; group 0 keeps the old names', () => {
  assert.equal(groupKey('seongsu@0,0', 0), 'seongsu@0,0');
  assert.equal(groupKey('seongsu@0,0', 2), 'seongsu@0,0~2');
  assert.ok(CROWD_CAP >= 10, 'a group still feels busy');
});

test('send rate drops in a crowd so each player receives about the budget', () => {
  const o = { base: 6, budget: 20, min: 1.5 };
  assert.equal(sendRate({ ...o, peers: 0 }), 6);
  assert.equal(sendRate({ ...o, peers: 3 }), 6);
  assert.equal(sendRate({ ...o, peers: 10 }), 2);
  assert.equal(sendRate({ ...o, peers: 40 }), 1.5);
  assert.equal(sendRate({ ...o }), 6); // solo play has no peer count
  // What one player receives from 11 others: never above the budget.
  assert.ok(11 * sendRate({ ...o, peers: 11 }) <= 20 + 1e-9);
});

import { createAreaNet } from '../src/net/area.js';
import { registerAdapter } from '../src/net/index.js';

test('movement is not broadcast while nobody is around to see it', async () => {
  const sent = [];
  let join = null;
  registerAdapter('count-sends', async (h) => ({
    async connect({ listenOnly }) { if (!listenOnly) join = h.onJoin; },
    sendState: (st) => sent.push(st),
    sendEmote: (e) => sent.push(e),
    setListenOnly() {}, updateSelf() {}, disconnect() {},
  }));
  const noop = () => {};
  const net = await createAreaNet('count-sends', { onJoin: noop, onLeave: noop, onState: noop, onEmote: noop }, {},
    { room: 'r', self: { id: 'me' }, cellSize: 0, privateChat: false });
  net.sendState({ x: 1 });
  net.sendEmote('wave');
  assert.equal(sent.length, 0, 'alone: nothing sent');
  join({ id: 'friend' });
  net.sendState({ x: 2 });
  assert.deepEqual(sent, [{ x: 2 }], 'someone nearby: sent');
  net.disconnect();
});

test('room-channel chat is logged on the server first, and a banned player says nothing', async () => {
  const said = [], logged = [];
  let answer = 'ok';
  registerAdapter('log-chat', async () => ({
    async connect() {},
    sendChat: (t) => said.push(t),
    logChat: async (room, t) => { logged.push([room, t]); return answer; },
    setListenOnly() {}, updateSelf() {}, disconnect() {},
  }));
  const noop = () => {};
  const net = await createAreaNet('log-chat', { onJoin: noop, onLeave: noop, onState: noop, onEmote: noop }, {},
    { room: 'seoul', self: { id: 'me' }, cellSize: 0, privateChat: true });
  net.sendChat('hi');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(logged, [['seoul', 'hi']]);
  assert.deepEqual(said, ['hi']);
  answer = 'chat';
  net.sendChat('rude');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(said, ['hi'], 'banned: not said');
  answer = 'error'; // the function isn't set up yet, or the network failed
  net.sendChat('ok then');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(said, ['hi', 'ok then']);
  net.disconnect();
});

test('test rooms without accounts chat on the room channel without logging', async () => {
  const said = [], logged = [];
  registerAdapter('log-chat-test-room', async () => ({
    async connect() {},
    sendChat: (t) => said.push(t),
    logChat: async (room, t) => { logged.push(t); return 'ok'; },
    setListenOnly() {}, updateSelf() {}, disconnect() {},
  }));
  const noop = () => {};
  const net = await createAreaNet('log-chat-test-room', { onJoin: noop, onLeave: noop, onState: noop, onEmote: noop }, {},
    { room: 'test', self: { id: 'me' }, cellSize: 0, privateChat: false });
  net.sendChat('hi');
  assert.deepEqual(said, ['hi']);
  assert.deepEqual(logged, []);
  net.disconnect();
});
