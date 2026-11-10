// My bikes: everyone starts with a basic bike (a little faster than running);
// the bike shop sells a few faster ones. The steps are small on purpose, so a
// new player never feels far behind. Bikes wear out very slowly as you ride
// (about 1% every 500 m) and the bike shop repairs them for a few coins.
// Kept free of DOM code so it can be unit-tested.

// Every ride in the shop: four kinds (type), each in steps (tier 0 basic,
// 1 faster and a bit cooler, 2 fastest and coolest). Bikes keep their ids.
export const RIDE_TYPES = ['bike', 'skate', 'inline', 'kick'];
export const RIDE_ICON = { bike: '🚲', skate: '🛹', inline: '⛸️', kick: '🛴' };
export const BIKE_MODELS = [
  { id: 'basic', type: 'bike', tier: 0, speed: 13.5, price: 0, color: '#3fb59a', name: { en: 'Basic bike', ko: '기본 자전거', ja: 'ベーシック自転車', zh: '基础自行车' } },
  { id: 'city', type: 'bike', tier: 1, speed: 14.3, price: 80000, color: '#5b8def', name: { en: 'City bike', ko: '시티 자전거', ja: 'シティサイクル', zh: '城市自行车' } },
  { id: 'sport', type: 'bike', tier: 1, speed: 15.1, price: 180000, color: '#f2a33a', name: { en: 'Sport bike', ko: '스포츠 자전거', ja: 'スポーツ自転車', zh: '运动自行车' } },
  { id: 'road', type: 'bike', tier: 2, speed: 16, price: 320000, color: '#e0475b', name: { en: 'Road bike', ko: '로드 자전거', ja: 'ロードバイク', zh: '公路自行车' } },
  { id: 'skate1', type: 'skate', tier: 0, speed: 13.3, price: 40000, color: '#c98a4b', name: { en: 'Skateboard', ko: '스케이트보드', ja: 'スケートボード', zh: '滑板' } },
  { id: 'skate2', type: 'skate', tier: 1, speed: 14.6, price: 150000, color: '#3b7dd8', name: { en: 'Street skateboard', ko: '스트리트 스케이트보드', ja: 'ストリートスケボー', zh: '街头滑板' } },
  { id: 'skate3', type: 'skate', tier: 2, speed: 15.8, price: 300000, color: '#7a3cff', name: { en: 'Pro longboard', ko: '프로 롱보드', ja: 'プロ・ロングボード', zh: '专业长板' } },
  { id: 'inline1', type: 'inline', tier: 0, speed: 13.4, price: 50000, color: '#4fb3a9', name: { en: 'Inline skates', ko: '인라인 스케이트', ja: 'インラインスケート', zh: '直排轮滑' } },
  { id: 'inline2', type: 'inline', tier: 1, speed: 14.7, price: 160000, color: '#ff7a59', name: { en: 'Sport inline skates', ko: '스포츠 인라인', ja: 'スポーツインライン', zh: '运动轮滑' } },
  { id: 'inline3', type: 'inline', tier: 2, speed: 15.9, price: 320000, color: '#1f2a44', name: { en: 'Speed inline skates', ko: '스피드 인라인', ja: 'スピードインライン', zh: '竞速轮滑' } },
  { id: 'kick1', type: 'kick', tier: 0, speed: 13.6, price: 60000, color: '#8fd14f', name: { en: 'Kick scooter', ko: '킥보드', ja: 'キックボード', zh: '滑板车' } },
  { id: 'kick2', type: 'kick', tier: 1, speed: 14.9, price: 170000, color: '#ff5d8f', name: { en: 'Street kick scooter', ko: '스트리트 킥보드', ja: 'ストリートキックボード', zh: '街头滑板车' } },
  { id: 'kick3', type: 'kick', tier: 2, speed: 16, price: 340000, color: '#20c4c4', name: { en: 'Pro kick scooter', ko: '프로 킥보드', ja: 'プロ・キックボード', zh: '专业滑板车' } },
];

