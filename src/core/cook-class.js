// Hands-on cooking classes built from steps of a few shared kinds, the rules
// without any DOM so they can be unit-tested. The tteok (core/tteok-game.js)
// and bibimbap (core/bibimbap-game.js) classes are made of these; the panel
// is ui/cook-class-ui.js. (The older kimchi, japchae and kimbap classes have
// their own hand-made steps.)
//
// Step kinds:
//   amounts  spoons of each thing on the shelf, as on the recipe card; decoys
//            sit on the shelf too and cost points
//   pick     choose min-max things freely; each has a hidden liking score
//            (never shown: the teacher only reacts in words)
//   meter    stop a moving bar in the green zone, `times` times
//   choice   one of a few ways to do it; each has its score
//   checks   tick the things you do; each adds (or, a wrong one, takes) points
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const zoneOff = (v, [a, b]) => (v < a ? a - v : v > b ? v - b : 0);

// amounts: { id: spoons }.
export function amountsScore(step, amounts) {
  const real = step.items.filter((g) => !g.decoy);
  let s = real.reduce((sum, g) => sum + Math.max(0, 100 - zoneOff(amounts[g.id] | 0, g.ok) * 60), 0) / real.length;
  for (const g of step.items) if (g.decoy) s -= (amounts[g.id] | 0) * 15;
  return clamp(s);
}
export function amountsNote(step, amounts) {
  if (step.items.some((g) => g.decoy && (amounts[g.id] | 0) > 0)) return 'a.decoy';
  return step.items.every((g) => g.decoy || !zoneOff(amounts[g.id] | 0, g.ok)) ? 'a.good' : 'a.off';
}

// pick: item ids. The average liking, minus a little below `full` picks.
export function pickScore(step, picks) {
  const pref = Object.fromEntries(step.items.map((f) => [f.id, f.pref]));
  const ids = [...new Set(picks)].filter((id) => id in pref);
  if (!ids.length) return 0;
  let s = ids.reduce((sum, id) => sum + pref[id], 0) / ids.length;
  const full = step.full ?? step.min;
  if (ids.length < full) s -= (full - ids.length) * 5;
  return clamp(s);
}
export function pickNote(step, picks) {
  const pref = Object.fromEntries(step.items.map((f) => [f.id, f.pref]));
  const ids = [...new Set(picks)].filter((id) => id in pref);
  const odd = ids.filter((id) => pref[id] <= 15).length;
  const bold = ids.filter((id) => pref[id] > 15 && pref[id] < 50).length;
  if (odd && odd * 2 >= ids.length) return 'p.wild';
  if (odd || bold) return 'p.bold';
  const classic = step.items.filter((f) => f.classic).map((f) => f.id);
  if (ids.every((id) => classic.includes(id))) return 'p.classic';
  return 'p.tasty';
}

// meter: the stopped values, 0-1.
export function meterScore(step, presses) {
  if (!presses.length) return 0;
  return clamp(presses.reduce((s, p) => s + Math.max(0, 100 - zoneOff(p, step.zone) * 200), 0) / step.times);
}
export const meterWord = (step, p) => (p < step.zone[0] - 0.05 ? 'low' : p > step.zone[1] + 0.05 ? 'high' : 'ok');

// choice: the chosen option id.
export const choiceScore = (step, id) => step.options.find((o) => o.id === id)?.score ?? 0;

// checks: the ticked ids.
export function checksScore(step, ticked) {
  const on = new Set(ticked);
  return clamp(step.items.reduce((s, c) => s + (on.has(c.id) ? c.pts : 0), step.base ?? 0));
}

export function stepScore(step, answer) {
  if (step.type === 'amounts') return amountsScore(step, answer || {});
  if (step.type === 'pick') return pickScore(step, answer || []);
  if (step.type === 'meter') return meterScore(step, answer || []);
  if (step.type === 'choice') return choiceScore(step, answer);
  if (step.type === 'checks') return checksScore(step, answer || []);
  return 0;
}

export function totalScore(steps, scores) {
  const v = steps.map((st) => scores[st.id] ?? 0);
  return clamp(v.reduce((a, b) => a + b, 0) / v.length);
}
