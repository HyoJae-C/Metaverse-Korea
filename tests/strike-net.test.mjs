import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMatch, GUNS, HP, HB, TICK, WARMUP_SECS, RESPAWN_SECS, aimFrom, damageOf } from '../src/core/strike.js';
import { createHost, createGuest, SEND_EVERY } from '../src/core/strike-net.js';

// Two screens and a network between them: every message arrives `delay`
// ticks late, and `lose` of them never do.
function pair({ size = 1, mode = 'vs', delay = 3, lose = 0, gun = 'hawk', seed = 5 } = {}) {
  const players = [{ id: 'H', name: 'Host', team: 0, gun }, { id: 'G', name: 'Guest', team: mode === 'vs' ? 1 : 0, gun }];
  const hm = createMatch({ map: 'warehouse', size, seed, players: players.map((p) => ({ ...p, remote: p.id === 'G' })) });
  const gm = createMatch({ map: 'warehouse', size, seed, players, guest: 'G' });
  const wire = [], sent = { h: 0, g: 0 };
  let now = 0, rnd = 99;
  const lost = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647 < lose; };
  const host = createHost({ match: hm, peer: 'G', send: (m) => { sent.h++; if (!lost()) wire.push({ at: now + delay, to: 'g', m: JSON.parse(JSON.stringify(m)) }); } });
  const guest = createGuest({ match: gm, me: 'G', send: (m) => { sent.g++; if (!lost()) wire.push({ at: now + delay, to: 'h', m: JSON.parse(JSON.stringify(m)) }); } });
  const log = { h: [], g: [] };
  const step = (hi = {}, gi = {}) => {
    now++;
    for (let i = 0; i < wire.length; i++) if (wire[i].at <= now) { const w = wire.splice(i--, 1)[0]; if (w.to === 'g') log.g.push(...guest.receive(w.m)); else log.h.push(...host.receive(w.m)); }
    const he = hm.step({ H: hi }); host.tick(he); log.h.push(...he);
    const ge = gm.step({ G: gi }); guest.tick(ge); log.g.push(...ge);
  };
  const run = (n, hi, gi) => { for (let i = 0; i < n; i++) step(hi, gi); };
  return { hm, gm, host, guest, step, run, log, sent };
}
const warm = (p) => p.run(Math.ceil(WARMUP_SECS / TICK) + 12);
const aimAt = (from, to, y) => { const o = aimFrom(from), dx = to.x - o[0], dy = y - o[1], dz = to.z - o[2]; return { yaw: Math.atan2(dx, dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) }; };

test('strike-net: both screens line up the same match', () => {
  const p = pair({ size: 4 });
  assert.equal(p.hm.players.length, 8);
  assert.deepEqual(p.hm.players.map((q) => [q.id, q.team, q.gun, q.nameKey]), p.gm.players.map((q) => [q.id, q.team, q.gun, q.nameKey]));
  assert.ok(p.hm.byId('G').remote && !p.hm.byId('H').remote);
  assert.ok(p.gm.players.every((q) => (q.id === 'G') !== q.remote), 'on the guest\'s screen everyone else is shown, not played');
  warm(p);
  assert.equal(p.hm.phase, 'play');
  assert.equal(p.gm.phase, 'play');
  assert.ok(p.log.g.some((e) => e.k === 'go'));
});

test('strike-net: the guest walks on their own screen and the host sees them there', () => {
  const p = pair();
  warm(p);
  const g = p.gm.byId('G'), x0 = g.x;
  p.run(60, {}, { mz: 1, yaw: g.yaw, pitch: 0 });
  assert.ok(Math.abs(g.x - x0) > 3, 'moved at once on their own screen');
  const seen = p.hm.byId('G');
  assert.ok(Math.hypot(seen.x - g.x, seen.z - g.z) < 1.2, `the host sees them within a step (${Math.hypot(seen.x - g.x, seen.z - g.z).toFixed(2)} m)`);
  // And the host on the guest's screen.
  const h = p.hm.byId('H');
  p.run(60, { mz: 1, yaw: h.yaw, pitch: 0 }, {});
  const hs = p.gm.byId('H');
  assert.ok(Math.hypot(hs.x - h.x, hs.z - h.z) < 1.2);
});

