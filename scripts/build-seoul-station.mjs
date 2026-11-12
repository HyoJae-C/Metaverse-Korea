#!/usr/bin/env node
// Builds Seoul Station (public/regions/another-seoul/districts/seoul-station.json):
// the station plaza between the old station building and Hangang-daero, the
// glass station hall over the tracks, Seoul Square across the road, and the
// big roads to Sungnyemun (Sejong-daero) and Hoehyeon (Toegye-ro).
//
// The lines are OpenStreetMap's at 1/4 (scripts/data/seoul-station-osm.json,
// from Yozi's export of 2026-11-12, © OpenStreetMap contributors, ODbL):
//   - Hangang-daero in front of the station, Sejong-daero from the Seoul
//     Station crossing north-east to Sungnyemun's ring road, and Toegye-ro
//     east to Sowol-ro, each the line between its two carriageways.
//   - The old station (Culture Station Seoul 284) at 37.5% of the real
//     building (Yozi 2026-11-12), scaled round the middle of its real
//     outline, so it touches the hall's round entrance at its south end, as
//     the real two do. The rest at 1/4: the hall, Seoul Square, the plaza.
//   - One row of buildings along the big roads (Yozi 2026-11-10, like
//     Seongsu): real outlines and heights at 1/4, no shops, no names.
//   - The open-air tracks north and south of the hall, fenced off.
//   - Seoullo 7017 (the walkway over the tracks just north of the old
//     station) comes next, in its own change: at 37.5% the old station
//     reaches 6 m past its real line, so it will pass about 8 m north of
//     it (inside the 10 m allowed for big roads, MEMORY rule 8).
//
//   node scripts/build-seoul-station.mjs     writes the map
//
// The district's (0, 0) is the middle of the old station's real outline
// (its anchor in region.json). Coordinates here are world metres (x east,
// z south; src/core/seoul-grid.js); the map is written in the district's
// own metres.

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, nearestOn, overlap, inPoly, strips } from './street-rows.mjs';
import { toLatLon, anchorOffset } from '../src/core/seoul-grid.js';
import { OLD_STATION, SEOUL_SQUARE } from '../src/data/seoul-station.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'seoul-station-osm.json'), 'utf8'));
const RAW = '/mnt/project-files/osm/seoul-station.json'; // (only for the row of buildings, below)
const region = JSON.parse(readFileSync(path.join(R, 'region.json'), 'utf8'));
const N = (ko, en, ja, zh) => ({ ko, en, ja, zh });
const link = (en) => region.links.find((l) => l.n?.en === en);
const box = (p) => { const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]); return [Math.min(...xs), Math.min(...zs), Math.max(...xs), Math.max(...zs)]; };
const rect = (x0, z0, x1, z1) => [[x0, z0], [x1, z0], [x1, z1], [x0, z1]];

// ---------- The anchor: the middle of the old station's real outline ----------
const [ox0, oz0, ox1, oz1] = box(OSM.oldStation);
export const MIDDLE = [r1((ox0 + ox1) / 2), r1((oz0 + oz1) / 2)];
const { lat, lon } = toLatLon(...MIDDLE);
export const ANCHOR = { lat: Number(lat.toFixed(6)), lon: Number(lon.toFixed(6)) };
export const OFFSET = anchorOffset({ ...ANCHOR, local: [0, 0] });
const local = ([x, z]) => [r1(x - OFFSET[0]), r1(z - OFFSET[1])];

// ---------- The old station at 37.5% ----------
// Scaled round its real middle: 1/4 -> 37.5% is x1.5.
const K = OLD_STATION.scale / 0.25;
export const OLD_OUTLINE = OSM.oldStation.slice(0, -1).map(([x, z]) => [r1(MIDDLE[0] + (x - MIDDLE[0]) * K), r1(MIDDLE[1] + (z - MIDDLE[1]) * K)]);
// The model's frame: its front faces east (+z in the model), north is +x.
const toModel = ([x, z]) => [r1(-(z - MIDDLE[1])), r1(x - MIDDLE[0])];
// The middle block (with the dome): the real front's middle projection
// (OSM points between z -311 and -316.5), scaled.
const MID_Z = [-316.5, -311].map((z) => MIDDLE[1] + (z - MIDDLE[1]) * K);
export const OLD_MID = MID_Z.map((z) => r1(-(z - MIDDLE[1]))).sort((a, b) => a - b); // model x range

