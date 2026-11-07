// Japchae (잡채) at Suragan Cooking Class, the rules without any DOM so they
// can be unit-tested. Eight steps, the way it is made at home for holidays
// and birthdays:
//
//   1 slice    cut the vegetables into thin matchsticks (julienne)
//   2 beef     marinate thin beef strips: soy sauce, sugar, garlic, sesame oil
//   3 spinach  blanch for a few seconds, cool in cold water, squeeze, season
//   4 egg      egg garnish (지단): yolk and white fried apart on low heat
//   5 fry      stir-fry each vegetable on its own, light colours first, beef last
//   6 noodles  boil the sweet potato glass noodles about 6-7 minutes, cut them
//   7 mix      everything into the big bowl with soy sauce, sugar, sesame oil
//   8 plate    a mound on the plate, egg strips and sesame seeds on top
//
// Each step scores 0-100; the final score is their average. Medals as at the
// samgyeopsal grill (Medals in grill-game.js).
export const JAPCHAE_GAME = 'japchae';
export const STEPS = ['slice', 'beef', 'spinach', 'egg', 'fry', 'noodles', 'mix', 'plate'];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));
const zoneOff = (v, [a, b]) => (v < a ? a - v : v > b ? v - b : 0);

// 1 · Slice. A marker swings over a thickness scale (0 = paper thin,
// 1 = a thick chunk); tap when it's in the matchstick zone. One cut per
// vegetable.
export const VEG = [
  { id: 'carrot', emoji: '🥕', ko: '당근', rom: 'danggeun', color: '#f08a2c' },
  { id: 'onion', emoji: '🧅', ko: '양파', rom: 'yangpa', color: '#f3e7c9' },
  { id: 'pepper', emoji: '🫑', ko: '피망', rom: 'pimang', color: '#d8402c' },
  { id: 'mushroom', emoji: '🍄', ko: '표고버섯', rom: 'pyogo-beoseot', color: '#7a5236' },
];
export const SLICE_ZONE = [0.18, 0.36];
export function sliceScore(cuts) {
  if (!cuts.length) return 0;
  return clamp(cuts.reduce((s, c) => s + Math.max(0, 100 - zoneOff(c, SLICE_ZONE) * 160), 0) / cuts.length);
}
export const sliceWord = (c) => (c < SLICE_ZONE[0] - 0.05 ? 'thin' : c > SLICE_ZONE[1] + 0.05 ? 'thick' : 'good');

// 2 · Beef marinade, in spoons. Decoys don't belong in japchae.
export const MARINADE = [
  { id: 'soy', emoji: '🫗', ko: '간장', rom: 'ganjang', ok: [2, 2], target: 2 },
  { id: 'sugar', emoji: '🍚', ko: '설탕', rom: 'seoltang', ok: [1, 1], target: 1 },
  { id: 'garlic', emoji: '🧄', ko: '다진 마늘', rom: 'dajin maneul', ok: [1, 1], target: 1 },
  { id: 'sesameoil', emoji: '🫒', ko: '참기름', rom: 'chamgireum', ok: [1, 1], target: 1 },
  { id: 'blackpepper', emoji: '🧂', ko: '후추', rom: 'huchu', ok: [0, 1], target: 1 },
  { id: 'ketchup', emoji: '🍅', ko: '케첩', rom: 'kecheop', decoy: true },
  { id: 'mayo', emoji: '🥚', ko: '마요네즈', rom: 'mayonejeu', decoy: true },
  { id: 'curry', emoji: '🍛', ko: '카레 가루', rom: 'kare garu', decoy: true },
];
export const MAX_SPOONS = 5;
export function recipeScore(list, amounts) {
  const real = list.filter((g) => !g.decoy);
  let s = real.reduce((sum, g) => sum + Math.max(0, 100 - zoneOff(amounts[g.id] | 0, g.ok) * 60), 0) / real.length;
  for (const g of list) if (g.decoy) s -= (amounts[g.id] | 0) * 15;
  return clamp(s);
}
export const beefScore = (amounts) => recipeScore(MARINADE, amounts);

// 3 · Spinach. In boiling salted water for 20-40 seconds (here 1 s = 10 s),
// straight into cold water so it stays bright green, squeezed, then a pinch
// of salt and a drop of sesame oil.
export const SPINACH_ZONE = [20, 40];
export const SPINACH_MAX = 90;
export function spinachScore({ secs, cooled, squeezed, seasoned }) {
  let s = 100 - zoneOff(secs, SPINACH_ZONE) * 2;
  if (!cooled) s -= 25;
  if (!squeezed) s -= 15;
  if (!seasoned) s -= 10;
  return clamp(s);
}
export const spinachState = (secs) => (secs < SPINACH_ZONE[0] - 5 ? 'raw' : secs <= SPINACH_ZONE[1] + 5 ? 'bright' : 'mushy');

