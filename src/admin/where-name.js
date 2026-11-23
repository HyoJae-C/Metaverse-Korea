// The live map's "where is this player" line on admin.html: the place they
// are at (Ttukseom Han River Park, Namsan, Cheonggyecheon…), the district
// around it, and the real gu. A district alone was too coarse: one district
// can hold several places (Seongsu holds Seoul Forest and Ttukseom park,
// Itaewon holds Namsan and the War Memorial), and a spot outside every
// district used to take the name of whichever district centre was nearest.
//
// Where the names come from, so a new area is named as soon as it is added:
// - districts: DISTRICT_NAME (ui/district-names.js), the same names the game's
//   map uses (tests/where-name.test.mjs fails for a district without one);
// - Han River parks: their `hanpark` landmark's box, named after its store;
// - subway stations: region.json, "near <name> Station";
// - big rooms on the street (parks, museums, halls): stores.json;
// - landmarks: PLACES below, by landmark type, so a landmark that moves keeps
//   its name. Every landmark type on the map is either in PLACES or in
//   NOT_A_PLACE (the test checks), so a new one has to be given a name.
// - gu: seoul.json's real gu outlines.
import { DISTRICT_NAME } from '../ui/district-names.js';
import { inPoly } from '../core/geom.js';
import { districtAt } from '../core/districts.js';

