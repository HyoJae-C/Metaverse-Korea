// Shared clock helpers for the timed shows (drone-show.js, fireworks-show.js,
// rainbow-fountain.js) and the game's day (weather.js). Pure, no DOM.
//
// The game's day is two hours long, the same for everyone (worked out from
// the clock, like the weather): 15 minutes of morning, 50 of day, 15 of
// sunset and 40 of night. One night in five has a show (every 10 hours),
// taking turns: the Yeouido fireworks, then the Ttukseom drone show. Each
// show comes every 20 hours, so its time moves on by 4 hours a day and
// wherever you live it comes round at a good hour sooner or later. (Yozi)

// 0 → 1 with soft ends (smoothstep), clamped.
export const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

const MIN = 60e3;
export const CYCLE = { morning: 15, day: 50, sunset: 15, night: 40 }; // minutes, in this order
export const CYCLE_MS = (CYCLE.morning + CYCLE.day + CYCLE.sunset + CYCLE.night) * MIN;
export const NIGHT_FROM = (CYCLE.morning + CYCLE.day + CYCLE.sunset) * MIN; // into the cycle
export const SHOW_FROM = NIGHT_FROM + 10 * MIN; // a show starts 10 minutes into the night (its notice comes at nightfall)
export const FIREWORKS = 0, DRONES = 1, NO_SHOW = -1;

export const cycleNumber = (t) => Math.floor(t / CYCLE_MS);
export const cycleMs = (t) => ((t % CYCLE_MS) + CYCLE_MS) % CYCLE_MS; // how far into its cycle
export const SHOW_EVERY = 5; // cycles (nights) from one show to the next
const mod = (a, b) => ((a % b) + b) % b;
// Which show cycle n has: FIREWORKS, DRONES or NO_SHOW.
export const showOf = (n) => (mod(n, SHOW_EVERY) ? NO_SHOW : mod(n / SHOW_EVERY, 2));

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

// Start times (ms) of one show (FIREWORKS or DRONES) around `now`: from
// two shows back to two ahead, in order.
export function showStarts(now, which) {
  const n = cycleNumber(now), out = [];
  for (let k = n - 4 * SHOW_EVERY; k <= n + 4 * SHOW_EVERY; k++) if (showOf(k) === which) out.push(k * CYCLE_MS + SHOW_FROM);
  return out;
}
