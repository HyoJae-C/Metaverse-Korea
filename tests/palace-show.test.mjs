import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAN_KEEP, FAN_NOTE, FAN_LOOKS, FAN_ROUTINE, FAN_CYCLE, FAN_BLEND, fanSlot, fanPart, assignSlots, tripPose, TRIP_EVERY, TRIP_RUN, ROYAL_ROUTE, ROYAL_ORDER, ROYAL_PAUSE, nextStop, ringPoly, FAN_AT } from '../src/core/palace-show.js';
import { CollisionMap, pointInPoly } from '../src/core/collision.js';
import { toGame } from '../src/core/seoul-grid.js';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const FAN = FAN_AT; // main.js: the palace offset + FAN_AT, on the west lawn

test('the fan dance has an unseen ring you cannot walk into', () => {
  const ring = ringPoly(FAN[0], FAN[1], FAN_KEEP);
  const solid = new CollisionMap([{ p: ring }]);
  assert.ok(FAN_KEEP >= 9, 'clear of the outer ring of dancers (about 7 m)');
  assert.ok(pointInPoly(FAN[0], FAN[1] + FAN_KEEP - 1, ring));
  assert.ok(solid.blocked(FAN[0], FAN[1] + FAN_KEEP - 0.5, 0.3));
  assert.ok(!solid.blocked(FAN[0], FAN[1] + FAN_KEEP + 1, 0.3));
  // walking straight at the dancers stops at the ring
  let [x, z] = [FAN[0], FAN[1] + 20];
  for (let i = 0; i < 200; i++) [x, z] = solid.move(x, z, 0, -0.1, 0.3);
  assert.ok(Math.hypot(x - FAN[0], z - FAN[1]) > FAN_KEEP - 0.5);
  // the step-back note shows just outside the ring, where you can stand
  assert.ok(FAN_NOTE > FAN_KEEP + 1 && FAN_NOTE < FAN_KEEP + 4);
});

test('the fan dancers wear a bun and red lips', () => {
  assert.equal(FAN_LOOKS.length, 10);
  for (const l of FAN_LOOKS) { assert.equal(l.hairStyle, 'bun'); assert.equal(l.lip, 'scarlet'); }
});

test('the fan dance is a 30-second routine of varied formations, all inside the ring', () => {
  assert.equal(FAN_CYCLE, 30);
  assert.deepEqual(FAN_ROUTINE.map((p) => p.name), ['rings', 'flower', 'line', 'circle']);
  for (const p of FAN_ROUTINE) assert.ok(p.len > FAN_BLEND + 2, p.name + ' holds a while after blending in');
  for (let t = 0; t < FAN_CYCLE * 2; t += 0.25) {
    const P = fanPart(t);
    for (let i = 0; i < FAN_LOOKS.length; i++) {
      const [x, z] = fanSlot(P.part, i, t, P.u);
      assert.ok(Math.hypot(x, z) < FAN_KEEP - 1, `${P.part} slot ${i} at ${t}s strays to the ring`);
    }
  }
  // the line really is one row, and the flower gathers in close
  const line = Array.from({ length: FAN_LOOKS.length }, (_, i) => fanSlot('line', i, 3));
  assert.ok(line.every(([, z]) => Math.abs(z) < 0.5));
  assert.equal(new Set(line.map(([x]) => x.toFixed(2))).size, FAN_LOOKS.length);
  const flower = Array.from({ length: FAN_LOOKS.length }, (_, i) => Math.hypot(...fanSlot('flower', i, 3, 0.5).slice(0, 2)));
  assert.ok(Math.max(...flower) < 6);
  // parts come round in order and blend in smoothly
  assert.equal(fanPart(0).part, 'rings');
  assert.equal(fanPart(9).part, 'flower');
  assert.equal(fanPart(9).prev, 'rings');
  assert.ok(fanPart(9).k > 0 && fanPart(9).k < 1);
  assert.equal(fanPart(31).part, 'rings');
});

test('each dancer takes a different place in the next formation, near where she is', () => {
  const from = Array.from({ length: FAN_LOOKS.length }, (_, i) => fanSlot('rings', i, 8));
  const to = Array.from({ length: FAN_LOOKS.length }, (_, i) => fanSlot('flower', i, 10, 0.3));
  const slots = assignSlots(from, to);
  assert.equal(new Set(slots).size, FAN_LOOKS.length);
  assert.ok(slots.every((s) => s >= 0 && s < FAN_LOOKS.length));
  const same = assignSlots(to, to);
  assert.deepEqual(same, to.map((_, i) => i));
});

