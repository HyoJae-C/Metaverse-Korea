// Delivery run (따릉이 배달): take an order from a shop that hires delivery
// riders (the tteokbokki stall, the chicken place) to another shop before the
// timer runs out. No DOM, unit-tested.
//
// Deliveries stay short: the destination must be reachable within one minute
// along the streets (the timer never goes over a minute), so even on foot,
// running, you can make it.

export const BIKE_MS = 13.5; // basic bike speed in m/s (main.js BIKE)
export const GRACE = 20; // seconds to find a bike and park
export const MAX_SECONDS = 60; // a delivery never takes longer than a minute
export const MIN_ROAD = 100; // metres: shorter is not really a delivery
// The longest street route that fits in a minute.
export const MAX_ROAD = (MAX_SECONDS - GRACE) * BIKE_MS;

// Street route length; without a route, a straight line ×1.4 for the bends.
const roadOf = (s) => (Number.isFinite(s.road) ? s.road : s.d * 1.4);

// Seconds allowed for a route of `road` metres: riding time plus time to get
// a bike, never more than a minute.
export const timeFor = (road) => Math.min(MAX_SECONDS, Math.round(road / BIKE_MS + GRACE));
export const reachable = (road) => road / BIKE_MS + GRACE <= MAX_SECONDS;

// Pick where to deliver: a shop reachable within a minute, at least MIN_ROAD
// along the streets if there is one. stores: [{ id, x, z, road? }] (road:
// street route length from `from`). Returns the store with d (straight) and
// road (route) set, or null when nothing is close enough.
export function pickDelivery(stores, from, rand = Math.random) {
  const withD = stores.map((s) => ({ ...s, d: Math.hypot(s.x - from.x, s.z - from.z) }))
    .filter((s) => s.d > 30)
    .map((s) => ({ ...s, road: roadOf(s) }))
    .filter((s) => reachable(s.road));
  const fit = withD.filter((s) => s.road >= MIN_ROAD);
  const pool = fit.length ? fit : withD;
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

// Won: ₩10,000 for making it, +₩5,000 for every 10 seconds to spare (up to ₩30,000).
export function deliveryPay(secondsLeft) {
  if (secondsLeft < 0) return 0;
  return (2 + Math.min(4, Math.floor(secondsLeft / 10))) * 5000;
}