// ---------- Roads (world metres) ----------
// The Seoul Station crossing: where Hangang-daero, Sejong-daero, Toegye-ro
// and Tongil-ro meet, north of the plaza.
const CROSS = [-1831.5, -342];
const ring = (() => { // Sungnyemun's ring road (Euljiro's map): its south side, z
  const d = region.districts.find((q) => q.id === 'euljiro');
  const m = JSON.parse(readFileSync(path.join(R, d.map), 'utf8'));
  const r = m.roads.find((q) => q.n?.en === 'Sejong-daero' && q.p.length === 5);
  return Math.max(...r.p.map((q) => q[1] + d.offset[1]));
})();
const sejong = OSM.roads.sejong.p.filter(([, z]) => z > ring);
const last = OSM.roads.sejong.p.at(-1);
const sowol = link('Sowol-ro').p;
const toegyeEnd = nearestOn(OSM.roads.toegye.p.at(-1), sowol).at.map(r1);
const HANGANG = [...OSM.roads.hangang.p, CROSS];
const ROADS = [
  { k: 'primary', w: 16, p: HANGANG, n: OSM.roads.hangang.n },
  { k: 'primary', w: 14, p: [CROSS, ...sejong, [last[0], ring]], n: OSM.roads.sejong.n },
  { k: 'primary', w: 12, p: [OSM.roads.hangang.p.at(-1), ...OSM.roads.toegye.p, toegyeEnd], n: OSM.roads.toegye.n },
];
const roadDist = (q) => Math.min(...ROADS.map((r) => nearestOn(q, r.p).d - r.w / 2));
const sowolDist = (q) => nearestOn(q, sowol).d - link('Sowol-ro').w / 2;

// ---------- The station hall, the plaza, Seoul Square ----------
export const HALL_OUTLINE = OSM.hall.slice(0, -1);
const SQUARE = OSM.seoulSquare.slice(0, -1);
// The plaza: from the old station and the hall out to Hangang-daero's kerb.
const kerbAt = (z) => { const { at } = nearestOn([-1830, z], HANGANG); return at[0] - 8; };
export const PLAZA = [
  [-1852, -347], [r1(kerbAt(-347) - 1), -347], [r1(kerbAt(-300) - 1), -300], [r1(kerbAt(-262) - 1), -262], [-1846, -262], [-1846, -269], [-1850.5, -270.5], [-1857, -279], [-1857, -284], [-1852, -291],
];
// The steps up to the hall's east doors (the photo's wide stairs): a
// flight between the round entrance and the hall's east wing.
export const STEPS = { x0: -1856.6, x1: -1851.6, z0: -283.4, z1: -272.6, n: 8 };
export const PILLAR = [-1848.8, -272.4]; // the round pillar in front of the steps
const ROTUNDA = [-1860, -287.4]; // the round entrance: the middle of the hall outline's half circle (r 3.6)
const SIGN = [-1857, -270]; // the "서울역 Seoul Station" sign on the roof, facing east
// Where a new player who picks "Seoul Station" starts: at the foot of the
// steps, as if just out of the hall, facing Seoul Square across the road.
export const START = [-1842, -276];
// The Information Center: a small kiosk at the plaza's south end, beside the
// hall's east wing (out of the way of the old station's front), its door
// (stores.json info-seoul-station "at") on its east side, towards the road.
export const KIOSK = { p: [[-1847, -266.5], [-1843, -266.5], [-1843, -263], [-1847, -263]], h: 3.4, door: [-1843, -264.8] };

// ---------- The tracks, fenced off ----------
const rails = OSM.rails.map((r) => ({ p: r.p }));
// The yard: from the tracks' west edge to the old station and the hall.
const YARD = { x0: -1913, x1: -1861.2, z0: -398, z1: -172 };
const yardBlock = rect(YARD.x0, YARD.z0, YARD.x1, YARD.z1);
// The fence you see: along the yard's east side where nothing stands in
// front (north of the old station, south of the hall), and across its ends.
export const FENCE = [
  [[YARD.x0, YARD.z0], [YARD.x1, YARD.z0], [YARD.x1, r1(Math.min(...OLD_OUTLINE.map((q) => q[1])))]],
  [[YARD.x1, r1(box(HALL_OUTLINE)[3])], [YARD.x1, YARD.z1], [YARD.x0, YARD.z1]],
];