test('the royal procession walks paths clear of halls, walls and the fan dance', () => {
  const walls = new CollisionMap(map.buildings.concat(map.blockers));
  const { stops, links } = ROYAL_ROUTE;
  for (const [a, b] of links) {
    const [ax, az] = stops[a], [bx, bz] = stops[b], n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.5);
    for (let k = 0; k <= n; k++) {
      const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
      // the walkers go two abreast, with a guard out on each flank
      const wide = Math.max(...ROYAL_ORDER.map((o) => Math.abs(o.side))) + 0.3;
      for (const s of [-wide, 0, wide]) {
        const dx = bx - ax, dz = bz - az, l = Math.hypot(dx, dz);
        assert.ok(!walls.blocked(x + (dz / l) * s, z - (dx / l) * s, 0.3), `path ${a}-${b} hits a wall near ${x.toFixed(0)},${z.toFixed(0)}`);
      }
      assert.ok(Math.hypot(x - FAN[0], z - FAN[1]) > FAN_NOTE + 2, `path ${a}-${b} goes through the fan dance`);
    }
  }
  // every stop can be reached from every other
  const seen = new Set([0]), todo = [0];
  while (todo.length) { const s = todo.pop(); for (const l of links) for (const [p, q] of [l, [...l].reverse()]) if (p === s && !seen.has(q)) { seen.add(q); todo.push(q); } }
  assert.equal(seen.size, stops.length);
});

test('the procession picks a new way on, pausing about 10 s for photos', () => {
  assert.ok(ROYAL_PAUSE >= 8 && ROYAL_PAUSE <= 12);
  for (let i = 0; i < 50; i++) assert.notEqual(nextStop(ROYAL_ROUTE, 0, 1, Math.random), 1); // on round the lawn, not straight back
  assert.equal(nextStop(ROYAL_ROUTE, 1, 0, Math.random), 2);
  assert.equal(nextStop({ stops: [[0, 0], [1, 0]], links: [[0, 1]] }, 1, 0, Math.random), 0); // at a dead end: back the way he came
});

test('the procession stays in sight of the front court, where Enter brings you', () => {
  for (const [x, z] of ROYAL_ROUTE.stops) assert.ok(Math.hypot(x, z - FAN[1]) < 170, `stop ${x},${z} is out of sight of the courtyard`);
  const who = ROYAL_ORDER.map((o) => o.who);
  for (const w of ['king', 'queen', 'parasol', 'fan', 'eunuch', 'sanggung']) assert.ok(who.includes(w), w);
  assert.equal(who.filter((w) => w === 'guard').length, 2);
  assert.equal(who.filter((w) => w === 'lady').length, 2);
  // the parasol is carried right behind the king, on his side
  const king = ROYAL_ORDER.find((o) => o.who === 'king'), par = ROYAL_ORDER.find((o) => o.who === 'parasol');
  assert.equal(par.side, king.side);
  assert.ok(par.back > king.back && par.back - king.back < 2);
});

test('now and then the last court lady trips, gets up flustered and hurries after the others', () => {
  assert.ok(TRIP_EVERY[0] >= 30, 'only once in a long while');
  const phases = [];
  for (let t = 0; t < 5; t += 0.05) { const p = tripPose(t); if (phases.at(-1) !== p.phase) phases.push(p.phase); }
  assert.deepEqual(phases, ['fall', 'down', 'up', 'fluster', 'hurry']);
  assert.ok(tripPose(1).flip > 1.2, 'flat on her face');
  assert.equal(tripPose(2.5).flip, 0, 'back on her feet');
  // she catches up: faster than the procession walks
  assert.ok(TRIP_RUN > 1.6 * 2);
  assert.equal(ROYAL_ORDER.filter((o) => o.who === 'lady').length, 2);
});