test('strike-net: the guest\'s hits are the host\'s to count; a kill shows on both screens and they come back', () => {
  const p = pair({ gun: 'hawk' });
  warm(p);
  const H = p.hm.byId('H'), G = p.gm.byId('G');
  // Face to face in the open (both screens agree where each stands).
  H.x = 0; H.z = -13; H.yaw = Math.PI / 2; H.protect = 0;
  G.x = 8; G.z = -13; G.yaw = -Math.PI / 2;
  p.run(30, { yaw: Math.PI / 2 }, { yaw: -Math.PI / 2 });
  p.hm.byId('G').protect = 0; p.hm.byId('H').protect = 0;
  const hOnG = p.gm.byId('H');
  assert.ok(Math.hypot(hOnG.x - 0, hOnG.z + 13) < 0.3);
  // The guest shoots the host in the body until they go down.
  let fired = 0;
  for (let i = 0; i < 200 && !H.dead; i++) { const a = aimAt(G, hOnG, 0.5); p.step({ yaw: Math.PI / 2 }, { ...a, fire: true }); fired = GUNS.hawk.mag - G.ammo; }
  assert.ok(H.dead, 'the host went down');
  assert.ok(fired >= Math.ceil(HP / damageOf('hawk', 'body')) && fired <= 8, `${fired} shots`);
  p.run(SEND_EVERY + 6);
  assert.deepEqual(p.gm.score, p.hm.score);
  assert.equal(p.hm.score[1], 1);
  assert.ok(p.log.g.some((e) => e.k === 'kill' && e.by === 'G' && e.to === 'H'), 'the guest\'s screen hears of the kill');
  assert.ok(p.log.h.some((e) => e.k === 'shot' && e.by === 'G'), 'the host\'s screen draws the guest\'s shots');
  assert.ok(p.log.g.some((e) => e.k === 'hit' && e.by === 'G' && e.claim), 'the guest sees their hit at once');
  assert.ok(p.gm.byId('H').dead);
  p.run(Math.ceil(RESPAWN_SECS / TICK) + SEND_EVERY + 6);
  assert.ok(!H.dead && !p.gm.byId('H').dead && p.gm.byId('H').hp === HP);
  // The host shoots the guest: the guest's health follows, then they are down and come back somewhere else.
  const g2 = p.hm.byId('G');
  H.x = 0; H.z = 13; H.protect = 0; G.x = 8; G.z = 13;
  p.run(30, { yaw: Math.PI / 2 }, { yaw: -Math.PI / 2 });
  g2.protect = 0;
  for (let i = 0; i < 200 && !g2.dead; i++) p.step({ ...aimAt(H, g2, 0.5), fire: true }, { yaw: -Math.PI / 2 });
  assert.ok(g2.dead, 'the guest went down');
  p.run(SEND_EVERY + 6);
  assert.ok(G.dead, 'and knows it');
  assert.ok(p.log.g.some((e) => e.k === 'hit' && e.to === 'G'), 'the guest is told who hit them');
  const spawns = G.spawns;
  p.run(Math.ceil(RESPAWN_SECS / TICK) + SEND_EVERY + 6, {}, { mz: 1 });
  assert.ok(!G.dead && G.spawns === spawns + 1 && G.hp === HP && G.ammo === GUNS.hawk.mag);
  assert.ok(Math.hypot(G.x - g2.x, G.z - g2.z) < 1.5, 'both screens agree where they came back');
});

