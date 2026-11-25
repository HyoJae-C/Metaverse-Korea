#!/usr/bin/env node
// Builds Gangnam Station (districts/gangnam.json): Gangnam-daero at 1/4 on
// its real line from the Gangnam Station crossroads north past Sinnonhyeon to
// Nonhyeon Station, with the first stretch of each street that crosses it.
//
// The streets are OpenStreetMap's (scripts/data/gangnam-osm.json):
// Gangnam-daero (the Gangnam-gu / Seocho-gu line), Teheran-ro and
// Seocho-daero at Gangnam Station, Bongeunsa-ro and Sapyeong-daero at
// Sinnonhyeon, Hakdong-ro and Sinbanpo-ro at Nonhyeon. The base map's own
// roads carry on from their ends (scripts/build-base.mjs), Teheran-ro all
// the way to Samseong.
//
// What it is for (Yozi 2026-11-24): the middle of Gangnam was empty, so the
// shops that real Gangnam is known for moved here from where they were piled
// up; no new shops were made:
//  - Gangnam Station crossroads: the big screens (night photos), three
//    clothes shops from Euljiro (it had 15, two over its share) and Teheran
//    Appliance Mart from Samseong, at the corner where Teheran-ro starts.
//  - Gangnam-daero up to Sinnonhyeon: the two cosmetic clinics from Seongsu
//    (the real stretch is Seoul's second clinic street, after Apgujeong).
//  - Hakdong-ro east of Nonhyeon Station: four furniture showrooms from
//    Euljiro, on the real Nonhyeon furniture street (Hakdong-ro from Nonhyeon
//    to Hakdong Station). Euljiro keeps its traditional furniture and lamps.
// Shops gather in those three places; between them the rows are quiet
// office buildings. One row along each street, the blocks behind left open.
// Only Gangnam Station (Line 2) has stairs and trains; Sinnonhyeon and
// Nonhyeon are names on the map. Every building and shop is fictional.
//
//   node scripts/build-gangnam.mjs          writes the map, sets the "at" of
//                                           the shops in GROUPS (stores.json),
//                                           Gangnam Station's exits and the
//                                           district's big screens (region.json)
//   node scripts/build-gangnam.mjs --lots   also prints the lots of each row
// Then: node scripts/build-base.mjs && node scripts/build-closed.mjs

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { r1, name, sideOf, nearestOn, pointAt, lengthOf, facing, strips, lineDist, town, clip } from './street-rows.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = path.join(root, 'public', 'regions', 'another-seoul');
const readJson = (f) => JSON.parse(readFileSync(path.join(R, f), 'utf8'));
export const OSM = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'gangnam-osm.json'), 'utf8'));
const region = readJson('region.json');
export const OFFSET = region.districts.find((x) => x.id === 'gangnam')?.offset || [-620, 1297];
const local = (p) => p.map(([x, z]) => [r1(x - OFFSET[0]), r1(z - OFFSET[1])]);
export const osmStreet = (en) => local(OSM.roads.find((r) => r.en === en).p);

