// Joining the realtime rooms when the server (or the device) is slow. Seen
// on CI about one run in three: the other player was listed but stood at the
// map's origin and never moved, because
//  - everything we sent while slow neighbour cells were still joining went
//    nowhere (the game only got its connection once all nine answered),
//  - a cell that timed out kept joining in the background, so a player who
//    had fallen back to solo still showed up in others' presence,
//  - movement that arrived just before its sender's presence was dropped.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createAreaNet } from '../src/net/area.js';
import { registerAdapter } from '../src/net/index.js';
import { sharedClient, createSupabaseAdapter } from '../src/net/adapters/supabase.js';

const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); }; // (with mocked timers)

// An adapter whose joins we answer by hand.
function scriptedProvider(name) {
  const made = [];
  registerAdapter(name, async (handlers) => {
    let answer;
    const a = {
      handlers, room: null, sent: [], disconnected: false,
      joined: new Promise((resolve, reject) => { answer = { resolve, reject }; }),
      connect({ room }) { a.room = room; return a.joined; },
      answer: (ok = true) => (ok ? answer.resolve() : answer.reject(new Error('Realtime connect timeout'))),
      sendState(st) { a.sent.push(st); },
      sendEmote() {}, sendLook() {}, setListenOnly() {},
      disconnect() { a.disconnected = true; },
    };
    made.push(a);
    return a;
  });
  return made;
}
const handlers = () => ({ joins: [], leaves: [], onJoin(p) { this.joins.push(p.id); }, onLeave(id) { this.leaves.push(id); }, onState() {}, onEmote() {} });
const quietly = async (fn) => { const w = console.warn; console.warn = () => {}; try { return await fn(); } finally { console.warn = w; } };

test('the connection is ready once our own cell is in, not when the slowest neighbour answers', async () => {
  const made = scriptedProvider('slow-neighbours');
  let ready = null;
  const joining = createAreaNet('slow-neighbours', handlers(), {}, { room: 'r', self: { id: 'me' }, cellSize: 200, x: 10, z: 10 }).then((n) => (ready = n));
  await tick();
  assert.equal(made.length, 9);
  assert.equal(made[0].room, 'r@0,0', 'our own cell is asked first');
  made[0].answer();
  await tick();
  assert.ok(ready, 'ready without waiting for the eight cells around us');
  ready.sendState({ x: 1, z: 2 });
  assert.deepEqual(made[0].sent, [{ x: 1, z: 2 }]);
  ready.disconnect();
  await joining;
});

test('if our own cell fails, every cell is left (no frozen ghost of us in others\' presence)', async () => {
  const made = scriptedProvider('own-fails');
  const h = handlers();
  const joining = createAreaNet('own-fails', h, {}, { room: 'r', self: { id: 'me' }, cellSize: 200, x: 10, z: 10 });
  await tick();
  made[1].handlers.onJoin({ id: 'friend' }); // a neighbour cell got in and saw someone
  await quietly(async () => {
    made[0].answer(false);
    await assert.rejects(joining, /Realtime unavailable/);
  });
  assert.ok(made.every((a) => a.disconnected), 'all nine adapters disconnected');
  assert.deepEqual(h.leaves, ['friend'], 'the game is told they are gone');
});

test('a neighbour cell that timed out is tried again', async (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const made = scriptedProvider('retry');
  const joining = createAreaNet('retry', handlers(), {}, { room: 'r', self: { id: 'me' }, cellSize: 200, x: 10, z: 10 });
  await flush();
  made[0].answer();
  const net = await joining;
  const before = made.length;
  await quietly(async () => { made[3].answer(false); await flush(); });
  t.mock.timers.tick(8000);
  await flush();
  assert.equal(made.length, before + 1, 'opened again');
  assert.equal(made.at(-1).room, made[3].room);
  assert.ok(made[3].disconnected);
  net.disconnect();
});

