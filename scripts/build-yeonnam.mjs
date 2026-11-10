// Yeonnam-dong (districts/yeonnam.json), at 1/4 on its real streets,
// north-west of Yanghwa-ro and Hongdae; written by scripts/build-mapo.mjs.
//
// The Gyeongui Line Forest Park ("Yeontral Park") runs north-north-west on
// its real line from Hongik Univ. Station's exit 3 at Yanghwa-ro, across
// Donggyo-ro and Seongmisan-ro. It is drawn PARK_W wide, twice its real
// width at 1/4 (Yozi's choice, 2026-11-10: it is where people picnic):
// change PARK_W to redraw it. Its streets (Donggyo-ro, Yeonnam-ro,
// Seongmisan-ro, Worldcup-buk-ro, Yeonhui-ro, Jandari-ro) are OpenStreetMap's
// (scripts/data/hongdae-osm.json); every building and shop is fictional.
// The district's anchor is where the park crosses Seongmisan-ro.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, name, town, inPoly, sideOf, clip, nearestOn, pointAt, lengthOf, facing, strips } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'hongdae-osm.json'), 'utf8'));

export const PARK_W = 16; // the forest park's width (m): real at 1/4 is about 8
const PATH_W = 4;

export function yeonnam(offset) {
  const local = (p) => p.map(([x, z]) => [r1(x - offset[0]), r1(z - offset[1])]);
  const street = (en) => local(OSM.roads.find((r) => r.en === en).p);
  const yanghwa = street('Yanghwa-ro');
  const yeonnamSide = (q) => sideOf(q, yanghwa) < 0; // north-west of Yanghwa-ro (Hongdae is south-east)
  const cut = (p) => clip(p, (q) => sideOf(q, yanghwa) < 4); // up to the middle of Yanghwa-ro
  const N = {
    path: name('Gyeongui Line Forest Path', '경의선숲길', '京義線森の道', '京义线林荫路'),
    donggyo: name('Donggyo-ro', '동교로', '東橋路', '东桥路'),
    yeonnamRo: name('Yeonnam-ro', '연남로', '延南路', '延南路'),
    seongmisan: name('Seongmisan-ro', '성미산로', '城美山路', '城美山路'),
    worldcup: name('Worldcup-buk-ro', '월드컵북로', 'ワールドカップ北路', '世界杯北路'),
    yeonhui: name('Yeonhui-ro', '연희로', '延禧路', '延禧路'),
    jandari: name('Jandari-ro', '잔다리로', 'チャンダリ路', '盏达里路'),
  };
  // The park's middle line, from Yanghwa-ro (south-east) to its north end.
  const park = local(OSM.parkLine);
  const roads = [
    { k: 'tertiary', w: 9, p: cut(street('Donggyo-ro')), n: N.donggyo },
    { k: 'tertiary', w: 8, p: street('Yeonnam-ro'), n: N.yeonnamRo },
    { k: 'tertiary', w: 8, p: street('Seongmisan-ro'), n: N.seongmisan },
    { k: 'secondary', w: 10, p: cut(street('Worldcup-buk-ro')), n: N.worldcup },
    { k: 'secondary', w: 10, p: cut(street('Yeonhui-ro')), n: N.yeonhui },
    { k: 'tertiary', w: 8, p: cut(street('Jandari-ro')), n: N.jandari },
  ];
  const parkLen = lengthOf(park);
  const along = (s) => pointAt(park, s);
  // The park: a strip PARK_W wide along its line, the path down the middle.
  const [pa, pb] = [park[0], park.at(-1)], pd = [(pb[0] - pa[0]) / parkLen, (pb[1] - pa[1]) / parkLen], pn = [-pd[1], pd[0]];
  const strip = (w) => [[pa, 1], [pb, 1], [pb, -1], [pa, -1]].map(([q, s]) => [r1(q[0] + pn[0] * s * w / 2), r1(q[1] + pn[1] * s * w / 2)]);
  // The path starts 12 m in, past the little square by exit 3.
  roads.unshift({ k: 'walk', w: PATH_W, p: [along(12).at.map(r1), pb], n: N.path });

  // The area: north-west of Yanghwa-ro, east of Mangwon (x -3197 world),
  // up to the park's north end; Yeonhui-ro is the east edge.
  const W = -3196 - offset[0];
  const AREA = local([[-3196, -258], [-3196, -560], [-3070, -600], [-2990, -612], [-2900, -570], [-2808, -520], [-2808, -385], [-2843, -390]]);
  const inside = (q) => inPoly(q[0], q[1], AREA) && yeonnamSide(q) && q[0] > W;
  // Hongik Univ. Station's exit 3 (at its real place, by the park's south end) stays clear.
  const [ex, ez] = local([OSM.exits['3']])[0];
  const open = [{ line: park, w: PARK_W }, { p: [[ex - 4, ez - 4], [ex + 4, ez - 4], [ex + 4, ez + 4], [ex - 4, ez + 4]] }];
  const t = town(239 + 621, { inside, roads, open });
  const { row } = t;
  const H = { w: [10, 15], h: [5, 11], depth: 14 }; // low houses turned into shops
  const fr = (r, pave = 3) => r.w / 2 + pave;
  // Facing the park, both sides (going north-west along it: east is on the right).
  row('parkW', park, -1, { off: PARK_W / 2 + 2, ...H });
  row('parkE', park, 1, { off: PARK_W / 2 + 2, ...H });
  // The main streets only (Worldcup-buk-ro, Jandari-ro and Yeonhui-ro, round
  // the edges, are left open).
  for (const r of roads.slice(1).filter((x) => [N.donggyo, N.yeonnamRo, N.seongmisan].includes(x.n))) {
    const id = r.n.en.split('-')[0].toLowerCase();
    row(`${id}R`, r.p, 1, { off: fr(r), ...H });
    row(`${id}L`, r.p, -1, { off: fr(r), ...H });
  }
  // Yanghwa-ro's north-west side.
  row('yanghwaN', yanghwa, -1, { off: 7 + 3, depth: 12, w: [10, 14], h: [8, 16] });
  // (one row along each street, nothing filling the blocks: open, like Seongsu)

  const areas = [{ k: 'park', trees: true, p: strip(PARK_W) }];
  // A small square at the south end, by exit 3 and Yanghwa-ro.
  const south = along(16).at, north = along(parkLen - 6).at;
  const [sa, sb, sw] = [along(1).at, along(13).at, PARK_W / 2 - 1];
  areas.push({ k: 'plaza', p: [[sa, 1], [sb, 1], [sb, -1], [sa, -1]].map(([q, s]) => [r1(q[0] + pn[0] * s * sw), r1(q[1] + pn[1] * s * sw)]) });
  const ry = facing(pd[0], pd[1]); // along the park, facing north-west
  const landmarks = [
    { type: 'arch', x: r1(south[0]), z: r1(south[1]), w: 9, ry: facing(-pd[0], -pd[1]), title: 'GYEONGUI LINE FOREST PARK', sub: '경의선숲길 · 연남동', color: '#3f7a4f' },
    { type: 'arch', x: r1(north[0]), z: r1(north[1]), w: 9, ry, title: 'GYEONGUI LINE FOREST PARK', sub: '경의선숲길 · 연남동', color: '#3f7a4f' },
  ];
  // Stretches of the old railway, kept in the grass east of the path,
  // stopping short of the streets that cross the park.
  const cross = roads.slice(1).flatMap((r) => {
    const out = [];
    for (let i = 1; i < r.p.length; i++) {
      const [a, b] = [r.p[i - 1], r.p[i]];
      for (let k = 0; k <= 40; k++) { const q = [a[0] + ((b[0] - a[0]) * k) / 40, a[1] + ((b[1] - a[1]) * k) / 40], o = nearestOn(q, park); if (o.d < r.w / 2) out.push(o.s); }
    }
    return out;
  }).sort((a, b) => a - b);
  const stops = [20, ...cross, parkLen - 20];
  for (let i = 1; i < stops.length; i++) {
    const [s0, s1] = [stops[i - 1] + (i > 1 ? 10 : 0), stops[i] - (i < stops.length - 1 ? 10 : 0)];
    if (s1 - s0 < 20) continue;
    const c = along((s0 + s1) / 2).at;
    landmarks.push({ type: 'tracks', x: r1(c[0] + pn[0] * 4.5), z: r1(c[1] + pn[1] * 4.5), ry, len: r1(s1 - s0) });
  }
  const signAt = along(26).at;
  landmarks.push({ type: 'sign', x: r1(signAt[0] - pn[0] * 3.5), z: r1(signAt[1] - pn[1] * 3.5), ry: facing(pn[0], pn[1]),
    title: name('Gyeongui Line Forest Park', '경의선숲길', '京義線森の道', '京义线林荫路'),
    text: {
      en: 'Trains on the old Gyeongui Line ran here. When the line went underground, the track bed became a long, narrow park. People call this stretch "Yeontral Park". Bring a picnic mat!',
      ko: '옛 경의선 기차가 달리던 길이에요. 철길이 지하로 들어간 뒤 그 자리가 길고 좁은 공원이 됐어요. 이 구간을 사람들은 "연트럴파크"라고 불러요. 돗자리를 챙겨 오세요!',
      ja: 'かつて京義線の列車が走っていた道です。線路が地下に移ったあと、跡地が細長い公園になりました。この区間は「ヨントラルパーク」と呼ばれています。レジャーシートを持ってきてね！',
      zh: '这里曾是旧京义线火车经过的地方。铁路转入地下后，原来的路基变成了一条细长的公园。人们把这一段叫作“延特尔公园”。记得带野餐垫！',
    } });
  // Benches along the path, facing it, staggered either side (not where a street crosses).
  const onRoad = (q) => roads.slice(1).some((r) => nearestOn(q, r.p).d < r.w / 2 + 2);
  for (let s = 30; s < parkLen - 20; s += 25) {
    for (const [side, ds] of [[-1, 0], [1, 12]]) {
      const { at } = along(s + ds), q = [at[0] + pn[0] * side * 3.2, at[1] + pn[1] * side * 3.2];
      if (!onRoad(q)) landmarks.push({ type: 'bench', x: r1(q[0]), z: r1(q[1]), ry: facing(-pn[0] * side, -pn[1] * side) });
    }
  }
  const anchor = nearestOn([0, 0], park).at;
  const donggyo = roads.find((r) => r.n === N.donggyo);
  const dg = pointAt(donggyo.p, lengthOf(donggyo.p) * 0.35).at;
  const pois = [
    { kind: 'landmark', x: r1(anchor[0]), z: r1(anchor[1]), name: name('Gyeongui Line Forest Park', '경의선숲길', '京義線森の道', '京义线林荫路') },
    { kind: 'landmark', x: r1(dg[0]), z: r1(dg[1]), name: name('Yeonnam-dong Chinese restaurants', '연남동 중식당 거리', '延南洞の中華料理店', '延南洞中餐馆') },
  ];
  const map = {
    meta: {
      district: 'yeonnam',
      source: `scripts/build-yeonnam.mjs, at 1/4 on the real place: the Gyeongui Line Forest Park's line and Yeonnam-dong's streets from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/hongdae-osm.json). The park is drawn ${PARK_W} m wide (twice its real width at 1/4). Every building and shop is fictional.`,
    },
    roads, buildings: t.buildings, rail: [], areas, blockers: [], pois, landmarks,
  };
  map.meta.parts = strips(map, 25, 'Yeonnam, north-west of Yanghwa-ro');
  return { map, lots: t.lots };
}

// Which shops go where: each group takes its rows' lots in order.
export const GROUPS = [
  // Facing the forest park: the info centre and picnic shop near the south
  // end, cafés, a bakery, books, a photo studio.
  [['parkW', 'parkE'], ['info-yeonnam', 'sopung-picnic', 'cheolgil-coffee', 'film-day-photo', 'gureum-bakery', 'small-things-room', 'chaekgalpi-books']],
  // Donggyo-ro: the vintage shop and the Chinese restaurant.
  [['donggyoR', 'donggyoL'], ['munbang-vintage', 'wolhwa-banjeom']],
];