// ---- the real streets (local metres from the anchor: the Gangnam Station crossroads)
export const N = {
  gangnam: name('Gangnam-daero', '강남대로', '江南大路', '江南大路'),
  teheran: name('Teheran-ro', '테헤란로', 'テヘラン路', '德黑兰路'),
  seocho: name('Seocho-daero', '서초대로', '瑞草大路', '瑞草大路'),
  bongeunsa: name('Bongeunsa-ro', '봉은사로', '奉恩寺路', '奉恩寺路'),
  sapyeong: name('Sapyeong-daero', '사평대로', '砂坪大路', '砂坪大路'),
  hakdong: name('Hakdong-ro', '학동로', '鶴洞路', '鹤洞路'),
  sinbanpo: name('Sinbanpo-ro', '신반포로', '新盤浦路', '新盘浦路'),
};
// Gangnam-daero from 45 m south of the crossroads to 25 m north of
// Hakdong-ro (north is -z). The other streets start on its middle line and
// run a short way out; the base map takes them on.
const GD_ALL = osmStreet('Gangnam-daero');
const crossAt = (en) => { const p = osmStreet(en); return nearestOn(p.reduce((a, q) => (lineDist(q, GD_ALL) < lineDist(a, GD_ALL) ? q : a)), GD_ALL); };
const S_SOUTH = nearestOn([0, 0], GD_ALL).s + 45;
const S_NORTH = crossAt('Hakdong-ro').s - 25;
export const GANGNAM_DAERO = clip(GD_ALL, (q) => { const s = nearestOn(q, GD_ALL).s; return s >= S_NORTH && s <= S_SOUTH; });
// A cross street: from Gangnam-daero's middle, `len` metres out (OSM's own line).
function cross(en, len) {
  const p = osmStreet(en);
  const end = (q) => lineDist(q, GD_ALL);
  const line = end(p[0]) < end(p.at(-1)) ? p : [...p].reverse(); // start at Gangnam-daero
  const out = clip(line, (q) => nearestOn(q, line).s <= nearestOn(line[0], line).s + len + lineDist(line[0], GD_ALL));
  return [nearestOn(out[0], GD_ALL).at.map(r1), ...out.slice(1)];
}
export const TEHERAN = cross('Teheran-ro', 75);
export const SEOCHO = cross('Seocho-daero', 60);
export const BONGEUNSA = cross('Bongeunsa-ro', 60);
export const SAPYEONG = cross('Sapyeong-daero', 60);
export const HAKDONG = cross('Hakdong-ro', 150); // the furniture street
export const SINBANPO = cross('Sinbanpo-ro', 40);

const roads = [
  { k: 'primary', w: 16, p: GANGNAM_DAERO, n: N.gangnam },
  { k: 'primary', w: 14, p: TEHERAN, n: N.teheran },
  { k: 'primary', w: 14, p: SEOCHO, n: N.seocho },
  { k: 'secondary', w: 10, p: BONGEUNSA, n: N.bongeunsa },
  { k: 'primary', w: 14, p: SAPYEONG, n: N.sapyeong },
  { k: 'secondary', w: 10, p: HAKDONG, n: N.hakdong },
  { k: 'secondary', w: 10, p: SINBANPO, n: N.sinbanpo },
];
export const ROADS = roads;
const [rGangnam, rTeheran, rSeocho, rBongeunsa, rSapyeong, rHakdong, rSinbanpo] = roads;

// ---- Gangnam Station's exits at their real places (OSM), moved out of
// Gangnam-daero onto the pavement: 10 on the west side, 11 on the east,
// both on the Sinnonhyeon side of the crossroads (the busy way up the
// avenue), on the avenue's wide pavement (the towers stand 9 m back from
// the kerb, like the real avenue's broad walks).
export function stationExits() {
  return ['10', '11'].map((ref) => {
    const real = local([OSM.exits.gangnam[ref]])[0];
    const { at, dir } = pointAt(GANGNAM_DAERO, nearestOn(real, GANGNAM_DAERO).s);
    const sgn = Math.sign(sideOf(real, GANGNAM_DAERO));
    const n = [-dir[1] * sgn, dir[0] * sgn], off = rGangnam.w / 2 + 3.5;
    // the stairs go down towards the crossroads (south along the avenue)
    return { n: Number(ref), at: [r1(at[0] + n[0] * off), r1(at[1] + n[1] * off)], ry: facing(dir[0], dir[1]), real };
  });
}
export const EXITS = stationExits();
const box = ([x, z], h) => [[x - h, z - h], [x + h, z - h], [x + h, z + h], [x - h, z + h]];

// ---- the district's area: one row along each street
const inside = (q) => roads.some((r) => lineDist(q, r.p) < r.w / 2 + 28)
  && nearestOn(q, GD_ALL).s >= S_NORTH - 30 && nearestOn(q, GD_ALL).s <= S_SOUTH + 10;
