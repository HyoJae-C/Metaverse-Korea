// Ttukseom drone light show (한강 드론 라이트쇼): when it happens. Pure, no
// DOM, so it can be unit-tested; the drones themselves are in drone-sky.js,
// which is only downloaded when you walk into Ttukseom park near show time.
//
// The game's day and night follow Seoul's (weather.js), and the show makes
// its own night too: during a show Ttukseom park's sky turns to night
// (park.js) even when the sun is still up, fading in and out.
//
// Everyone's clock gives the same show at the same moment (like the lucky
// fishing spot and the weather), so friends watch the same drones together.

// Show start times on Korean time (KST, UTC+9): twice a day. 18:00 is the
// early evening in Korea; 06:00 is the evening (22:00 CET) in Europe. To
// change the schedule, change this list. Kept 3 hours apart from the Yeouido
// fireworks (09, 21 KST, fireworks-show.js), so the two shows never overlap.
export const DRONE_SHOW_HOURS_KST = [6, 18];
export const SHOW_SECONDS = 20 * 60; // the show itself (t = 0 … 1200)
export const LIFT_SECONDS = 180; // before the start: the sky darkens, the drones rise
export const LAND_SECONDS = 180; // after the end: they land, the sky brightens
export const ALERT_SECONDS = 600; // the game-wide "in 10 minutes" notice

const HOUR = 3600e3, DAY = 24 * HOUR, KST = 9 * HOUR;
const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

// Show start times (ms) around `now`: yesterday, today and tomorrow, in order.
function startsAround(now, hours) {
  const kstMidnight = Math.floor((now + KST) / DAY) * DAY - KST;
  const out = [];
  for (const d of [-1, 0, 1]) for (const h of hours) out.push(kstMidnight + d * DAY + h * HOUR);
  return out.sort((a, b) => a - b);
}

// How dark the park's sky is t seconds into a show: 0 = day, 1 = night.
// Darkens over the 3 minutes before the start, stays dark through the show
// and the landing, brightens over the last 2 minutes.
export function nightAt(t) {
  if (t < -LIFT_SECONDS || t > SHOW_SECONDS + LAND_SECONDS) return 0;
  if (t < -60) return smooth((t + LIFT_SECONDS) / (LIFT_SECONDS - 60));
  if (t > SHOW_SECONDS + 60) return 1 - smooth((t - SHOW_SECONDS - 60) / (LAND_SECONDS - 60));
  return 1;
}

// The show around `now`, from 10 minutes before the start to the end of the
// landing: { start (ms), t (seconds from the start, negative before),
// night (0–1), on (the drones are up: lift-off to landing) }. null otherwise.
export function droneShowAt(now = Date.now(), hours = DRONE_SHOW_HOURS_KST) {
  for (const start of startsAround(now, hours)) {
    const t = (now - start) / 1000;
    if (t >= -ALERT_SECONDS && t < SHOW_SECONDS + LAND_SECONDS) {
      return { start, t, night: nightAt(t), on: t >= -LIFT_SECONDS && t < SHOW_SECONDS + 60 };
    }
  }
  return null;
}

// The next show's start (ms) after the current one (or after now).
export function nextDroneShow(now = Date.now(), hours = DRONE_SHOW_HOURS_KST) {
  return startsAround(now, hours).find((s) => s > now) ?? startsAround(now + DAY, hours)[0];
}

// Which show of all time this is (counts up by one per show): picks the
// changing part of the program, the same on every screen.
export const showNumber = (start, hours = DRONE_SHOW_HOURS_KST) => Math.round(start / (DAY / hours.length));

// Where it happens, in the Ttukseom park room's space (park.js: the river is
// z < -4, the duck boats stay at z > -44, the bridge is at z = -74). The
// drones draw on an upright "sky plane" in front of the bridge, sized so a
// phone held upright still sees the whole picture from the lawn.
export const SKY = { x: 0, y: 16, z: -52, w: 28, h: 20 };
// The launch barge the drones rise from and land on (there in the day too).
export const BARGE = { x: 0, z: -52, w: 15, d: 6, deck: 0.55 };
