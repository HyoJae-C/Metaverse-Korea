// Sinchon's live café: the room, and the rules for the singer's voice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import {
  canPerform, clock, LIVE_PREFIX, liveMsg, lineOrder, nextUp, NEXT_GRACE_MS, offStage, parseLive,
  PERFORM_MIN_AGE_MS, SLOT_MS, stageWinner, timeUp,
} from '../src/core/live-rules.js';

globalThis.document ??= { createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ width: 0 }) }) }) };

const stores = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/stores.json', import.meta.url))).stores;
const cafe = stores.find((s) => s.workshop === 'livecafe');

test('one live café, in Sinchon, on a street with the other shops', () => {
  assert.equal(stores.filter((s) => s.workshop === 'livecafe').length, 1);
  assert.equal(cafe.district, 'seodaemun');
  // On the pavement of one of Sinchon's streets (scripts/build-sinchon.mjs
  // puts it by Sinchon Square), with a door of its own.
  const region = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/region.json', import.meta.url)));
  const d = region.districts.find((x) => x.id === 'seodaemun');
  const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + d.map, import.meta.url)));
  const q = [cafe.at[0] - d.offset[0], cafe.at[1] - d.offset[1]];
  const segDist = ([px, pz], [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, L = dx * dx + dz * dz; const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / L)) : 0; return Math.hypot(px - ax - t * dx, pz - az - t * dz); };
  const near = map.roads.map((r) => ({ r, edge: Math.min(...r.p.slice(1).map((b, i) => segDist(q, r.p[i], b))) - r.w / 2 })).sort((a, b) => a.edge - b.edge)[0];
  assert.ok(near.edge < 4, `by a street (${near.edge.toFixed(1)} m from ${near.r.n?.en})`);
  assert.ok(near.r.k === 'walk' || near.edge > 0, `not on the road (${near.r.n?.en})`); // (on a walking street the door may stand at its edge)
  for (const s of stores) if (s !== cafe && s.at) assert.ok(Math.hypot(s.at[0] - cafe.at[0], s.at[1] - cafe.at[1]) > 6, `not on top of ${s.id}`);
});

test('inside: a stage with a mic you can reach, seats, people already there, a clear walk from the door', async () => {
  const { buildInterior } = await import('../src/core/interior.js');
  const r = buildInterior(cafe);
  const [mic] = r.stations.livestage;
  assert.ok(mic, 'the singer’s spot');
  const solid = (x, z) => r.colliders.some((c) => inPolygon(x, z, c.p));
  assert.ok(!solid(mic.x, mic.z), 'you can stand at the mic');
  for (let z = r.exit.z - 0.5; z > mic.z; z -= 0.5) assert.ok(!solid(0, z), `walk to the stage open at ${z}`);
  assert.ok(r.seats.length >= 6, 'free seats to listen from');
  for (const s of r.seats) assert.ok(!solid(...s.stand), 'getting up lands on the floor');
  assert.ok(r.stations.patrons.some((p) => p.sit) && r.stations.patrons.some((p) => p.fan), 'regulars sitting, fans by the stage');
  assert.ok(r.barkeep, 'a bartender');
});

test('voice messages: only well-formed ones get through', () => {
  const m = parseLive(liveMsg({ k: 'o', to: 'b', sdp: 'v=0', since: 5, muted: false }));
  assert.deepEqual(m, { k: 'o', to: 'b', sdp: 'v=0', since: 5, muted: false });
  assert.ok(liveMsg({ k: 'hi' }).startsWith(LIVE_PREFIX));
  assert.equal(parseLive('wave'), null);
  assert.equal(parseLive(LIVE_PREFIX + '{bad'), null);
  assert.equal(parseLive(liveMsg({ k: 'nope' })), null);
  assert.equal(parseLive(liveMsg({ k: 'o', to: 'b' })), null, 'an offer needs its sdp');
  assert.equal(parseLive(liveMsg({ k: 'q' })), null, 'joining the line needs a time');
  assert.equal(parseLive(LIVE_PREFIX + JSON.stringify({ k: 'a', to: 'x', sdp: 'x'.repeat(20000) })), null, 'too long');
  assert.equal(parseLive({ k: 'on' }), null);
});

test('two people step up at once: both agree on who keeps the stage', () => {
  const a = { id: 'a', since: 100 }, b = { id: 'b', since: 200 };
  assert.equal(stageWinner(a, b), a);
  assert.equal(stageWinner(b, a), a);
  const c = { id: 'c', since: 100 };
  assert.equal(stageWinner(c, a), a, 'tie: the smaller id');
});

test('singing needs an account at least a day old (listening does not)', () => {
  const now = Date.parse('2026-11-11T00:00:00Z');
  const ago = (ms) => ({ created_at: new Date(now - ms).toISOString() });
  assert.equal(canPerform({ user: ago(PERFORM_MIN_AGE_MS + 1000), required: true, now }), true);
  assert.equal(canPerform({ user: ago(3600 * 1000), required: true, now }), false);
  assert.equal(canPerform({ user: null, required: true, now }), false);
  assert.equal(canPerform({ user: null, required: false, now }), true, 'local test builds');
});

test('the mic turns off when you step off the stage', () => {
  const spot = { x: 0, z: -4 };
  assert.equal(offStage({ x: 0.5, z: -4 }, spot), false);
  assert.equal(offStage({ x: 0, z: 0 }, spot), true);
});

test('taking turns: 5 minutes each while someone waits, the first in line goes next', () => {
  assert.equal(timeUp({ since: 0, now: SLOT_MS + 1, waiting: 0 }), false, 'nobody waiting: keep singing');
  assert.equal(SLOT_MS, 5 * 60 * 1000, 'five minutes a turn (Yozi)');
  assert.equal(timeUp({ since: 0, now: SLOT_MS - 1, waiting: 2 }), false);
  assert.equal(timeUp({ since: 0, now: SLOT_MS, waiting: 1 }), true);
  const line = lineOrder([{ id: 'z', at: 30 }, { id: 'y', at: 10 }, { id: 'x', at: 10 }]);
  assert.deepEqual(line.map((q) => q.id), ['x', 'y', 'z']);
  assert.equal(nextUp({ me: 'y', line, freeAt: 1000, now: 2000 }), 'x', 'the head of the line has the stage first');
  assert.equal(nextUp({ me: 'x', line, freeAt: 1000, now: 2000 }), null, 'that’s me');
  assert.equal(nextUp({ me: 'y', line, freeAt: 1000, now: 1000 + NEXT_GRACE_MS }), null, 'they didn’t come: open to all');
  assert.equal(nextUp({ me: 'y', line: [], freeAt: 1000, now: 2000 }), null);
  assert.equal(clock(65_000), '1:05');
  assert.equal(clock(-5), '0:00');
});

test('the backup relay: only usable entries from the server, port 53 dropped', async () => {
  const { relayList } = await import('../src/core/live-rules.js');
  assert.deepEqual(relayList({ iceServers: [] }), []);
  assert.deepEqual(relayList(null), []);
  assert.deepEqual(relayList({ iceServers: { urls: 'turn:x' } }), [], 'not a list: ignored');
  assert.deepEqual(relayList({ iceServers: [
    { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.cloudflare.com:53'] },
    { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turn:turn.cloudflare.com:53?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
    { urls: ['http://evil'] }, 'junk',
  ] }), [
    { urls: ['stun:stun.cloudflare.com:3478'] },
    { urls: ['turn:turn.cloudflare.com:3478?transport=udp', 'turns:turn.cloudflare.com:443?transport=tcp'], username: 'u', credential: 'c' },
  ]);
});