// Named places. lm: a landmark type (kind: which one, when a type has
// several), r: how far from it (m) still counts as there. box: [x0, z0, x1,
// z1] in world metres, for a place no landmark marks (approximate: the
// admin's label only, nothing is built from it).
export const PLACES = [
  // Seongsu
  { name: 'Yeonmujang-gil', at: [4.7, 67.4], r: 60 }, // (its stamp, among the shops)
  { name: 'Seoul Forest', box: [-614, -200, -243, 190] },
  { name: 'Seoul Forest', lm: 'rosegarden', r: 30 }, { name: 'Seoul Forest', lm: 'greenhouse', r: 30 }, { name: 'Seoul Forest', lm: 'hill', r: 30 }, { name: 'Seoul Forest', lm: 'pond', r: 20 }, { name: 'Seoul Forest', lm: 'deerpen', r: 30 }, { name: 'Seoul Forest', lm: 'lawn', r: 50 }, { name: 'Seoul Forest', lm: 'tandemrental', r: 20 },
  { name: 'Seoul Forest', lm: 'avenue', r: 0 }, // (no spot of its own: inside the box above)
  // Gyeongbokgung, Gwanghwamun, Cheonggyecheon, Jongno
  { name: 'Gwanghwamun Gate', lm: 'gwanghwamun', r: 25 },
  { name: 'Gwanghwamun Gate', lm: 'palacehalls', r: 0 }, { name: 'Gwanghwamun Gate', lm: 'cloister', r: 0 }, // (the palace's and Changdeokgung's halls: their own box/district names it)
  { name: 'Gyeongbokgung Palace', lm: 'yeongjegyo', r: 40 }, { name: 'Gyeongbokgung Palace', lm: 'rankstones', r: 40 }, { name: 'Gyeongbokgung Palace', lm: 'pavilion', r: 50 }, { name: 'Gyeongbokgung Palace', lm: 'hexpavilion', r: 50 }, { name: 'Gyeongbokgung Palace', lm: 'amisan', r: 30 },
  { name: 'Cheong Wa Dae', lm: 'bluehouse', r: 60 }, { name: 'Cheong Wa Dae', lm: 'bluegate', r: 30 }, { name: 'Cheong Wa Dae', lm: 'bhfountain', r: 20 }, { name: 'Cheong Wa Dae', lm: 'bhfence', r: 0 }, // (the street side: scripts/build-cheongwadae.mjs)
  { name: 'Gyeongbokgung Palace', box: [-2001, -1331, -1639, -885] },
  { name: 'Gwanghwamun Square', lm: 'statue', kind: 'king', r: 60 }, { name: 'Gwanghwamun Square', lm: 'statue', kind: 'admiral', r: 60 },
  { name: 'Bosingak', lm: 'bosingak', r: 25 },
  { name: 'Jogyesa Temple', lm: 'jogyesa', r: 50 },
  { name: 'Bugaksan (Seoul City Wall)', lm: 'northwall', r: 150 },
  { name: 'Cheonggyecheon Stream', box: [-1735, -750, -680, -600], district: 'gyeongbokgung' },
  // Bukchon, Jongmyo, Changdeokgung
  { name: 'Bukchon Hanok Village', lm: 'openhouse', r: 40 }, { name: 'Bukchon Hanok Village', lm: 'planters', r: 30 }, { name: 'Bukchon Hanok Village', lm: 'lanewalls', r: 30 },
  { name: 'Jongmyo Shrine', lm: 'woldae', r: 40 }, { name: 'Jongmyo Shrine', lm: 'samdo', r: 30 }, { name: 'Jongmyo Shrine', lm: 'squarepond', r: 30 }, { name: 'Jongmyo Shrine', lm: 'jeryeband', r: 30 },
  { name: 'Jongmyo Park', lm: 'janggitable', r: 30 },
  { name: 'Changdeokgung Palace', lm: 'jeongja', r: 0 },
  { name: 'Huwon (Secret Garden)', lm: 'pondisle', r: 70 },
  { name: 'Huwon (Secret Garden)', box: [-1471, -1196, -1350, -1010] },
  // Yongsan: Namsan, War Memorial, museum, family park, Itaewon
  { name: 'N Seoul Tower', at: [-1474.5, -187.3], r: 40 },
  { name: 'Namsan Cable Car', lm: 'cablecar', r: 40 },
  { name: 'Namsan', lm: 'namsan', r: 230 },
  { name: 'War Memorial', lm: 'warmemorial', r: 90 }, { name: 'War Memorial', lm: 'outdoorexhibits', r: 60 },
  { name: 'Yongsan Family Park', lm: 'farm', r: 120 },
  { name: 'Itaewon-ro', lm: 'arcade', r: 60, district: 'itaewon' },
  { name: 'Mangwon Market', lm: 'arcade', r: 60, district: 'mangwon' },
  { name: 'Banpo Bridge', lm: 'banpobridge', r: 25 },
  // Songpa, Olympic Park
  { name: 'Seokchon Lake', lm: 'lakeshore', r: 0, lake: true },
  { name: 'Modu Tower', lm: 'haneultower', r: 70 },
  { name: 'Modu Tower', lm: 'haneulstore', r: 60 },
  { name: 'Modu Ballpark', lm: 'dome', r: 60 },
  { name: 'World Peace Gate', lm: 'peacegate', r: 40 },
  { name: 'Olympic Park', lm: 'skatepark', r: 0 }, { name: 'Olympic Park', lm: 'lonetree', r: 0 }, { name: 'Olympic Park', lm: 'poolhall', r: 0 }, { name: 'Olympic Park', lm: 'basketball', r: 0 },
  // Mapo, Seodaemun
  { name: 'Hongdae Busking Street', lm: 'busking', r: 40 },
  { name: 'Gyeongui Line Forest Park', lm: 'tracks', r: 40 },
  { name: 'Sogang Bridge', lm: 'seogang', r: 30 },
  { name: 'Haneul Park', lm: 'skypark', r: 160 },
  { name: 'Nanji Camping Ground', lm: 'nanjicamp', r: 110 },
  { name: 'Dalmaji Park', lm: 'dalmaji', r: 90 },
  // West: Gimpo, Mokdong, Magok
  { name: 'Gimpo Airport Terminal', lm: 'gimpoairport', r: 120 },
  { name: 'Mokdong Ice Rink', lm: 'mokdongrink', r: 50 },
  { name: 'Seoul Botanic Park', lm: 'botanic', r: 260 },
  // Yeouido
  { name: '63 Building', lm: 'tower63', r: 45 },
  { name: 'Seoul Dal (balloon)', lm: 'seouldal', r: 30 },
  { name: 'Yeouido Han River Park', lm: 'fwbarge', r: 0 }, { name: 'Yeouido Han River Park', lm: 'mulbit', r: 40 },
  // Jung-gu: gates, DDP, Namsangol, Myeongdong, Seoul Station
  { name: 'Sungnyemun Gate', lm: 'sungnyemun', r: 50 },
  { name: 'Heunginjimun Gate', lm: 'heunginjimun', r: 40 }, { name: 'Heunginjimun Gate', lm: 'ongseong', r: 0 },
  { name: 'Dongdaemun Design Plaza', lm: 'ddp', r: 90 },
  { name: 'Namsangol Hanok Village', lm: 'hanokgate', r: 50 }, { name: 'Namsangol Hanok Village', lm: 'folkyard', r: 40 },
  { name: 'Dongdaemun Seed Shop', lm: 'seedshop', r: 20 },
  { name: 'Dongmyo Flea Market', lm: 'potatomarket', r: 50 }, { name: 'Dongmyo Flea Market', lm: 'fleastall', r: 25 },
  { name: 'Naksan Park', lm: 'naksanpin', r: 100 },
  { name: 'Myeongdong Cathedral', lm: 'cathedral', r: 45 }, { name: 'Myeongdong Cathedral', lm: 'cathedralyard', r: 0 },
  { name: 'Myeongdong Night Food Carts', lm: 'nightcarts', r: 30 },
  { name: 'Old Seoul Station', lm: 'oldstation', r: 40 }, { name: 'Old Seoul Station', lm: 'stationhall', r: 0 }, { name: 'Old Seoul Station', lm: 'yardfence', r: 0 },
  // Grand Park, Samseong
  { name: 'Grand Park Zoo', lm: 'zooentrance', r: 50 }, { name: 'Grand Park Zoo', lm: 'zoofence', r: 0 },
  { name: "Grown-ups' Grand Park Gate", lm: 'cgpgate', r: 25 },
  { name: 'Bongeunsa Temple', lm: 'bongeunsa', r: 80 }, { name: 'Bongeunsa Temple', lm: 'maitreya', r: 30 },
  { name: 'KONEXT', lm: 'konext', r: 70 }, { name: 'KONEXT Aquarium', lm: 'aquarium', r: 25 },
  { name: 'Samseong Bridge', lm: 'samseongbridge', r: 25 },
  { name: 'Seonjeongneung Royal Tombs', lm: 'royaltomb', r: 40 }, { name: 'Seonjeongneung Royal Tombs', lm: 'jeongjagak', r: 30 }, { name: 'Seonjeongneung Royal Tombs', lm: 'hongsalmun', r: 0 }, { name: 'Seonjeongneung Royal Tombs', lm: 'chamdo', r: 0 }, { name: 'Seonjeongneung Royal Tombs', lm: 'bigak', r: 0 }, { name: 'Seonjeongneung Royal Tombs', lm: 'tombhall', r: 0 }, { name: 'Seonjeongneung Royal Tombs', lm: 'oldginkgo', r: 0 }, // (the grounds: scripts/build-seonjeongneung.mjs)
  { name: 'Seoul Arts Center', lm: 'artscenter', r: 0 }, // (its district is the arts centre)
];