// A stand-in for the realtime client's channels, enough for the adapter.
function fakeChannels(client) {
  const channels = [];
  const made = [];
  client.getChannels = () => channels;
  client.channel = (topic) => {
    const full = 'realtime:' + topic;
    const old = channels.find((c) => c.topic === full);
    if (old) return old; // as the real client does, even while it is closing
    const binds = [];
    const ch = {
      topic: full, binds, tracked: null, state: 'closed', subscribed: null, closing: false,
      on(type, filter, cb) { binds.push({ type, event: filter.event, cb }); return ch; },
      subscribe(cb) { if (ch.state === 'closed' && !ch.closing) { ch.state = 'joining'; ch.subscribed = cb; } return ch; },
      presenceState: () => ch.presence || {},
      async track(meta) { ch.tracked = meta; },
      async untrack() { ch.tracked = null; },
      send() {},
      emit(type, event, payload) { for (const b of binds) if (b.type === type && b.event === event) b.cb(payload); },
    };
    channels.push(ch);
    made.push(ch);
    return ch;
  };
  client.removeChannel = (ch) => {
    ch.closing = true;
    return new Promise((r) => setTimeout(() => {
      const i = channels.indexOf(ch);
      if (i >= 0) channels.splice(i, 1);
      ch.state = 'closed';
      ch.subscribed?.('CLOSED');
      r('ok');
    }, 5));
  };
  return made;
}
const cfgFor = (n) => ({ url: `https://test-${n}.supabase.co`, key: 'sb_publishable_test' });

test('a room left a moment ago is rejoined on a fresh channel, not the closing one', async () => {
  const cfg = cfgFor('rejoin');
  const made = fakeChannels(sharedClient(cfg.url, cfg.key));
  const first = createSupabaseAdapter(handlers(), cfg);
  const c1 = first.connect({ room: 'r@0,0', self: { id: 'me', name: 'Me' } });
  await tick();
  made[0].subscribed('SUBSCRIBED');
  await c1;
  first.disconnect(); // walked out of the cell...
  const again = createSupabaseAdapter(handlers(), cfg);
  const c2 = again.connect({ room: 'r@0,0', self: { id: 'me', name: 'Me' } }); // ...and straight back in
  await tick(20);
  assert.equal(made.length, 2, 'a new channel');
  assert.ok(made[1].subscribed, 'and its join was really sent');
  made[1].subscribed('SUBSCRIBED');
  await c2;
  assert.deepEqual(made[1].tracked, { name: 'Me', look: undefined });
  again.disconnect();
});

test('a join that timed out is left for good: getting in later does not announce us', async (t) => {
  const cfg = cfgFor('late');
  const made = fakeChannels(sharedClient(cfg.url, cfg.key));
  const a = createSupabaseAdapter(handlers(), cfg);
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const joining = a.connect({ room: 'r@1,1', self: { id: 'me', name: 'Me' } });
  await flush();
  const ch = made[0];
  const late = ch.subscribed;
  t.mock.timers.tick(10000);
  await assert.rejects(joining, /timeout/);
  assert.ok(ch.closing, 'channel removed');
  await late('SUBSCRIBED'); // the server answers after all
  assert.equal(ch.tracked, null, 'not in the room\'s presence');
  t.mock.timers.tick(10);
});

test('movement that arrives before its sender\'s presence is played once they appear', async () => {
  const cfg = cfgFor('early');
  const made = fakeChannels(sharedClient(cfg.url, cfg.key));
  const seen = [];
  const a = createSupabaseAdapter({ onJoin: (p) => seen.push(['join', p.id]), onLeave() {}, onState: (id, st) => seen.push(['state', id, st.x]), onEmote() {} }, cfg);
  const joining = a.connect({ room: 'r@2,2', self: { id: 'me', name: 'Me' }, listenOnly: true });
  await tick();
  const ch = made[0];
  ch.subscribed('SUBSCRIBED');
  await joining;
  ch.emit('broadcast', 's', { payload: { id: 'b', st: { x: 5, z: 0 } } }); // B's spot, before B's presence
  ch.emit('broadcast', 's', { payload: { id: 'b', st: { x: 6, z: 0 } } });
  assert.deepEqual(seen, []);
  ch.presence = { b: [{ name: 'B' }] };
  ch.emit('presence', 'sync');
  assert.deepEqual(seen, [['join', 'b'], ['state', 'b', 6]], 'joined, then their latest spot');
  a.disconnect();
});

test('after the client rejoins by itself (network blip) we announce ourselves again', async () => {
  const cfg = cfgFor('blip');
  const made = fakeChannels(sharedClient(cfg.url, cfg.key));
  const a = createSupabaseAdapter(handlers(), cfg);
  const joining = a.connect({ room: 'r@3,3', self: { id: 'me', name: 'Me' } });
  await tick();
  const ch = made[0];
  ch.subscribed('SUBSCRIBED');
  await joining;
  ch.tracked = null; // the server forgot us while the socket was down
  await ch.subscribed('SUBSCRIBED'); // the client got back in
  assert.deepEqual(ch.tracked, { name: 'Me', look: undefined });
  a.disconnect();
});
