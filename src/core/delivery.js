// Delivery race (따릉이 배달): take a tteokbokki order from the stall to
// another shop before the timer runs out. A bike from a bike station makes it
// in time; on foot you'd have to run the whole way. No DOM, unit-tested.

export const DELIVERY_GAME = 'delivery';
export const BIKE_MS = 16; // bike speed in m/s (main.js BIKE)
export const MIN_DIST = 120, MAX_DIST = 450; // metres, straight line

// Pick where to deliver: a shop between MIN_DIST and MAX_DIST away (the
// nearest-to-ideal ones if none fit). stores: [{ id, x, z }].
export function pickDelivery(stores, from, rand = Math.random) {
  const withD = stores.map((s) => ({ ...s, d: Math.hypot(s.x - from.x, s.z - from.z) })).filter((s) => s.d > 30);
  const fit = withD.filter((s) => s.d >= MIN_DIST && s.d <= MAX_DIST);
  const pool = fit.length ? fit : withD.sort((a, b) => Math.abs(a.d - 250) - Math.abs(b.d - 250)).slice(0, 3);
  return pool.length ? pool[Math.floor(rand() * pool.length)] : null;
}

// Seconds allowed: streets wind (×1.6 the straight line) at bike speed, plus
// time to get a bike and park.
export const timeFor = (dist) => Math.round((dist * 1.6) / BIKE_MS + 25);

// Coins: 4 for making it, +1 for every 10 seconds to spare (up to +4).
export function deliveryPay(secondsLeft) {
  if (secondsLeft < 0) return 0;
  return 4 + Math.min(4, Math.floor(secondsLeft / 10));
}
