import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { toGame } from '../src/core/seoul-grid.js';
import { CollisionMap } from '../src/core/collision.js';
import { lawnFrom, onLawn } from '../src/core/picnic-mat.js';
import { createCityHallNear } from '../src/game/city-hall-near.js';

// Seoul City Hall and Seoul Plaza (scripts/build-city-hall.mjs): the whole
// place at 37.5% of real size (1.5 × the 1/4 map, Yozi 2026-11-24) grown from
// one fixed point, so the roads round it are off their real lines and say so.
const read = (f) => JSON.parse(readFileSync(new URL('../public/regions/another-seoul/' + f, import.meta.url)));
const region = read('region.json');
const map = read('districts/gyeongbokgung.json');
const osm = JSON.parse(readFileSync(new URL('../scripts/data/city-hall-osm.json', import.meta.url)));
const [ox, oz] = region.districts.find((d) => d.id === 'gyeongbokgung').offset;
const M = map.meta.cityhall;
const local = ([la, lo]) => { const [x, z] = toGame(la, lo); return [x - ox, z - oz]; };
const grow = ([x, z]) => [M.game[0] + M.scale * (x - M.real[0]), M.game[1] + M.scale * (z - M.real[1])];
const one = (k) => osm.elements.find((e) => e.kind === k);
const ring = (P) => (P.length > 1 && P[0][0] === P.at(-1)[0] && P[0][1] === P.at(-1)[1] ? P.slice(0, -1) : P);
const area = (P) => { let s = 0; for (let i = 0; i < P.length; i++) { const a = P[i], b = P[(i + 1) % P.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s / 2); };
const box = (P) => { const xs = P.map((q) => q[0]), zs = P.map((q) => q[1]); return [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)]; };
const mid = (P) => { const [a, b, c, d] = box(P); return [(a + b) / 2, (c + d) / 2]; };
const segDist = (x, z, [ax, az], [bx, bz]) => { const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz, t = l2 ? Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2)) : 0; return Math.hypot(x - (ax + dx * t), z - (az + dz * t)); };
const lineDist = (x, z, P) => { let b = Infinity; for (let i = 1; i < P.length; i++) b = Math.min(b, segDist(x, z, P[i - 1], P[i])); return b; };
const inside = (P, x, z) => { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) if ((P[i][1] > z) !== (P[j][1] > z) && x < ((P[j][0] - P[i][0]) * (z - P[i][1])) / (P[j][1] - P[i][1]) + P[i][0]) c = !c; return c; };
const lm = (t) => map.landmarks.find((l) => l.type === t && l.sp);
const hall = lm('cityhall'), old = lm('oldcityhall'), gate = lm('palacegate');
const lawn = map.areas.find((a) => a.sp && a.lawn), paving = map.areas.find((a) => a.sp && a.k === 'plaza');
const foot = (l) => l.outline.map(([u, v]) => [l.x + u, l.z + v]);

test('the lawn and both halls are OSM\'s shapes at 1.5 × the 1/4 map, grown from one fixed point', () => {
  assert.equal(M.scale, 1.5);
  for (const [name, mine, kind] of [['lawn', lawn.p, 'lawn'], ['new hall', foot(hall), 'hall'], ['old hall', foot(old), 'library']]) {
    const real = ring(one(kind).pts.map(local));
    const k = Math.sqrt(area(mine) / area(real));
    assert.ok(Math.abs(k - 1.5) < 0.06, `${name} is 1.5 × across (${k.toFixed(2)})`);
    const [gx, gz] = grow(mid(real)), [mx, mz] = mid(mine);
    assert.ok(Math.hypot(gx - mx, gz - mz) < 1.5, `${name} is where growing puts it (${Math.hypot(gx - mx, gz - mz).toFixed(1)} m)`);
    const off = Math.hypot(mx - mid(real)[0], mz - mid(real)[1]);
    assert.ok(Math.abs(off - M.moved[name]) < 1, `${name}: the note says ${M.moved[name]} m from its real spot, it is ${off.toFixed(1)}`);
  }
  const [w, d] = M.lawn.size;
  assert.ok(w > 24 && w < 27 && d > 30 && d < 33, `the lawn is about 26 × 31 m (${w} × ${d})`);
  assert.ok(old.h < hall.h && hall.h > 18 && hall.h < 24, 'the glass hall stands over the stone one');
  assert.ok(box(foot(old))[3] > box(foot(hall))[3], 'the old hall is in front (south) of the new one');
});

