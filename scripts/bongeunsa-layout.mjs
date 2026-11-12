// Bongeunsa (봉은사), the temple north of Bongeunsa-ro opposite KONEXT, for
// the Samseong-dong map (scripts/build-samseong.mjs).
//
// Everything sits on its real spot at 1/4 (rules in docs and project memory):
// the grounds and the halls are OpenStreetMap's outlines (scripts/data/
// bongeunsa-osm.json, from Yozi's export; © OpenStreetMap contributors,
// ODbL). What OSM has no outline for (the Maitreya Buddha, Haesu Gwaneum and
// its pond, the three-storey pagoda, Iljumun, the bell pavilion) is placed
// from Yozi's Naver map capture (/mnt/project-files/bongeunsa/naver.png),
// fitted onto the OSM halls: 12 halls, about 1 m apart on average.
//
// Sizes (Yozi 2026-11-12, "진행해줘"): the Maitreya Buddha at 50% of the real
// 23 m, Daeungjeon, Beopwangru and Jinyeomun at 37.5%, the grounds and every
// other hall at 1/4. At 50% the courtyard between Daeungjeon and
// Beopwangru would have shrunk to about 1 m; at 37.5% it keeps about 6 m.
// The halls that the bigger three now touch step aside (`why` below).
//
// World metres in, map metres (local to the district) out; x east, z south.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BES = JSON.parse(readFileSync(path.join(root, 'scripts', 'data', 'bongeunsa-osm.json'), 'utf8'));
const r1 = (v) => Math.round(v * 10) / 10;
const r3 = (v) => Math.round(v * 1000) / 1000;
const name = (en, ko, ja, zh) => ({ ko, en, ja, zh });
const D2R = Math.PI / 180;

// Bigger than 1/4: footprint scale from the OSM outline (0.375 / 0.25).
export const BIG = { 대웅전: 1.5, 법왕루: 1.5, 진여문: 1.5 };
export const BUDDHA_H = 11.5; // 23 m at 50%
// Hall kind for core/palace-model.js palacehalls ('h' hall, 'g' gate) and
// its name board. Beopwangru is drawn by core/bongeunsa-model.js (two storeys).
const KIND = {
  대웅전: ['h', '大雄殿'], 판전: ['h', '板殿'], 지장전: ['h', '地藏殿'], 미륵전: ['h', '彌勒殿'], 선불당: ['h', '禪佛堂'],
  진여문: ['g', '眞如門'], 법왕루: ['nu'],
};
// Halls moved off the real outline so the bigger three fit (world metres,
// how far and why). Found by pushing each one straight away from the bigger
// hall until 0.6 m is left between their stone bases.
export const NUDGE = {};

// Spots from the Naver capture (world metres; the fit in the file's header).
export const SPOTS = {
  buddha: [11.3, 809.5], // the Maitreya Buddha, on its oval plaza in the north-west
  gwaneum: [38.8, 833.5], // Haesu Gwaneum on a round pond south of the courtyard
  iljumun: [51.7, 850.5], // the one-pillar gate by Bongeunsa-ro
  pagoda: [38.9, 814.6], // the three-storey pagoda in the courtyard
  bell: [26.6, 826], // the bell pavilion (종루)
};