const open = EXITS.map((e) => ({ p: box(e.at, 4) }));
const t = town(222, { inside, roads, open }); // (Gangnam is station 222)
const { row } = t;
const TOWER = { w: [16, 22], h: [22, 36], depth: 18, gap: 3 };
const OFFICE = { w: [14, 20], h: [14, 26], depth: 16, gap: 3 };
const SHOWROOM = { w: [11, 15], h: [8, 13], depth: 14, gap: 2 };
const fr = (r, pave = 3) => r.w / 2 + pave;
// Gangnam-daero runs from Nonhyeon (north) down to Gangnam Station: its
// right (+1) is the west (Seocho-gu) side, its left (-1) the east (Gangnam-gu).
const PAVE = 9; // the avenue's pavement: room for the exits and the crowd
row('gdE', GANGNAM_DAERO, -1, { off: fr(rGangnam, PAVE), ...TOWER });
row('gdW', GANGNAM_DAERO, 1, { off: fr(rGangnam, PAVE), ...TOWER });
// The cross streets run outwards from the avenue.
row('teheranN', TEHERAN, -1, { off: fr(rTeheran), ...OFFICE });
row('teheranS', TEHERAN, 1, { off: fr(rTeheran), ...OFFICE });
row('seochoN', SEOCHO, 1, { off: fr(rSeocho), ...OFFICE });
row('seochoS', SEOCHO, -1, { off: fr(rSeocho), ...OFFICE });
row('bongeunsaN', BONGEUNSA, -1, { off: fr(rBongeunsa), ...OFFICE });
row('bongeunsaS', BONGEUNSA, 1, { off: fr(rBongeunsa), ...OFFICE });
row('sapyeongN', SAPYEONG, 1, { off: fr(rSapyeong), ...OFFICE });
row('sapyeongS', SAPYEONG, -1, { off: fr(rSapyeong), ...OFFICE });
row('hakdongN', HAKDONG, -1, { off: fr(rHakdong), ...SHOWROOM });
row('hakdongS', HAKDONG, 1, { off: fr(rHakdong), ...SHOWROOM });
row('sinbanpoN', SINBANPO, 1, { off: fr(rSinbanpo), ...OFFICE });
row('sinbanpoS', SINBANPO, -1, { off: fr(rSinbanpo), ...OFFICE });

// ---- names on the map
const gdLen = lengthOf(GANGNAM_DAERO);
const at2 = (line, s) => pointAt(line, s).at.map(r1);
const sinnonhyeon = local([OSM.exits.sinnonhyeon['3']])[0], nonhyeon = local([OSM.exits.nonhyeon['1']])[0];
export const SPOT = {
  crossroads: [0, 0],
  exits: [r1((EXITS[0].at[0] + EXITS[1].at[0]) / 2), r1((EXITS[0].at[1] + EXITS[1].at[1]) / 2)],
  teheran: at2(TEHERAN, 14), // the corner where Teheran-ro starts
  sinnonhyeon: nearestOn(sinnonhyeon, GANGNAM_DAERO).at.map(r1),
  clinics: at2(GANGNAM_DAERO, nearestOn(sinnonhyeon, GANGNAM_DAERO).s + 40), // just south of Sinnonhyeon, facing the avenue
  furniture: at2(HAKDONG, 30),
};
const pois = [
  { kind: 'landmark', x: 6, z: -6, name: name('Gangnam Station Crossroads', '강남역 사거리', '江南駅交差点', '江南站十字路口') },
  { kind: 'landmark', x: SPOT.sinnonhyeon[0] + 14, z: SPOT.sinnonhyeon[1], name: name('Sinnonhyeon Station', '신논현역', '新論峴駅', '新论岘站') },
  { kind: 'landmark', x: r1(nonhyeon[0] + 14), z: r1(nonhyeon[1] + 4), name: name('Nonhyeon Station', '논현역', '論峴駅', '论岘站') },
  { kind: 'landmark', ...(([x, z]) => ({ x, z }))(at2(HAKDONG, 70)), name: name('Nonhyeon Furniture Street', '논현 가구거리', '論峴家具通り', '论岘家具街') },
  { kind: 'landmark', ...(([x, z]) => ({ x: r1(x + 14), z }))(at2(GANGNAM_DAERO, gdLen / 2)), name: N.gangnam },
];

