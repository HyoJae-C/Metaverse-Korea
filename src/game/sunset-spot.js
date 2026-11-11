// Mangwon Han River Park's sunset steps (core/han-park.js `steps` with
// `sunset: true`, facing Seongsan Bridge): sit down and you're told how long
// until the sun goes down behind the bridge, or that it is going down now.
// The sunset is the same 22.5 minutes of every 3-hour game day for everyone
// (core/show-clock.js, core/show-notice.js nextSunset); core/sunset-sky.js
// draws it.
import { nextSunset } from '../core/show-notice.js';

// Minutes until the next sunset starts (0 while it is on).
export function sunsetIn(now = Date.now()) {
  const s = nextSunset(now);
  return s.on ? 0 : Math.max(1, Math.ceil((s.start - now) / 60e3));
}

export function sunsetNote(t, now = Date.now()) {
  const n = sunsetIn(now);
  return n ? t('sunset.in', { n }) : t('sunset.now');
}
