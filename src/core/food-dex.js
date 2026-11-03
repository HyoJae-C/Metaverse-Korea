// Food dex (음식 도감): every food you buy is recorded, even if you didn't
// eat it in the shop. Shows how many kinds you've tried out of all the food
// in town, and how many you've bought in total.

export const FOOD_MODELS = new Set(['cup', 'bread', 'bowl', 'bacon', 'roll', 'samgak', 'milk', 'cocktail', 'skewer']);
const FOOD_SHOPS = new Set(['cafe', 'restaurant', 'market', 'play', 'club', 'bar']);

export const isFood = (store, product) => !!store && !!product && FOOD_SHOPS.has(store.category) && FOOD_MODELS.has(product.model);
export const foodKey = (store, product) => `${store.id}/${product.id}`;

// Every food on the map: [{ key, store, product }].
export function allFoods(stores) {
  const out = [];
  for (const s of stores) for (const p of s.products || []) if (isFood(s, p)) out.push({ key: foodKey(s, p), store: s, product: p });
  return out;
}

const KEY = 'mk.foodDex';
export class FoodDex {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.items = {};
    for (const [k, v] of Object.entries(raw.items || {})) if (typeof k === 'string' && (v?.n | 0) > 0) this.items[k] = { n: v.n | 0, first: +v.first || 0 };
  }
  has(key) { return !!this.items[key]; }
  count(key) { return this.items[key]?.n || 0; }
  get kinds() { return Object.keys(this.items).length; }
  get total() { return Object.values(this.items).reduce((a, v) => a + v.n, 0); }
  // Record a purchase; returns true the first time this food is bought.
  add(store, product, qty = 1, now = Date.now()) {
    if (!isFood(store, product) || !(qty > 0)) return false;
    const k = foodKey(store, product);
    const isNew = !this.items[k];
    this.items[k] = { n: (this.items[k]?.n || 0) + qty, first: this.items[k]?.first || now };
    try { this.storage?.setItem(KEY, JSON.stringify({ items: this.items })); } catch { /* storage blocked */ }
    return isNew;
  }
}