// ---------- One row of buildings along the big roads ----------
// Real outlines and heights at 1/4 (OSM ways), only the front row: Seoul
// City Tower and Gateway Tower south of Seoul Square, the towers along
// Toegye-ro (Yonsei Severance, Metro Tower, Daewoo Foundation, SK Namsan)
// and SG Tower by Sejong-daero. Kept only if clear of the roads.
const ROW = [328442729, 328442815, 443520736, 328442772, 328442755, 315658901, 770858370];
function rowBuildings() {
  let raw;
  try { raw = JSON.parse(readFileSync(RAW, 'utf8')); } catch { return null; }
  const out = [];
  for (const id of ROW) {
    const e = raw.elements.find((q) => q.type === 'way' && q.id === id);
    const p = e.geometry.slice(0, -1).map((n) => OSM_GAME(n.lat, n.lon));
    const h = e.tags.height ? +e.tags.height / 4 : (+e.tags['building:levels'] || 5) * 3.5 / 4;
    const clear = p.every((q) => roadDist(q) > 1.5 && sowolDist(q) > 1.5);
    if (clear) out.push({ id, h: r1(h), p });
    else console.log(`left out building ${id}: too close to a road`);
  }
  return out;
}
let OSM_GAME;
// The row is cached in the OSM data file (the raw export is on the shared drive).
async function row() {
  OSM_GAME = (await import('../src/core/seoul-grid.js')).toGame;
  OSM_GAME = ((f) => (la, lo) => f(la, lo).map(r1))(OSM_GAME);
  const fresh = rowBuildings();
  if (fresh) {
    OSM.row = fresh;
    writeFileSync(path.join(root, 'scripts', 'data', 'seoul-station-osm.json'), JSON.stringify(OSM) + '\n');
  }
  return OSM.row || [];
}

// ---------- Subway exits ----------
// Seoul Station's exits 1 and 2 (OSM 3390512293, 3403067559). Exit 1 stands
// against the old station's south end at 37.5%, so it moves 7 m east onto
// the plaza; exit 2 is on the plaza in front of the old station, as it is.
export const EXITS = [
  { n: 1, at: [-1846.6, -287.6], ry: Math.PI / 2, why: 'real exit 1 is under the old station\'s south end at 37.5%: 7 m east, on the plaza' },
  { n: 2, at: OSM.exits.find((x) => x.ref === '2').at, ry: Math.PI / 2 },
];