// Landmark types that are street furniture or part of a place named above
// (a bench, a sign, a stretch of wall): no place of their own.
export const NOT_A_PLACE = ['bench', 'sign', 'meadow', 'blossoms', 'arch', 'wall', 'citywall', 'icecream', 'flowergarden', 'palacegate', 'throne', 'shrinehall', 'jongmyogate', 'shrinetrees', 'hanpark', 'tombvisitors'];

// Rooms that sit on the street big enough to be a place (a park's
// greenhouse, a museum); shops are named by the "In …" line instead.
const BIG_ROOMS = { park: 60, museum: 80, memorial: 0, cathedral: 0, dharmahall: 0, skydeck: 40, zoo: 0, pool: 0, dome: 0, island: 60, icerink: 0, opera: 50, concert: 50, aquarium: 0, hall: 0, cablecar: 0 };
// Store names that read better as the place's name.
const ROOM_NAME = { 'mangwon-hangang': 'Mangwon Han River Park' };

const STATION_R = 70; // near a subway exit (m)
const PARK_MARGIN = 25; // a Han River park's box, plus this much (m)
const DISTRICT_MARGIN = 40; // the same margin core/districts.js gives

const boxOf = (pts) => {
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of pts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  return [x0, z0, x1, z1];
};

// Everything the label needs, built once when the map has loaded.
// map: the joined map (core/districts.js), boxes: districtBoxes(map),
// stores: stores.json's list, stations: region.json subway.stations,
// gu: seoul.json's gu (or none).
export function wherePlaces({ map, boxes = [], stores = [], stations = [], gu = [] }) {
  const spots = []; // { name, x, z, r }
  const areas = []; // { name, test(x, z), district }
  const marks = map?.landmarks || [];
  const storeById = new Map(stores.map((s) => [s.id, s]));
  for (const p of PLACES) {
    if (p.box) {
      const [x0, z0, x1, z1] = p.box;
      areas.push({ name: p.name, district: p.district, test: (x, z) => x >= x0 && x <= x1 && z >= z0 && z <= z1 });
      continue;
    }
    if (p.at) { spots.push({ name: p.name, x: p.at[0], z: p.at[1], r: p.r }); continue; }
    for (const l of marks) {
      if (l.type !== p.lm || (p.kind && l.kind !== p.kind)) continue;
      if (p.lake) {
        for (const lake of l.lakes || []) {
          const [x0, z0, x1, z1] = boxOf((lake.shore || []).map(([x, z]) => [x + (l.x || 0), z + (l.z || 0)])); // (shores are from the landmark, core/lakeshore.js)
          areas.push({ name: p.name, test: (x, z) => x >= x0 - 15 && x <= x1 + 15 && z >= z0 - 15 && z <= z1 + 15 });
        }
        continue;
      }
      if (p.r > 0 && Number.isFinite(l.x)) spots.push({ name: p.name, x: l.x, z: l.z, r: p.r, district: p.district });
    }
  }
  // Han River parks: the park's own box, turned like the park (game/han-parks.js).
  for (const l of marks) {
    if (l.type !== 'hanpark') continue;
    const s = storeById.get(l.store);
    const name = ROOM_NAME[l.store] || s?.name?.en || l.store;
    const [bx0, bz0, bx1, bz1] = l.bounds || [-30, -45, 30, 20];
    const c = Math.cos(l.ry || 0), sn = Math.sin(l.ry || 0);
    areas.unshift({ name, test: (x, z) => {
      const dx = x - l.x, dz = z - l.z, u = dx * c - dz * sn, v = dx * sn + dz * c;
      return u > bx0 - PARK_MARGIN && u < bx1 + PARK_MARGIN && v > bz0 - PARK_MARGIN && v < bz1 + PARK_MARGIN;
    } });
  }
  for (const s of stores) {
    const r = BIG_ROOMS[s.size];
    if (!r || s.hanpark || !Array.isArray(s.at)) continue;
    spots.push({ name: ROOM_NAME[s.id] || s.name?.en || s.id, x: s.at[0], z: s.at[1], r });
  }
  for (const st of stations) {
    const n = st.name?.en || st.id;
    for (const e of st.exits || []) if (Array.isArray(e.at)) spots.push({ name: `near ${n} Station`, x: e.at[0], z: e.at[1], r: STATION_R, station: true });
  }
  return { spots, areas, boxes, gu };
}

