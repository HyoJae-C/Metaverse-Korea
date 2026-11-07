import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FAN_KEEP, FAN_NOTE, FAN_LOOKS, FAN_ROUTINE, FAN_CYCLE, FAN_BLEND, fanSlot, fanPart, assignSlots, ROYAL_ROUTE, ROYAL_ORDER, ROYAL_PAUSE, nextStop, ringPoly } from '../src/core/palace-show.js';
import { CollisionMap, pointInPoly } from '../src/core/collision.js';

const map = JSON.parse(readFileSync(new URL('../public/regions/another-seoul/districts/gyeongbokgung.json', import.meta.url)));
const FAN = [0, -150]; // main.js: the palace offset + (0, -150)

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
  assert.equal(FAN_LOOKS.length, 20);
  for (const l of FAN_LOOKS) { assert.equal(l.hairStyle, 'bun'); assert.equal(l.lip, 'scarlet'); }
});

test('the fan dance is a 30-second routine of varied formations, all inside the ring', () => {
  assert.equal(FAN_CYCLE, 30);
  assert.deepEqual(FAN_ROUTINE.map((p) => p.name), ['rings', 'flower', 'line', 'circle']);
  for (const p of FAN_ROUTINE) assert.ok(p.len > FAN_BLEND + 2, p.name + ' holds a while after blending in');
  for (let t = 0; t < FAN_CYCLE * 2; t += 0.25) {
    const P = fanPart(t);
    for (let i = 0; i < 20; i++) {
      const [x, z] = fanSlot(P.part, i, t, P.u);
      assert.ok(Math.hypot(x, z) < FAN_KEEP - 1, `${P.part} slot ${i} at ${t}s strays to the ring`);
    }
  }
  // the line really is one row, and the flower gathers in close
  const line = Array.from({ length: 20 }, (_, i) => fanSlot('line', i, 3));
  assert.ok(line.every(([, z]) => Math.abs(z) < 0.5));
  assert.equal(new Set(line.map(([x]) => x.toFixed(2))).size, 20);
  const flower = Array.from({ length: 20 }, (_, i) => Math.hypot(...fanSlot('flower', i, 3, 0.5).slice(0, 2)));
  assert.ok(Math.max(...flower) < 6);
  // parts come round in order and blend in smoothly
  assert.equal(fanPart(0).part, 'rings');
  assert.equal(fanPart(9).part, 'flower');
  assert.equal(fanPart(9).prev, 'rings');
  assert.ok(fanPart(9).k > 0 && fanPart(9).k < 1);
  assert.equal(fanPart(31).part, 'rings');
});

test('each dancer takes a different place in the next formation, near where she is', () => {
  const from = Array.from({ length: 20 }, (_, i) => fanSlot('rings', i, 8));
  const to = Array.from({ length: 20 }, (_, i) => fanSlot('flower', i, 10, 0.3));
  const slots = assignSlots(from, to);
  assert.equal(new Set(slots).size, 20);
  assert.ok(slots.every((s) => s >= 0 && s < 20));
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
  for (let i = 0; i < 50; i++) assert.notEqual(nextStop(ROYAL_ROUTE, 1, 0, Math.random), 0); // stop 1 has other ways on
  assert.equal(nextStop(ROYAL_ROUTE, 0, 1, Math.random), 2);
});

test('the procession stays round Geunjeongjeon, where Enter brings you', () => {
  for (const [x, z] of ROYAL_ROUTE.stops) assert.ok(Math.hypot(x - FAN[0], z - FAN[1]) < 125, `stop ${x},${z} is out of sight of the courtyard`);
  const who = ROYAL_ORDER.map((o) => o.who);
  for (const w of ['king', 'queen', 'parasol', 'fan', 'eunuch', 'sanggung']) assert.ok(who.includes(w), w);
  assert.equal(who.filter((w) => w === 'guard').length, 2);
  assert.equal(who.filter((w) => w === 'lady').length, 2);
  // the parasol is carried right behind the king, on his side
  const king = ROYAL_ORDER.find((o) => o.who === 'king'), par = ROYAL_ORDER.find((o) => o.who === 'parasol');
  assert.equal(par.side, king.side);
  assert.ok(par.back > king.back && par.back - king.back < 2);
});
