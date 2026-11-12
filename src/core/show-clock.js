// Shared clock helpers for the timed shows (drone-show.js, fireworks-show.js,
// rainbow-fountain.js) and the game's day (weather.js). Pure, no DOM.
//
// The game's day is three hours long, the same for everyone (worked out
// from the clock, like the weather): 22.5 minutes of morning, 75 of day,
// 22.5 of sunset and 60 of night. Every night has a show: the Yeouido
// fireworks and the Ttukseom drone show take turns (four fireworks and
// three drone shows a real day), except one night a day, 20:10 KST, which
// is the lantern parade to Jogyesa's (like the real festival, rare: once a
// year in Seoul, once a day here, at Japan's, China's and Taiwan's evening).
// Wherever you live, night comes round within three hours and a show with
// it. (Yozi 2026-11-11: three hours, a longer night for the shows and
// Myeongdong's night carts; was two hours with a show every other night.
// 2026-11-12: the lantern parade, once a day at 20:10 KST.)

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
export const SHOW_EVERY = 2; // cycles from one fireworks show to the next
export const DAY_CYCLES = (24 * 60 * MIN) / CYCLE_MS; // 8 (cycles start at 0:00 UTC)
export const LANTERN_CYCLE = 3; // of the day's 8: its show at 11:10 UTC, 20:10 KST (was a drone show)
const mod = (a, b) => ((a % b) + b) % b;
export const showOf = (n) => (mod(n, DAY_CYCLES) === LANTERN_CYCLE ? LANTERNS : mod(n, SHOW_EVERY));
// The drone shows counted one by one (three a day), for their changing parts.
const DRONE_SLOTS = [...Array(DAY_CYCLES).keys()].filter((r) => showOf(r) === DRONES);
export const droneNumber = (n) => Math.floor(n / DAY_CYCLES) * DRONE_SLOTS.length + DRONE_SLOTS.indexOf(mod(n, DAY_CYCLES));

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
// `now`: from a day back to a day ahead (fewer cycles for the frequent ones), in order.
export function showStarts(now, which) {
  const n = cycleNumber(now), out = [], w = which === LANTERNS ? DAY_CYCLES : SHOW_EVERY + 2;
  for (let k = n - w; k <= n + w; k++) if (showOf(k) === which) out.push(k * CYCLE_MS + SHOW_FROM);
  return out;
}
