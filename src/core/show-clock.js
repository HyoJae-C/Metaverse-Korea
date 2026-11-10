// Shared clock helpers for the timed shows (drone-show.js, fireworks-show.js,
// rainbow-fountain.js). Pure, no DOM.

const HOUR = 3600e3, DAY = 24 * HOUR, KST = 9 * HOUR;

// 0 → 1 with soft ends (smoothstep), clamped.
export const smooth = (x) => { const k = Math.min(1, Math.max(0, x)); return k * k * (3 - 2 * k); };

// Show start times (ms) around `now` for shows at these whole hours on
// Korean time: yesterday, today and tomorrow, in order.
export function dailyStarts(now, hours) {
  const kstMidnight = Math.floor((now + KST) / DAY) * DAY - KST;
  const out = [];
  for (const d of [-1, 0, 1]) for (const h of hours) out.push(kstMidnight + d * DAY + h * HOUR);
  return out.sort((a, b) => a - b);
}
