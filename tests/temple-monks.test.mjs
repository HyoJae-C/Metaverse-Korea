// Jogyesa and Bongeunsa, made right (Yozi 2026-11-15): monks with shaved
// heads at both temples (data/temple-monks.js, game/temple-monks.js), loaded
// only near them; a wall round Bongeunsa with its two ways in; Jogyesa's
// lantern canopy in its real shape (data/jogyesa.js).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inPolygon } from '../src/core/seoul-grid.js';
import { MONK_SITES, MONK_LOOK } from '../src/data/temple-monks.js';
import { HAIR_STYLES, sanitizeLook } from '../src/data/appearance.js';
import { JOGYESA as J, canopySlots, inCanopy } from '../src/data/jogyesa.js';
import { SLOTS } from '../src/core/temple-lanterns.js';

const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const mapOf = (id) => read(region.districts.find((d) => d.id === id).map);
const src = (f) => readFileSync(new URL('../src/' + f, import.meta.url), 'utf8');
const solid = (m) => [...m.blockers.map((b) => b.p), ...m.buildings.map((b) => b.p)];

test('monks: shaved heads, two at each temple, never in a wall or a hall', () => {
  assert.equal(MONK_LOOK.hairStyle, 'shaved');
  assert.ok(!HAIR_STYLES.includes('shaved'), 'not a style players can pick');
  assert.equal(sanitizeLook(MONK_LOOK).hairStyle, 'shaved', 'kept when the character is made (not dropped back to the model\'s own hair)');
  assert.match(src('core/hair-styles.js'), /case 'shaved':/);
  assert.match(src('game/lantern-parade.js'), /MONK_LOOK/, 'the parade\'s monks too');
  assert.doesNotMatch(src('core/bosingak-show.js'), /hairStyle: 'buzz'/, 'and Bosingak\'s');
  for (const s of MONK_SITES) {
    assert.ok(s.monks.length >= 2 && s.monks.length <= 3, s.id);
    const map = mapOf(s.district), P = solid(map);
    const spots = s.monks.flatMap((m) => (m.bow ? [m.bow] : m.walk.flatMap((a, i) => {
      const b = m.walk[i + 1];
      if (!b) return [a];
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.25);
      return Array.from({ length: n }, (_, k) => [a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
    })));
    for (const [x, z] of spots) {
      for (const p of P) for (const [dx, dz] of [[0, 0], [0.3, 0], [-0.3, 0], [0, 0.3], [0, -0.3]]) assert.ok(!inPolygon(x + dx, z + dz, p), `${s.id} monk at ${x.toFixed(1)},${z.toFixed(1)} in a wall or hall`);
      assert.ok(Math.hypot(x - s.at[0], z - s.at[1]) < 60, `${s.id} monk near the temple`);
    }
  }
});

test('monks: loaded only near the temples, not in the first download', () => {
  const main = src('main.js');
  assert.match(main, /from '\.\/game\/temple-monks-near\.js'/);
  assert.doesNotMatch(main, /temple-monks\.js'/);
  assert.match(src('game/temple-monks-near.js'), /import\('\.\/temple-monks\.js'\)/);
});

test('Bongeunsa: a wall round the grounds, open only at Iljumun and the drive', () => {
  const map = mapOf('samseong'), t = map.landmarks.find((l) => l.type === 'bongeunsa');
  assert.ok(t.wall.length >= 8, 'wall runs');
  const len = t.wall.reduce((s, [a, b, c, d]) => s + Math.hypot(c - a, d - b), 0);
  assert.ok(len > 120, `wall ${len.toFixed(0)} m long`);
  const walls = map.blockers.filter((b) => b.p.length === 4);
  const crosses = ([ax, az], [bx, bz]) => walls.some((b) => { for (let k = 0; k <= 40; k++) if (inPolygon(ax + (bx - ax) * k / 40, az + (bz - az) * k / 40, b.p)) return true; return false; });
  // Through each gate: from the pavement outside to the yard inside.
  const [ix, iz, ry] = t.iljumun, I = [ix + t.x, iz + t.z], f = [Math.sin(ry), Math.cos(ry)];
  assert.ok(!crosses([I[0] + f[0] * 3, I[1] + f[1] * 3], [I[0] - f[0] * 4, I[1] - f[1] * 4]), 'in through Iljumun');
  // Anywhere else along Bongeunsa-ro: the wall is in the way.
  const south = t.wall.filter(([a, b, c, d]) => (b + d) / 2 > 30).sort((p, q) => q[2] - p[2])[0];
  const m = [(south[0] + south[2]) / 2 + t.x, (south[1] + south[3]) / 2 + t.z];
  assert.ok(crosses([m[0], m[1] + 3], [m[0], m[1] - 3]), 'walled along the street');
});

test('Jogyesa: the canopy in its real shape, close-hung, the yard and the east wing', () => {
  const s = canopySlots();
  assert.ok(s.length >= 450, `${s.length} lanterns`);
  assert.equal(SLOTS, 400, 'players still have 400 spots (the server\'s count)');
  assert.ok(J.canopy.gap <= 0.65, 'lanterns touch: one roof from above');
  for (const [x, z] of s) assert.ok(inCanopy(x, z), 'inside its parts');
  assert.ok(s.some(([x, z]) => x > 120 && Math.abs(z - J.iljumun.z) < 2), 'the wing you walk under from Iljumun');
  assert.ok(J.canopy.x1 < J.iljumun.x - J.iljumun.d / 2, 'it stops short of the gate');
  assert.ok(J.canopy.yard[1] + 1.9 < J.canopy.z1, 'the parade stands under it');
});

test('Jogyesa: the whole temple at 37.5%, every hall on its real spot grown about Iljumun', async () => {
  const { grow, SCALE, PIVOT } = await import('../src/data/jogyesa.js');
  assert.equal(SCALE, 1.5);
  // Real middles at 1/4 (OpenStreetMap, the district's metres).
  const real = { daeungjeon: [111.6, 55.5], geungnakjeon: [104.8, 56.6], iljumun: [129.6, 57.2], ujeongguk: [129.4, 41.2] };
  for (const [n, p] of Object.entries(real)) {
    const [x, z] = grow(p), h = J[n];
    assert.ok(Math.hypot(h.x - x, h.z - z) <= 2.1, `${n} within 2 m of its place (${Math.hypot(h.x - x, h.z - z).toFixed(1)} m)`);
  }
  assert.ok(Math.hypot(J.iljumun.x - PIVOT[0], J.iljumun.z - PIVOT[1]) < 6, 'the gate stays by the street');
  // Daeungjeon: OSM's outline (its plinth) 9.7 x 6.4 m at 1/4.
  const D = J.daeungjeon;
  assert.ok(Math.abs(D.w + 2.6 - 9.7 * 1.5) < 0.6 && Math.abs(D.d + 2.6 - 6.4 * 1.5) < 0.6, 'Daeungjeon\'s plinth 37.5%');
  // The two halls stand side by side without touching, both on the grounds.
  const G = J.geungnakjeon;
  assert.ok(G.x + G.w / 2 + 1.3 <= D.x - D.w / 2 - 1.3 + 0.01, 'the plinths don\'t overlap');
  const xs = J.site.map((q) => q[0]), zs = J.site.map((q) => q[1]);
  for (const h of [D, G, J.bell, J.sarira, J.ujeongguk]) assert.ok(h.x > Math.min(...xs) + 1 && h.x < Math.max(...xs) - 1 && h.z > Math.min(...zs) + 1 && h.z < Math.max(...zs) - 1, 'on the grounds');
  // Nothing of the temple under a building, the museum clear of Yulgok-ro and Daeungjeon.
  const map = mapOf('gyeongbokgung');
  for (const b of map.buildings.filter((q) => !q.jg)) for (const [x, z] of J.site) assert.ok(!inPolygon(x, z, b.p), 'the grounds clear of the blocks beside them');
  assert.ok(J.museum[1] >= 26 && J.museum[3] < D.z - D.d / 2 - 1.3 - 2);
});

test('Jogyesa: a wall round the grounds, open only at Iljumun', async () => {
  const { wallRuns } = await import('../src/data/jogyesa.js');
  const map = mapOf('gyeongbokgung');
  const walls = map.blockers.filter((b) => b.jg && b.why === 'the temple wall');
  assert.equal(walls.length, wallRuns().length);
  const blocked = (x, z) => walls.some((b) => inPolygon(x, z, b.p));
  const crosses = ([ax, az], [bx, bz]) => { for (let k = 0; k <= 60; k++) if (blocked(ax + (bx - ax) * k / 60, az + (bz - az) * k / 60)) return true; return false; };
  const I = J.iljumun, xs = J.site.map((q) => q[0]), zs = J.site.map((q) => q[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  assert.ok(!crosses([x1 + 2, I.z], [x1 - 6, I.z]), 'in through Iljumun from Ujeongguk-ro');
  for (const z of [z0 + 5, I.z - I.w / 2 - 1, I.z + I.w / 2 + 1, z1 - 5]) assert.ok(crosses([x1 + 2, z], [x1 - 3, z]), `walled along the street at z ${z}`);
  for (const x of [x0 + 5, (x0 + x1) / 2, x1 - 5]) { assert.ok(crosses([x, z0 - 2], [x, z0 + 3]), 'the north side'); assert.ok(crosses([x, z1 + 2], [x, z1 - 3]), 'the south side'); }
  assert.ok(crosses([x0 - 2, I.z], [x0 + 3, I.z]), 'the west side');
});
