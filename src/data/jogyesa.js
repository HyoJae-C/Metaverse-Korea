// Jogyesa (조계사), the head temple of the Jogye Order, north of Jong-ro on
// Ujeongguk-ro, in the Gyeongbokgung district's metres
// (districts/gyeongbokgung.json; x east, z south, (0, 0) Gwanghwamun).
// Laid out by scripts/build-jogyesa.mjs, drawn by core/jogyesa-model.js.
//
// The whole temple at 37.5% (Yozi 2026-11-15, "그냥 진행해"): the grounds, the
// halls and the yard are all the real ones (OpenStreetMap way 223157537 and
// its halls, at 1/4: x 100-133, z 27-70) grown 1.5 times about PIVOT, where
// Iljumun's way in meets Ujeongguk-ro, so the gate stays on the street and
// the temple takes its room from the made-up block west of it. Before,
// Daeungjeon and Geungnakjeon were 50% on 1/4 grounds: Geungnakjeon stood 9 m
// west of its place, off the real grounds, and the grounds were squared off
// to twice their size. Placed from OSM, Yozi's guide map and braille sign
// and the satellite view (2026-11-12):
//   - Daeungjeon (대웅전) faces south onto the yard. Real: 7 × 4 bays,
//     about 515 m², plinth 1.6 m; OSM's outline (its plinth) 39 × 26 m.
//     At 37.5%: plinth 14.5 × 9.6 m, the hall on it 11.9 × 7 m.
//   - Geungnakjeon (극락전, 소설법전/대설법전 upstairs) is the long hall
//     right beside it on the west, running north-south (OSM's "대설법전"
//     outline, 14 × 37 m real), 0.5 m west of its place so the two plinths
//     don't touch.
//   - The yard: the pagoda tree (회화나무) in front, the white pine (백송,
//     Natural Monument 9) by Daeungjeon's east end, the baby Buddha (천진불)
//     and the temple stele (사적비); the octagonal ten-storey sarira pagoda
//     (8각10층 진신사리탑) at its south-west corner; the bell pavilion
//     (범종루) at the far west.
//   - Iljumun (일주문), the gate on Ujeongguk-ro, with the Four Heavenly
//     Kings inside (north 다문천왕, east 지국천왕, south 증장천왕, west 광목천왕).
//   - The lantern canopy (연등 지붕) over the yard, the temple's best-known
//     sight and the heart of this place (Yozi 2026-11-12).
//   - Ujeongchongguk (우정총국, the 1884 post office) next door on the north-east.
//   - North of Daeungjeon the memorial hall is only a backdrop: Yulgok-ro
//     is in its way, so it is cut short there (19 m deep, 27 m at 37.5%).
// Not built: Ansimdang, the education hall and the Buddhist college south
// of the yard (modern buildings).

export const SCALE = 1.5; // 37.5% over 1/4
export const PIVOT = [133, 57];
// A real spot (the district's metres at 1/4) → where it is drawn.
export const grow = ([x, z]) => [PIVOT[0] + (x - PIVOT[0]) * SCALE, PIVOT[1] + (z - PIVOT[1]) * SCALE];