test('Sejong-daero is on its real line; every road moved out with the plaza is marked and says why', () => {
  const real = osm.elements.filter((e) => e.kind === 'road' && /세종대로$/.test(e.name || '')).map((e) => e.pts.map(local));
  assert.ok(real.length, 'OSM has Sejong-daero');
  const roads = map.roads.filter((r) => r.sp);
  assert.equal(roads.filter((r) => !r.approx).length, 0, 'every road this place adds is moved or made up');
  // Sejong-daero past the plaza is the region's link road (from Sungnyemun), not drawn a second time here
  const sejong = region.links.filter((r) => r.n?.en === 'Sejong-daero').map((r) => r.p.map(([x, z]) => [x - ox, z - oz])).find((P) => P.some(([, z]) => z > 250 && z < 340));
  assert.ok(sejong, 'the link road passes the plaza');
  for (const [x, z] of sejong) { if (z < 250 || z > 340) continue; const d = Math.min(...real.map((P) => lineDist(x, z, P))); assert.ok(d < 10, `Sejong-daero at ${x},${z} is ${d.toFixed(1)} m off`); }
  assert.ok(lineDist(...roads.find((r) => r.n?.en === 'Sogong-ro').p[0], sejong) < 6, 'Sogong-ro starts on Sejong-daero');
  // Eulji-ro: the link road east of here starts where this one ends, and no link road crosses the plaza any more
  const eulji = roads.find((r) => r.n?.en === 'Eulji-ro'), link = region.links.find((r) => r.n?.en === 'Eulji-ro');
  assert.deepEqual(link.p[0], [eulji.p.at(-1)[0] + ox, eulji.p.at(-1)[1] + oz]);
  for (const r of region.links) for (let i = 1; i < r.p.length; i++) for (let t = 0; t <= 1; t += 0.05) {
    const x = r.p[i - 1][0] + (r.p[i][0] - r.p[i - 1][0]) * t - ox, z = r.p[i - 1][1] + (r.p[i][1] - r.p[i - 1][1]) * t - oz;
    assert.ok(!inside(M.noBase[0], x, z), `the link road ${r.n?.en} crosses the plaza at ${x.toFixed(0)},${z.toFixed(0)}`);
  }
  for (const r of roads.filter((r) => r.approx)) assert.ok(r.why && r.why.length > 20, 'a moved or made-up road says why');
  assert.deepEqual(roads.filter((r) => r.approx && r.n).map((r) => r.n.en).sort(), ['Eulji-ro', 'Mugyo-ro', 'Sogong-ro']);
  for (const k of ['sogong-ro', 'new hall', 'lawn', 'old hall']) assert.ok(M.moved[k] > 10 && M.moved[k] < 25, `${k} moved ${M.moved[k]} m: known, and no more than the size change makes it`);
  assert.ok(M.moved['eulji-ro at namdaemun-ro'] <= 10 && M.moved.daehanmun <= 15);
  assert.ok(M.approx.length >= 4 && M.why);
  for (const a of map.areas.filter((a) => a.sp)) assert.ok(a.why, 'each area says where it is from');
  for (const l of map.landmarks.filter((l) => l.sp && l.type !== 'sign')) assert.ok(l.why, l.type);
});

test('nothing else stands on the plaza: no building of any district, and the two halls do not overlap', () => {
  const [x0, x1, z0, z1] = box(paving.p);
  const keep = M.noBase[0];
  for (const d of region.districts) {
    let m; try { m = read(`districts/${d.id}.json`); } catch { continue; }
    const dx = d.offset[0] - ox, dz = d.offset[1] - oz;
    for (const b of m.buildings || []) {
      if (b.sp || !b.p) continue;
      for (const [bx, bz] of b.p) {
        const x = bx + dx, z = bz + dz;
        if (x < x0 - 5 || x > x1 + 5 || z < z0 - 5 || z > z1 + 5) continue;
        assert.ok(!inside(paving.p, x, z) && !inside(keep, x, z), `${d.id}: a building corner at ${x.toFixed(1)},${z.toFixed(1)} is on the plaza`);
      }
    }
  }
  // the made-up lanes behind the hall and up to Cheonggyecheon run between the blocks, not through them
  const blocks = [];
  for (const d of region.districts) {
    let m; try { m = read(`districts/${d.id}.json`); } catch { continue; }
    for (const b of m.buildings || []) if (b.p) blocks.push(b.p.map(([x, z]) => [x + d.offset[0] - ox, z + d.offset[1] - oz]));
  }
  for (const r of map.roads.filter((r) => r.sp && r.k === 'walk')) for (let i = 1; i < r.p.length; i++) {
    const [a, b] = [r.p[i - 1], r.p[i]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 0; k <= n; k++) { const x = a[0] + ((b[0] - a[0]) * k) / n, z = a[1] + ((b[1] - a[1]) * k) / n; assert.ok(!blocks.some((P) => inside(P, x, z)), `a lane runs through a building at ${x.toFixed(1)},${z.toFixed(1)}`); }
  }
  const base = read('base.json');
  for (const b of base.buildings || []) for (const [bx, bz] of b.p || []) assert.ok(!inside(keep, bx - ox, bz - oz), 'no base-map building on the plaza');
  for (const r of base.roads || []) for (const [bx, bz] of r.p) assert.ok(!inside(paving.p, bx - ox, bz - oz) || !['primary', 'secondary', 'street'].includes(r.k), `no base-map road across the plaza (${r.n?.en || r.k})`);
  const A = foot(hall), B = foot(old);
  for (const [x, z] of A) assert.ok(!inside(B, x, z));
  for (const [x, z] of B) assert.ok(!inside(A, x, z));
  for (const [x, z] of lawn.p) assert.ok(inside(paving.p, x, z) && !inside(A, x, z) && !inside(B, x, z), 'the lawn lies on the paving, clear of the halls');
});

