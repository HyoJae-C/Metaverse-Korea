// Kimjang (김장): making napa cabbage kimchi at Sonmat Kimchi School, the
// rules without any DOM so they can be unit-tested. Ten steps, in the order
// a Korean family really does it:
//
//   1 pick     choose the best cabbage (heavy, tight, fresh green, white cut)
//   2 halve    slit only the root end with a knife, then pull it apart by hand
//   3 salt     coarse sea salt between the leaves, mostly on the thick stems
//   4 soak     leave it 6-8 hours, turn it over once halfway, bend-test a stem
//   5 rinse    rinse three times in clean water, drain cut side down
//   6 paste    cook sweet rice paste (찹쌀풀), stirring so it doesn't go lumpy
//   7 season   follow the recipe card; some jars on the shelf don't belong
//   8 stuff    spread the filling on every leaf, starting from the stem
//   9 pack     fold, wrap, press into the onggi jar, cover with outer leaves
//  10 ripen    a day at room temperature, then the kimchi fridge
//
// Each step scores 0-100; the final score is their average. Medals and coins
// work as at the samgyeopsal grill (Medals in grill-game.js).
export const KIMCHI_GAME = 'kimchi';
export const STEPS = ['pick', 'halve', 'salt', 'soak', 'rinse', 'paste', 'season', 'stuff', 'pack', 'ripen'];

const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

// 1 · Pick a cabbage. Four things to look at; the best one has all four.
export const TRAITS = ['heavy', 'tight', 'green', 'white'];
// Three cabbages in a random order: one with all 4 good traits, one with 2,
// one with 1. rng() returns 0..1 (Math.random by default).
export function makeCabbages(rng = Math.random) {
  const pickN = (n) => {
    const t = TRAITS.slice();
    for (let i = t.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [t[i], t[j]] = [t[j], t[i]]; }
    return new Set(t.slice(0, n));
  };
  const list = [4, 2, 1].map((n) => {
    const good = pickN(n);
    const traits = Object.fromEntries(TRAITS.map((k) => [k, good.has(k)]));
    const kg = traits.heavy ? 2.6 + Math.round(rng() * 6) / 10 : 1.5 + Math.round(rng() * 5) / 10;
    return { traits, kg: Math.round(kg * 10) / 10 };
  });
  for (let i = list.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [list[i], list[j]] = [list[j], list[i]]; }
  return list;
}
export function pickScore(cabbage) {
  return clamp(TRAITS.filter((k) => cabbage.traits[k]).length * 25);
}

// 2 · Halve. The knife slides from the root end (0) to the leaf tips (1);
// stop it in the first third so only the base is cut, and the leaves stay
// whole when you pull the halves apart by hand.
export const SLIT_ZONE = [0.22, 0.4];
export function halveScore(pos) {
  const [a, b] = SLIT_ZONE;
  const off = pos < a ? a - pos : pos > b ? pos - b : 0;
  return clamp(100 - off * 220);
}
// (A hair outside the zone still counts as clean: the score says how close.)
export function halveResult(pos) {
  if (pos < SLIT_ZONE[0] - 0.04) return 'short'; // hard to pull apart, some leaves tear
  if (pos > SLIT_ZONE[1] + 0.04) return 'through'; // cut through the leaves: bits fall off
  return 'clean';
}

// 3 · Salt. Six leaves from the outside in; each has a thick white stem and a
// soft green leaf. Two pinches on each stem, at most one on the leaf.
export const LEAVES = 6;
export const MAX_PINCH = 4;
const STEM_PTS = [0, 55, 100, 60, 25];
const LEAF_PTS = [100, 100, 45, 15, 0];
// layers: [{ stem: n, leaf: n }]
export function saltScore(layers) {
  if (!layers.length) return 0;
  const sum = layers.reduce((s, l) => s + 0.75 * STEM_PTS[Math.min(MAX_PINCH, l.stem)] + 0.25 * LEAF_PTS[Math.min(MAX_PINCH, l.leaf)], 0);
  return clamp(sum / layers.length);
}
// 'low' (some stems got no salt / not enough), 'high' (too salty), 'good'.
export function saltVerdict(layers) {
  const stems = layers.map((l) => l.stem);
  if (stems.some((n) => n >= 3) || layers.some((l) => l.leaf >= 2)) return 'high';
  if (stems.some((n) => n < 2)) return 'low';
  return 'good';
}

