#!/usr/bin/env node
// Builds the Seoul overview for the map (public/regions/another-seoul/seoul.json):
// the 25 districts (gu) with their real outlines, the Han River, and which gu
// are open. Everything is on the Seoul grid (src/core/seoul-grid.js): real
// Seoul at 1/4 around Seongsu Station, game metres (x east, z south).
//
// The outlines come from OpenStreetMap (scripts/data/seoul-gu-osm.geojson,
// admin_level=6, simplified; © OpenStreetMap contributors, ODbL). The map
// shows that credit in its corner. The Han River is the line where the gu
// north of the river meet the ones south of it.
//
// A gu is open when a game district's anchor (region.json) is inside it.
// Each gu is that area's budget: its districts have to fit in its outline
// (scripts/place-districts.mjs checks it).
//
// Seongsu is the one full-size district (its streets are not shrunk), so
// around it the river and the gu edges near it are pushed a little south to
// make room. Everything else is where the 1/4 map puts it.
//
//   node scripts/build-seoul.mjs

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { toGame, anchorOffset, inPolygon, SCALE } from '../src/core/seoul-grid.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');

// [id, ko, en, ja, zh]
const GU = [
  ['jongno', '종로구', 'Jongno-gu', '鍾路区', '钟路区'],
  ['jung', '중구', 'Jung-gu', '中区', '中区'],
  ['yongsan', '용산구', 'Yongsan-gu', '龍山区', '龙山区'],
  ['seongdong', '성동구', 'Seongdong-gu', '城東区', '城东区'],
  ['gwangjin', '광진구', 'Gwangjin-gu', '広津区', '广津区'],
  ['dongdaemun', '동대문구', 'Dongdaemun-gu', '東大門区', '东大门区'],
  ['jungnang', '중랑구', 'Jungnang-gu', '中浪区', '中浪区'],
  ['seongbuk', '성북구', 'Seongbuk-gu', '城北区', '城北区'],
  ['gangbuk', '강북구', 'Gangbuk-gu', '江北区', '江北区'],
  ['dobong', '도봉구', 'Dobong-gu', '道峰区', '道峰区'],
  ['nowon', '노원구', 'Nowon-gu', '蘆原区', '芦原区'],
  ['eunpyeong', '은평구', 'Eunpyeong-gu', '恩平区', '恩平区'],
  ['seodaemun', '서대문구', 'Seodaemun-gu', '西大門区', '西大门区'],
  ['mapo', '마포구', 'Mapo-gu', '麻浦区', '麻浦区'],
  ['gangseo', '강서구', 'Gangseo-gu', '江西区', '江西区'],
  ['yangcheon', '양천구', 'Yangcheon-gu', '陽川区', '阳川区'],
  ['guro', '구로구', 'Guro-gu', '九老区', '九老区'],
  ['geumcheon', '금천구', 'Geumcheon-gu', '衿川区', '衿川区'],
  ['yeongdeungpo', '영등포구', 'Yeongdeungpo-gu', '永登浦区', '永登浦区'],
  ['dongjak', '동작구', 'Dongjak-gu', '銅雀区', '铜雀区'],
  ['gwanak', '관악구', 'Gwanak-gu', '冠岳区', '冠岳区'],
  ['seocho', '서초구', 'Seocho-gu', '瑞草区', '瑞草区'],
  ['gangnam', '강남구', 'Gangnam-gu', '江南区', '江南区'],
  ['songpa', '송파구', 'Songpa-gu', '松坡区', '松坡区'],
  ['gangdong', '강동구', 'Gangdong-gu', '江東区', '江东区'],
];
// The gu on each bank of the Han River.
const NORTH_BANK = ['mapo', 'yongsan', 'seongdong', 'gwangjin'];
const SOUTH_BANK = ['gangseo', 'yangcheon', 'yeongdeungpo', 'dongjak', 'seocho', 'gangnam', 'songpa', 'gangdong'];

// Room for full-size Seongsu: push points south of Seongsu Station, most at
// the river, fading out to the east, west and north.
export function seongsuRoom([x, z]) {
  const w = Math.max(0, 1 - Math.abs(x - 50) / 700) * Math.max(0, Math.min(1, (z + 150) / 400)) * Math.max(0, Math.min(1, (900 - z) / 500));
  return [x, z + 150 * w];
}

// Drop points closer than `eps` metres to the line between their neighbours.
function simplify(p, eps) {
  if (p.length < 3) return p;
  const [a, b] = [p[0], p[p.length - 1]];
  const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1e-9;
  let best = 0, at = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs(dz * (p[i][0] - a[0]) - dx * (p[i][1] - a[1])) / L;
    if (d > best) { best = d; at = i; }
  }
  return best > eps ? [...simplify(p.slice(0, at + 1), eps).slice(0, -1), ...simplify(p.slice(at), eps)] : [a, b];
}
const round = (p) => p.map(([x, z]) => [Math.round(x), Math.round(z)]);
const area = (p) => p.reduce((s, [x, z], i) => { const [x2, z2] = p[(i + 1) % p.length]; return s + x * z2 - x2 * z; }, 0) / 2;

