// Mangwon Han River Park's sunset steps (core/han-park.js `steps` with
// `sunset: true`, facing Seongsan Bridge): sit down and you're told how long
// until the sun goes down behind the bridge, or that it is going down now.
// The sunset is the same 22.5 minutes of every 3-hour game day for everyone
// (core/show-clock.js); core/sunset-sky.js draws it.
import { cycleMs, CYCLE, CYCLE_MS } from '../core/show-clock.js';

const MIN = 60e3;
const FROM = (CYCLE.morning + CYCLE.day) * MIN, TO = FROM + CYCLE.sunset * MIN; // into the cycle

// Minutes until the next sunset starts (0 while it is on).
export function sunsetIn(now = Date.now()) {
  const m = cycleMs(now);
  if (m >= FROM && m < TO) return 0;
  return Math.max(1, Math.ceil((((FROM - m) % CYCLE_MS) + CYCLE_MS) % CYCLE_MS / MIN));
}

export function sunsetNote(t, now = Date.now()) {
  const n = sunsetIn(now);
  return n ? t('sunset.in', { n }) : t('sunset.now');
}