test('City Hall station: exits 4, 5 and 6 round the plaza, within 15 m of where growing puts the real ones, on the pavement', () => {
  const st = region.subway.stations.find((s) => s.id === 'city-hall-station');
  assert.equal(st.name.ko, '시청');
  assert.deepEqual(st.exits.map((e) => String(e.n ?? e.id ?? e.name)).length, 3);
  const solid = new CollisionMap(map.blockers);
  const carRoads = map.roads.filter((r) => r.k !== 'walk');
  const refs = ['4', '5', '6'];
  st.exits.forEach((e, i) => {
    const [x, z] = [e.at[0] - ox, e.at[1] - oz];
    const node = osm.elements.find((q) => q.kind === 'exit' && q.ref === refs[i] && /^시청역 \d+번 출구$/.test(q.tags.description));
    const [gx, gz] = grow(local(node.pts[0]));
    const d = Math.hypot(gx - x, gz - z);
    assert.ok(d <= 15, `exit ${refs[i]} is ${d.toFixed(1)} m from its grown real spot`);
    // the stair pit (2.4 × 6) and the 3 m in front of it: off every carriageway, out of every wall
    const fx = Math.sin(e.ry), fz = Math.cos(e.ry);
    for (let t = -3; t <= 6; t += 1.5) for (const s of [-1.2, 0, 1.2]) {
      const px = x + fx * t + fz * s, pz = z + fz * t - fx * s;
      for (const r of carRoads) assert.ok(lineDist(px, pz, r.p) > r.w / 2 - 0.05, `exit ${refs[i]} is on ${r.n?.en || 'a road'} (${px.toFixed(1)},${pz.toFixed(1)})`);
      assert.ok(!solid.blocked(px, pz, 0.2), `exit ${refs[i]} is in a wall`);
      assert.ok(!inside(lawn.p, px, pz), `exit ${refs[i]} is on the grass`);
    }
  });
});

test('you can walk from the lawn to the streets and up to both halls, but not into a hall or through Daehanmun', () => {
  const solid = new CollisionMap([...map.blockers, ...map.buildings.map((b) => ({ p: b.p }))]);
  const R = 0.5, X0 = -125, Z0 = 160, nx = Math.ceil(225 / R), nz = Math.ceil(185 / R);
  const seen = new Uint8Array(nx * nz), cell = (x, z) => Math.floor((z - Z0) / R) * nx + Math.floor((x - X0) / R);
  const q = [cell(...M.lawn.at)];
  seen[q[0]] = 1;
  while (q.length) {
    const c = q.pop(), i = c % nx, j = (c - i) / nx;
    for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ii = i + di, jj = j + dj, k = jj * nx + ii;
      if (ii < 0 || jj < 0 || ii >= nx || jj >= nz || seen[k]) continue;
      if (solid.blocked(X0 + (ii + 0.5) * R, Z0 + (jj + 0.5) * R, 0.3)) continue;
      seen[k] = 1; q.push(k);
    }
  }
  const can = (x, z) => !!seen[cell(x, z)];
  assert.ok(can(8, 300), 'Sejong-daero');
  assert.ok(can(40, 326.9), 'Sogong-ro');
  assert.ok(can(68.7, 284.6), 'Eulji-ro');
  assert.ok(can(55.3, 200), 'Mugyo-ro, towards Cheonggyecheon');
  const of = box(foot(old)), nf = box(foot(hall));
  assert.ok(can((of[0] + of[1]) / 2, of[3] + 1.5), 'the old hall\'s front step');
  assert.ok(can(nf[1] + 2, (nf[2] + nf[3]) / 2), 'round the glass hall\'s east end');
  assert.ok(!can(old.x, old.z + 4) && !can(hall.x, hall.z), 'not inside either hall');
  assert.ok(can(gate.x + 6, gate.z), 'up to Daehanmun');
  assert.ok(can(-30, 312), 'along the stone wall road outside');
  const yard = map.areas.find((a) => a.sp && a.approx && a.k === 'park');
  assert.ok(inside(yard.p, gate.x - 8, gate.z) && inside(yard.p, -40, 280));
  for (const [x, z] of [[gate.x - 8, gate.z], [gate.x - 8, gate.z - 20], [-40, 280], [-50, 300], [-20, 265]]) assert.ok(!can(x, z), `inside Deoksugung's wall at ${x},${z}: the palace is not built, nobody gets in`);
  assert.equal(gate.name.han, '大漢門');
});

