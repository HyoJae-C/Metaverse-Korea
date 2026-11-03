// Taxi fares: a base fare for the first stretch, then a little more for
// every 50 m, like a real meter. Distance is the straight line × 1.3, a fair
// guess at the streets the taxi drives along.

export const TAXI_BASE = 30; // coins, covers the first 200 m
export const TAXI_BASE_M = 200;
export const TAXI_STEP = 1; // coin per…
export const TAXI_STEP_M = 50; // …50 m after that

export function taxiFare(ax, az, bx, bz) {
  const m = Math.hypot(bx - ax, bz - az) * 1.3;
  return TAXI_BASE + Math.ceil(Math.max(0, m - TAXI_BASE_M) / TAXI_STEP_M) * TAXI_STEP;
}
