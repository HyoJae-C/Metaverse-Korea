#!/usr/bin/env node
// Builds the Seoul overview for the map (public/regions/seongsu/seoul.json):
// the 25 districts (gu) as simple tiles, the Han River, and which gu are open.
// It is a schematic, not a survey: Seoul's outline and each gu office are
// placed at 1/4 scale around Seongsu (game metres, x east, z south), and the
// tiles are the areas closest to each gu (a Voronoi diagram) inside the
// outline. Open gu hold a game district (core/districts.js); the rest are
// shown as "coming soon".
//
//   node scripts/build-seoul.mjs

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const C = { lat: 37.5446, lon: 127.0557 }; // Seongsu: the game's origin
export const SCALE = 1 / 4;
const mLat = (Math.PI / 180) * 6378137, mLon = mLat * Math.cos((C.lat * Math.PI) / 180);
const xy = ([lat, lon]) => [Math.round((lon - C.lon) * mLon * SCALE), Math.round(-(lat - C.lat) * mLat * SCALE)];

// [id, ko, en, ja, zh, [lat, lon] of the tile's seed, district (open)]
const GU = [
  ['jongno', '종로구', 'Jongno-gu', '鍾路区', '钟路区', [37.5800, 126.9800], 'gyeongbokgung'],
  ['jung', '중구', 'Jung-gu', '中区', '中区', [37.5600, 127.0000]],
  ['yongsan', '용산구', 'Yongsan-gu', '龍山区', '龙山区', [37.5326, 126.9905], 'itaewon'],
  ['seongdong', '성동구', 'Seongdong-gu', '城東区', '城东区', [37.5520, 127.0420], 'seongsu'],
  ['gwangjin', '광진구', 'Gwangjin-gu', '広津区', '广津区', [37.5420, 127.0880]],
  ['dongdaemun', '동대문구', 'Dongdaemun-gu', '東大門区', '东大门区', [37.5800, 127.0450]],
  ['jungnang', '중랑구', 'Jungnang-gu', '中浪区', '中浪区', [37.6000, 127.0930]],
  ['seongbuk', '성북구', 'Seongbuk-gu', '城北区', '城北区', [37.6000, 127.0100]],
  ['gangbuk', '강북구', 'Gangbuk-gu', '江北区', '江北区', [37.6400, 127.0150]],
  ['dobong', '도봉구', 'Dobong-gu', '道峰区', '道峰区', [37.6700, 127.0350]],
  ['nowon', '노원구', 'Nowon-gu', '蘆原区', '芦原区', [37.6450, 127.0700]],
  ['eunpyeong', '은평구', 'Eunpyeong-gu', '恩平区', '恩平区', [37.6100, 126.9250]],
  ['seodaemun', '서대문구', 'Seodaemun-gu', '西大門区', '西大门区', [37.5750, 126.9400], 'seodaemun'],
  ['mapo', '마포구', 'Mapo-gu', '麻浦区', '麻浦区', [37.5550, 126.9150]],
  ['gangseo', '강서구', 'Gangseo-gu', '江西区', '江西区', [37.5550, 126.8350]],
  ['yangcheon', '양천구', 'Yangcheon-gu', '陽川区', '阳川区', [37.5200, 126.8600]],
  ['guro', '구로구', 'Guro-gu', '九老区', '九老区', [37.4950, 126.8650]],
  ['geumcheon', '금천구', 'Geumcheon-gu', '衿川区', '衿川区', [37.4600, 126.9000]],
  ['yeongdeungpo', '영등포구', 'Yeongdeungpo-gu', '永登浦区', '永登浦区', [37.5200, 126.9050]],
  ['dongjak', '동작구', 'Dongjak-gu', '銅雀区', '铜雀区', [37.5000, 126.9450]],
  ['gwanak', '관악구', 'Gwanak-gu', '冠岳区', '冠岳区', [37.4650, 126.9450]],
  ['seocho', '서초구', 'Seocho-gu', '瑞草区', '瑞草区', [37.4750, 127.0250]],
  ['gangnam', '강남구', 'Gangnam-gu', '江南区', '江南区', [37.4950, 127.0650]],
  ['songpa', '송파구', 'Songpa-gu', '松坡区', '松坡区', [37.5000, 127.1150]],
  ['gangdong', '강동구', 'Gangdong-gu', '江東区', '江东区', [37.5400, 127.1450]],
];
// Seoul's outline, roughly, clockwise from the north.
const OUTLINE = [
  [37.715, 127.020], [37.695, 127.090], [37.640, 127.115], [37.575, 127.115], [37.560, 127.180], [37.520, 127.180],
  [37.480, 127.150], [37.455, 127.105], [37.430, 127.055], [37.430, 126.985], [37.445, 126.930], [37.430, 126.895],
  [37.475, 126.835], [37.535, 126.790], [37.585, 126.800], [37.575, 126.870], [37.600, 126.900], [37.640, 126.900],
  [37.665, 126.950], [37.650, 126.985], [37.690, 127.005],
].map(xy);
// The Han River, west to east. Near Seongsu it is moved a little south so it
// runs past the bottom of the (full-size) Seongsu district.
const RIVER = [
  [37.585, 126.795], [37.565, 126.850], [37.548, 126.895], [37.532, 126.930], [37.518, 126.965], [37.515, 126.995],
  [37.522, 127.020], [37.530, 127.045], [37.535, 127.070], [37.530, 127.095], [37.540, 127.115], [37.555, 127.140], [37.560, 127.180],
].map(xy).map(([x, z]) => [x, z + Math.round(170 * Math.max(0, 1 - Math.abs(x - 50) / 650))]);

// Keep the part of polygon p on the side of the bisector nearer to a (than b).
function halfPlane(p, a, b) {
  const nx = b[0] - a[0], nz = b[1] - a[1], c = (nx * (a[0] + b[0]) + nz * (a[1] + b[1])) / 2;
  const inside = ([x, z]) => nx * x + nz * z <= c;
  const out = [];
  for (let i = 0; i < p.length; i++) {
    const s = p[(i + p.length - 1) % p.length], e = p[i];
    const cross = () => { const ds = nx * s[0] + nz * s[1] - c, de = nx * e[0] + nz * e[1] - c, t = ds / (ds - de); return [s[0] + (e[0] - s[0]) * t, s[1] + (e[1] - s[1]) * t]; };
    if (inside(e)) { if (!inside(s)) out.push(cross()); out.push(e); } else if (inside(s)) out.push(cross());
  }
  return out;
}

const seeds = GU.map((g) => xy(g[5]));
const gu = GU.map(([id, ko, en, ja, zh, , district], i) => {
  let p = OUTLINE;
  for (let j = 0; j < seeds.length; j++) if (j !== i) p = halfPlane(p, seeds[i], seeds[j]);
  p = p.map(([x, z]) => [Math.round(x), Math.round(z)]);
  const label = [Math.round(p.reduce((s, q) => s + q[0], 0) / p.length), Math.round(p.reduce((s, q) => s + q[1], 0) / p.length)];
  return { id, name: { ko, en, ja, zh }, open: !!district, ...(district ? { district } : {}), label, p };
});

const out = { note: 'Schematic Seoul at 1/4 scale around Seongsu (scripts/build-seoul.mjs). Not a survey map.', scale: SCALE, gu, river: RIVER, outline: OUTLINE };
await writeFile(path.join(root, 'public', 'regions', 'seongsu', 'seoul.json'), JSON.stringify(out));
console.log(gu.map((g) => `${g.id}${g.open ? '*' : ''} ${g.p.length}`).join(', '));
