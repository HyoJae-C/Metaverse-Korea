// The weekend farm's place: Yongsan Family Park's eco allotments (용산가족공원
// 친환경 텃밭, run by the city: 132 plots in 2025, no pesticide, no vinyl),
// in the Itaewon district's map (Yozi 2026-11-21).
//
// Real, from OpenStreetMap at 1/4 (scripts/data/yongsan-family-park-osm.json):
//   the park's outline (way 921902039), its big pond (616037081) and the
//   path that comes in from Seobinggo-ro and passes east of the pond
//   (382079505).
// Made up (each says so in its `why`):
//   the glasshouse with the twelve beds and the stall. The real allotments
//   are open-air plots east of the pond (Naver map, 2026-11-21); the game
//   keeps everyone's beds under one glass roof at game size, on that spot,
//   between the path and the park's east edge. The last few metres of the
//   path down to the road are made up too (OSM's path stops at the gate).
//
// Run after build-itaewon.mjs (it drops these; this puts them back):
//   node scripts/build-farm.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame } from '../src/core/seoul-grid.js';
import { FARM_HOUSE, STALL } from '../src/core/farm-site.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const MAP = path.join(R, 'districts', 'itaewon.json');
const readJson = (f) => JSON.parse(readFileSync(f, 'utf8'));
const osm = readJson(path.join(root, 'scripts', 'data', 'yongsan-family-park-osm.json'));
const region = readJson(path.join(R, 'region.json'));
const itaewon = readJson(MAP);
const [ox, oz] = region.districts.find((d) => d.id === 'itaewon').offset;
const r1 = (v) => Math.round(v * 10) / 10;
const way = (id) => osm.ways.find((w) => w.id === id).p.map(([lat, lon]) => { const [x, z] = toGame(lat, lon); return [r1(x - ox), r1(z - oz)]; });
const ring = (p) => (p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1] ? p.slice(0, -1) : p);
const segD = (p, a, b) => {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / (dx * dx + dz * dz || 1)));
  return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dz * t);
};
const lineD = (p, l) => Math.min(...l.slice(1).map((b, i) => segD(p, l[i], b)));

for (const k of ['roads', 'areas', 'blockers', 'pois', 'landmarks']) itaewon[k] = (itaewon[k] || []).filter((it) => !it.fm);

const park = ring(way(921902039));
const pond = ring(way(616037081));
const trail = way(382079505);
const PATH_W = 3;

// The glasshouse: half-way between the path and the park's east edge, its
// long side along that edge, its door at the south end (towards the gate).
const edge = park.reduce((best, q, i) => { // the east edge's long straight piece
  const a = q, b = park[(i + 1) % park.length];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return a[0] > -225 && b[0] > -225 && Math.min(a[1], b[1]) > 360 && len > best.len ? { a, b, len } : best;
}, { len: 0 });
const [south, north] = edge.a[1] > edge.b[1] ? [edge.a, edge.b] : [edge.b, edge.a];
const ry = Math.atan2(south[0] - north[0], south[1] - north[1]); // the house's +z looks along the edge, south
const Z = 374.5;
const edgeX = north[0] + ((south[0] - north[0]) * (Z - north[1])) / (south[1] - north[1]);
const pathX = (() => { for (let i = 1; i < trail.length; i++) { const [a, b] = [trail[i - 1], trail[i]]; if ((a[1] - Z) * (b[1] - Z) <= 0 && a[0] > -235) return a[0] + ((b[0] - a[0]) * (Z - a[1])) / (b[1] - a[1] || 1); } throw new Error('the path does not pass the allotments'); })();
const cx = r1((edgeX + pathX + PATH_W / 2) / 2), cz = Z;
const s = Math.sin(ry), c = Math.cos(ry);
const W = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
const { hw, hl } = FARM_HOUSE;
const corners = [W(-hw, -hl), W(hw, -hl), W(hw, hl), W(-hw, hl), W(STALL.x - 1.3, STALL.z + 0.8), W(STALL.x + 1.3, STALL.z + 0.8)];
const toPath = Math.min(...corners.map((q) => lineD(q, trail))) - PATH_W / 2;
const toEdge = Math.min(...corners.map((q) => segD(q, north, south)));
const toPond = Math.min(...corners.map((q) => lineD(q, [...pond, pond[0]])));
if (toPath < 0.5 || toPond < 1) throw new Error(`the glasshouse does not fit: path ${toPath}, pond ${toPond}`);

// The path: OSM's, from where it leaves the pond's north side down to the
// gate, then (made up) on to Seobinggo-ro's kerb.
const seobinggo = itaewon.roads.find((r) => r.n?.en === 'Seobinggo-ro');
const gate = trail.at(-1);
const kerb = (() => { // straight south from the gate to the road's edge
  let best = null;
  for (let z = gate[1]; z < gate[1] + 30; z += 0.1) { const d = lineD([gate[0], z], seobinggo.p); if (d <= seobinggo.w / 2 + 0.5) { best = [gate[0], r1(z)]; break; } }
  return best;
})();
const walk = [...trail, ...(kerb ? [kerb] : [])];

const why = 'made up: the real allotments are open-air plots on this spot (Naver map 2026-11-21); the glasshouse, its beds and the stall are the game\'s (Yozi 2026-11-21)';
const name = (ko, en, ja, zh) => ({ ko, en, ja, zh });
itaewon.areas.push({ k: 'park', p: park, fm: 1 }, { k: 'water', p: pond, fm: 1 });
itaewon.blockers.push({ p: pond, fm: 1, n: name('연못', 'Pond', '池', '池塘') });
itaewon.roads.push({ k: 'walk', w: PATH_W, p: walk, n: name('용산가족공원 산책로', 'Yongsan Family Park path', '龍山家族公園 散策路', '龙山家族公园步道'), fm: 1, ...(kerb ? { approx: [[gate, kerb]], why: 'OSM\'s path stops at the gate; the last piece to Seobinggo-ro is made up' } : {}) });
// label: its name on the map (ui/map-view.js draws it, Yozi 2026-11-21).
itaewon.landmarks.push({ type: 'farm', x: cx, z: cz, ry: Math.round(ry * 1000) / 1000, clear: 10, label: name('주말농장', 'Weekend Farm', '週末農園', '周末农场'), fm: 1, why });
const [px, pz] = W(0, hl + 3).map(r1);
itaewon.pois.push({ kind: 'landmark', x: px, z: pz, name: name('용산가족공원 친환경 텃밭', 'Yongsan Family Park Eco Farm', '龍山家族公園 エコ農園', '龙山家族公园生态农园'), fm: 1 });
writeFileSync(MAP, JSON.stringify(itaewon));
console.log(`farm: glasshouse at district (${cx}, ${cz}) = world (${r1(cx + ox)}, ${r1(cz + oz)}), ry ${(ry * 180 / Math.PI).toFixed(1)}°`);
console.log(`  to the path's edge ${toPath.toFixed(1)} m, to the park's east edge ${toEdge.toFixed(1)} m, to the pond ${toPond.toFixed(1)} m`);
console.log(`  path ${walk.length} points, made-up end ${kerb ? Math.hypot(kerb[0] - gate[0], kerb[1] - gate[1]).toFixed(1) : 0} m`);