// 4 · Soak. One second of play = one hour. Turn the cabbage over once,
// between 2.5 and 5 hours, and take it out between 6 and 8 hours. After
// 12 hours it is far too salty and the step ends by itself.
export const SOAK_ZONE = [6, 8];
export const TURN_ZONE = [2.5, 5];
export const SOAK_MAX = 12;
export function soakScore({ hours, turnedAt = null }) {
  const [a, b] = SOAK_ZONE;
  const off = hours < a ? a - hours : hours > b ? hours - b : 0;
  let s = 100 - off * 22;
  if (turnedAt == null) s -= 30;
  else if (turnedAt < TURN_ZONE[0] || turnedAt > TURN_ZONE[1]) s -= 12;
  return clamp(s);
}
// What happens when you bend a white stem: it snaps (raw), it's stiff,
// it bends softly without breaking (ready!), or it's limp (over-salted).
export function bendTest(hours) {
  if (hours < 3.5) return 'snaps';
  if (hours < SOAK_ZONE[0]) return 'stiff';
  if (hours <= SOAK_ZONE[1] + 0.5) return 'bends';
  return 'limp';
}

// 5 · Rinse three times, then drain with the cut side down.
const RINSE_PTS = [0, 35, 70, 100, 85, 60];
export function rinseScore({ rinses, cutDown }) {
  return clamp(RINSE_PTS[Math.min(5, rinses)] - (cutDown ? 0 : 30));
}
export function rinseVerdict(rinses) {
  if (rinses < 3) return 'salty';
  if (rinses > 4) return 'bland';
  return 'good';
}

// 6 · Sweet rice paste. Thickness rises while it cooks; take it off the heat
// when it's like thin porridge (0.7-0.9). Every 1.4 s without a stir a lump
// forms (at most 5). Past 1.15 it catches on the bottom of the pot.
export const PASTE_RATE = 0.12; // thickness per second
export const PASTE_ZONE = [0.7, 0.9];
export const PASTE_BURN = 1.15;
export const LUMP_EVERY = 1.4;
export const MAX_LUMPS = 5;
export function pasteScore({ thick, lumps }) {
  const [a, b] = PASTE_ZONE;
  const off = thick < a ? a - thick : thick > b ? thick - b : 0;
  let s = 100 - off * 250 - Math.min(MAX_LUMPS, lumps) * 10;
  if (thick >= PASTE_BURN) s = Math.min(s, 20);
  return clamp(s);
}
export function pasteState(thick) {
  if (thick < 0.35) return 'watery';
  if (thick < PASTE_ZONE[0]) return 'thickening';
  if (thick <= PASTE_ZONE[1]) return 'ready';
  if (thick < PASTE_BURN) return 'thick';
  return 'burnt';
}

// 7 · Seasoning (양념) for one cabbage, in scoops. `ok` is the range that
// counts as right ("to taste"); decoys (target 0) don't belong in kimchi.
// Real kimchi gets its sourness from fermenting, never from vinegar.
export const INGREDIENTS = [
  { id: 'gochugaru', emoji: '🌶️', ko: '고춧가루', rom: 'gochutgaru', ok: [3, 5], target: 4 },
  { id: 'garlic', emoji: '🧄', ko: '다진 마늘', rom: 'dajin maneul', ok: [2, 2], target: 2 },
  { id: 'ginger', emoji: '🫚', ko: '생강', rom: 'saenggang', ok: [1, 1], target: 1 },
  { id: 'fishsauce', emoji: '🐟', ko: '멸치액젓', rom: 'myeolchi aekjeot', ok: [2, 2], target: 2 },
  { id: 'shrimp', emoji: '🦐', ko: '새우젓', rom: 'saeujeot', ok: [1, 1], target: 1 },
  { id: 'paste', emoji: '🥣', ko: '찹쌀풀', rom: 'chapssal-pul', ok: [2, 2], target: 2 },
  { id: 'sugar', emoji: '🍯', ko: '매실청', rom: 'maesil-cheong', ok: [1, 1], target: 1 },
  { id: 'radish', emoji: '🥕', ko: '무채', rom: 'muchae', ok: [3, 3], target: 3 },
  { id: 'onion', emoji: '🌿', ko: '쪽파', rom: 'jjokpa', ok: [2, 2], target: 2 },
  { id: 'pear', emoji: '🍐', ko: '배', rom: 'bae', ok: [0, 1], target: 1 },
  { id: 'ketchup', emoji: '🍅', ko: '케첩', rom: 'kecheop', decoy: true },
  { id: 'vinegar', emoji: '🧴', ko: '식초', rom: 'sikcho', decoy: true },
  { id: 'cheese', emoji: '🧀', ko: '치즈', rom: 'chijeu', decoy: true },
  { id: 'choco', emoji: '🍫', ko: '초콜릿', rom: 'chokollit', decoy: true },
];
export const MAX_SCOOPS = 6;
export const REAL = INGREDIENTS.filter((g) => !g.decoy);
export const DECOYS = INGREDIENTS.filter((g) => g.decoy);
// amounts: { id: scoops }; gloves: put on the rubber gloves before mixing.
export function seasonScore(amounts, { gloves = true } = {}) {
  let sum = 0;
  for (const g of REAL) {
    const n = amounts[g.id] | 0;
    const off = n < g.ok[0] ? g.ok[0] - n : n > g.ok[1] ? n - g.ok[1] : 0;
    sum += Math.max(0, 100 - off * 50);
  }
  let s = sum / REAL.length;
  for (const g of DECOYS) s -= (amounts[g.id] | 0) * 15;
  if (!gloves) s -= 8;
  return clamp(s);
}
// How it tastes, for the teacher's comment: salty / bland, spicy / mild,
// and whether something strange went in.
export function tasteNotes(amounts) {
  const n = (id) => amounts[id] | 0;
  const notes = [];
  if (DECOYS.some((g) => n(g.id) > 0)) notes.push('strange');
  const salt = n('fishsauce') + n('shrimp');
  if (salt > 4) notes.push('salty');
  else if (salt < 2) notes.push('bland');
  if (n('gochugaru') > 5) notes.push('spicy');
  else if (n('gochugaru') < 3) notes.push('mild');
  if (!notes.length) notes.push('balanced');
  return notes;
}

