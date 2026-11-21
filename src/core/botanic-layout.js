// How the inside of Seoul Botanic Park's greenhouse is laid out (the map's
// "botanic" landmark, scripts/build-magok.mjs): all made up, in metres from
// the greenhouse's middle (x east, z south). No three.js here: the drawing
// is game/botanic-site.js, and the tests read this.
//
//   A lily pond in the middle, a walk round it, a ring of low beds, a wider
//   walk, and a ring of tall beds against the glass. Four straight walks cut
//   through the beds: one from each door, and each carried on to the far
//   side. The half by the main door is the tropical hall, the far half the
//   Mediterranean hall. Pot plants are sold from stands on the edge of the
//   tall beds: everyday ones just inside the main door, rare ones at the far
//   end of the main walk, next to where the same plant grows.
import { PLANTS } from './house-plants.js';

export const GREENHOUSE = {
  rim: 13, // m: the glass wall's height (the real rim is about 28 m: 50%)
  dip: 8.6, // m: the roof's height over the middle (a dish: lower in the middle)
  lean: 1.07, // the wall leans out: its top is this much wider than its foot
  pond: 3, // m: the lily pond's radius
  inner: [5.4, 10.2], // m: the low beds' ring
  outer: 13.4, // m: where the tall beds begin; they run to the glass
  walk: 1.8, // m: half the width of a walk through the beds
  mainWalk: 2.2, // (the main door's)
  stand: 0.55, // m: a pot stand's side
};
const norm = (a) => ((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
const rnd = (i, k) => { const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return s - Math.floor(s); };

// l: the landmark ({ r, doors: [{ a, w, main }] }).
export function greenhouseLayout(l) {
  const K = GREENHOUSE, R = l.r;
  const main = l.doors.find((d) => d.main) || l.doors[0];
  // The walks: each door's angle and the one straight across from it.
  const walks = l.doors.flatMap((d) => [{ a: norm(d.a), hw: d.main ? K.mainWalk : K.walk, door: true }, { a: norm(d.a + Math.PI), hw: K.walk }]).sort((p, q) => p.a - q.a);
  // A bed between two walks, from r0 out to r1: its outline, with the sides
  // parallel to the walks.
  const sector = (w0, w1, r0, r1) => {
    let a0 = w0.a, a1 = w1.a; if (a1 <= a0) a1 += Math.PI * 2;
    const p = [];
    const arc = (r, from, to) => { const n = Math.max(2, Math.ceil(Math.abs(to - from) / 0.14)); for (let i = 0; i <= n; i++) { const a = from + (to - from) * (i / n); p.push([Math.cos(a) * r, Math.sin(a) * r]); } };
    arc(r0, a0 + Math.asin(w0.hw / r0), a1 - Math.asin(w1.hw / r0));
    arc(r1, a1 - Math.asin(w1.hw / r1), a0 + Math.asin(w0.hw / r1));
    return p.map(([x, z]) => [Math.round(x * 100) / 100, Math.round(z * 100) / 100]);
  };
  // Tropical: the half the main door opens into; Mediterranean: the far half.
  const zoneAt = (x, z) => (x * Math.cos(main.a) + z * Math.sin(main.a) > 0 ? 'tropical' : 'med');
  const beds = [];
  walks.forEach((w0, i) => {
    const w1 = walks[(i + 1) % walks.length];
    let mid = (w0.a + (w1.a <= w0.a ? w1.a + Math.PI * 2 : w1.a)) / 2;
    const zone = zoneAt(Math.cos(mid), Math.sin(mid));
    beds.push({ ring: 'inner', zone, a0: w0.a, a1: w1.a, p: sector(w0, w1, K.inner[0], K.inner[1]) });
    beds.push({ ring: 'outer', zone, a0: w0.a, a1: w1.a, p: sector(w0, w1, K.outer, R - 0.35) });
  });
  const inBed = (x, z, pad = 0) => {
    const r = Math.hypot(x, z);
    const ring = r > K.inner[0] + pad && r < K.inner[1] - pad ? 'inner' : r > K.outer + pad && r < R - 0.35 - pad ? 'outer' : null;
    if (!ring) return null;
    for (const w of walks) { const d = Math.abs(-Math.sin(w.a) * x + Math.cos(w.a) * z), along = Math.cos(w.a) * x + Math.sin(w.a) * z; if (along > 0 && d < w.hw + pad) return null; }
    return ring;
  };

  // The pot stands: on the tall beds' edge, facing the wide walk. Everyday
  // plants either side of the main walk where it comes in; rare ones either
  // side of its far end.
  const stands = [];
  const standAt = (id, a, rare) => {
    const r = K.outer + 0.45;
    stands.push({ id, rare, x: Math.cos(a) * r, z: Math.sin(a) * r, ry: Math.atan2(-Math.cos(a), -Math.sin(a)), stand: [Math.cos(a) * (K.outer - 0.75), Math.sin(a) * (K.outer - 0.75)], a });
  };
  const deg = Math.PI / 180;
  const common = PLANTS.filter((p) => !p[3]).map((p) => p[0]), rare = PLANTS.filter((p) => p[3]).map((p) => p[0]);
  [-27, -17, 17, 27, 37].forEach((d, i) => common[i] && standAt(common[i], main.a + d * deg, false));
  [-25, -15, 15, 25, 35].forEach((d, i) => rare[i] && standAt(rare[i], main.a + Math.PI + d * deg, true));
  // A gardener by each group of stands, on the walk's outer edge.
  const clerks = [[main.a - 37 * deg, false], [main.a + Math.PI - 35 * deg, true]].map(([a, isRare]) => ({ x: Math.cos(a) * (K.outer - 0.45), z: Math.sin(a) * (K.outer - 0.45), ry: Math.atan2(-Math.cos(a), -Math.sin(a)), rare: isRare }));

  // What grows: [kind, x, z, size, turn]. Tall things in the outer beds (the
  // roof is highest at the glass), low ones round the pond. Behind each rare
  // stand grows the big one of the same plant.
  const plants = [];
  const TALL = { tropical: ['palm', 'palm', 'banana', 'ficus', 'treefern', 'palm'], med: ['olive', 'cactus', 'citrus', 'olive', 'cypress', 'cactus'] };
  const LOW = { tropical: ['fern', 'monstera', 'paradise', 'fern', 'flower'], med: ['agave', 'lavender', 'cactusball', 'lavender', 'agave'] };
  const BIG = { 'plant-baobab': 'baobab', 'plant-bottle': 'bottle', 'plant-dragon': 'dragon', 'plant-orchid': 'orchids', 'plant-flytrap': 'flytraps', 'plant-olive': 'olive', 'plant-cactus': 'cactus', 'plant-monstera': 'monstera', 'plant-fern': 'treefern', 'plant-paradise': 'paradise' };
  for (const s of stands) { const r = s.rare ? K.outer + 3.6 : K.outer + 2.6; plants.push([BIG[s.id], Math.cos(s.a) * r, Math.sin(s.a) * r, s.rare ? 1.25 : 1, s.a]); }
  const clear = (x, z, d) => plants.every((p) => Math.hypot(p[1] - x, p[2] - z) > d) && stands.every((s) => Math.hypot(s.x - x, s.z - z) > 1.3);
  let i = 0;
  for (let r = K.outer + 1.6; r < R - 1.4; r += 2.7) {
    const n = Math.floor((Math.PI * 2 * r) / 3.1);
    for (let k = 0; k < n; k++) {
      i++;
      const a = (k / n) * Math.PI * 2 + rnd(i, 1) * 0.12, rr = r + (rnd(i, 2) - 0.5) * 0.9, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      if (inBed(x, z, 0.9) !== 'outer' || !clear(x, z, 2.4)) continue;
      const list = TALL[zoneAt(x, z)];
      plants.push([list[Math.floor(rnd(i, 3) * list.length)], x, z, 0.8 + rnd(i, 4) * 0.45, rnd(i, 5) * 6.28]);
    }
  }
  for (const r of [K.outer + 0.9, K.inner[1] - 0.9, (K.inner[0] + K.inner[1]) / 2, K.inner[0] + 0.9]) { // low planting: the beds' edges and the inner ring
    const n = Math.floor((Math.PI * 2 * r) / 1.55);
    for (let k = 0; k < n; k++) {
      i++;
      const a = (k / n) * Math.PI * 2 + rnd(i, 1) * 0.1, x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (!inBed(x, z, 0.55) || !clear(x, z, 1.15)) continue;
      const list = LOW[zoneAt(x, z)];
      plants.push([list[Math.floor(rnd(i, 3) * list.length)], x, z, 0.8 + rnd(i, 4) * 0.4, rnd(i, 5) * 6.28]);
    }
  }
  for (let k = 0; k < 4; k++) { // a few small trees in the inner ring, off the sight lines along the walks
    const w = walks[k], a = w.a + 0.75, r = (K.inner[0] + K.inner[1]) / 2, x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (inBed(x, z, 1)) plants.push([zoneAt(x, z) === 'tropical' ? 'treefern' : 'olive', x, z, 0.85, k]);
  }
  // Benches on the wide walk, facing the pond (two in each hall).
  const benches = walks.map((w) => { const a = w.a + 0.62, r = K.outer - 0.5; return { x: Math.cos(a) * r, z: Math.sin(a) * r, ry: Math.atan2(-Math.cos(a), -Math.sin(a)) }; }).filter((b) => stands.every((s) => Math.hypot(s.x - b.x, s.z - b.z) > 2.2) && clerks.every((c) => Math.hypot(c.x - b.x, c.z - b.z) > 1.6));
  return { R, walks, beds, stands, clerks, plants, benches, inBed, zoneAt, roofAt: (r) => K.dip + (K.rim - K.dip) * Math.min(1, r / R) };
}

// The glass wall as straight pieces [x0, z0, x1, z1], with the doors left open.
export function wallPieces(l) {
  const out = [], n = l.sides * 2;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2, mid = (a0 + a1) / 2;
    if (l.doors.some((d) => Math.abs(Math.atan2(Math.sin(mid - d.a), Math.cos(mid - d.a))) * l.r < d.w / 2 + 0.1)) continue;
    out.push([Math.cos(a0) * l.r, Math.sin(a0) * l.r, Math.cos(a1) * l.r, Math.sin(a1) * l.r]);
  }
  return out;
}