const map = {
  meta: {
    district: 'gangnam',
    source: 'scripts/build-gangnam.mjs, at 1/4 on the real place: Gangnam-daero from Gangnam Station to Nonhyeon Station, with Teheran-ro, Seocho-daero, Bongeunsa-ro, Sapyeong-daero, Hakdong-ro and Sinbanpo-ro, from OpenStreetMap (© OpenStreetMap contributors, ODbL; scripts/data/gangnam-osm.json). Every building and shop is fictional.',
    approx: 'Made up, not from OpenStreetMap: every building (one row along each street, the blocks behind left open), the 9 m pavements of Gangnam-daero, and the road widths (16, 14 and 10 m, not 1/4 of the real ones). Real: the street lines, and the two exits within 9 m of their real spots.',
  },
  roads: roads.map((r) => ({ ...r, p: r.p.map((q) => q.map(r1)) })), buildings: t.buildings, rail: [], areas: [], blockers: [], pois, landmarks: [],
};
map.meta.parts = strips(map, 25, 'Gangnam Station to Nonhyeon, along Gangnam-daero').filter(({ box: [x0, z0, x1, z1] }) => x1 - x0 > 0.5 && z1 - z0 > 0.5);

// Big screens on the towers round the crossroads and up the avenue
// (region.json "screens"). `near`: the spot (local metres) whose nearest
// long wall carries the screen, or metres up the avenue from the crossroads
// with `side`: 1 west, -1 east.
export const SCREENS = [
  { near: [24, -24], w: 16, h: 22, y: 6, city: { top: 'WELCOME TO', local: '강남', name: 'GANGNAM', hue: 285 } },
  { near: [-24, -18], w: 20, h: 11, y: 8, text: '모두서울 MODU SEOUL...' },
  { near: [22, 22], w: 20, h: 11, y: 8, text: 'Teheran-ro → Samseong · KONEXT...' },
  { near: [-20, 26], w: 16, h: 20, y: 6, city: { local: '압구정', name: 'APGUJEONG', hue: 20 } },
  { near: 70, side: -1, w: 18, h: 10, y: 9 },
  { near: 105, side: 1, w: 14, h: 18, y: 7, city: { top: 'FURNITURE STREET', local: '논현', name: 'NONHYEON', hue: 150 } },
];