test('Deoksugung\'s wall is on OSM\'s line all the way round (the piece by the enlarged gate is marked), and crosses no road', () => {
  const real = one('deoksugung').pts.map(local);
  const walls = map.landmarks.filter((l) => l.sp && l.type === 'wall');
  assert.equal(walls.length, 3);
  assert.equal(walls.filter((w) => w.approx).length, 1);
  const carRoads = [...map.roads, ...read('base.json').roads.map((r) => ({ ...r, p: r.p.map(([x, z]) => [x - ox, z - oz]) }))].filter((r) => r.k !== 'walk');
  for (const w of walls) for (let i = 1; i < w.p.length; i++) {
    const [a, b] = [w.p[i - 1], w.p[i]], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n, z = a[1] + ((b[1] - a[1]) * k) / n;
      for (const r of carRoads) assert.ok(lineDist(x, z, r.p) > (r.w || 6) / 2, `the wall is on ${r.n?.en || r.k} at ${x.toFixed(1)},${z.toFixed(1)}`);
      if (!w.approx) assert.ok(lineDist(x, z, real) < 4, `the wall at ${x.toFixed(1)},${z.toFixed(1)} is ${lineDist(x, z, real).toFixed(1)} m off OSM's line`);
    }
  }
});

test('the oval lawn takes picnic mats inside its outline only; other lawns are as before', () => {
  const l = lawnFrom(lawn.p, true);
  assert.equal(l.p, lawn.p);
  const [cx, cz] = M.lawn.at;
  assert.ok(onLawn({ x: cx, z: cz }, [l]), 'a mat in the middle');
  assert.ok(!onLawn({ x: l.x0 + 1.5, z: l.z0 + 1.5 }, [l]), 'not in the corner of its box (paving)');
  assert.ok(onLawn({ x: l.x0 + 1.5, z: l.z0 + 1.5 }, [lawnFrom(lawn.p)]), '(which a plain box lawn would allow)');
  assert.equal(lawnFrom(lawn.p).p, undefined, 'a many-cornered lawn without the flag is its box');
  assert.equal(map.areas.filter((a) => a.oval).length, 1);
});

test('the people on the lawn are not made until you come near', async () => {
  const world = lawn.p.map(([x, z]) => [x + ox, z + oz]);
  const near = createCityHallNear({ areas: [{ ...lawn, p: world }], scene: { add() {} }, labels: null });
  assert.equal(near.loaded, false);
  assert.equal(near.nearest(world[0][0], world[0][1]), null);
  near.update({ x: world[0][0] + 600, z: world[0][1] }, 0.016);
  await new Promise((r) => setTimeout(r, 30));
  assert.equal(near.loaded, false, 'far away: nothing loads');
  const none = createCityHallNear({ areas: [] });
  none.update({ x: 0, z: 0 }, 0.016);
  assert.equal(none.nearest(0, 0), null);
});

test('the board on the plaza tells the story in four languages, and the map names the places', () => {
  const sign = map.landmarks.find((l) => l.type === 'sign' && l.sp);
  for (const k of ['ko', 'en', 'ja', 'zh']) assert.ok(sign.text[k] && sign.title[k], k);
  assert.ok(inside(paving.p, sign.x, sign.z) && !inside(lawn.p, sign.x, sign.z), 'on the paving beside the grass');
  assert.equal(map.pois.filter((p) => p.sp).length, 4);
  for (const p of map.pois.filter((p) => p.sp)) for (const k of ['ko', 'en', 'ja', 'zh']) assert.ok(p.name[k]);
});