// Skins: a colour and a pattern, bought once and used on any ride. Each ride
// shop sells its own set (SKIN_SHOP; Pedal Lab has the first nine colours and
// five patterns). Hangeul Mihak by Gyeongbokgung sells a limited Hunminjeongeum
// line you can only get there.
export const SKIN_COLORS = {
  red: '#ff5a5f', orange: '#ff9f43', yellow: '#ffd93d', mint: '#3ddc97', sky: '#4dabf7',
  purple: '#9b6bff', pink: '#ff8fc7', black: '#2b2d33', white: '#f5f6f8',
  // Bike Research Lab (Hongdae): spray-can street colours
  lime: '#b6ff3b', spray: '#ff3ea5', concrete: '#9aa0a6',
  // RIDE WITH ME (Itaewon): night-out colours
  midnight: '#1b2a4a', chrome: '#c9ced6', gold: '#d4a640', neonred: '#ff2e4d',
  // Hangeul Mihak (Gyeongbokgung): paper, ink and palace colours
  hanji: '#efe6d2', meok: '#1e1e22', dancheong: '#c0392b', celadon: '#7fb5a5', jjok: '#2e4a7d',
};
export const SKIN_PATTERNS = [
  'flower', 'bolt', 'heart', 'star', 'hangul',
  'graffiti', 'checker', 'drip', 'splat',
  'flame', 'stripe', 'dots', 'wave',
  'hunmin', 'naratmal', 'cheonjiin', 'jaeum', 'moeum', 'gana', 'dojang', 'panbon', 'jamo-ring', 'brush',
];
// The ride shops: their own skins, and what else they do. 'pedal' is Pedal
// Lab (Seongsu); every shop sells and repairs the rides themselves.
export const RIDE_SHOPS = {
  pedal: { colors: ['red', 'orange', 'yellow', 'mint', 'sky', 'purple', 'pink', 'black', 'white'], patterns: ['flower', 'bolt', 'heart', 'star', 'hangul'], extra: null },
  lab: { colors: ['lime', 'spray', 'concrete'], patterns: ['graffiti', 'checker', 'drip', 'splat'], extra: 'tune' },
  rwm: { colors: ['midnight', 'chrome', 'gold', 'neonred'], patterns: ['flame', 'stripe', 'dots', 'wave'], extra: 'kit' },
  hangul: { colors: ['hanji', 'meok', 'dancheong', 'celadon', 'jjok'], patterns: ['hunmin', 'naratmal', 'cheonjiin', 'jaeum', 'moeum', 'gana', 'dojang', 'panbon', 'jamo-ring', 'brush'], extra: null, limited: true },
};
export const shopOf = (kind, id) => Object.keys(RIDE_SHOPS).find((k) => RIDE_SHOPS[k][kind === 'color' ? 'colors' : 'patterns'].includes(id)) || null;
export const SKIN_PRICE = { color: 20000, pattern: 40000 };
// Shop-only skins cost a little more; the limited Hangul line the most.
export function skinPrice(kind, id) {
  const shop = shopOf(kind, id);
  const base = SKIN_PRICE[kind];
  return shop === 'hangul' ? base + 30000 : shop && shop !== 'pedal' ? base + 15000 : base;
}

// Upgrades for a ride you own, three steps each, small on purpose:
// tune (Bike Research Lab) makes it a little faster, kit (RIDE WITH ME)
// makes it wear out more slowly.
export const UPGRADE_MAX = 3;
export const TUNE_STEP = 0.25; // speed per tune step (a ride step is ~1.2)
export const KIT_WEAR = [1, 0.75, 0.5, 0.3]; // wear by kit step
export const UPGRADE_PRICE = { tune: [60000, 110000, 170000], kit: [40000, 80000, 120000] };

// What others need to draw your ride: "type.tier.colour.pattern" (- = none).
export function rideCode({ type, tier, color, pattern }) {
  return [type, tier, color || '-', pattern || '-'].join('.');
}
export function parseRide(code) {
  const [type, tier, color, pattern] = String(code || '').split('.');
  if (!RIDE_TYPES.includes(type)) return null;
  const tr = Math.max(0, Math.min(2, Number(tier) | 0));
  return {
    type, tier: tr,
    color: /^#[0-9a-f]{6}$/i.test(color || '') ? color : null,
    pattern: SKIN_PATTERNS.includes(pattern) ? pattern : null,
  };
}

export const bikeModel = (id) => BIKE_MODELS.find((b) => b.id === id) || BIKE_MODELS[0];

export const WEAR_PER_M = 1 / 500; // durability points (0–100) lost per metre
export const LOW = 20; // below this the bike asks for a repair
const KEY = 'mk.bikes';

