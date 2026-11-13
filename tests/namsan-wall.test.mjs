import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { loadRegionMap } from '../src/core/districts.js';
import { CollisionMap } from '../src/core/collision.js';
import { onNamsan, namsanGround } from '../src/core/namsan-shape.js';
import { createNamsanWalk } from '../src/game/namsan-walk.js';

// The Seoul City Wall on Namsan, Baekbeom Square to Gwanghuimun
// (scripts/build-namsan-wall.mjs): the wall on its real OpenStreetMap line
// at 1/4, 50% high, its trail (서울한양도성 남산구간) walkable all the way,
// Gwanghuimun at 43.75% like Hyehwamun, and Sungnyemun at 50% like
// Heunginjimun (Yozi, 2026-11-13).
const R = new URL('../public/regions/another-seoul/', import.meta.url);
const rj = (f) => JSON.parse(readFileSync(new URL(f, R), 'utf8'));
const region = rj('region.json');
const map = await loadRegionMap(region, async (f) => rj(f));
const osm = JSON.parse(readFileSync(new URL('../scripts/data/namsan-wall-osm.json', import.meta.url), 'utf8'));
const hill = map.landmarks.find((l) => l.type === 'namsan');
const W = (p) => p.map(([x, z]) => [hill.x + x, hill.z + z]);
const runs = hill.wall.runs.map(W);
const gate = { ...hill.wall.gate, x: hill.x + hill.wall.gate.x, z: hill.z + hill.wall.gate.z };
const trails = map.roads.filter((r) => r.hw);
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))); return Math.hypot(x - ax - dx * t, z - az - dz * t); };
const lineDist = (x, z, p) => Math.min(...p.slice(1).map((q, i) => segDist(x, z, p[i], q)));
const samples = (p, step) => p.slice(1).flatMap((b, i) => { const a = p[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step)); return Array.from({ length: n }, (_, k) => [a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n]); });
const len = (p) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
// What you bump into, with the hill's trails as decks (as main.js builds it).
const collision = new CollisionMap(map.buildings.filter((b) => !b.visit).concat(map.blockers || []));
createNamsanWalk({ landmarks: map.landmarks, collision });

test('the wall is on its real OpenStreetMap line at 1/4, with its real gaps', () => {
  assert.match(osm.note, /OpenStreetMap contributors/);
  const real = osm.elements.filter((e) => e.tags?.barrier === 'city_wall' || e.tags?.historic === 'citywalls').map((e) => e.geometry.map((q) => toGame(q.lat, q.lon)));
  let worst = 0;
  for (const p of runs) for (const [x, z] of p) worst = Math.max(worst, Math.min(...real.map((q) => lineDist(x, z, q))));
  assert.ok(worst < 1, `every point within 1 m of the real line (worst ${worst.toFixed(2)} m)`);
  const total = runs.reduce((s, p) => s + len(p), 0);
  assert.ok(total > 450 && total < 650, `${Math.round(total)} m of wall (about 2.3 km real)`);
  assert.ok(runs.length >= 6, `${runs.length} stretches`);
  // On the hill and off it: up the summit's ridge and through Jangchung-dong.
  assert.ok(runs.some((p) => p.some(([x, z]) => namsanGround(hill, x - hill.x, z - hill.z) > 50)), 'up by the summit');
  assert.ok(runs.some((p) => p.every(([x, z]) => !onNamsan(hill, x - hill.x, z - hill.z))), 'down in Jangchung-dong');
  // 50% high (Yozi): about 3.5 m.
  assert.ok(hill.wall.H > 3.2 && hill.wall.H < 4, `${hill.wall.H} m`);
});

test('the trail goes from Baekbeom Square over the summit plaza to Gwanghuimun, and you can walk all of it', () => {
  const ways = [...trails, map.roads.find((r) => r.nw)];
  const start = toGame(37.5557752, 126.9769588); // the course's first node, by Baekbeom Square
  assert.ok(ways.some((r) => Math.hypot(r.p[0][0] - start[0], r.p[0][1] - start[1]) < 8), 'starts at Baekbeom Square');
  assert.ok(trails.some((r) => Math.hypot(r.p.at(-1)[0] - gate.x, r.p.at(-1)[1] - gate.z) < 12), 'ends by Gwanghuimun');
  const tower = [hill.x + hill.px, hill.z + hill.pz];
  assert.ok(trails.some((r) => Math.hypot(r.p.at(-1)[0] - tower[0], r.p.at(-1)[1] - tower[1]) < 27), 'comes up to the summit plaza');
  const total = trails.reduce((s, r) => s + len(r.p), 0);
  assert.ok(total > 1000 && total < 1500, `${Math.round(total)} m`);
  for (const r of ways) for (const [x, z] of samples(r.p, 0.5)) assert.ok(!collision.blocked(x, z, 0.35), `${r.n.en} blocked at ${x.toFixed(1)}, ${z.toFixed(1)}`);
});

test('the trails keep off the wall; it opens where one goes through', () => {
  const ways = [...trails, map.roads.find((r) => r.nw)];
  for (const r of ways) for (const [x, z] of samples(r.p, 0.5)) {
    const d = Math.min(...runs.map((p) => lineDist(x, z, p)));
    assert.ok(d > hill.wall.thick / 2 + 0.6, `${r.n.en} at ${x.toFixed(1)}, ${z.toFixed(1)}: ${d.toFixed(2)} m from the wall`);
  }
});

