import { test } from 'node:test';
import assert from 'node:assert/strict';

// The builders draw their signs on a canvas: a do-nothing one is enough here.
const ctx = new Proxy({}, { get: (o, k) => (k === 'measureText' ? () => ({ width: 100 }) : k in o ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => ctx }) };

const P = await import('../src/core/park-rides.js');
const { RIDES, RIDE_CYCLE, RIDE_GATES, RIDE_NAME, MAZE, FLUME_TRACK, TRAIN_TRACK, ridePhase, seatAt, canBoard, rideLocked, trackDist } = P;
const { buildThemePark } = await import('../src/core/themepark.js');
const { ROOM_SIZES, exitOf, roomBox } = await import('../src/core/interior.js');
const { CollisionMap } = await import('../src/core/collision.js');
const { GUEST_SEATS } = await import('../src/game/park-riders.js');
const { inMaze } = await import('../src/game/mirror-maze.js');

const NEW = ['swing', 'teacups', 'train', 'flume'];
const room = ROOM_SIZES.themepark;
const park = buildThemePark({ workshop: 'themepark' }, room, exitOf(room));
const col = new CollisionMap(park.colliders);
const R = 0.35;
function reachable(a, b, step = 0.25) {
  const bx = roomBox(room), key = (x, z) => `${Math.round(x / step)},${Math.round(z / step)}`;
  const seen = new Set([key(a.x, a.z)]), q = [[a.x, a.z]];
  while (q.length) {
    const [x, z] = q.shift();
    if (Math.hypot(x - b.x, z - b.z) < 0.6) return true;
    for (const [dx, dz] of [[step, 0], [-step, 0], [0, step], [0, -step]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < bx.x0 + 0.5 || nx > bx.x1 - 0.5 || nz < bx.z0 + 0.5 || nz > bx.z1 - 0.5 || seen.has(key(nx, nz)) || col.blocked(nx, nz, R)) continue;
      seen.add(key(nx, nz));
      q.push([nx, nz]);
    }
  }
  return false;
}
// A moment in a cycle: n cycles in, s seconds into the run (or load/stop).
const at = (kind, phase, s = 0) => { const c = RIDE_CYCLE[kind], len = c.load + c.run + c.stop, base = 1000 * len; return phase === 'load' ? base + s : phase === 'run' ? base + c.load + s : base + c.load + c.run + s; };

test('the new rides: each has a gate, an attendant, a price, a name in every language, and a cycle', () => {
  for (const k of NEW) {
    assert.ok(RIDE_GATES[k] && RIDE_GATES[k].staff, `${k} gate`);
    assert.ok(P.RIDE_PRICE[k] > 0 && P.RIDE_SECONDS[k] > 0, `${k} price and time`);
    assert.equal(Object.keys(RIDE_NAME[k]).length, 11, `${k}: 11 names`);
    assert.ok(P.RIDE_EMOJI[k], `${k} emoji`);
    assert.equal(ridePhase(k, at(k, 'load', 1)).phase, 'load');
    assert.ok(canBoard(k, at(k, 'load', 1)) && !rideLocked(k, 0, at(k, 'load', 1)));
    assert.ok(rideLocked(k, 0, at(k, 'run', 3)), `${k}: held in while it runs`);
    for (const s of GUEST_SEATS[k]) assert.ok(s < RIDES[k].seats, `${k}: guest seat ${s} exists`);
  }
  assert.equal(Object.keys(RIDE_NAME.maze).length, 11);
});

test('swing ride: chairs hang low to get on, fly out and up while it spins, all round the crown', () => {
  const S = RIDES.swing, rest = seatAt('swing', 0, at('swing', 'load', 2)), fly = seatAt('swing', 0, at('swing', 'run', 12));
  const r = (p) => Math.hypot(p.x - S.x, p.z - S.z);
  assert.ok(rest.y < 0.6 && rest.y > 0, `rest y ${rest.y}`);
  assert.ok(Math.abs(r(rest) - S.arm) < 0.01);
  assert.ok(fly.y > rest.y + 1.2, `up in the air (${fly.y.toFixed(2)})`);
  assert.ok(r(fly) > S.arm + 2.5 && r(fly) < 6.5, `out to ${r(fly).toFixed(2)} (inside its fence)`);
  const a = seatAt('swing', 0, at('swing', 'run', 12)), b = seatAt('swing', 0, at('swing', 'run', 12.2));
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 0.3, 'it goes round');
  // Facing the way it goes round.
  const dir = Math.atan2(b.x - a.x, b.z - a.z), d = Math.atan2(Math.sin(dir - a.ry), Math.cos(dir - a.ry));
  assert.ok(Math.abs(d) < 0.4, `faces its way (${d.toFixed(2)})`);
  assert.equal(seatAt('swing', 3, at('swing', 'stop', 3)).y, seatAt('swing', 3, at('swing', 'load', 3)).y, 'down again after');
});

test('teacups: every seat stays on the floor, in its cup, and the cups go round', () => {
  const T = RIDES.teacups;
  for (const t of [at('teacups', 'load', 2), at('teacups', 'run', 10)]) {
    for (let i = 0; i < T.seats; i++) {
      const s = seatAt('teacups', i, t), c = P.teacupSpot(Math.floor(i / T.per), t);
      assert.ok(Math.hypot(s.x - c.x, s.z - c.z) < T.cupR, `seat ${i} in its cup`);
      assert.ok(Math.hypot(s.x - T.x, s.z - T.z) < T.R + T.cupR, 'on the floor');
    }
  }
  const a = P.teacupSpot(0, at('teacups', 'run', 5)), b = P.teacupSpot(0, at('teacups', 'run', 15));
  assert.ok(Math.hypot(a.x - b.x, a.z - b.z) > 1, 'the floor turns');
});