test('the palace stands on its real ground at 1/4, and the fan dance and the king are on the lawns', () => {
  // The wall is OSM's outline of the palace grounds, measured from Gwanghwamun (scripts/build-gyeongbokgung.mjs).
  const osm = JSON.parse(readFileSync(new URL('../scripts/data/gyeongbokgung-osm.json', import.meta.url)));
  const local = (pts) => { const g = osm.elements.find((e) => e.name === '광화문').pts.slice(0, -1), c = g.reduce((a, p) => [a[0] + p[0] / g.length, a[1] + p[1] / g.length], [0, 0]), [gx, gz] = toGame(...c); return pts.map(([la, lo]) => { const [x, z] = toGame(la, lo); return [x - gx, z - gz]; }); };
  const real = local(osm.elements.find((e) => e.kind === 'palace').pts);
  const outer = map.landmarks.find((l) => l.type === 'wall' && l.gb).p;
  const box = (P) => [Math.min(...P.map((p) => p[0])), Math.min(...P.map((p) => p[1])), Math.max(...P.map((p) => p[0])), Math.max(...P.map((p) => p[1]))];
  const [a, b] = [box(real), box(outer)];
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i] - b[i]) < 1, `the wall on its real line (${a} vs ${b})`);
  assert.ok(a[2] - a[0] > 130 && a[2] - a[0] < 145 && -a[1] > 210 && -a[1] < 222, 'about 555 x 870 m in Seoul, at 1/4');
  assert.deepEqual(map.meta.enclosure.box, [Math.floor(b[0]), 0, Math.ceil(b[2]), Math.floor(b[1])]);
  // The fan dance and the king fill the two lawns either side of the
  // corridors round Heungnyemun and Geunjeongjeon (Yozi, 2026-11-10): the
  // dancers' ring on the west lawn, the king's walk on the east one.
  const lawn = (side) => map.areas.find((a) => a.k === 'grass' && a.p.every(([x, z]) => z > -90 && z < -25 && Math.sign(x) === side)).p;
  const west = lawn(-1), east = lawn(1);
  for (const [x, z] of ringPoly(FAN[0], FAN[1], FAN_NOTE)) assert.ok(pointInPoly(x, z, west), `the fan dance's ring is on the west lawn (${x.toFixed(0)},${z.toFixed(0)})`);
  for (const [x, z] of ROYAL_ROUTE.stops) assert.ok(pointInPoly(x, z, east), `stop ${x},${z} is on the east lawn`);
});

test('palace buildings: footprints at 30% of the real ones (Gwanghwamun 50%), heights at half', () => {
  const at = (type) => map.landmarks.find((l) => l.type === type);
  for (const t of ['palacegate', 'throne', 'yeongjegyo', 'amisan', 'hexpavilion']) assert.deepEqual(at(t).sc, [0.6, 1], t + ': drawn at 50%, 60% of that across');
  // Gwanghwamun is 50% across too, like its height, so it isn't a narrow tower (Yozi).
  assert.deepEqual(at('gwanghwamun').sc, [1, 1], 'Gwanghwamun: drawn at 50% both ways');
  assert.ok(Math.abs(at('gwanghwamun').w - 31.2 * 0.5) < 0.5, 'Gwanghwamun (31 m wide in Seoul)');
  assert.ok(Math.abs(at('throne').hs * 30 * 0.6 - 32 * 0.3) < 1, 'Geunjeongjeon (32 m wide on the map)');
  assert.deepEqual(at('pavilion').sc, [0.3, 0.5], 'Gyeonghoeru (its model is full size)');
  assert.equal(at('palacehalls').v, 1);
});

test('the palace has about a quarter of its buildings, and every hall and yard can be walked to', () => {
  const out = execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/build-gyeongbokgung.mjs', import.meta.url)), '--dry', '--check'], { encoding: 'utf8' });
  const [, n, all] = out.match(/buildings (\d+) of (\d+)/).map(Number);
  assert.equal(n, 30);
  assert.ok(n < all / 2);
  assert.match(out, /every hall and yard can be walked to/);
});

test('left-out buildings stand as plain blocks, and the two museums stay empty', () => {
  const halls = map.landmarks.find((l) => l.type === 'palacehalls').halls, blocks = halls.filter((h) => h[5] === 'r');
  assert.ok(blocks.length >= 10 && blocks.length <= 30, `a few plain blocks (${blocks.length})`);
  for (const [x, z] of blocks) {
    assert.ok(!(x > 45 && z < -95) && !(x > 25 && z < -150), `no block on or beside the Folk Museum's grounds (${x},${z})`);
    assert.ok(!(x < -30 && z > -70 && z < -20), `no block on the National Palace Museum (${x},${z})`);
  }
});