// A hall's footprint from its OSM outline: the smallest rectangle round it
// turned near the temple's own axis (about 28° off the compass, like the
// streets round it), its centre, size (w across its front, d deep) and turn.
function fit(P) {
  let best = null;
  for (let t = 13; t <= 43; t += 0.5) {
    const c = Math.cos(t * D2R), s = Math.sin(t * D2R);
    const u = P.map(([x, z]) => x * c - z * s), v = P.map(([x, z]) => x * s + z * c);
    const w = Math.max(...u) - Math.min(...u), d = Math.max(...v) - Math.min(...v);
    if (!best || w * d < best.A) best = { A: w * d, t, w, d, cu: (Math.max(...u) + Math.min(...u)) / 2, cv: (Math.max(...v) + Math.min(...v)) / 2 };
  }
  const c = Math.cos(best.t * D2R), s = Math.sin(best.t * D2R);
  return { x: best.cu * c + best.cv * s, z: -best.cu * s + best.cv * c, w: best.w, d: best.d, ry: best.t * D2R };
}
// The four corners of a turned rectangle (pad: added all round).
export function corners(h, pad = 0) {
  const c = Math.cos(h.ry), s = Math.sin(h.ry), hw = h.w / 2 + pad, hd = h.d / 2 + pad;
  return [[-hw, -hd], [hw, -hd], [hw, hd], [-hw, hd]].map(([u, v]) => [h.x + u * c + v * s, h.z - u * s + v * c]);
}
// Do two convex polygons overlap (separating axes)?
export function overlap(A, B) {
  for (const P of [A, B]) for (let i = 0; i < P.length; i++) {
    const [x1, z1] = P[i], [x2, z2] = P[(i + 1) % P.length], nx = z1 - z2, nz = x2 - x1;
    const pa = A.map(([x, z]) => x * nx + z * nz), pb = B.map(([x, z]) => x * nx + z * nz);
    if (Math.max(...pa) <= Math.min(...pb) || Math.max(...pb) <= Math.min(...pa)) return false;
  }
  return true;
}
const BASE = 0.35; // the stone base round every hall (palacehalls draws it 0.7 m wider)

// The halls (world metres), scaled and nudged.
export function halls() {
  const H = {};
  for (const [n, P] of Object.entries(BES.halls)) {
    const h = fit(P), k = BIG[n] || 1;
    H[n] = { ...h, w: h.w * k, d: h.d * k, osm: [h.x, h.z] };
  }
  for (const big of Object.keys(BIG)) for (const [n, h] of Object.entries(H)) {
    if (BIG[n]) continue;
    const b = H[big];
    let dx = h.x - b.x, dz = h.z - b.z;
    const L = Math.hypot(dx, dz) || 1;
    dx /= L; dz /= L;
    let moved = 0;
    while (overlap(corners(h, BASE + 0.3), corners(b, BASE + 0.3)) && moved < 8) { h.x += dx * 0.25; h.z += dz * 0.25; moved += 0.25; }
    if (moved) NUDGE[n] = { m: r1(Math.hypot(h.x - h.osm[0], h.z - h.osm[1])), why: `${NUDGE[n] ? NUDGE[n].why.replace(/ \(.*/, '') + ' and ' + big : 'moved off ' + big} (drawn at 37.5%, so bigger than its real outline)` };
  }
  return H;
}