async function build() {
  const buildings = [], areas = [], blockers = [], landmarks = [], pois = [];
  const nOld = N('문화역서울284 (구 서울역사)', 'Culture Station Seoul 284 (old Seoul Station)', '文化駅ソウル284（旧ソウル駅舎）', '文化站首尔284（旧首尔站）');
  const nHall = N('서울역', 'Seoul Station', 'ソウル駅', '首尔站');
  const nSquare = N('서울스퀘어', 'Seoul Square', 'ソウルスクエア', '首尔广场大厦');
  areas.push({ k: 'plaza', p: PLAZA.map(local) });
  // The old station: drawn by its landmark, a wall all the same. (Landmark
  // outlines are called `outline`, not `p`: districts.js shifts a landmark's p
  // by the district offset instead of its x, z.)
  buildings.push({ h: OLD_STATION.arch, custom: 1, p: OLD_OUTLINE.map(local), n: nOld });
  landmarks.push({ type: 'oldstation', x: local(MIDDLE)[0], z: local(MIDDLE)[1], ry: 1.5708, outline: OLD_OUTLINE.map(toModel), mid: OLD_MID });
  // The hall and its steps.
  buildings.push({ h: 9.5, custom: 1, p: HALL_OUTLINE.map(local), n: nHall });
  const steps = rect(STEPS.x0, STEPS.z0, STEPS.x1, STEPS.z1);
  buildings.push({ h: 1.2, custom: 1, low: 1, p: steps.map(local), n: nHall });
  landmarks.push({ type: 'stationhall', x: 0, z: 0, outline: HALL_OUTLINE.map(local), steps: { ...STEPS, x0: local([STEPS.x0, 0])[0], x1: local([STEPS.x1, 0])[0], z0: local([0, STEPS.z0])[1], z1: local([0, STEPS.z1])[1] }, pillar: local(PILLAR), rotunda: [...local(ROTUNDA), 3.6], sign: local(SIGN) });
  // Seoul Square: an ordinary building in its own stone; its media wall is a
  // region.json screen.
  buildings.push({ h: SEOUL_SQUARE.h, wall: SEOUL_SQUARE.wall, roof: SEOUL_SQUARE.roof, p: SQUARE.map(local), n: nSquare });
  for (const b of await row()) buildings.push({ h: b.h, p: b.p.map(local) });
  buildings.push({ h: KIOSK.h, p: KIOSK.p.map(local) });
  const info = JSON.parse(readFileSync(path.join(R, 'stores.json'), 'utf8')).stores.find((q) => q.id === 'info-seoul-station');
  if (String(info?.at) !== String(KIOSK.door)) throw new Error(`stores.json info-seoul-station: set "at" to [${KIOSK.door}]`);
  // The yard and its fence.
  blockers.push({ p: yardBlock.map(local) });
  landmarks.push({ type: 'yardfence', x: 0, z: 0, lines: FENCE.map((l) => l.map(local)) });
  // A board on the plaza (like the cathedral's).
  landmarks.push({
    type: 'sign', x: local([-1847.5, -309])[0], z: local([-1847.5, -309])[1], ry: -1.5708,
    title: N('서울역', 'Seoul Station', 'ソウル駅', '首尔站'),
    text: N(
      '서울의 대표 기차역이에요. 1925년에 지은 붉은 벽돌 옛 역사(지금은 전시장 "문화역서울284")와 2004년에 문을 연 유리 역사가 나란히 있어요. KTX와 공항철도(인천공항까지 약 1시간), 지하철 1·4호선이 서요.',
      "Seoul's main railway station. The red-brick old station from 1925 (now an exhibition space, Culture Station Seoul 284) stands beside the glass station hall opened in 2004. KTX trains, the airport railroad (about an hour to Incheon Airport) and subway lines 1 and 4 stop here.",
      'ソウルを代表する鉄道駅です。1925年に建てられた赤レンガの旧駅舎（今は展示施設「文化駅ソウル284」）と、2004年開業のガラスの駅舎が並んでいます。KTX、空港鉄道（仁川空港まで約1時間）、地下鉄1・4号線が停まります。',
      '首尔的代表性火车站。1925年建成的红砖旧站舍（现为展览空间"文化站首尔284"）与2004年启用的玻璃站房并排而立。KTX、机场铁路（到仁川机场约1小时）和地铁1、4号线在此停靠。',
    ),
  });
  pois.push({ kind: 'landmark', x: local([-1850, -282])[0], z: local([-1850, -282])[1], name: nHall });
  pois.push({ kind: 'landmark', x: local([-1849, -317])[0], z: local([-1849, -317])[1], name: nOld });
  pois.push({ kind: 'landmark', x: local([-1817, -304])[0], z: local([-1817, -304])[1], name: nSquare });

  // Checks: nothing stands on a road; the start spot, the exits and the
  // steps are clear of the roads and the buildings.
  const walls = buildings.map((b) => b.p);
  for (const b of buildings) {
    const world = b.p.map(([x, z]) => [x + OFFSET[0], z + OFFSET[1]]);
    if (world.some((q) => roadDist(q) < 0.5)) throw new Error(`a building stands on a road: ${b.n?.en || b.h}`);
  }
  for (let i = 0; i < walls.length; i++) for (let j = i + 1; j < walls.length; j++) {
    const lowPair = buildings[i].low || buildings[j].low;
    if (!lowPair && overlap(walls[i], walls[j])) throw new Error(`buildings overlap: ${buildings[i].n?.en || i} / ${buildings[j].n?.en || j}`);
  }
  for (const [what, q] of [['start', START], ...EXITS.map((x) => [`exit ${x.n}`, x.at])]) {
    const l = local(q);
    if (walls.some((p) => inPoly(l[0], l[1], p))) throw new Error(`${what} is inside a building`);
    if (roadDist(q) < 2) throw new Error(`${what} is on a road`);
  }

  const roads = ROADS.map((r) => ({ ...r, p: r.p.map(local) }));
  const map = {
    meta: {
      district: 'seoul-station',
      source: 'OpenStreetMap roads, station buildings and plaza at 1/4 (© OpenStreetMap contributors, ODbL; scripts/data/seoul-station-osm.json); the old station at 37.5% (Yozi 2026-11-12). Built by scripts/build-seoul-station.mjs',
    },
    roads, buildings, rail: rails.map((r) => ({ p: r.p.map(local) })), areas, blockers, pois, landmarks,
  };
  map.meta.parts = strips(map, 25, 'Seoul Station: the station, the plaza and the roads round it');
  writeFileSync(path.join(R, 'districts', 'seoul-station.json'), JSON.stringify(map) + '\n');
  console.log(`seoul-station: offset ${OFFSET}, anchor ${ANCHOR.lat}, ${ANCHOR.lon}; ${buildings.length} buildings, ${rails.length} rails`);
  console.log(`start (local) ${local(START)}; exits ${EXITS.map((x) => `${x.n}: [${x.at.map(r1)}]`).join(', ')}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) await build();
