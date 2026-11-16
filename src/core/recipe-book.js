// The recipe book (요리비법서): every Korean dish you can learn to cook, one
// page each. A dish you made at a cooking class is written in with how many
// times you made it and your best medal. Dishes nobody can cook yet show as
// "coming soon", so the empty pages make you want to fill them.
// Kept free of DOM code so it can be unit-tested; the panel is
// ui/recipe-book-ui.js, downloaded when the book is first opened.
import { medalFor } from './grill-game.js';
import { isKimchi, kimchiScore } from './kimchi-market.js';

// In book order. cook: a cooking class makes it today (Bukchon's row).
// ko: the dish's Korean name, shown on its page in every language.
export const RECIPES = [
  { id: 'bibimbap', icon: '🥗', ko: '비빔밥', cook: true },
  { id: 'kimbap', icon: '🍙', ko: '김밥', cook: true },
  { id: 'kimchi', icon: '🫙', ko: '김치', cook: true },
  { id: 'japchae', icon: '🍝', ko: '잡채', cook: true },
  { id: 'tteok', icon: '🍡', ko: '송편', cook: true },
  { id: 'jeon', icon: '🥞', ko: '전' },
  { id: 'kimchijjigae', icon: '🍲', ko: '김치찌개' },
  { id: 'doenjangjjigae', icon: '🥘', ko: '된장찌개' },
  { id: 'samgyetang', icon: '🐔', ko: '삼계탕' },
  { id: 'tteokguk', icon: '🥣', ko: '떡국' },
  { id: 'galbijjim', icon: '🍖', ko: '갈비찜' },
  { id: 'bulgogi', icon: '🥩', ko: '불고기' },
  { id: 'samgyeopsal', icon: '🥓', ko: '삼겹살' },
  { id: 'chicken', icon: '🍗', ko: '치킨' },
  { id: 'tteokbokki', icon: '🌶️', ko: '떡볶이' },
  // Bibim or mul naengmyeon: two dishes when you cook, one page in the book.
  { id: 'naengmyeon', icon: '🍜', ko: '냉면', variants: ['bibimnaengmyeon', 'mulnaengmyeon'] },
];
const PAGE = new Map();
for (const r of RECIPES) { PAGE.set(r.id, r.id); for (const v of r.variants || []) PAGE.set(v, r.id); }
// A dish id (or a variant of one) → its page id, or null.
export const recipePage = (id) => PAGE.get(id) || null;

// A bag entry from a cooking class → { id, score }, or null.
export function recipeOf(e) {
  const id = isKimchi(e) ? 'kimchi' : e?.kind === 'gift' ? recipePage(e.g) : null;
  return id ? { id, score: kimchiScore(e) } : null;
}

const KEY = 'mk.recipeBook';
export class RecipeBook {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.fresh = !raw.pages; // never opened on this save: fill() it from the bag once
    this.pages = {};
    for (const [id, v] of Object.entries(raw.pages || {})) {
      if (recipePage(id) !== id || !((v?.n | 0) > 0)) continue;
      this.pages[id] = { n: v.n | 0, best: Math.max(0, Math.min(100, +v.best || 0)), first: +v.first || 0 };
    }
  }
  has(id) { return !!this.pages[id]; }
  count(id) { return this.pages[id]?.n || 0; }
  best(id) { return this.pages[id] ? medalFor(this.pages[id].best) : null; }
  get kinds() { return Object.keys(this.pages).length; }
  get total() { return Object.values(this.pages).reduce((a, v) => a + v.n, 0); }
  // A dish was cooked (score 0-100). Returns true the first time its page is written.
  cooked(id, score = 0, now = Date.now()) {
    const page = recipePage(id);
    if (!page) return false;
    const old = this.pages[page];
    const s = Math.max(0, Math.min(100, Math.round(+score) || 0));
    this.pages[page] = { n: (old?.n || 0) + 1, best: Math.max(old?.best ?? 0, s), first: old?.first || now };
    this.save();
    return !old;
  }
  // Dishes made before the book existed: the ones in the bag now are written
  // in (count and best medal). Only once, on a save that never had the book.
  fill(entries, now = Date.now()) {
    if (!this.fresh) return 0;
    this.fresh = false;
    for (const e of entries) {
      const r = recipeOf(e);
      if (!r) continue;
      const p = (this.pages[r.id] ||= { n: 0, best: 0, first: now });
      p.n++;
      p.best = Math.max(p.best, r.score);
    }
    this.save();
    return this.kinds;
  }
  save() { try { this.storage?.setItem(KEY, JSON.stringify({ pages: this.pages })); } catch { /* storage blocked */ } }
}