test('the wall and the gate keep off the streets; off the hill the wall is solid', () => {
  const streets = map.roads.filter((r) => !r.hill && r.k !== 'walk');
  for (const p of runs) for (const [x, z] of samples(p, 1)) for (const r of streets) assert.ok(lineDist(x, z, r.p) > r.w / 2, `wall at ${x.toFixed(1)}, ${z.toFixed(1)} on ${r.n?.en}`);
  const off = runs.flatMap((p) => samples(p, 2)).filter(([x, z]) => !onNamsan(hill, x - hill.x, z - hill.z, 1) && Math.hypot(x - gate.x, z - gate.z) > 5);
  assert.ok(off.length > 50);
  for (const [x, z] of off) assert.ok(collision.blocked(x, z, 0.3), `the wall at ${x.toFixed(1)}, ${z.toFixed(1)} is solid`);
});

test('Gwanghuimun is on its real spot at 43.75%, clear of Toegye-ro, and you walk through its arch', () => {
  const nodes = osm.elements.filter((e) => e.type === 'node' && /광희문/.test(e.tags?.name || '')).map((e) => toGame(e.lat, e.lon));
  const real = [nodes.reduce((s, q) => s + q[0], 0) / nodes.length, nodes.reduce((s, q) => s + q[1], 0) / nodes.length];
  assert.ok(Math.hypot(gate.x - real[0], gate.z - real[1]) < 15, 'within 15 m of the real one');
  assert.ok(gate.W > 4.5 && gate.W < 5.6 && gate.D < gate.W, `${gate.W} x ${gate.D} m`);
  assert.ok(gate.S + gate.A > 1.45, `the arch's top (${gate.S + gate.A} m) is over the character's head`);
  const c = Math.cos(gate.ry), s = Math.sin(gate.ry), P = (u, v) => [gate.x + u * c + v * s, gate.z - u * s + v * c];
  for (let v = -gate.D / 2 - 1; v <= gate.D / 2 + 1; v += 0.25) assert.ok(!collision.blocked(...P(0, v), 0.35), `the arch is open at ${v.toFixed(2)}`);
  assert.ok(collision.blocked(...P(gate.W / 3, 0), 0.35) && collision.blocked(...P(-gate.W / 3, 0), 0.35), 'the base either side is solid');
  const toegye = map.roads.filter((r) => r.n?.en === 'Toegye-ro');
  for (const u of [-1, 1]) for (const v of [-1, 1]) for (const r of toegye) assert.ok(lineDist(...P((u * gate.W) / 2, (v * gate.D) / 2), r.p) > r.w / 2, 'off Toegye-ro');
});

test('Sungnyemun is at half size, like Heunginjimun, and you walk through its arch', () => {
  const eul = rj('districts/euljiro.json');
  const [ex, ez] = region.districts.find((d) => d.id === 'euljiro').offset;
  const g = eul.landmarks.find((l) => l.type === 'sungnyemun');
  assert.deepEqual(g.sc, [0.5]);
  const [x, z] = [g.x + ex, g.z + ez];
  for (let dz = -8; dz <= 8; dz += 0.5) assert.ok(!collision.blocked(x, z + dz, 0.35), `the arch is open at ${dz}`);
  for (const dx of [-5, 5]) assert.ok(collision.blocked(x + dx, z, 0.35), 'its base is solid');
  assert.ok(!collision.blocked(x + 9, z + 4, 0.35) && !collision.blocked(x - 9, z - 4, 0.35), 'the lawn beyond its smaller base is open');
  for (const w of eul.landmarks.filter((l) => l.type === 'citywall' && l.z === g.z)) assert.deepEqual(w.sc, [0.6, 0.6], 'its wall stubs as low as Heunginjimun\'s');
});

test('the place names: the Namsan City Wall Trail, and Gwanghuimun at its gate', () => {
  const names = map.pois.filter((p) => p.hw).map((p) => p.name.en).sort();
  assert.deepEqual(names, ['Gwanghuimun', 'Namsan City Wall Trail']);
});

test('the trails go up Namsan at a walkable grade: nowhere steeper than 22°, and the summit plaza stays level', () => {
  // (Yozi 2026-11-13: the west way up from Baekbeom Square was up to 45°)
  const g = (x, z) => namsanGround(hill, x - hill.x, z - hill.z);
  for (const p of [...hill.wtrail.map(W), W(hill.trail)]) {
    const s = samples(p, 1);
    for (let i = 1; i < s.length; i++) {
      const d = Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]) || 1;
      const deg = (Math.atan(Math.abs(g(...s[i]) - g(...s[i - 1])) / d) * 180) / Math.PI;
      assert.ok(deg < 22, `${deg.toFixed(0)}° at ${s[i][0].toFixed(1)}, ${s[i][1].toFixed(1)}`);
    }
  }
  assert.equal(hill.h, 56);
  for (let a = 0; a < 6.28; a += 0.5) assert.ok(Math.abs(namsanGround(hill, hill.px + Math.cos(a) * 25, hill.pz + Math.sin(a) * 25) - hill.h) < 0.05, 'the plaza is level');
});