// What the temple adds to the Samseong map. local: world → map metres;
// street(q): how far a map point is from the nearest street's edge.
export function bongeunsa(local, street = () => Infinity) {
  const L = ([x, z]) => local([[x, z]])[0];
  const H = halls();
  const buildings = [], blockers = [], areas = [];
  // The landmark's own origin: the middle of Daeungjeon's courtyard.
  const O = L([(H.대웅전.x + H.법왕루.x) / 2, (H.대웅전.z + H.법왕루.z) / 2]);
  const rel = ([x, z]) => [r1(x - O[0]), r1(z - O[1])];
  const list = []; // palacehalls rows
  let nu = null;
  for (const [n, h] of Object.entries(H)) {
    const [kind, han] = KIND[n] || ['h'];
    const [x, z] = L([h.x, h.z]);
    const foot = corners({ ...h, x, z }, BASE).map(([a, b]) => [r1(a), r1(b)]);
    const k = Math.min(h.w, h.d);
    // Heights as palacehalls draws them (base + walls + band + roof), for the wall.
    const B = Math.min(0.6, 0.25 + k * 0.05);
    const wallH = kind === 'g' ? Math.max(2.4, 1.6 + k * 0.25) : Math.min(4, Math.max(2.1, 1.1 + h.d * 0.3));
    const top = r1(B + wallH + 0.62 + Math.max(1, Math.min(3.4, h.d * 0.5)));
    if (kind === 'nu') {
      nu = [...rel([x, z]), r1(h.w), r1(h.d), r3(h.ry)];
      buildings.push({ h: 8.5, custom: true, p: foot }); // (Beopwangru: two storeys and its roof, core/bongeunsa-model.js)
      continue;
    }
    list.push([...rel([x, z]), r1(h.w), r1(h.d), r3(h.ry), kind, ...(han ? [han] : [])]);
    if (kind === 'g') {
      // Jinyeomun: you walk through its middle bay; the side bays (the four
      // heavenly kings' rooms) are walls.
      const third = h.w / 3;
      for (const sx of [-1, 1]) {
        const c = Math.cos(h.ry), s = Math.sin(h.ry), off = sx * third;
        buildings.push({ h: top, custom: true, p: corners({ x: x + off * c, z: z - off * s, w: third, d: h.d, ry: h.ry }, BASE).map(([a, b]) => [r1(a), r1(b)]) });
      }
    } else buildings.push({ h: top, custom: true, p: foot });
  }
  // The Maitreya Buddha's plaza: an oval of paving, the statue at its north
  // end facing south-south-east (over the courtyard towards KONEXT), a
  // curved wall of niches behind it.
  const [bx, bz] = L(SPOTS.buddha);
  const bry = 15 * D2R; // facing: +z turned 15° east
  const ring = (cx, cz, rx, rz, n = 16, a0 = 0, a1 = Math.PI * 2) => Array.from({ length: n }, (_, i) => {
    const a = a0 + ((a1 - a0) * i) / (a1 - a0 === Math.PI * 2 ? n : n - 1);
    return [r1(cx + Math.cos(a) * rx), r1(cz + Math.sin(a) * rz)];
  });
  blockers.push({ p: ring(bx, bz, 2.7, 2.7, 6) }); // the hexagonal base
  // The niche wall: a half ring 4.6 m out behind the statue (a thin wall of short pieces).
  const back = [-Math.sin(bry), -Math.cos(bry)]; // behind the statue
  const wallR = 4.6, wa = Math.atan2(back[1], back[0]);
  for (let i = 0; i < 8; i++) {
    const a0 = wa - 1.55 + (3.1 * i) / 8, a1 = wa - 1.55 + (3.1 * (i + 1)) / 8;
    const p0 = [bx + Math.cos(a0) * wallR, bz + Math.sin(a0) * wallR], p1 = [bx + Math.cos(a1) * wallR, bz + Math.sin(a1) * wallR];
    const o0 = [bx + Math.cos(a0) * (wallR + 0.5), bz + Math.sin(a0) * (wallR + 0.5)], o1 = [bx + Math.cos(a1) * (wallR + 0.5), bz + Math.sin(a1) * (wallR + 0.5)];
    blockers.push({ p: [p0, p1, o1, o0].map(([a, b]) => [r1(a), r1(b)]) });
  }
  // Haesu Gwaneum's pond: water you can't walk into.
  const [gx, gz] = L(SPOTS.gwaneum);
  const pond = ring(gx, gz, 1.7, 1.7, 12);
  areas.push({ k: 'water', p: pond });
  blockers.push({ p: pond });
  // The pagoda and the bell.
  const [px, pz] = L(SPOTS.pagoda);
  blockers.push({ p: ring(px, pz, 0.7, 0.7, 6) });
  const [lx, lz] = L(SPOTS.bell);
  blockers.push({ p: ring(lx, lz, 0.6, 0.6, 6) });
  // Iljumun stands at the kerb; the game's Bongeunsa-ro is a little wider
  // than 1/4, so the gate steps back along the way in until 1.2 m is left.
  let [ix, iz] = L(SPOTS.iljumun);
  const [jx, jz] = L([H.진여문.x, H.진여문.z]), jl = Math.hypot(jx - ix, jz - iz);
  const [i0x, i0z] = [ix, iz];
  while (street([ix, iz]) < 1.2 && Math.hypot(ix - i0x, iz - i0z) < 5) { ix += ((jx - ix) / jl) * 0.25; iz += ((jz - iz) / jl) * 0.25; }
  if (ix !== i0x) NUDGE.일주문 = { m: r1(Math.hypot(ix - i0x, iz - i0z)), why: 'stepped back off Bongeunsa-ro (drawn 14 m wide)' };
  // Lanterns (연등): a canopy over the courtyard between Daeungjeon and
  // Beopwangru, and two strings along the way in from Jinyeomun.
  const front = (h) => { const [x, z] = L([h.x, h.z]); return [x + Math.sin(h.ry) * h.d / 2, z + Math.cos(h.ry) * h.d / 2]; };
  const backOf = (h) => { const [x, z] = L([h.x, h.z]); return [x - Math.sin(h.ry) * h.d / 2, z - Math.cos(h.ry) * h.d / 2]; };
  const f1 = front(H.대웅전), b2 = backOf(H.법왕루);
  const canopy = [...rel([(f1[0] + b2[0]) / 2, (f1[1] + b2[1]) / 2]), r1(H.법왕루.w + 2), r1(Math.hypot(b2[0] - f1[0], b2[1] - f1[1]) - 1), r3(H.대웅전.ry)];
  const gateIn = backOf(H.진여문), nuOut = front(H.법왕루);
  const lane = [rel(gateIn), rel(nuOut)];
  const landmark = {
    type: 'bongeunsa', x: O[0], z: O[1], ry: 0,
    halls: list, nu,
    gwaneum: rel([gx, gz]), pagoda: rel([px, pz]), bell: [...rel([lx, lz]), r3(H.대웅전.ry)],
    iljumun: [...rel([ix, iz]), r3(H.진여문.ry)],
    canopy, lane,
  };
  // The ground: the temple's stone-paved yards; woods on the hill in the north and
  // the west (trees keep off the halls and the Buddha's plaza by themselves).
  const grounds = local(BES.grounds);
  const woods = local([[-14, 813], [-7, 805], [2, 798], [12, 793], [21, 790], [30, 788], [59, 778], [66, 792], [48, 796], [32, 798], [19, 802], [18, 816], [8, 818], [7, 830], [5, 834], [0, 835], [-3, 827], [-14, 827]]);
  // The Maitreya Buddha is its own landmark, so the woods keep off its plaza
  // (clear: core/world.js) and the far culling knows where it stands.
  const buddha = { type: 'maitreya', x: r1(bx), z: r1(bz), ry: r3(bry), h: BUDDHA_H, wallR, clear: 7.5 };
  const signAt = L([SPOTS.iljumun[0] - 3.2, SPOTS.iljumun[1] - 3.5]);
  const sign = {
    type: 'sign', x: r1(signAt[0]), z: r1(signAt[1]), ry: r3(H.진여문.ry - Math.PI / 2),
    title: name('Bongeunsa Temple', '봉은사', '奉恩寺（ボンウンサ）', '奉恩寺'),
    text: {
      ko: '봉은사는 794년 신라 때 처음 세워진 절이에요. 도심 한가운데, 큰 전시장 건너편에 있어요. 북서쪽 언덕의 미륵대불은 높이 23 m의 화강암 불상이고, 판전의 현판은 추사 김정희가 세상을 떠나기 사흘 전에 쓴 글씨로 알려져 있어요.',
      en: 'Bongeunsa was first built in 794, in the Silla kingdom, and now sits in the middle of the city across the road from the big exhibition centre. The 23 m granite Maitreya Buddha stands on the hill in the north-west, and the board on Panjeon hall is said to be the last writing of the calligrapher Kim Jeong-hui (Chusa), made three days before he died.',
      ja: '奉恩寺は794年、新羅の時代に建てられたお寺です。都会のど真ん中、展示場の向かいにあります。北西の丘には高さ23 mの花崗岩の弥勒大仏が立ち、板殿の扁額は書家・金正喜（秋史）が亡くなる三日前に書いたものと伝えられています。',
      zh: '奉恩寺始建于794年新罗时期，如今位于市中心、会展中心的对面。西北山坡上矗立着高23米的花岗岩弥勒大佛，板殿的匾额据说是书法家金正喜（秋史）去世前三天所写。',
    },
  };
  const pois = [
    { kind: 'landmark', x: O[0], z: O[1], name: name('Bongeunsa', '봉은사', '奉恩寺', '奉恩寺') },
    { kind: 'landmark', x: r1(bx), z: r1(bz), name: name('Maitreya Buddha', '미륵대불', '弥勒大仏', '弥勒大佛') },
  ];
  return {
    buildings, blockers, landmarks: [landmark, buddha, sign], pois,
    areas: [{ k: 'stone', p: grounds }, { k: 'park', trees: true, p: woods }, ...areas],
    grounds,
  };
}
