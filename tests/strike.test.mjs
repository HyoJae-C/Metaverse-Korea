import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GUNS, GUN_IDS, HP, HB, CORE_K, MAPS, MAP_IDS, KILL_TARGET, damageOf, shotsToKill, rayPlayer, rayWalls, pushOut, pathStep, solids, createMatch, aimFrom, dirOf, loadStrike, afterStrike, RADIUS, TICK, WARMUP_SECS, RESPAWN_SECS } from '../src/core/strike.js';

const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
const target = (x = 0, z = 10, yaw = Math.PI) => ({ x, z, yaw });
const ray = (from, at) => { const d = [at[0] - from[0], at[1] - from[1], at[2] - from[2]], l = Math.hypot(...d); return d.map((v) => v / l); };

test('strike: the four guns trade fire rate and magazine for damage (Yozi 2026-11-14)', () => {
  const [sparrow, magpie, hawk, eagle] = GUN_IDS.map((id) => GUNS[id]);
  assert.deepEqual(GUN_IDS, ['sparrow', 'magpie', 'hawk', 'eagle']);
  // fast, many bullets, weak · normal speed, many, weak · normal, medium magazine, strong · the sniper hits hardest
  assert.ok(sparrow.rate > magpie.rate && magpie.rate > hawk.rate && hawk.rate > eagle.rate);
  assert.ok(sparrow.mag > magpie.mag && magpie.mag > hawk.mag && hawk.mag > eagle.mag);
  assert.ok(sparrow.body < magpie.body && magpie.body < hawk.body && hawk.body < eagle.body);
  // Each gun reloads, and the bigger the gun the longer.
  for (const g of GUN_IDS.map((id) => GUNS[id])) assert.ok(g.reload >= 1.5 && g.reload <= 3.2);
  // Body damage per second stays within a band, so no gun is simply best.
  const dps = GUN_IDS.map((id) => GUNS[id].body * GUNS[id].rate);
  assert.ok(Math.max(...dps.slice(0, 3)) / Math.min(...dps.slice(0, 3)) < 1.25, 'automatic guns ' + dps);
  // Shots to bring someone down on the body: the rifle needs several, the sniper two.
  assert.deepEqual(GUN_IDS.map((id) => shotsToKill(id, 'body')), [8, 5, 3, 2]);
});

test('strike: body hurts most, hands and feet less, the head\'s exact middle kills with the big guns', () => {
  for (const id of GUN_IDS) {
    assert.ok(damageOf(id, 'limb') < damageOf(id, 'body'), id + ' limb < body');
    assert.equal(damageOf(id, 'head'), damageOf(id, 'body'), id + ' the head off its middle counts as the body');
    assert.ok(damageOf(id, 'core') > damageOf(id, 'body'), id + ' core > body');
  }
  assert.equal(damageOf('hawk', 'core'), HP);
  assert.equal(damageOf('eagle', 'core'), HP);
  assert.ok(damageOf('sparrow', 'core') < HP && damageOf('magpie', 'core') < HP);
});

test('strike: a bullet finds the part of the body it crosses', () => {
  const p = target();
  const from = [0, 1.0, 0];
  const zoneAt = (y, x = 0) => rayPlayer(from, ray(from, [x, y, 10]), p)?.zone ?? null;
  assert.equal(zoneAt(HB.head.y), 'core');
  assert.equal(zoneAt(HB.head.y + HB.head.r * (CORE_K + 0.2)), 'head');
  assert.equal(zoneAt(0.6, 0.05), 'body');
  assert.equal(zoneAt(0.2), 'limb');
  assert.equal(zoneAt(1.6), null);
  assert.equal(zoneAt(0.6, 0.6), null);
  // From behind the same: the body faces away.
  const back = [0, 1.0, 20];
  assert.equal(rayPlayer(back, ray(back, [0, HB.head.y, 10]), p).zone, 'core');
  // The nearest part wins: a shot at the chest from the front meets the arms holding the gun.
  const front = rayPlayer(from, ray(from, [0.15, 0.66, 10]), target(0, 10, Math.PI));
  assert.equal(front.zone, 'limb');
});

