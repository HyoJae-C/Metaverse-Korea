// Shared clock helpers for the timed shows (drone-show.js, fireworks-show.js,
// rainbow-fountain.js) and the game's day (weather.js). Pure, no DOM.
//
// The game's day is three hours long, the same for everyone (worked out
// from the clock, like the weather): 22.5 minutes of morning, 75 of day,
// 22.5 of sunset and 60 of night. Most nights are quiet now (the night
// market, the sunset): a show is rare, so it feels special (Yozi
// 2026-11-13: a show every night, eight a day, and people lost interest).
// Two nights a day have one, at Japan's, China's and Taiwan's evening:
// 20:10 KST the lantern parade to Jogyesa's every day, and 23:10 KST the
// Yeouido fireworks and the Ttukseom drone show taking turns day by day
// (PLAN). (2026-11-11: three hours, a longer night for the shows and
// Myeongdong's night carts; was two hours with a show every other night.)

// 0 → 1 with soft ends (smoothstep), clamped.
export const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

const MIN = 60e3;
export const CYCLE = { morning: 22.5, day: 75, sunset: 22.5, night: 60 }; // minutes, in this order
export const CYCLE_MS = (CYCLE.morning + CYCLE.day + CYCLE.sunset + CYCLE.night) * MIN;
export const NIGHT_FROM = (CYCLE.morning + CYCLE.day + CYCLE.sunset) * MIN; // into the cycle
export const SHOW_FROM = NIGHT_FROM + 10 * MIN; // a show starts 10 minutes into the night (its notice comes at nightfall)
export const FIREWORKS = 0, DRONES = 1, LANTERNS = 2; // which show a cycle has (showOf)

export const cycleNumber = (t) => Math.floor(t / CYCLE_MS);
export const cycleMs = (t) => ((t % CYCLE_MS) + CYCLE_MS) % CYCLE_MS; // how far into its cycle
export const DAY_CYCLES = (24 * 60 * MIN) / CYCLE_MS; // 8 (cycles start at 0:00 UTC, 9:00 KST)
export const NONE = -1; // a quiet night
// Which night of a day has which show, for PLAN_DAYS days in turn (by the
// UTC day, which is the KST day for these nights). Night k of a day starts
// its show at 11:10 + 3k hours KST: 3 → 20:10, 4 → 23:10.
const PLAN = [
  { 3: LANTERNS, 4: FIREWORKS }, // 2026-11-13 (KST) and every other day
  { 3: LANTERNS, 4: DRONES },
];
export const PLAN_DAYS = PLAN.length;
export const PERIOD = PLAN_DAYS * DAY_CYCLES; // cycles before the plan repeats
const mod = (a, b) => ((a % b) + b) % b;
export const showOf = (n) => PLAN[mod(Math.floor(n / DAY_CYCLES), PLAN_DAYS)][mod(n, DAY_CYCLES)] ?? NONE;
// The drone shows counted one by one, for their changing parts.
const DRONE_SLOTS = [...Array(PERIOD).keys()].filter((r) => showOf(r) === DRONES);
export const droneNumber = (n) => Math.floor(n / PERIOD) * DRONE_SLOTS.length + DRONE_SLOTS.indexOf(mod(n, PERIOD));

// The game's clock as an hour of a 24-hour day (sunrise 6:00, sunset
// 18:00, the sky's colours in weather.js): morning runs 5:18–8:00, day
// 8:00–16:30, sunset 16:30–18:42, night 18:42–5:18.
export const SKY_SUN = { rise: 6, set: 18 };
const SKY_HOURS = [5.3, 8, 16.5, 18.7, 29.3];
export function gameHour(now) {
  let m = cycleMs(now) / MIN, i = 0;
  const lens = [CYCLE.morning, CYCLE.day, CYCLE.sunset, CYCLE.night];
  while (i < 3 && m >= lens[i]) m -= lens[i++];
  return (SKY_HOURS[i] + ((SKY_HOURS[i + 1] - SKY_HOURS[i]) * m) / lens[i]) % 24;
}

// Start times (ms) of one show (FIREWORKS, DRONES or LANTERNS) around
// `now`: a whole plan back to a whole plan ahead, in order.
export function showStarts(now, which) {
  const n = cycleNumber(now), out = [];
  for (let k = n - PERIOD; k <= n + PERIOD; k++) if (showOf(k) === which) out.push(k * CYCLE_MS + SHOW_FROM);
  return out;
}
