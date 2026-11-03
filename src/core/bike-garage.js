// My bikes: everyone starts with a basic bike (a little faster than running);
// the bike shop sells a few faster ones. The steps are small on purpose, so a
// new player never feels far behind. Bikes wear out very slowly as you ride
// (about 1% every 500 m) and the bike shop repairs them for a few coins.
// Kept free of DOM code so it can be unit-tested.

export const BIKE_MODELS = [
  { id: 'basic', speed: 13.5, price: 0, color: '#3fb59a', name: { en: 'Basic bike', ko: '기본 자전거', ja: 'ベーシック自転車', zh: '基础自行车' } },
  { id: 'city', speed: 14.3, price: 80, color: '#5b8def', name: { en: 'City bike', ko: '시티 자전거', ja: 'シティサイクル', zh: '城市自行车' } },
  { id: 'sport', speed: 15.1, price: 180, color: '#f2a33a', name: { en: 'Sport bike', ko: '스포츠 자전거', ja: 'スポーツ自転車', zh: '运动自行车' } },
  { id: 'road', speed: 16, price: 320, color: '#e0475b', name: { en: 'Road bike', ko: '로드 자전거', ja: 'ロードバイク', zh: '公路自行车' } },
];
export const bikeModel = (id) => BIKE_MODELS.find((b) => b.id === id) || BIKE_MODELS[0];

export const WEAR_PER_M = 1 / 500; // durability points (0–100) lost per metre
export const LOW = 20; // below this the bike asks for a repair
const KEY = 'mk.bikes';

// Speed with wear: a worn-out bike is at most 10% slower.
export const wornSpeed = (speed, dur) => speed * (0.9 + 0.1 * Math.max(0, Math.min(100, dur)) / 100);
// Repair cost: 1 coin per 10 points missing (at most 10 coins).
export const repairCost = (dur) => Math.ceil((100 - Math.max(0, Math.min(100, dur))) / 10);

function clean(raw) {
  const own = Array.isArray(raw?.own) ? raw.own.filter((id) => BIKE_MODELS.some((b) => b.id === id)) : [];
  if (!own.includes('basic')) own.unshift('basic');
  const dur = {};
  for (const id of own) {
    const d = Number(raw?.dur?.[id]);
    dur[id] = Number.isFinite(d) ? Math.max(0, Math.min(100, d)) : 100;
  }
  const use = own.includes(raw?.use) ? raw.use : 'basic';
  return { own, use, dur };
}

export class Garage {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = null;
    try { raw = JSON.parse(storage?.getItem(KEY) || 'null'); } catch { /* broken save */ }
    this.s = clean(raw);
    this.warned = false;
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }
  get current() { return bikeModel(this.s.use); }
  has(id) { return this.s.own.includes(id); }
  durability(id = this.s.use) { return this.s.dur[id] ?? 100; }
  speed() { return wornSpeed(this.current.speed, this.durability()); }

  // 'bought', 'owned' or 'poor'. wallet: { spend(n) → bool }.
  buy(id, wallet) {
    const m = BIKE_MODELS.find((b) => b.id === id);
    if (!m) return 'unknown';
    if (this.has(id)) return 'owned';
    if (!wallet.spend(m.price)) return 'poor';
    this.s.own.push(id);
    this.s.dur[id] = 100;
    this.s.use = id;
    this._save();
    return 'bought';
  }
  use(id) {
    if (!this.has(id)) return false;
    this.s.use = id;
    this._save();
    return true;
  }
  // Riding m metres on the current bike. Returns true when it just got low.
  ride(m) {
    if (!(m > 0)) return false;
    const id = this.s.use;
    const before = this.durability(id);
    this.s.dur[id] = Math.max(0, before - m * WEAR_PER_M);
    // Save now and then, not every frame.
    if (Math.floor(before) !== Math.floor(this.s.dur[id])) this._save();
    return before >= LOW && this.s.dur[id] < LOW;
  }
  // 'fixed', 'fine' (nothing to fix) or 'poor'.
  repair(id, wallet) {
    const cost = repairCost(this.durability(id));
    if (cost <= 0) return 'fine';
    if (!wallet.spend(cost)) return 'poor';
    this.s.dur[id] = 100;
    this._save();
    return 'fixed';
  }
}
