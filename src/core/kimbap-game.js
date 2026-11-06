// Free-style kimbap (김밥) at Suragan Cooking Class, the rules without any
// DOM so they can be unit-tested. Kimbap has no fixed recipe: the class
// shows a classic one but players fill theirs with anything on the shelf.
// Seven steps:
//
//   1 rice    season warm rice with a pinch of salt and sesame oil
//   2 fill    pick 3-8 fillings (free choice)
//   3 gim     lay the seaweed sheet shiny side down, rough side up
//   4 spread  a thin layer of rice over the lower part, the top edge bare
//   5 roll    roll it up firmly in three turns with the bamboo mat
//   6 finish  brush sesame oil on top, rest it seam side down
//   7 slice   wet the knife, cut it into bite-size pieces
//
// The fillings have a hidden preference score (never shown to players):
// classic fillings score high, polarizing ones (mala, cilantro...) low, and
// ones that clash (ketchup, chocolate, snacks...) very low. The fill step
// scores the average, so a roll full of odd fillings scores low.
export const KIMBAP_GAME = 'kimbap';
export const STEPS = ['rice', 'fill', 'gim', 'spread', 'roll', 'finish', 'slice'];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const zoneOff = (v, [a, b]) => (v < a ? a - v : v > b ? v - b : 0);

// 1 · Rice seasoning, in pinches / spoons.
export const RICE = [
  { id: 'salt', emoji: '🧂', ko: '소금', rom: 'sogeum', ok: [1, 1], target: 1 },
  { id: 'sesameoil', emoji: '🫒', ko: '참기름', rom: 'chamgireum', ok: [1, 2], target: 1 },
  { id: 'sesame', emoji: '✨', ko: '깨', rom: 'kkae', ok: [0, 1], target: 1 },
  { id: 'sugar', emoji: '🍚', ko: '설탕', rom: 'seoltang', decoy: true },
  { id: 'vinegar', emoji: '🧴', ko: '식초', rom: 'sikcho', decoy: true }, // that's sushi rice
];
export const MAX_SPOONS = 4;
export function riceScore(amounts) {
  const real = RICE.filter((g) => !g.decoy);
  let s = real.reduce((sum, g) => sum + Math.max(0, 100 - zoneOff(amounts[g.id] | 0, g.ok) * 60), 0) / real.length;
  for (const g of RICE) if (g.decoy) s -= (amounts[g.id] | 0) * 15;
  return clamp(s);
}
export const riceNote = (amounts) => ((amounts.vinegar | 0) > 0 ? 'sushi' : (amounts.salt | 0) === 0 ? 'bland' : (amounts.salt | 0) > 1 ? 'salty' : 'good');

// 2 · Fillings. pref is hidden: 90-100 classic, 70-85 popular modern,
// 25-40 polarizing, 0-15 clashing. `classic` marks the recommended roll.
export const FILLINGS = [
  { id: 'danmuji', emoji: '🟨', ko: '단무지', rom: 'danmuji', pref: 100, classic: true },
  { id: 'egg', emoji: '🥚', ko: '달걀', rom: 'dalgyal', pref: 100, classic: true },
  { id: 'spinach', emoji: '🥬', ko: '시금치', rom: 'sigeumchi', pref: 95, classic: true },
  { id: 'carrot', emoji: '🥕', ko: '당근', rom: 'danggeun', pref: 95, classic: true },
  { id: 'fishcake', emoji: '🍥', ko: '어묵', rom: 'eomuk', pref: 95, classic: true },
  { id: 'ham', emoji: '🥓', ko: '햄', rom: 'haem', pref: 90, classic: true },
  { id: 'burdock', emoji: '🪵', ko: '우엉', rom: 'ueong', pref: 90, classic: true },
  { id: 'cucumber', emoji: '🥒', ko: '오이', rom: 'oi', pref: 95 },
  { id: 'crab', emoji: '🦀', ko: '맛살', rom: 'matsal', pref: 90 },
  { id: 'tuna', emoji: '🐟', ko: '참치마요', rom: 'chamchi-mayo', pref: 90 },
  { id: 'bulgogi', emoji: '🥩', ko: '불고기', rom: 'bulgogi', pref: 90 },
  { id: 'perilla', emoji: '🌿', ko: '깻잎', rom: 'kkaennip', pref: 85 },
  { id: 'cheese', emoji: '🧀', ko: '치즈', rom: 'chijeu', pref: 80 },
  { id: 'kimchi', emoji: '🌶️', ko: '김치', rom: 'gimchi', pref: 80 },
  { id: 'tempura', emoji: '🍤', ko: '새우튀김', rom: 'saeu-twigim', pref: 75 },
  { id: 'avocado', emoji: '🥑', ko: '아보카도', rom: 'abokado', pref: 65 },
  { id: 'mala', emoji: '🔥', ko: '마라 소스', rom: 'mara soseu', pref: 30 },
  { id: 'cilantro', emoji: '🌱', ko: '고수', rom: 'gosu', pref: 30 },
  { id: 'durian', emoji: '🍈', ko: '두리안', rom: 'durian', pref: 15 },
  { id: 'ketchup', emoji: '🍅', ko: '케첩', rom: 'kecheop', pref: 10 },
  { id: 'chips', emoji: '🥔', ko: '감자칩', rom: 'gamjachip', pref: 5 },
  { id: 'choco', emoji: '🍫', ko: '초콜릿', rom: 'chokollit', pref: 0 },
  { id: 'gummy', emoji: '🐻', ko: '젤리', rom: 'jelli', pref: 0 },
];
export const MIN_FILL = 3;
export const MAX_FILL = 8;
export const CLASSIC = FILLINGS.filter((f) => f.classic).map((f) => f.id);
const PREF = Object.fromEntries(FILLINGS.map((f) => [f.id, f.pref]));
// picks: filling ids. Average preference, minus a little for a thin roll.
export function fillScore(picks) {
  const ids = [...new Set(picks)].filter((id) => id in PREF);
  if (!ids.length) return 0;
  let s = ids.reduce((sum, id) => sum + PREF[id], 0) / ids.length;
  if (ids.length < 5) s -= (5 - ids.length) * 5;
  return clamp(s);
}
// What the teacher says, without giving the numbers away.
export function fillNote(picks) {
  const ids = [...new Set(picks)].filter((id) => id in PREF);
  const odd = ids.filter((id) => PREF[id] <= 15).length;
  const bold = ids.filter((id) => PREF[id] > 15 && PREF[id] < 50).length;
  if (odd >= 2 || odd * 2 >= ids.length) return 'wild';
  if (odd || bold) return 'bold';
  if (ids.every((id) => CLASSIC.includes(id)) && ids.length >= 5) return 'classic';
  return 'tasty';
}
// A name for the roll from its two best-liked fillings ("Danmuji & egg").
export function rollName(picks) {
  return [...new Set(picks)].filter((id) => id in PREF).sort((a, b) => PREF[b] - PREF[a]).slice(0, 2);
}

