// Tteokbokki stall (떡볶이 포장마차) rules, no DOM so it can be unit-tested.
// Customers order out loud in Korean: how spicy, and which toppings. Make
// the bowl they asked for before they run out of patience. Each right bowl
// pays a small tip; the round's score gives a medal (core/grill-game.js).

export const POCHA_GAME = 'pocha';
export const CUSTOMERS = 5;
export const PATIENCE = 16; // seconds per customer
export const TIP = 1; // coins for a right bowl, +1 when served in half the time

export const SPICE = [
  { id: 'mild', ko: '안 맵게', rom: 'an maepge', emoji: '🙂', name: { en: 'not spicy', ja: '辛くない', zh: '不辣' } },
  { id: 'medium', ko: '보통맛', rom: 'botongmat', emoji: '🌶️', name: { en: 'medium', ja: '普通', zh: '中辣' } },
  { id: 'hot', ko: '매운맛', rom: 'maeunmat', emoji: '🔥', name: { en: 'extra spicy', ja: '激辛', zh: '特辣' } },
];
export const TOPPINGS = [
  { id: 'eomuk', ko: '어묵', rom: 'eomuk', emoji: '🍢', name: { en: 'fish cake', ja: 'おでん', zh: '鱼饼' } },
  { id: 'egg', ko: '계란', rom: 'gyeran', emoji: '🥚', name: { en: 'egg', ja: 'ゆで卵', zh: '鸡蛋' } },
  { id: 'cheese', ko: '치즈', rom: 'chijeu', emoji: '🧀', name: { en: 'cheese', ja: 'チーズ', zh: '芝士' } },
  { id: 'ramyeon', ko: '라면사리', rom: 'ramyeon sari', emoji: '🍜', name: { en: 'ramen noodles', ja: 'ラーメン麺', zh: '拉面' } },
  { id: 'twigim', ko: '튀김', rom: 'twigim', emoji: '🍤', name: { en: 'fried snacks', ja: '天ぷら', zh: '炸物' } },
];
export const spiceById = (id) => SPICE.find((s) => s.id === id);
export const toppingById = (id) => TOPPINGS.find((s) => s.id === id);

// A customer's order: one spice level and 0–2 toppings.
export function makeOrder(rand = Math.random) {
  const spice = SPICE[Math.floor(rand() * SPICE.length)].id;
  const n = Math.floor(rand() * 3);
  const pool = TOPPINGS.map((x) => x.id);
  const toppings = [];
  for (let i = 0; i < n; i++) toppings.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return { spice, toppings: toppings.sort() };
}

// What the customer says, e.g. "떡볶이 보통맛에 치즈랑 계란 추가해 주세요".
export function orderLine(o) {
  const s = spiceById(o.spice), tops = o.toppings.map(toppingById);
  if (!tops.length) return { ko: `떡볶이 ${s.ko} 주세요`, rom: `tteokbokki ${s.rom} juseyo` };
  return {
    ko: `떡볶이 ${s.ko}${s.id === 'mild' ? '' : '에'} ${tops.map((x) => x.ko).join('랑 ')} 추가해 주세요`,
    rom: `tteokbokki ${s.rom}${s.id === 'mild' ? '' : 'e'} ${tops.map((x) => x.rom).join('rang ')} chugahae juseyo`,
  };
}

// Is the bowl exactly what they asked for? bowl: { spice, toppings: [] }
export function rightBowl(order, bowl) {
  if (!bowl || bowl.spice !== order.spice) return false;
  const a = [...order.toppings].sort().join(), b = [...new Set(bowl.toppings)].sort().join();
  return a === b;
}

// Points for one customer: 14 for the right bowl, plus up to 6 for speed.
// Five customers: 100 at most.
export function servePoints(ok, timeLeft) {
  if (!ok) return 0;
  return Math.round(14 + 6 * Math.max(0, Math.min(1, timeLeft / PATIENCE)));
}
export const tipFor = (ok, timeLeft) => (ok ? TIP + (timeLeft >= PATIENCE / 2 ? 1 : 0) : 0);