export const districtName = (id) => DISTRICT_NAME[id]?.en || (id ? id.charAt(0).toUpperCase() + id.slice(1) : '');

// { place, district, gu } at (x, z): each a name or ''.
export function whereAt(w, x, z) {
  const inBox = w.boxes.some((b) => x >= b.x0 - DISTRICT_MARGIN && x <= b.x1 + DISTRICT_MARGIN && z >= b.z0 - DISTRICT_MARGIN && z <= b.z1 + DISTRICT_MARGIN);
  const district = inBox ? districtAt(w.boxes, x, z, DISTRICT_MARGIN) || '' : '';
  // The nearest named spot, by how far into its circle; a landmark beats a
  // station exit, a spot beats a box (Bosingak inside Cheonggyecheon's box).
  let best = null, bk = Infinity;
  for (const s of w.spots) {
    if (s.district && s.district !== district) continue;
    const d = Math.hypot(x - s.x, z - s.z);
    if (d > s.r) continue;
    const k = d / s.r + (s.station ? 1 : 0);
    if (k < bk) { bk = k; best = s; }
  }
  let place = best && !best.station ? best.name : '';
  if (!place) place = w.areas.find((a) => (!a.district || a.district === district) && a.test(x, z))?.name || '';
  if (!place && best) place = best.name;
  const g = w.gu.find((d) => d.p && inPoly(x, z, d.p));
  return { place, district: districtName(district), gu: g?.name?.en || '' };
}

// The line under a player's row: "Ttukseom Han River Park · Gwangjin-gu",
// or the district when no place is near ("Seongsu · Seongdong-gu"). Near a
// station it says both ("near Sinchon Station · Seodaemun (Sinchon)").
export function whereText(w, x, z) {
  const { place, district, gu } = whereAt(w, x, z);
  const parts = [];
  if (place) parts.push(place);
  if (district && (!place || place.startsWith('near '))) parts.push(district);
  if (!place && !district) parts.push('Between areas');
  if (gu) parts.push(gu);
  return parts.join(' · ');
}