// 3 · Gim: shiny side down, so the rice sits on the rough side.
export const gimScore = (shinyDown) => (shinyDown ? 100 : 50);

// 4 · Spread rice on a grid of the sheet: 4 rows (0 = bottom) x 4 columns.
// The bottom three rows should be covered, the top row left bare to seal.
export const ROWS = 4, COLS = 4;
export function spreadScore(cells) {
  // cells: Set or array of 'r,c' keys
  const set = new Set(cells);
  let good = 0;
  for (let r = 0; r < ROWS - 1; r++) for (let c = 0; c < COLS; c++) if (set.has(`${r},${c}`)) good++;
  let top = 0;
  for (let c = 0; c < COLS; c++) if (set.has(`${ROWS - 1},${c}`)) top++;
  return clamp((good / ((ROWS - 1) * COLS)) * 100 - top * 15);
}

// 5 · Roll in three turns; each turn stops a pressure meter in 0.55-0.8:
// too loose falls apart, too tight bursts the seaweed.
export const ROLL_ZONE = [0.55, 0.8];
export const ROLL_TURNS = 3;
export function rollScore(presses) {
  if (!presses.length) return 0;
  return clamp(presses.reduce((s, p) => s + Math.max(0, 100 - zoneOff(p, ROLL_ZONE) * 200), 0) / ROLL_TURNS);
}
export const rollWord = (p) => (p < ROLL_ZONE[0] - 0.05 ? 'loose' : p > ROLL_ZONE[1] + 0.05 ? 'tight' : 'firm');

// 6 · Finish: sesame oil on the outside, rest it seam side down.
export const finishScore = ({ oil, seamDown }) => clamp((oil ? 50 : 20) + (seamDown ? 50 : 10));

// 7 · Slice: a wet knife cuts cleanly; 8-10 slices are bite size.
export function sliceScore({ wet, slices }) {
  let s = 100;
  if (!wet) s -= 30;
  if (slices < 8) s -= (8 - slices) * 10;
  else if (slices > 10) s -= (slices - 10) * 10;
  return clamp(s);
}

export function totalScore(scores) {
  const v = STEPS.map((k) => scores[k] ?? 0);
  return clamp(v.reduce((a, b) => a + b, 0) / v.length);
}

export const WORDS = [
  { ko: '김밥', rom: 'gimbap', key: 'gimbap' },
  { ko: '김', rom: 'gim', key: 'gim' },
  { ko: '밥', rom: 'bap', key: 'bap' },
  { ko: '단무지', rom: 'danmuji', key: 'danmuji' },
  { ko: '김발', rom: 'gimbal', key: 'gimbal' },
  { ko: '말다', rom: 'malda', key: 'malda' },
  { ko: '썰다', rom: 'sseolda', key: 'sseolda' },
  { ko: '소풍', rom: 'sopung', key: 'sopung' },
];
