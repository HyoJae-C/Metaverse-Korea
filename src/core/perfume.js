// Perfume: bought in a perfume shop, carried in the bag, sprayed from the
// hand. A spray wears off after a few minutes; while it lasts, a small
// effect of that perfume (hearts, a stink cloud, petals…) pops up next to
// the character now and then, and everyone nearby sees it.
//
// The perfumes themselves are region data: products in stores.json with
// "perfume": "<style>" and "fx": { e: [...], c: '#rrggbb', m: '<motion>' }.
// This file only holds the rules, so another region can sell its own.

export const SPRAYS = 5; // sprays in a bottle
export const SCENT_MS = 3 * 60 * 1000; // one spray lasts 3 minutes
export const PUFF_EVERY = 7; // seconds between little effects (± PUFF_JITTER)
export const PUFF_JITTER = 1.5;
export const PUFF_NEAR = 22; // others' effects only show within this many metres
export const SCENT_KEY = 'mk.scent';

// The five styles, 6 perfumes each in Seongsu.
export const STYLES = {
  funny: { icon: '🤪', en: 'Funny', ko: '재밌는', ja: 'おもしろ', zh: '搞笑', es: 'Divertido', ar: 'مضحك', vi: 'Hài hước', hi: 'मज़ेदार', id: 'Lucu' },
  elegant: { icon: '🥂', en: 'Elegant', ko: '우아한', ja: 'エレガント', zh: '优雅', es: 'Elegante', ar: 'أنيق', vi: 'Thanh lịch', hi: 'शानदार', id: 'Elegan' },
  cute: { icon: '🎀', en: 'Cute', ko: '귀여운', ja: 'かわいい', zh: '可爱', es: 'Tierno', ar: 'لطيف', vi: 'Dễ thương', hi: 'प्यारा', id: 'Imut' },
  simple: { icon: '🤍', en: 'Simple', ko: '심플한', ja: 'シンプル', zh: '简约', es: 'Sencillo', ar: 'بسيط', vi: 'Đơn giản', hi: 'सादा', id: 'Simpel' },
  clean: { icon: '💧', en: 'Clean', ko: '깔끔한', ja: 'クリーン', zh: '清爽', es: 'Limpio', ar: 'منعش', vi: 'Sạch sẽ', hi: 'ताज़ा', id: 'Segar' },
};

export const MOTIONS = ['rise', 'float', 'fall', 'twinkle', 'orbit', 'pop'];
// Drawn shapes (not emoji): look the same on every device.
export const SHAPES = ['@spark', '@bubble', '@pearl'];

const isColor = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// Keep an effect to what the renderer understands (it comes from data).
export function cleanFx(fx) {
  const e = (Array.isArray(fx?.e) ? fx.e : []).filter((s) => typeof s === 'string' && s.length > 0 && s.length <= 8).slice(0, 4);
  const out = { e, m: MOTIONS.includes(fx?.m) ? fx.m : 'float' };
  if (isColor(fx?.c)) out.c = fx.c;
  if (!out.e.length && !out.c) out.e = ['@spark'];
  return out;
}

// All perfumes of a region, by product id: { product, store, fx, style }.
export function perfumeIndex(stores = []) {
  const map = new Map();
  for (const s of stores) {
    for (const p of s.products || []) {
      if (!p.perfume || map.has(p.id)) continue;
      map.set(p.id, { product: p, store: s, fx: cleanFx(p.fx), style: STYLES[p.perfume] ? p.perfume : 'simple' });
    }
  }
  return map;
}

// Seconds to the next puff: about PUFF_EVERY, never in step with others.
export const nextPuff = (rnd = Math.random) => PUFF_EVERY - PUFF_JITTER + rnd() * 2 * PUFF_JITTER;

// The scent you're wearing: which perfume and until when (epoch ms, so it
// survives a reload). Spraying again refreshes it; a new perfume replaces it.
export class Scent {
  constructor(storage = globalThis.localStorage, isPerfume = () => true) {
    this.storage = storage;
    this.id = null;
    this.until = 0;
    try {
      const raw = JSON.parse(storage?.getItem(SCENT_KEY) || 'null');
      if (raw && typeof raw.id === 'string' && isPerfume(raw.id) && Number.isFinite(raw.until)) {
        this.id = raw.id;
        this.until = Math.min(raw.until, Date.now() + SCENT_MS); // no scents from the future
      }
    } catch { /* broken save */ }
  }

  spray(id, now = Date.now()) {
    this.id = id;
    this.until = now + SCENT_MS;
    this._save();
  }

  // The perfume worn now, or null once it has worn off.
  active(now = Date.now()) {
    if (this.id && now >= this.until) { this.id = null; this.until = 0; this._save(); }
    return this.id;
  }

  // Whole minutes left (rounded up), 0 when nothing is on.
  minutesLeft(now = Date.now()) {
    return this.active(now) ? Math.ceil((this.until - now) / 60000) : 0;
  }

  _save() {
    try {
      if (this.id) this.storage?.setItem(SCENT_KEY, JSON.stringify({ id: this.id, until: this.until }));
      else this.storage?.removeItem(SCENT_KEY);
    } catch { /* storage blocked */ }
  }
}
