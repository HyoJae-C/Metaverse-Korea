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

// ---- Operator-set start times (admin.html → Shows) ----
// Times are minutes after midnight KST (0 … 1439).

// "18:30" for 1110.
export const clockText = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Checks one show's list of start times: 1 to `max` of them, at least `gap`
// minutes apart (round the clock too). → { minutes } sorted, or { error }:
// 'empty', 'many', 'bad', 'close'.
export function checkTimes(list, { max = 4, gap = 60 } = {}) {
  if (!Array.isArray(list) || !list.length) return { error: 'empty' };
  if (list.length > max) return { error: 'many' };
  if (list.some((m) => !Number.isInteger(m) || m < 0 || m >= 1440)) return { error: 'bad' };
  const minutes = [...list].sort((a, b) => a - b);
  if (minutes.length > 1) {
    for (let i = 0; i < minutes.length; i++) {
      const next = i + 1 < minutes.length ? minutes[i + 1] : minutes[0] + 1440;
      if (next - minutes[i] < gap) return { error: 'close' };
    }
  }
  return { minutes };
}

// Whether two shows ever overlap: a starts at minutes `a` and lasts from
// spanA[0] to spanA[1] minutes around each start, b the same (round the clock).
export function timesOverlap(a, spanA, b, spanB) {
  for (const x of a) for (const y of b) for (const d of [-1440, 0, 1440]) {
    if (x + spanA[0] < y + d + spanB[1] && y + d + spanB[0] < x + spanA[1]) return true;
  }
  return false;
}