test('strike: maps are closed, spawns are clear, and every place can be walked to', () => {
  for (const id of MAP_IDS) {
    const m = MAPS[id];
    for (const team of [0, 1]) for (const [x, z] of m.spawns[team]) {
      const p = { x, z };
      pushOut(id, p);
      assert.ok(Math.hypot(p.x - x, p.z - z) < 1e-6, `${id} spawn ${x},${z} is clear`);
    }
    // Walk from the first spawn of each team to every bot place and the other spawns.
    for (const [sx, sz] of [m.spawns[0][0], m.spawns[1][0]]) {
      for (const [gx, gz] of [...m.points, ...m.spawns[0], ...m.spawns[1]]) {
        const p = { x: sx, z: sz };
        let k = 0;
        for (; k < 2000 && Math.hypot(p.x - gx, p.z - gz) > 0.8; k++) {
          const [dx, dz] = pathStep(id, p.x, p.z, gx, gz);
          p.x += dx * 0.12; p.z += dz * 0.12;
          pushOut(id, p);
        }
        assert.ok(k < 2000, `${id}: ${sx},${sz} → ${gx},${gz}`);
      }
    }
    // Nobody leaves the map: a ray out hits the outer wall.
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]) assert.ok(rayWalls(id, [0, 1, 0], d) < Math.max(...m.size), id + ' closed');
    assert.ok(solids(id).every((b) => b[3] > b[0] && b[5] > b[2]));
  }
});

test('strike: walls stop players and bullets', () => {
  const p = { x: -6, z: -6 }; // inside the warehouse's first container
  pushOut('warehouse', p);
  const b = solids('warehouse')[4];
  const inside = p.x > b[0] - RADIUS + 1e-6 && p.x < b[3] + RADIUS - 1e-6 && p.z > b[2] - RADIUS + 1e-6 && p.z < b[5] + RADIUS - 1e-6;
  assert.ok(!inside, 'pushed out of the container');
  // Low crates: a bullet at head height passes over, at the knee it stops.
  assert.ok(rayWalls('warehouse', [-13, 1.3, -1], [1, 0, 0], 6) === 6);
  assert.ok(rayWalls('warehouse', [-13, 0.5, -1], [1, 0, 0], 6) < 6);
});

test('strike: shooting, reloading and a kill', () => {
  const m = createMatch({ map: 'warehouse', size: 1, players: [{ id: 'me', team: 0, gun: 'hawk' }], seed: 3 });
  const me = m.byId('me'), foe = m.players.find((p) => p.team === 1);
  assert.equal(m.players.length, 2);
  assert.ok(foe.bot);
  for (let i = 0; i < WARMUP_SECS / TICK + 2; i++) m.step({});
  assert.equal(m.phase, 'play');
  // Stand them face to face in the open, the bot asleep.
  foe.bot = false; foe.ai = null;
  me.x = 0; me.z = -12.5; me.yaw = 0; foe.x = 0; foe.z = -4.5; foe.yaw = Math.PI; foe.protect = 0; me.protect = 0;
  const aimAt = (y) => { const o = aimFrom(me); const d = ray(o, [foe.x, y, foe.z]); return { yaw: Math.atan2(d[0], d[2]), pitch: Math.asin(d[1]) }; };
  // A body shot, then let go and shoot again.
  const a = aimAt(0.5);
  let ev = m.step({ me: { ...a, fire: true } });
  const hit = ev.find((e) => e.k === 'hit');
  assert.ok(hit, 'hit ' + JSON.stringify(ev));
  assert.equal(foe.hp, HP - damageOf('hawk', hit.zone));
  assert.equal(me.ammo, GUNS.hawk.mag - 1);
  // The head's middle: dead in one.
  foe.hp = HP;
  for (let i = 0; i < 10; i++) m.step({});
  ev = m.step({ me: { ...aimAt(HB.head.y), fire: true } });
  // (the hawk's spread can push it off the middle: try a few times)
  for (let k = 0; k < 20 && !ev.some((e) => e.k === 'kill'); k++) { foe.hp = HP; for (let i = 0; i < 8; i++) m.step({}); ev = m.step({ me: { ...aimAt(HB.head.y), fire: true } }); }
  const kill = ev.find((e) => e.k === 'kill');
  assert.ok(kill && kill.zone === 'core', 'a headshot kill');
  assert.ok(foe.dead);
  assert.equal(m.score[0], 1);
  assert.equal(me.kills, 1);
  // Back after a few seconds, full health.
  for (let i = 0; i < RESPAWN_SECS / TICK + 2; i++) m.step({});
  assert.ok(!foe.dead && foe.hp === HP);
  // Empty the magazine: it reloads by itself, then it is full again.
  me.ammo = 1; me.cool = 0;
  ev = m.step({ me: { fire: true } });
  assert.ok(ev.some((e) => e.k === 'reload'));
  assert.ok(me.reload > 0);
  for (let i = 0; i < GUNS.hawk.reload / TICK + 2; i++) m.step({});
  assert.equal(me.ammo, GUNS.hawk.mag);
});