test('strike-net: the host does not believe what cannot be', () => {
  const p = pair({ gun: 'eagle' });
  warm(p);
  const H = p.hm.byId('H'), g = p.hm.byId('G');
  H.x = 0; H.z = -13; H.protect = 0; g.x = 8; g.z = -13; g.net = null; g.protect = 0;
  const o = aimFrom(g), hi = p.hm.players.indexOf(H);
  const shot = (to, t, extra = {}) => { const d = [to[0] - o[0], to[1] - o[1], to[2] - o[2]], l = Math.hypot(...d); return [extra.o || o, d.map((v) => v / l), t ?? l, extra.ti ?? hi, 0, 0]; };
  // A wall in between (the host behind a container).
  H.x = -6; H.z = -9; g.x = -6; g.z = -3; g.net = null;
  const o2 = aimFrom(g);
  let ev = p.hm.claim('G', [o2, [0, 0, -1], 6, hi, 0, 0]);
  assert.ok(!ev.some((e) => e.k === 'hit'), 'through a container');
  // Aiming nowhere near them.
  H.x = 0; H.z = -13; g.x = 8; g.z = -13;
  p.hm.t += 5;
  ev = p.hm.claim('G', shot([8, 1, 0], 10));
  assert.ok(!ev.some((e) => e.k === 'hit'), 'the bullet went elsewhere');
  // From across the map.
  p.hm.t += 5;
  ev = p.hm.claim('G', shot([0, 1, -13], 1, { o: [0.5, 1, -13] }));
  assert.ok(!ev.some((e) => e.k === 'hit'), 'not from where they stand');
  // A true one counts; a second at once is faster than a sniper fires.
  p.hm.t += 5;
  ev = p.hm.claim('G', shot([0, HB.head.y, -13]));
  assert.ok(ev.some((e) => e.k === 'kill'), 'the head\'s middle with the sniper');
  H.dead = false; H.hp = HP;
  ev = p.hm.claim('G', shot([0, HB.head.y, -13]));
  assert.equal(ev.length, 0, 'too soon');
  // A teammate, a made-up index, rubbish.
  p.hm.t += 5;
  assert.ok(!p.hm.claim('G', shot([0, 1, -13], undefined, { ti: p.hm.players.indexOf(g) })).some((e) => e.k === 'hit'));
  p.hm.t += 5;
  assert.ok(!p.hm.claim('G', shot([0, 1, -13], undefined, { ti: 99 })).some((e) => e.k === 'hit'));
  assert.deepEqual(p.hm.claim('G', [[NaN, 0, 0], [0, 0, 1], 3, hi, 0, 0]), []);
  assert.deepEqual(p.hm.claim('G', 'x'), []);
  assert.deepEqual(p.host.receive({ g: ['a'], f: 'no' }), []);
  // More shots than the magazine holds, without time to reload.
  const q = pair({ gun: 'sparrow' });
  warm(q);
  const qg = q.hm.byId('G'), qo = aimFrom(qg);
  let ok = 0;
  for (let i = 0; i < 80; i++) { q.hm.t += 1 / GUNS.sparrow.rate; ok += q.hm.claim('G', [qo, [1, 0, 0], 5, -1, 0, 0]).length; }
  assert.ok(ok <= GUNS.sparrow.mag * 2 && ok >= GUNS.sparrow.mag, `${ok} shots believed of 80`);
});

test('strike-net: a slow network that loses messages still ends on the same score, with few messages', () => {
  const p = pair({ size: 2, mode: 'coop', delay: 6, lose: 0.1, gun: 'magpie', seed: 21 });
  let ticks = 0;
  while (p.hm.phase !== 'over' && ticks < 310 / TICK) { p.step({}, {}); ticks++; }
  assert.equal(p.hm.phase, 'over');
  p.run(40);
  // (the last message can be one of the lost ones: the host says it again on its next send)
  for (let i = 0; i < 60 && p.gm.phase !== 'over'; i++) { p.host.tick([]); p.step({}, {}); }
  assert.equal(p.gm.phase, 'over');
  assert.deepEqual(p.gm.score, p.hm.score);
  assert.equal(p.gm.winner, p.hm.winner);
  const secs = ticks * TICK;
  assert.ok(p.sent.h / secs < 4.1 && p.sent.g / secs < 4.1, `per second: host ${(p.sent.h / secs).toFixed(1)}, guest ${(p.sent.g / secs).toFixed(1)}`);
  // A whole five minute match: under 2,500 messages each way.
  assert.ok(300 / TICK / SEND_EVERY * 2 < 2500);
});

test('strike-net: the guest leaves and a bot plays on', () => {
  const p = pair({ size: 1 });
  warm(p);
  p.hm.toBot('G');
  const g = p.hm.byId('G');
  assert.ok(g.bot && !g.remote);
  const x = g.x, z = g.z;
  for (let i = 0; i < 300; i++) p.hm.step({});
  assert.ok(Math.hypot(g.x - x, g.z - z) > 1 || g.dead || p.hm.score[1] > 0);
});