// 4 · Egg garnish. Yolk and white are fried apart as thin sheets. Low heat
// keeps them clean yellow and white; high heat browns them. Each side cooks
// 0 → 1; flip and take it off between 0.55 and 0.8.
export const EGG_ZONE = [0.55, 0.8];
export function eggSideScore(v) {
  return clamp(100 - zoneOff(v, EGG_ZONE) * 180);
}
// sheets: [{ a: first side, b: second side }], heat: 'low' | 'high'
export function eggScore({ sheets, heat, separated = true }) {
  if (!sheets.length) return 0;
  let s = sheets.reduce((sum, sh) => sum + (eggSideScore(sh.a) + eggSideScore(sh.b)) / 2, 0) / sheets.length;
  if (heat === 'high') s -= 20;
  if (!separated) s -= 25;
  return clamp(s);
}

// 5 · Stir-fry each vegetable on its own with a pinch of salt (light colours
// first so the pan stays clean, beef last), until just tender: 0.5-0.75 on
// the meter. order: ids in the order they went in.
export const FRY_ORDER = ['onion', 'carrot', 'pepper', 'mushroom', 'beef'];
export const FRY_ZONE = [0.5, 0.75];
export function fryScore({ times, order }) {
  const ids = Object.keys(times);
  if (!ids.length) return 0;
  let s = ids.reduce((sum, id) => sum + Math.max(0, 100 - zoneOff(times[id], FRY_ZONE) * 160), 0) / FRY_ORDER.length;
  // Each pair in the wrong order (a darker one before a lighter one) costs 4.
  let wrong = 0;
  for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (FRY_ORDER.indexOf(order[i]) > FRY_ORDER.indexOf(order[j])) wrong++;
  return clamp(s - wrong * 4);
}
export const fryState = (v) => (v < FRY_ZONE[0] ? 'raw' : v <= FRY_ZONE[1] ? 'tender' : v < 1 ? 'soft' : 'burnt');

// 6 · Noodles. Dangmyeon boils about 6-7 minutes (1 s = 1 min) until clear
// and chewy; drain, then cut a few times with kitchen scissors so they're
// easy to eat (2-3 snips).
export const NOODLE_ZONE = [6, 7.5];
export const NOODLE_MAX = 12;
export function noodleScore({ mins, snips }) {
  let s = 100 - zoneOff(mins, NOODLE_ZONE) * 25;
  if (snips < 2) s -= snips ? 10 : 20;
  else if (snips > 3) s -= Math.min(30, (snips - 3) * 10);
  return clamp(s);
}
export const noodleState = (m) => (m < NOODLE_ZONE[0] - 0.5 ? 'hard' : m <= NOODLE_ZONE[1] + 0.5 ? 'chewy' : 'mushy');

// 7 · Mix. Everything into the bowl, then the noodle seasoning; mix gently
// by hand (3-6 times).
export const PARTS = ['noodles', 'spinach', 'onion', 'carrot', 'pepper', 'mushroom', 'beef'];
export const SAUCE = [
  { id: 'soy', emoji: '🫗', ko: '간장', rom: 'ganjang', ok: [3, 3], target: 3 },
  { id: 'sugar', emoji: '🍚', ko: '설탕', rom: 'seoltang', ok: [1, 2], target: 2 },
  { id: 'sesameoil', emoji: '🫒', ko: '참기름', rom: 'chamgireum', ok: [2, 2], target: 2 },
  { id: 'vinegar', emoji: '🧴', ko: '식초', rom: 'sikcho', decoy: true },
  { id: 'gochujang', emoji: '🌶️', ko: '고추장', rom: 'gochujang', decoy: true },
];
export function mixScore({ added, amounts, mixes }) {
  let s = (PARTS.filter((p) => added.includes(p)).length / PARTS.length) * 40;
  s += recipeScore(SAUCE, amounts) * 0.45;
  s += mixes >= 3 && mixes <= 6 ? 15 : mixes > 6 ? 8 : mixes * 4;
  return clamp(s);
}
export function mixNotes({ amounts, mixes }) {
  const n = (id) => amounts[id] | 0;
  const notes = [];
  if (SAUCE.some((g) => g.decoy && n(g.id))) notes.push('strange');
  if (n('soy') > 3) notes.push('salty'); else if (n('soy') < 3) notes.push('bland');
  if (n('sugar') > 2) notes.push('sweet');
  if (mixes > 6) notes.push('broken');
  if (!notes.length) notes.push('glossy');
  return notes;
}

// 8 · Plate. A mound of japchae, then yellow and white egg strips and
// sesame seeds on top.
export function plateScore({ mound, yolk, white, seeds }) {
  return clamp((mound ? 40 : 0) + (yolk ? 20 : 0) + (white ? 20 : 0) + (seeds ? 20 : 0));
}

export function totalScore(scores) {
  const v = STEPS.map((k) => scores[k] ?? 0);
  return clamp(v.reduce((a, b) => a + b, 0) / v.length);
}

export const WORDS = [
  { ko: '잡채', rom: 'japchae', key: 'japchae' },
  { ko: '당면', rom: 'dangmyeon', key: 'dangmyeon' },
  { ko: '채썰기', rom: 'chaesseolgi', key: 'chae' },
  { ko: '데치다', rom: 'dechida', key: 'dechida' },
  { ko: '지단', rom: 'jidan', key: 'jidan' },
  { ko: '볶다', rom: 'bokda', key: 'bokda' },
  { ko: '참기름', rom: 'chamgireum', key: 'sesameoil' },
  { ko: '버무리다', rom: 'beomurida', key: 'beomurida' },
];