// Where to write a gu's name: the inside point farthest from its edges, on a
// coarse grid (a centroid can fall outside a crescent-shaped gu).
function labelSpot(p) {
  const xs = p.map((q) => q[0]), zs = p.map((q) => q[1]);
  const [x0, x1, z0, z1] = [Math.min(...xs), Math.max(...xs), Math.min(...zs), Math.max(...zs)];
  const edge = (x, z) => {
    let m = Infinity;
    for (let i = 0; i < p.length; i++) {
      const [ax, az] = p[i], [bx, bz] = p[(i + 1) % p.length], vx = bx - ax, vz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * vx + (z - az) * vz) / (vx * vx + vz * vz || 1)));
      m = Math.min(m, Math.hypot(x - ax - vx * t, z - az - vz * t));
    }
    return m;
  };
  let best = [(x0 + x1) / 2, (z0 + z1) / 2], bd = -1;
  for (let i = 1; i < 24; i++) for (let j = 1; j < 24; j++) {
    const x = x0 + ((x1 - x0) * i) / 24, z = z0 + ((z1 - z0) * j) / 24;
    if (!inPolygon(x, z, p)) continue;
    const d = edge(x, z);
    if (d > bd) { bd = d; best = [x, z]; }
  }
  return best.map(Math.round);
}

const osm = JSON.parse(await readFile(path.join(root, 'scripts', 'data', 'seoul-gu-osm.geojson'), 'utf8'));
const region = JSON.parse(await readFile(path.join(R, 'region.json'), 'utf8'));
const byEn = Object.fromEntries(osm.features.map((f) => [f.properties['name:en'], f]));
const project = (ring) => ring.map(([lon, lat]) => seongsuRoom(toGame(lat, lon)));

// The river: points on a north-bank gu's edge that a south-bank gu shares
// (within 20 real metres), west to east, thinned to one every ~60 m.
const ll = (id) => byEn[GU.find((g) => g[0] === id)[2]].geometry.coordinates[0];
const near = 20 / 111000;
const southRings = SOUTH_BANK.map(ll);
const onSouth = ([lon, lat]) => southRings.some((r) => r.some(([x, y]) => Math.abs(x - lon) < near * 1.3 && Math.abs(y - lat) < near));
let riverLL = NORTH_BANK.flatMap(ll).filter(onSouth).sort((a, b) => a[0] - b[0]);
const river = [];
for (const q of project(riverLL)) if (!river.length || Math.hypot(q[0] - river.at(-1)[0], q[1] - river.at(-1)[1]) > 60) river.push(q);

const gu = GU.map(([id, ko, en, ja, zh]) => {
  const f = byEn[en];
  if (!f) throw new Error(`No outline for ${en} in seoul-gu-osm.geojson`);
  // A closed ring: simplify its two halves (one line from a point back to itself has no direction).
  const ring = project(f.geometry.coordinates[0]), h = Math.floor(ring.length / 2);
  let p = round([...simplify(ring.slice(0, h + 1), 3).slice(0, -1), ...simplify(ring.slice(h), 3)]);
  if (p.length > 3 && p[0][0] === p.at(-1)[0] && p[0][1] === p.at(-1)[1]) p.pop();
  const districts = region.districts.filter((d) => {
    const [ox, oz] = d.anchor ? anchorOffset(d.anchor) : d.offset || [0, 0];
    const [ax, az] = d.anchor?.local || [0, 0];
    return inPolygon(ox + ax, oz + az, p);
  }).map((d) => d.id);
  return {
    id, name: { ko, en, ja, zh }, open: districts.length > 0, ...(districts.length ? { district: districts[0], districts } : {}),
    osm: f.properties.osm, label: labelSpot(p), area: Math.round(Math.abs(area(p))), p,
  };
});

const out = {
  note: 'Seoul at 1/4 around Seongsu Station (scripts/build-seoul.mjs). Gu outlines © OpenStreetMap contributors (ODbL), simplified; Seongsu has extra room south of it.',
  credit: '© OpenStreetMap contributors',
  scale: SCALE, gu, river,
};
await writeFile(path.join(R, 'seoul.json'), JSON.stringify(out));
console.log(gu.map((g) => `${g.id}${g.open ? `*(${g.districts})` : ''} ${(g.area / 1e6).toFixed(2)} km²`).join('\n'));
console.log(`river: ${river.length} points`);