test('train: waits at its station by the gate, goes once round the oval, seats on the rails', () => {
  const T = RIDES.train, SX = T.x - T.rx - 1.4, SZ = T.z + 1.5; // (the platform: 8 m along the west straight)
  for (let i = 0; i < T.seats; i++) {
    const s = seatAt('train', i, at('train', 'load', 3));
    assert.ok(Math.abs(s.x - SX) < 2.5 && Math.abs(s.z - SZ) < 4.2, `seat ${i} by the platform`);
    assert.ok(trackDist(TRAIN_TRACK, s.x, s.z) < 0.4, 'on the rails');
  }
  const mid = seatAt('train', 0, at('train', 'run', RIDE_CYCLE.train.run / 2));
  assert.ok(mid.x > RIDES.train.x + 3, 'half way: round the far side');
  const end = seatAt('train', 0, at('train', 'stop', 1)), start = seatAt('train', 0, at('train', 'load', 1));
  assert.ok(Math.hypot(end.x - start.x, end.z - start.z) < 0.01, 'back at the station');
});

test('log flume: boards at its platform, climbs the lift, plunges down the drop nose first, back in the station', () => {
  const g = RIDE_GATES.flume, s0 = seatAt('flume', 0, at('flume', 'load', 2));
  assert.ok(Math.hypot(s0.x - g.x, s0.z - g.z) < 2.6, 'the boat is by the gate');
  let top = 0, steepest = 0, seen = new Set();
  for (let s = 0; s < RIDE_CYCLE.flume.run; s += 0.1) {
    const p = P.flumeSpot(0, at('flume', 'run', s));
    top = Math.max(top, p.y);
    steepest = Math.max(steepest, p.pitch);
    seen.add(p.seg);
  }
  assert.ok(top > 5.5, `up to ${top.toFixed(1)} m`);
  assert.ok(steepest > 0.5, `down the drop at ${steepest.toFixed(2)} rad`);
  assert.equal(seen.size, FLUME_TRACK.pts.length, 'every stretch of the channel');
  const e = seatAt('flume', 0, at('flume', 'stop', 1));
  assert.ok(Math.hypot(e.x - s0.x, e.z - s0.z) < 0.01, 'back at the station');
});

test('the new rides stand apart and inside the park; every new gate is a walk from the park gate', () => {
  const bx = roomBox(room), spawn = exitOf(room);
  for (const k of NEW) {
    const g = RIDE_GATES[k];
    assert.ok(g.x > bx.x0 + 1 && g.x < bx.x1 - 1 && g.z > bx.z0 + 1 && g.z < bx.z1 - 1, `${k} gate inside`);
    assert.ok(!col.blocked(g.x, g.z, R), `${k} gate free`);
    assert.ok(!col.blocked(g.staff.x, g.staff.z, 0.3), `${k} attendant free`);
    assert.ok(reachable(spawn, g), `gate → ${k}`);
  }
  for (const p of TRAIN_TRACK.pts) assert.ok(p[0] < bx.x1 - 1 && p[2] < bx.z1 - 1, 'the oval is inside');
  for (const p of FLUME_TRACK.pts) assert.ok(p[0] < bx.x1 - 1 && p[2] > bx.z0 + 1, 'the channel is inside');
  const S = RIDES.swing, T = RIDES.teacups;
  assert.ok(Math.hypot(S.x - T.x, S.z - T.z) > 12, 'swing ↔ teacups');
});

test('mirror maze: a way through from the door to the exit, walkable, and you reach it from the gate', () => {
  // Cells joined where no wall stands between them.
  const { cols, rows, cell, x0, z0 } = MAZE;
  const wallAt = (ax, az, bx, bz) => MAZE.walls.some(([wx0, wz0, wx1, wz1]) => {
    const mx = (ax + bx) / 2, mz = (az + bz) / 2;
    if (wx0 === wx1) return Math.abs(mx - wx0) < 0.01 && Math.abs(az - bz) < 0.01 && mz > wz0 && mz < wz1;
    return Math.abs(mz - wz0) < 0.01 && Math.abs(ax - bx) < 0.01 && mx > wx0 && mx < wx1;
  });
  const door = [Math.floor((MAZE.door[0] - x0) / cell), rows - 1], exit = [cols - 1, Math.floor((MAZE.exit[1] - z0) / cell)];
  const seen = new Set([door.join()]), q = [door];
  while (q.length) {
    const [c, r] = q.shift();
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nc = c + dc, nr = r + dr;
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows || seen.has(nc + ',' + nr)) continue;
      const ex = x0 + (Math.max(c, nc)) * cell, ez = z0 + (Math.max(r, nr)) * cell;
      const blocked = dc ? wallAt(ex, z0 + r * cell, ex, z0 + (r + 1) * cell) : wallAt(x0 + c * cell, ez, x0 + (c + 1) * cell, ez);
      if (blocked) continue;
      seen.add(nc + ',' + nr);
      q.push([nc, nr]);
    }
  }
  assert.equal(seen.size, cols * rows, 'every cell can be reached');
  assert.ok(seen.has(exit.join()));
  // And on foot, with the real walls: gate → the door → inside → out the far side.
  const spawn = exitOf(room), inDoor = { x: MAZE.door[0], z: MAZE.door[1] - 1 }, out = { x: MAZE.exit[0] + 1.2, z: MAZE.exit[1] };
  assert.ok(inMaze(inDoor.x, inDoor.z) && !inMaze(out.x, out.z));
  assert.ok(reachable(spawn, { x: MAZE.door[0], z: MAZE.door[1] + 1 }), 'gate → maze door');
  assert.ok(reachable(inDoor, out), 'through the maze');
});