test('strike: the sniper is one shot at a time, sharp only through the scope', () => {
  const m = createMatch({ map: 'warehouse', size: 1, players: [{ id: 'me', team: 0, gun: 'eagle' }] });
  const me = m.byId('me');
  for (let i = 0; i < WARMUP_SECS / TICK + 2; i++) m.step({});
  let shots = 0;
  for (let i = 0; i < 90; i++) shots += m.step({ me: { fire: true, scope: true } }).filter((e) => e.k === 'shot' && e.by === 'me').length;
  assert.equal(shots, 1, 'holding the trigger fires once');
  assert.ok(me.scoped);
  assert.ok(GUNS.eagle.scoped < GUNS.eagle.spread[0] / 20);
});

test('strike: bots fill the teams, play a whole match, and someone wins', () => {
  for (const map of MAP_IDS) {
    const m = createMatch({ map, size: 4, players: [{ id: 'me', team: 0, gun: 'magpie' }], seed: 11 });
    assert.equal(m.players.length, 8);
    assert.equal(m.players.filter((p) => p.bot).length, 7);
    assert.equal(new Set(m.players.map((p) => p.nameKey).filter((k) => k != null)).size, 7, 'different names');
    m.byId('me').bot = true; m.byId('me').ai = { goal: null, goalT: 0, target: null, seen: 0, err: [0, 0], strafe: 1, strafeT: 0, react: 0 };
    let kills = 0, ticks = 0, stuck = 0;
    const last = new Map();
    while (m.phase !== 'over' && ticks < 320 / TICK) {
      const ev = m.step({});
      kills += ev.filter((e) => e.k === 'kill').length;
      ticks++;
      if (ticks % 300 === 0) for (const p of m.players) {
        const was = last.get(p.id);
        if (was && !p.dead && Math.hypot(was[0] - p.x, was[1] - p.z) < 0.3 && !p.ai.target) stuck++;
        last.set(p.id, [p.x, p.z]);
      }
    }
    assert.equal(m.phase, 'over', map + ' ends');
    assert.ok(kills >= 10, `${map}: ${kills} kills in ${(ticks * TICK).toFixed(0)} s`);
    assert.ok(m.winner === -1 || m.score[m.winner] >= Math.max(...m.score));
    assert.ok(stuck < 12, `${map}: bots stuck ${stuck} times`);
    for (const p of m.players) assert.ok(Number.isFinite(p.x) && Number.isFinite(p.z));
    const [w, h] = MAPS[map].size;
    for (const p of m.players) assert.ok(Math.abs(p.x) < w / 2 && Math.abs(p.z) < h / 2, 'inside the map');
  }
});

test('strike: kill target grows with the teams, and the record saves', () => {
  assert.deepEqual(KILL_TARGET, [10, 20, 25, 30]);
  assert.equal(createMatch({ size: 2 }).target, 20);
  const s = memStore();
  assert.deepEqual(loadStrike(s), { map: 'warehouse', size: 4, gun: 'magpie', wins: 0, played: 0, best: 0 });
  afterStrike(s, { won: true, kills: 7 });
  afterStrike(s, { won: false, kills: 3 });
  const r = loadStrike(s);
  assert.equal(r.played, 2); assert.equal(r.wins, 1); assert.equal(r.best, 7);
  s.setItem('mk.strike', '{bad');
  assert.equal(loadStrike(s).played, 0);
});

test('strike: dirOf and aimFrom agree with the way a player faces', () => {
  const d = dirOf(Math.PI / 2, 0);
  assert.ok(Math.abs(d[0] - 1) < 1e-9 && Math.abs(d[2]) < 1e-9);
  // Facing +z, the right shoulder is toward -x.
  const o = aimFrom({ x: 0, z: 0, yaw: 0 });
  assert.ok(o[0] < 0 && Math.abs(o[2]) < 1e-9);
});
