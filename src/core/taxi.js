// Taxi fares: a base fare for the first stretch, then a little more for
// every 50 m, like a real meter. Distance is the straight line × 1.3, a fair
// guess at the streets the taxi drives along.

export const TAXI_BASE = 4800; // won (Seoul's base fare), covers the first 200 m
export const TAXI_BASE_M = 200;
export const TAXI_STEP = 100; // won per…
export const TAXI_STEP_M = 50; // …50 m after that

export function taxiFare(ax, az, bx, bz) {
  const m = Math.hypot(bx - ax, bz - az) * 1.3;
  return TAXI_BASE + Math.ceil(Math.max(0, m - TAXI_BASE_M) / TAXI_STEP_M) * TAXI_STEP;
}

// No-taxi areas: a place that is closed off (a hoarding landmark with
// `closes`, like the zoo before it opens) plus a small margin round it, so a
// taxi can neither take you there nor drop you just over the fence. Boxes
// [x0, z0, x1, z1] in map coordinates; they go away when the hoarding does.
export const NO_TAXI_MARGIN = 4; // m: just over the fence
export function noTaxiZones(landmarks = [], margin = NO_TAXI_MARGIN) {
  const zones = [];
  for (const l of landmarks) {
    if (l.type !== 'hoarding' || !l.closes || !l.p?.length) continue;
    const xs = l.p.map((q) => q[0]), zs = l.p.map((q) => q[1]);
    zones.push({ closes: l.closes, box: [Math.min(...xs) - margin, Math.min(...zs) - margin, Math.max(...xs) + margin, Math.max(...zs) + margin] });
  }
  return zones;
}
export const noTaxiAt = (zones, x, z) => zones.find(({ box: [x0, z0, x1, z1] }) => x >= x0 && x <= x1 && z >= z0 && z <= z1) || null;
