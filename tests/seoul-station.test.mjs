// Seoul Station (scripts/build-seoul-station.mjs): the old station at 37.5%
// of the real one, everything else at 1/4 on its real place, and the arrival
// start on the plaza with Seoul Square in view.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { OLD_STATION } from '../src/data/seoul-station.js';
import { OFFSET, START, EXITS, OLD_OUTLINE } from '../scripts/build-seoul-station.mjs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url)));
const osm = read('../scripts/data/seoul-station-osm.json');
const district = read('../public/regions/another-seoul/districts/seoul-station.json');
const region = read('../public/regions/another-seoul/region.json');
const box = (p) => {
  const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
  return { cx: (Math.min(...xs) + Math.max(...xs)) / 2, cz: (Math.min(...zs) + Math.max(...zs)) / 2, w: Math.max(...xs) - Math.min(...xs), d: Math.max(...zs) - Math.min(...zs) };
};
const world = (p) => p.map(([x, z]) => [x + OFFSET[0], z + OFFSET[1]]);

test('the old station: 37.5% of the real one (1.5x the 1/4 map), on its real middle', () => {
  const real = box(osm.oldStation), game = box(OLD_OUTLINE), k = OLD_STATION.scale / 0.25;
  assert.ok(Math.abs(game.d - real.d * k) < 0.3, `length ${game.d} vs ${real.d * k}`);
  assert.ok(Math.hypot(game.cx - real.cx, game.cz - real.cz) < 0.5, 'middle');
  assert.ok(game.d > 50 && game.d < 54, 'about 52 m long');
});

test('the station hall and Seoul Square stand on their real outlines at 1/4', () => {
  for (const [name, ref] of [['Seoul Station', osm.hall], ['Seoul Square', osm.seoulSquare]]) {
    const b = district.buildings.filter((q) => q.n?.en === name).sort((a, c) => c.p.length - a.p.length)[0];
    const g = box(world(b.p)), r = box(ref);
    assert.ok(Math.hypot(g.cx - r.cx, g.cz - r.cz) < 1 && Math.abs(g.w - r.w) < 1, name);
  }
});

test('the arrival start and the subway exits: on the plaza, near the real exits', () => {
  const s = region.spawn.starts.find((q) => q.k === 'arrive');
  assert.equal(s.district, 'seoul-station');
  assert.deepEqual(s.at, [START[0] - OFFSET[0], START[1] - OFFSET[1]]);
  for (const e of EXITS) {
    const real = osm.exits.find((q) => q.ref === String(e.n));
    assert.ok(Math.hypot(e.at[0] - real.at[0], e.at[1] - real.at[1]) <= 15, `exit ${e.n} within 15 m`);
  }
});

test('from the start, Seoul Square is in sight: no building or exit in between', () => {
  const sq = box(osm.seoulSquare), to = [sq.cx - 9, sq.cz]; // its west front
  const hits = (p, q) => { // does the segment START-to cross polygon p?
    for (let t = 0.05; t < 1; t += 0.02) {
      const x = START[0] + (to[0] - START[0]) * t, z = START[1] + (to[1] - START[1]) * t;
      let inside = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > z) !== (p[j][1] > z) && x < ((p[j][0] - p[i][0]) * (z - p[i][1])) / (p[j][1] - p[i][1]) + p[i][0]) inside = !inside;
      if (inside) return q;
    }
    return null;
  };
  for (const b of district.buildings) if (!/Seoul Square/.test(b.n?.en || '')) assert.equal(hits(world(b.p)), null, b.n?.en || 'a building');
  for (const e of EXITS) assert.ok(hits([[e.at[0] - 2.5, e.at[1] - 2.5], [e.at[0] + 2.5, e.at[1] - 2.5], [e.at[0] + 2.5, e.at[1] + 2.5], [e.at[0] - 2.5, e.at[1] + 2.5]], 1) === null, `exit ${e.n}`);
});

test('station names get "Station" / "역" once: Seoul Station is not "Seoul Station Station"', async () => {
  const { stationName } = await import('../src/core/subway.js');
  const seoul = stationName(region.subway.stations.find((s) => s.id === 'seoul-station').name);
  assert.deepEqual([seoul.en, seoul.ko, seoul.ja, seoul.zh], ['Seoul Station', '서울역', 'ソウル駅', '首尔站']);
  assert.deepEqual(stationName({ ko: '성수', en: 'Seongsu' }), { ko: '성수역', en: 'Seongsu Station' });
  for (const st of region.subway.stations) assert.ok(!/역역|Station Station|駅駅|站站/.test(Object.values(stationName(st.name)).join('|')), st.id);
});