export const JOGYESA = {
  district: 'gyeongbokgung',
  real: { lat: 37.57395, lon: 126.98185 }, // Daeungjeon's real middle (OSM way 432721256): local 111.6, 55.5 at 1/4
  site: [[82, 26], [131.5, 26], [131.5, 80], [82, 80]], // the grounds (paved): OSM's outline grown, squared off
  road: { x: 136, w: 9, from: 20, to: 146 }, // Ujeongguk-ro, from Yulgok-ro down to Jong-ro (OSM x 134.4-138)
  daeungjeon: { x: 100.9, z: 54.8, w: 11.9, d: 7, plinth: 0.6, eave: 3.6, ridge: 6.9, bays: 7 }, // grow(111.6, 55.5)
  geungnakjeon: { x: 90.2, z: 56.4, w: 3.8, d: 11.6, plinth: 0.4, eave: 2.8, ridge: 5.2, bays: 5 }, // grow(104.8, 56.6), 0.5 m west; long way north-south, faces east
  iljumun: { x: 127.9, z: 57.3, w: 7.5, d: 2.8, h: 5.6, bay: 1.9 }, // grow(129.6, 57.2); the gate's opening runs east-west (w across, north-south)
  kingScale: 0.85, // (the kings, 2.6 m as built, under the smaller gate)
  kings: [ // the Four Heavenly Kings, two in each side bay, facing the way through
    { x: 127.25, z: 54.5, ry: 0, name: { ko: '다문천왕', en: 'King of the North' }, color: '#3f6f9a', holds: 'pagoda' },
    { x: 128.55, z: 54.5, ry: 0, name: { ko: '지국천왕', en: 'King of the East' }, color: '#2f8a68', holds: 'lute' },
    { x: 127.25, z: 60.1, ry: Math.PI, name: { ko: '증장천왕', en: 'King of the South' }, color: '#b2402f', holds: 'sword' },
    { x: 128.55, z: 60.1, ry: Math.PI, name: { ko: '광목천왕', en: 'King of the West' }, color: '#d4a73a', holds: 'dragon' },
  ],
  pagodaTree: { x: 97, z: 66, h: 11.5, r: 6 }, // 회화나무: about 450 years old, it grows up through the canopy
  whitePine: { x: 111.3, z: 49.3, h: 6.5 }, // 백송: white-barked, by Daeungjeon's east end
  sarira: { x: 89, z: 76, h: 6 }, // the octagonal ten-storey pagoda
  babyBuddha: { x: 112.8, z: 69 }, // 천진불
  stele: { x: 121.8, z: 69.5 }, // 사적비
  bell: { x: 86, z: 69, w: 3.6 }, // 범종루, at the far west (satellite: 종각)
  ujeongguk: { x: 127.4, z: 33.5, w: 4.3, d: 2.5, plinth: 0.3, eave: 2.4, ridge: 4.4, bays: 5 }, // 우정총국: grow(129.4, 41.2) (OSM way 471352768)
  museum: [90.5, 27, 114.5, 45.5], // 한국불교역사문화기념관: grow(OSM 104.6-120.8 × 31.7-49.8), cut at Yulgok-ro
  // The canopy: lotus lanterns hung close together on lines, so from above it
  // reads as one striped roof, as in the satellite view. Its shape is the
  // real one (the satellite capture fitted on OSM's Daeungjeon and
  // Geungnakjeon, about 20 px a metre, then grown like the rest): the yard in
  // front of Daeungjeon and a wing east of the hall that you walk under as
  // soon as you are through Iljumun.
  // parts: [x0, z0, x1, z1]; gap: metres between lanterns (they touch);
  // yard: where the parade's first marcher stands.
  canopy: {
    parts: [[94, 61, 114, 72.5], [109.5, 51.5, 124.5, 67]],
    x0: 94, x1: 124.5, z0: 51.5, z1: 72.5, // (the parts' bounds)
    y: 4.4, gap: 0.62,
    yard: [100, 68.6],
  },
};

// Where the canopy's lanterns hang: a grid over its parts, minus the spot
// where the pagoda tree's trunk comes up through it. Each slot: [x, z, row],
// numbered row by row from the north (the gate side's wing first). Players'
// own lanterns (core/temple-lanterns.js) hang in the first 400 slots, by
// number.
export const inCanopy = (x, z, c = JOGYESA.canopy, pad = 0) => c.parts.some(([x0, z0, x1, z1]) => x > x0 + pad && x < x1 - pad && z > z0 + pad && z < z1 - pad);
export function canopySlots(c = JOGYESA.canopy) {
  const J = JOGYESA, out = [];
  const holes = [[J.pagodaTree.x, J.pagodaTree.z, 1.4], [J.sarira.x, J.sarira.z, 2]];
  let row = 0;
  for (let z = c.z0 + c.gap / 2; z < c.z1; z += c.gap, row++) {
    for (let x = c.x0 + c.gap / 2; x < c.x1; x += c.gap) {
      if (!inCanopy(x, z, c)) continue;
      if (holes.some(([hx, hz, r]) => Math.hypot(x - hx, z - hz) < r)) continue;
      out.push([x, z, row]);
    }
  }
  return out;
}
// Where the poles holding the lines up stand: round the outside of the
// parts, every 5 m or so (not where one part joins the other).
export function canopyPoles(c = JOGYESA.canopy) {
  const out = [];
  c.parts.forEach(([x0, z0, x1, z1], i) => {
    const others = c.parts.filter((_, k) => k !== i);
    const put = (x, z, ox, oz) => { if (!others.some(([a, b, cc, d]) => x > a - 0.1 && x < cc + 0.1 && z > b - 0.1 && z < d + 0.1)) out.push([x + ox * 0.3, z + oz * 0.3]); };
    const nx = Math.round((x1 - x0) / 5), nz = Math.round((z1 - z0) / 5);
    for (let k = 0; k <= nx; k++) { const x = x0 + ((x1 - x0) * k) / nx; put(x, z0, 0, -1); put(x, z1, 0, 1); }
    for (let k = 1; k < nz; k++) { const z = z0 + ((z1 - z0) * k) / nz; put(x0, z, -1, 0); put(x1, z, 1, 0); }
  });
  return out;
}
// The x the canopy spans at a given z (for its lines): [from, to] or null.
export function canopySpan(z, c = JOGYESA.canopy) {
  const on = c.parts.filter(([, z0, , z1]) => z > z0 && z < z1);
  return on.length ? [Math.min(...on.map((p) => p[0])), Math.max(...on.map((p) => p[2]))] : null;
}
