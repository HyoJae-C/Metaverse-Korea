// Jogyesa (조계사), the head temple of the Jogye Order, north of Jong-ro on
// Ujeongguk-ro, in the Gyeongbokgung district's metres
// (districts/gyeongbokgung.json; x east, z south, (0, 0) Gwanghwamun).
// Laid out by scripts/build-jogyesa.mjs, drawn by core/jogyesa-model.js.
//
// The grounds are the real ones at 1/4 (OpenStreetMap way 223157537: x
// 99-132, z 26-70). The halls are drawn at 50% (like Gyeongbokgung's next
// door), placed from OSM, Yozi's guide map and braille sign and the
// satellite view (2026-11-12):
//   - Daeungjeon (대웅전) faces south onto the yard. Real: 7 × 4 bays,
//     about 515 m², plinth 1.6 m, ceiling 8.5 m. At 50%: 15 × 8.5 m.
//     Its middle is 3 m north of the real one so the yard in front keeps
//     its depth under the bigger hall.
//   - Geungnakjeon (극락전, 소설법전/대설법전 upstairs) is the long hall
//     west of it, running north-south (OSM's "대설법전" outline), 7 m west
//     of its real middle so the two halls don't overlap at 50%.
//   - The yard: the pagoda tree (회화나무) in front, the white pine (백송,
//     Natural Monument 9) on the east, the baby Buddha (천진불) and the
//     temple stele (사적비); the octagonal ten-storey sarira pagoda
//     (8각10층 진신사리탑) at its south-west corner.
//   - Iljumun (일주문), the gate on Ujeongguk-ro, with the Four Heavenly
//     Kings inside (north 다문천왕, east 지국천왕, south 증장천왕, west 광목천왕).
//   - The lantern canopy (연등 지붕) over the yard, the temple's best-known
//     sight and the heart of this place (Yozi 2026-11-12).
//   - The bell pavilion only if there is room (Yozi): left out for now.

export const JOGYESA = {
  district: 'gyeongbokgung',
  real: { lat: 37.57395, lon: 126.98185 }, // Daeungjeon's real middle (OSM way 432721256)
  site: [[99, 26], [132, 26], [132, 75], [99, 75]], // the grounds (paved): OSM's outline, squared off
  road: { x: 136, w: 9, from: 20, to: 146 }, // Ujeongguk-ro, from Yulgok-ro down to Jong-ro (OSM x 134.4-138)
  daeungjeon: { x: 111.6, z: 52.5, w: 15, d: 8.5, plinth: 0.8, eave: 4.6, ridge: 8.6, bays: 7 },
  geungnakjeon: { x: 95.8, z: 56, w: 6.5, d: 15, plinth: 0.5, eave: 3.4, ridge: 6.4, bays: 5 }, // long way north-south, faces east
  iljumun: { x: 129.5, z: 57, w: 10, d: 3.2, h: 6.2, bay: 2.2 }, // the gate's opening runs east-west (w across, north-south)
  kings: [ // the Four Heavenly Kings, two in each side bay, facing the way through
    { x: 128.7, z: 53.1, ry: 0, name: { ko: '다문천왕', en: 'King of the North' }, color: '#3f6f9a', holds: 'pagoda' },
    { x: 130.3, z: 53.1, ry: 0, name: { ko: '지국천왕', en: 'King of the East' }, color: '#2f8a68', holds: 'lute' },
    { x: 128.7, z: 60.9, ry: Math.PI, name: { ko: '증장천왕', en: 'King of the South' }, color: '#b2402f', holds: 'sword' },
    { x: 130.3, z: 60.9, ry: Math.PI, name: { ko: '광목천왕', en: 'King of the West' }, color: '#d4a73a', holds: 'dragon' },
  ],
  pagodaTree: { x: 108, z: 63, h: 13, r: 6.5 }, // 회화나무: about 450 years old, it grows up through the canopy
  whitePine: { x: 124.5, z: 49, h: 7.5 }, // 백송: white-barked, by Daeungjeon's east end
  sarira: { x: 102.5, z: 70.5, h: 6.5 }, // the octagonal ten-storey pagoda
  babyBuddha: { x: 119.5, z: 63 }, // 천진불
  stele: { x: 125.5, z: 61 }, // 사적비
  // The canopy: rows of lotus lanterns hung on lines over the yard, from in
  // front of Daeungjeon to the gate. gap: metres between lanterns.
  canopy: { x0: 100.5, x1: 127, z0: 60, z1: 73.5, y: 4.4, gap: 0.95 },
};

// Where the canopy's lanterns hang: a grid over the yard, minus the spots
// where the pagoda tree's trunk and the sarira pagoda come up through it.
// Each slot: [x, z, row]. Players' own lanterns (core/temple-lanterns.js)
// hang in these slots too, by number.
export function canopySlots(c = JOGYESA.canopy) {
  const J = JOGYESA, out = [];
  const holes = [[J.pagodaTree.x, J.pagodaTree.z, 1.4], [J.sarira.x, J.sarira.z, 2]];
  let row = 0;
  for (let z = c.z0; z <= c.z1 + 1e-6; z += c.gap, row++) {
    for (let x = c.x0; x <= c.x1 + 1e-6; x += c.gap) {
      if (holes.some(([hx, hz, r]) => Math.hypot(x - hx, z - hz) < r)) continue;
      out.push([x, z, row]);
    }
  }
  return out;
}