// Speed with wear: a worn-out bike is at most 10% slower.
export const wornSpeed = (speed, dur) => speed * (0.9 + 0.1 * Math.max(0, Math.min(100, dur)) / 100);
// Repair cost: ₩1,000 per 10 points missing (at most ₩10,000).
export const repairCost = (dur) => Math.ceil((100 - Math.max(0, Math.min(100, dur))) / 10) * 1000;

function clean(raw) {
  const own = Array.isArray(raw?.own) ? raw.own.filter((id) => BIKE_MODELS.some((b) => b.id === id)) : [];
  if (!own.includes('basic')) own.unshift('basic');
  const dur = {};
  for (const id of own) {
    const d = Number(raw?.dur?.[id]);
    dur[id] = Number.isFinite(d) ? Math.max(0, Math.min(100, d)) : 100;
  }
  const use = own.includes(raw?.use) ? raw.use : 'basic';
  const colors = Array.isArray(raw?.colors) ? raw.colors.filter((c) => SKIN_COLORS[c]) : [];
  const patterns = Array.isArray(raw?.patterns) ? raw.patterns.filter((p) => SKIN_PATTERNS.includes(p)) : [];
  const skin = {
    color: colors.includes(raw?.skin?.color) ? raw.skin.color : null,
    pattern: patterns.includes(raw?.skin?.pattern) ? raw.skin.pattern : null,
  };
  const steps = (o) => {
    const out = {};
    for (const id of own) {
      const n = Number(o?.[id]) | 0;
      if (n > 0) out[id] = Math.min(UPGRADE_MAX, n);
    }
    return out;
  };
  return { own, use, dur, colors, patterns, skin, tune: steps(raw?.tune), kit: steps(raw?.kit) };
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
  speed() { return wornSpeed(this.current.speed + this.level('tune') * TUNE_STEP, this.durability()); }
  // Upgrade step of a ride (0–3): kind 'tune' | 'kit'.
  level(kind, id = this.s.use) { return this.s[kind]?.[id] || 0; }
  // Next step's price, or null when it is at the top.
  upgradePrice(kind, id = this.s.use) {
    const n = this.level(kind, id);
    return n >= UPGRADE_MAX ? null : UPGRADE_PRICE[kind][n];
  }
  // 'upgraded', 'max', 'poor', 'unknown' (not a kind, or a ride you don't own).
  upgrade(kind, id, wallet) {
    if (!UPGRADE_PRICE[kind] || !this.has(id)) return 'unknown';
    const price = this.upgradePrice(kind, id);
    if (price == null) return 'max';
    if (!wallet.spend(price)) return 'poor';
    this.s[kind][id] = this.level(kind, id) + 1;
    this._save();
    return 'upgraded';
  }
  // Speed of any owned ride, with its tune and wear.
  speedOf(id) { return wornSpeed(bikeModel(id).speed + this.level('tune', id) * TUNE_STEP, this.durability(id)); }
  // How the ride in use looks: its type and tier, the skin colour (or the
  // model's own) and pattern.
  rideSpec() {
    const m = this.current;
    return { type: m.type, tier: m.tier, color: SKIN_COLORS[this.s.skin.color] || m.color, pattern: this.s.skin.pattern };
  }
  hasSkin(kind, id) { return (kind === 'color' ? this.s.colors : this.s.patterns).includes(id); }
  // kind 'color' | 'pattern'. Buying also puts it on. 'bought', 'owned',
  // 'poor', 'unknown', or 'elsewhere' when `shop` is given and that shop
  // doesn't sell it (shop-only and limited skins).
  buySkin(kind, id, wallet, shop = null) {
    const ok = kind === 'color' ? !!SKIN_COLORS[id] : SKIN_PATTERNS.includes(id);
    if (!ok) return 'unknown';
    if (this.hasSkin(kind, id)) return 'owned';
    if (shop && shopOf(kind, id) !== shop) return 'elsewhere';
    if (!wallet.spend(skinPrice(kind, id))) return 'poor';
    (kind === 'color' ? this.s.colors : this.s.patterns).push(id);
    this.s.skin[kind] = id;
    this._save();
    return 'bought';
  }
  // Put an owned skin on (id), or take it off (null).
  setSkin(kind, id) {
    if (id !== null && !this.hasSkin(kind, id)) return false;
    this.s.skin[kind] = id;
    this._save();
    return true;
  }

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
    this.s.dur[id] = Math.max(0, before - m * WEAR_PER_M * KIT_WEAR[this.level('kit', id)]);
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
