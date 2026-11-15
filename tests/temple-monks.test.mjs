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
      assert.ok(Math.hypot(x - s.at[0], z - s.at[1]) < 40, `${s.id} monk near the temple`);
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
  assert.ok(s.some(([x, z]) => x > 121 && z < 58), 'the wing you walk under from Iljumun');
  assert.ok(!s.some(([, z]) => z > 68), 'not further south than the real one');
  assert.ok(J.canopy.yard[1] + 1.9 < J.canopy.z1, 'the parade stands under it');
});