// Which shops go where: each group takes the free lots of its rows, nearest
// its spot first.
export const GROUPS = [
  [['gdE', 'gdW'], ['info-gangnam'], { near: 'exits' }],
  [['teheranN', 'gdE'], ['teheran-appliances'], { near: 'teheran' }],
  [['teheranN', 'teheranS'], ['fullpower-gaming', 'fullpower-gaming-room'], { near: 'teheran' }], // (Yozi 2026-11-25: gaming beside the appliance mart)
  [['gdW', 'gdE', 'teheranN', 'seochoN'], ['wide-pants', 'tteugae-knit', 'cap-yard'], { near: 'crossroads' }],
  [['gdE', 'gdW'], ['bitna-clinic', 'saebom-clinic'], { near: 'clinics' }],
  [['hakdongN', 'hakdongS'], ['saebyeok-living', 'saebyeok-bedroom', 'kkotjam-beds', 'danjang-dressroom', 'white-mood-living', 'white-mood-interior'], { near: 'furniture' }],
];
// Why each moved shop is here (stores.json "why"). The clothes shops are
// three of Euljiro's that belonged to no group there: its skirt shops and the
// Dongdaemun Fashion Town mall stay together.
const FURNITURE = 'Fictional showroom on the real Nonhyeon furniture street: Hakdong-ro east of Nonhyeon Station, towards Hakdong Station. Moved here from Euljiro\'s furniture street, which keeps the traditional furniture and the lamps (Yozi 2026-11-24).';
const CLOTHES = 'Fictional shop by the Gangnam Station crossroads. Moved here from Euljiro, which had more clothes shops than its share (Yozi 2026-11-24).';
const WHITE_MOOD = 'Fictional showroom on the real Nonhyeon furniture street (Hakdong-ro east of Nonhyeon Station). Yozi 2026-11-25: a white-tone interior, furniture, wallpaper and floors, in Gangnam; a little dearer than Euljiro.';
const GAMING = 'Fictional shop beside Teheran Appliance Mart at the Gangnam Station corner of Teheran-ro (Yozi 2026-11-25: a gaming-style interior; Yozi picked the spot next to the appliance mart so home shopping is one stop).';
export const WHY = {
  'teheran-appliances': 'Fictional shop on the Gangnam Station corner where Teheran-ro starts (Yozi 2026-11-22: home appliances like a fridge and a washer, somewhere like Gangnam, not Sewoon Sangga; moved here from the Samseong end of Teheran-ro when Gangnam Station was built, Yozi 2026-11-24). The real Gangnam-daero has big electronics showrooms.',
  'bitna-clinic': 'Fictional clinic on Gangnam-daero between Gangnam Station and Sinnonhyeon, the real stretch with one of Seoul\'s biggest clusters of cosmetic clinics. Moved here from Seongsu (Yozi 2026-11-24).',
  'saebom-clinic': 'Fictional clinic on Gangnam-daero between Gangnam Station and Sinnonhyeon, by Bitna. Moved here from Seongsu (Yozi 2026-11-24).',
  'wide-pants': CLOTHES, 'tteugae-knit': CLOTHES, 'cap-yard': CLOTHES,
  'saebyeok-living': FURNITURE, 'saebyeok-bedroom': FURNITURE, 'kkotjam-beds': FURNITURE, 'danjang-dressroom': FURNITURE,
  'white-mood-living': WHITE_MOOD, 'white-mood-interior': WHITE_MOOD,
  'fullpower-gaming': GAMING, 'fullpower-gaming-room': GAMING,
};
// The shops made new here, not moved from elsewhere.
export const NEW_SHOPS = ['white-mood-living', 'white-mood-interior', 'fullpower-gaming', 'fullpower-gaming-room'];

// The lots each shop gets (local metres), and the screens' wall spots.
export function placeShops(stores = readJson('stores.json').stores) {
  const ids = new Set(stores.map((s) => s.id));
  const used = new Set(), out = {};
  const ok = (at) => roads.every((r) => lineDist(at, r.p) >= r.w / 2 + 0.5) && open.every((o) => lineDist(at, o.p) > 1);
  for (const [rows, list, opt] of GROUPS) {
    const want = list.filter((sid) => ids.has(sid));
    let free = rows.flatMap((rowId) => (t.lots[rowId] || []).map((at, i) => ({ key: `${rowId}:${i}`, at })));
    free = free.filter((l) => !used.has(l.key) && ok(l.at));
    const s = SPOT[opt.near];
    free.sort((a, b) => Math.hypot(a.at[0] - s[0], a.at[1] - s[1]) - Math.hypot(b.at[0] - s[0], b.at[1] - s[1]));
    if (free.length < want.length) throw new Error(`${rows}: ${free.length} free lots for ${want.length} shops`);
    want.forEach((sid, i) => { used.add(free[i].key); out[sid] = free[i].at; });
  }
  return out;
}
// Each screen's spot on a wall at least 12 m long that faces a street.
export function screenSpots() {
  const s0 = nearestOn([0, 0], GANGNAM_DAERO).s;
  const taken = new Set();
  return SCREENS.map(({ near, side, ...rest }) => {
    let q = near;
    if (typeof near === 'number') { const { at: c, dir } = pointAt(GANGNAM_DAERO, s0 - near); q = [c[0] - dir[1] * side * (rGangnam.w / 2 + PAVE), c[1] + dir[0] * side * (rGangnam.w / 2 + PAVE)]; }
    let best = null;
    t.buildings.forEach((b, bi) => b.p.forEach((a, i) => {
      const c = b.p[(i + 1) % b.p.length], len = Math.hypot(c[0] - a[0], c[1] - a[1]);
      if (len < 12 || taken.has(bi)) return;
      const mid = [(a[0] + c[0]) / 2, (a[1] + c[1]) / 2];
      if (!roads.some((r) => lineDist(mid, r.p) < r.w / 2 + PAVE + 1)) return; // a wall on a street
      const d = Math.hypot(mid[0] - q[0], mid[1] - q[1]);
      if (!best || d < best.d) best = { d, mid, bi, h: b.h, len };
    }));
    taken.add(best.bi);
    return { at: best.mid.map(r1), ...rest };
  });
}