// 8 · Stuff (속 넣기). For each leaf: spread on the stem (2 strokes) and the
// leaf (1 stroke), stem first so the thick part gets the most.
// leaves: [{ stem: n, leaf: n, stemFirst: bool }]
const STUFF_STEM = [0, 70, 100, 75, 50];
const STUFF_LEAF = [0, 100, 70, 45, 30];
export function stuffScore(leaves) {
  if (!leaves.length) return 0;
  const sum = leaves.reduce((s, l) => s + 0.6 * STUFF_STEM[Math.min(MAX_PINCH, l.stem)] + 0.25 * STUFF_LEAF[Math.min(MAX_PINCH, l.leaf)] + (l.stemFirst && l.stem > 0 ? 15 : 0), 0);
  return clamp(sum / leaves.length);
}

// 9 · Pack. Fold each half and wrap it in its outer leaf, press it into the
// jar to squeeze out the air bubbles, and cover the top with outer leaves
// (우거지) before the lid goes on. The jar is only filled to about 80%.
export const BUBBLES = 6;
export function packScore({ wrapped = 0, halves = 2, bubblesLeft = BUBBLES, covered = false }) {
  const wrap = Math.min(halves, wrapped) / halves * 40;
  const air = (1 - Math.min(BUBBLES, bubblesLeft) / BUBBLES) * 40;
  return clamp(wrap + air + (covered ? 20 : 0));
}

// 10 · Ripen. How you let it ferment.
export const RIPEN = [
  { id: 'room', score: 100 }, // a day or two at room temperature, then the fridge
  { id: 'fridge', score: 80 }, // straight into the fridge: fine, just slow
  { id: 'sun', score: 20 }, // a week somewhere warm: sour and fizzy
];
export const ripenScore = (id) => RIPEN.find((r) => r.id === id)?.score ?? 0;

// The final score: the average of the ten steps.
export function totalScore(scores) {
  const v = STEPS.map((k) => scores[k] ?? 0);
  return clamp(v.reduce((a, b) => a + b, 0) / v.length);
}

// Korean words met along the way, for the word card at the end.
export const WORDS = [
  { ko: '김장', rom: 'gimjang', key: 'gimjang' },
  { ko: '배추', rom: 'baechu', key: 'baechu' },
  { ko: '천일염', rom: 'cheonillyeom', key: 'salt' },
  { ko: '절이다', rom: 'jeorida', key: 'jeorida' },
  { ko: '양념', rom: 'yangnyeom', key: 'yangnyeom' },
  { ko: '속', rom: 'sok', key: 'sok' },
  { ko: '옹기', rom: 'onggi', key: 'onggi' },
  { ko: '익다', rom: 'ikda', key: 'ikda' },
];
