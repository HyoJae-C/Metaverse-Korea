// Fishing at the Han River and selling the catch at the fish market (no DOM,
// so it can be unit-tested). Ten kinds of catch, each with a chance per bite
// (they add up to 100%) and a price: the rarer, the pricier. Rarer fish also
// fight harder: more reel taps in the same time, and get away more often.
//
// Yes, whales and sharks don't live in the Han River. It's a game. 🐋

export const FISH = [
  { id: 'crucian', emoji: '🐟', ko: '붕어', rom: 'bungeo', name: { en: 'Crucian carp', ja: 'フナ', zh: '鲫鱼' }, chance: 30, price: 1 },
  { id: 'catfish', emoji: '🐟', ko: '메기', rom: 'megi', name: { en: 'Catfish', ja: 'ナマズ', zh: '鲶鱼' }, chance: 20, price: 1 },
  { id: 'mackerel', emoji: '🐟', ko: '고등어', rom: 'godeungeo', name: { en: 'Mackerel', ja: 'サバ', zh: '鲭鱼' }, chance: 14, price: 2 },
  { id: 'crayfish', emoji: '🦞', ko: '가재', rom: 'gajae', name: { en: 'Crayfish', ja: 'ザリガニ', zh: '小龙虾' }, chance: 12, price: 3 },
  { id: 'crab', emoji: '🦀', ko: '게', rom: 'ge', name: { en: 'Crab', ja: 'カニ', zh: '螃蟹' }, chance: 9, price: 4 },
  { id: 'squid', emoji: '🦑', ko: '오징어', rom: 'ojingeo', name: { en: 'Squid', ja: 'イカ', zh: '鱿鱼' }, chance: 7, price: 5 },
  { id: 'salmon', emoji: '🐟', ko: '연어', rom: 'yeoneo', name: { en: 'Salmon', ja: 'サケ', zh: '三文鱼' }, chance: 5, price: 8 },
  { id: 'tuna', emoji: '🐟', ko: '참치', rom: 'chamchi', name: { en: 'Tuna', ja: 'マグロ', zh: '金枪鱼' }, chance: 2, price: 20 },
  { id: 'shark', emoji: '🦈', ko: '상어', rom: 'sangeo', name: { en: 'Shark', ja: 'サメ', zh: '鲨鱼' }, chance: 0.9, price: 60 },
  { id: 'whale', emoji: '🐋', ko: '고래', rom: 'gorae', name: { en: 'Whale', ja: 'クジラ', zh: '鲸鱼' }, chance: 0.1, price: 300 },
];
export const fishById = (id) => FISH.find((f) => f.id === id) || null;

// Pick what bit, by chance. rand() in [0, 1).
export function rollFish(rand = Math.random) {
  let r = rand() * 100;
  for (const f of FISH) {
    r -= f.chance;
    if (r < 0) return f;
  }
  return FISH[0];
}

// Reel taps needed: common fish 5, a whale 24. Time to do it: REEL_SECONDS.
export const REEL_SECONDS = 5;
export function tapsFor(fish) {
  const rank = FISH.indexOf(fish); // 0 = most common
  return 5 + Math.round(rank * rank * 0.24);
}

// A hooked fish can still get away just as you land it: 10% for the most
// common, up to 37% for a whale. Reeling it in fast (time to spare) halves
// that at best. spare: the share of REEL_SECONDS left, 0..1.
export function escapeChance(fish, spare = 0) {
  const rank = Math.max(0, FISH.indexOf(fish));
  return (0.1 + rank * 0.03) * (1 - 0.5 * Math.min(1, Math.max(0, spare)));
}

// Seconds to wait for a bite, and how long the bite lasts.
export const biteWait = (rand = Math.random) => 2.5 + rand() * 4.5;
export const BITE_WINDOW = 1.2;

// The fish bag: { id: count }, saved on this device (and in the cloud save).
const BAG_KEY = 'mk.fish';
export const BAG_MAX = 30;
export class FishBag {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(BAG_KEY) || '{}') || {}; } catch { /* ignore */ }
    this.c = {};
    for (const f of FISH) if (Number.isInteger(raw[f.id]) && raw[f.id] > 0) this.c[f.id] = Math.min(BAG_MAX, raw[f.id]);
  }
  get size() { return Object.values(this.c).reduce((a, b) => a + b, 0); }
  get full() { return this.size >= BAG_MAX; }
  count(id) { return this.c[id] || 0; }
  list() { return FISH.filter((f) => this.c[f.id]).map((f) => ({ fish: f, n: this.c[f.id] })); }
  get value() { return this.list().reduce((a, { fish, n }) => a + fish.price * n, 0); }
  add(id) {
    if (this.full || !fishById(id)) return false;
    this.c[id] = (this.c[id] || 0) + 1;
    this._save();
    return true;
  }
  // Sell n of a kind (all of it when n is omitted); returns the coins.
  sell(id, n = Infinity) {
    const k = Math.min(n, this.c[id] || 0);
    if (!k) return 0;
    this.c[id] -= k;
    if (!this.c[id]) delete this.c[id];
    this._save();
    return k * fishById(id).price;
  }
  sellAll() { return FISH.reduce((a, f) => a + this.sell(f.id), 0); }
  _save() { try { this.storage?.setItem(BAG_KEY, JSON.stringify(this.c)); } catch { /* storage blocked */ } }
}