export { map };

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  writeFileSync(path.join(R, 'districts', 'gangnam.json'), JSON.stringify(map) + '\n');
  const [ox, oz] = OFFSET;
  const W = (q) => [r1(q[0] + ox), r1(q[1] + oz)];
  if (process.argv.includes('--lots')) for (const [k, v] of Object.entries(t.lots)) console.log('  ', k, v.length, JSON.stringify(v));
  // stores.json is hand-formatted, so only the "at" (and "district") of each
  // placed shop is rewritten in the text.
  let stores = readFileSync(path.join(R, 'stores.json'), 'utf8');
  const order = JSON.parse(stores).stores.map((x) => x.id);
  const find = (sid, from = 0) => { const m = new RegExp(`"id":\\s*"${sid}"`).exec(stores.slice(from)); return m ? from + m.index : -1; };
  const spots = placeShops();
  for (const [sid, at] of Object.entries(spots)) {
    const i = find(sid), next = order[order.indexOf(sid) + 1];
    if (i < 0) throw new Error(`${sid}: not in stores.json`);
    const end = next ? find(next, i) : stores.length;
    let part = stores.slice(i, end);
    if (!/"at":\s*\[[^\]]*\]/.test(part)) throw new Error(`${sid}: no "at"`);
    part = part.replace(/"at":\s*\[[^\]]*\]/, `"at": [${W(at).join(', ')}]`);
    part = /"district":\s*"/.test(part) ? part.replace(/"district":\s*"[^"]*"/, '"district": "gangnam"') : part.replace(/("at": \[[^\]]*\])/, '$1, "district": "gangnam"');
    if (WHY[sid]) {
      const why = JSON.stringify(WHY[sid]);
      part = /"why":\s*"/.test(part) ? part.replace(/"why":\s*"(?:[^"\\]|\\.)*"/, () => `"why": ${why}`) : part.replace(/("district": "gangnam")/, () => `"district": "gangnam", "why": ${why}`);
    }
    stores = stores.slice(0, i) + part + stores.slice(end);
  }
  writeFileSync(path.join(R, 'stores.json'), stores);

  // Gangnam Station's exits and the big screens (region.json is
  // hand-formatted: each is one line, rewritten whole).
  let reg = readFileSync(path.join(R, 'region.json'), 'utf8');
  const exits = EXITS.map((e) => `{"n": ${e.n}, "at": [${W(e.at).join(', ')}], "ry": ${e.ry}}`).join(', ');
  reg = reg.replace(/("id": "gangnam-station"[^\n]*"exits": \[)[^\n]*(\] \},?\n)/, `$1${exits}$2`);
  const MARK = '[build-gangnam screen]';
  const lines = reg.split('\n').filter((l) => !l.includes(MARK));
  const i = lines.findIndex((l) => l.startsWith('  "screens": ['));
  lines.splice(i + 1, 0, ...screenSpots().map((sc, k) => `    ${JSON.stringify({ ...sc, at: W(sc.at), note: `Gangnam Station's big screens, ${k + 1} of ${SCREENS.length} ${MARK}` })},`));
  writeFileSync(path.join(R, 'region.json'), lines.join('\n'));

  console.log(`gangnam: ${t.buildings.length} buildings, ${Object.keys(spots).length} shops placed, Gangnam-daero ${r1(gdLen)} m`);
  for (const e of EXITS) console.log(`  Gangnam exit ${e.n}: [${W(e.at)}], ry ${e.ry} (${r1(Math.hypot(e.at[0] - e.real[0], e.at[1] - e.real[1]))} m from the real one)`);
  for (const r of roads) console.log(`  ${r.n.en}: [${W(r.p[0])}] .. [${W(r.p.at(-1))}]`);
}
