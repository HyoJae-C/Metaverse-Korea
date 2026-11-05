// Nickname emblems and name colours, sold at the nickname shop (a place to
// spend coins). Both are part of the look, so other players see them on your
// name tag. Three tiers each: basic, fancy and dazzling (animated).
// Kept free of DOM-only code at import time so it can be unit-tested.

export const TIERS = {
  basic: { price: 30, name: { en: 'Basic', ko: '기본', ja: 'ベーシック', zh: '基础' } },
  fancy: { price: 80, name: { en: 'Fancy', ko: '화려함', ja: '華やか', zh: '华丽' } },
  dazzling: { price: 200, name: { en: 'Dazzling', ko: '완전 화려함', ja: '超ド派手', zh: '超华丽' } },
};

// 20 emblems. bg: badge colour (or a gradient for fancy/dazzling ones).
export const EMBLEMS = [
  // basic: a symbol on a plain colour
  { id: 'heart', tier: 'basic', icon: '❤', bg: '#ff8fa3', name: { en: 'Heart', ko: '하트', ja: 'ハート', zh: '爱心' } },
  { id: 'star', tier: 'basic', icon: '★', bg: '#ffc94d', name: { en: 'Star', ko: '별', ja: '星', zh: '星星' } },
  { id: 'leaf', tier: 'basic', icon: '🍀', bg: '#9fd486', name: { en: 'Clover', ko: '네잎클로버', ja: 'クローバー', zh: '四叶草' } },
  { id: 'note', tier: 'basic', icon: '♪', bg: '#86b8f0', name: { en: 'Music note', ko: '음표', ja: '音符', zh: '音符' } },
  { id: 'coffee', tier: 'basic', icon: '☕', bg: '#c9a27a', name: { en: 'Coffee', ko: '커피', ja: 'コーヒー', zh: '咖啡' } },
  { id: 'paw', tier: 'basic', icon: '🐾', bg: '#e8c9a8', name: { en: 'Paw', ko: '발바닥', ja: '肉球', zh: '爪印' } },
  { id: 'hangul', tier: 'basic', icon: '한', bg: '#b9a6f0', name: { en: 'Hangul', ko: '한글', ja: 'ハングル', zh: '韩文' } },
  { id: 'smile', tier: 'basic', icon: '☺', bg: '#8fd3c7', name: { en: 'Smile', ko: '스마일', ja: 'スマイル', zh: '笑脸' } },
  // fancy: gradients and an outline
  { id: 'sakura', tier: 'fancy', icon: '🌸', bg: 'linear-gradient(135deg,#ffd1e3,#ff8fb8)', name: { en: 'Cherry blossom', ko: '벚꽃', ja: '桜', zh: '樱花' } },
  { id: 'taegeuk', tier: 'fancy', icon: '☯', bg: 'linear-gradient(135deg,#e04a5f,#3f6fd6)', name: { en: 'Taegeuk', ko: '태극', ja: '太極', zh: '太极' } },
  { id: 'fish', tier: 'fancy', icon: '🐟', bg: 'linear-gradient(135deg,#a9e2ff,#4f9fe0)', name: { en: 'Angler', ko: '낚시왕', ja: '釣り名人', zh: '钓鱼王' } },
  { id: 'mic', tier: 'fancy', icon: '🎤', bg: 'linear-gradient(135deg,#d6b8ff,#8a5cc9)', name: { en: 'Singer', ko: '노래왕', ja: '歌うま', zh: '麦霸' } },
  { id: 'tteok', tier: 'fancy', icon: '🍡', bg: 'linear-gradient(135deg,#fff1b8,#ff9fb0)', name: { en: 'Rice cake', ko: '떡꼬치', ja: '餅串', zh: '年糕串' } },
  { id: 'moon', tier: 'fancy', icon: '🌙', bg: 'linear-gradient(135deg,#43418a,#1d1b3a)', name: { en: 'Night owl', ko: '올빼미', ja: '夜ふかし', zh: '夜猫子' } },
  { id: 'gem', tier: 'fancy', icon: '💎', bg: 'linear-gradient(135deg,#c6f4ff,#6fcdeb)', name: { en: 'Gem', ko: '보석', ja: '宝石', zh: '宝石' } },
  // dazzling: animated
  { id: 'crown', tier: 'dazzling', icon: '👑', bg: 'linear-gradient(135deg,#fff3b0,#e8b52e,#fff3b0)', fx: 'shine', name: { en: 'Golden crown', ko: '황금 왕관', ja: '黄金の王冠', zh: '金王冠' } },
  { id: 'rainbow', tier: 'dazzling', icon: '🌈', bg: 'linear-gradient(90deg,#ff7a7a,#ffc94d,#8fe08a,#7ab8ff,#c18aff,#ff7a7a)', fx: 'flow', name: { en: 'Rainbow', ko: '무지개', ja: '虹', zh: '彩虹' } },
  { id: 'fire', tier: 'dazzling', icon: '🔥', bg: 'linear-gradient(135deg,#ffdf6b,#ff6a3d,#d62f4f)', fx: 'glow', name: { en: 'Blazing', ko: '불꽃', ja: '炎', zh: '火焰' } },
  { id: 'dragon', tier: 'dazzling', icon: '🐉', bg: 'linear-gradient(135deg,#7ff0c0,#2f8f6b,#d4a73a)', fx: 'shine', name: { en: 'Blue dragon', ko: '청룡', ja: '青龍', zh: '青龙' } },
  { id: 'galaxy', tier: 'dazzling', icon: '✨', bg: 'linear-gradient(90deg,#2b1d5c,#7b3fe4,#ff8fd0,#2b1d5c)', fx: 'flow', name: { en: 'Galaxy', ko: '은하수', ja: '銀河', zh: '银河' } },
];

// Name colours: plain (basic), two-tone gradients (fancy), animated (dazzling).
export const NAME_COLORS = [
  { id: 'red', tier: 'basic', css: '#d8452f', name: { en: 'Red', ko: '빨강', ja: '赤', zh: '红' } },
  { id: 'orange', tier: 'basic', css: '#e07a1f', name: { en: 'Orange', ko: '주황', ja: 'オレンジ', zh: '橙' } },
  { id: 'green', tier: 'basic', css: '#2f8f4b', name: { en: 'Green', ko: '초록', ja: '緑', zh: '绿' } },
  { id: 'blue', tier: 'basic', css: '#2f6fd6', name: { en: 'Blue', ko: '파랑', ja: '青', zh: '蓝' } },
  { id: 'purple', tier: 'basic', css: '#7b3fe4', name: { en: 'Purple', ko: '보라', ja: '紫', zh: '紫' } },
  { id: 'pink', tier: 'basic', css: '#d6458a', name: { en: 'Pink', ko: '분홍', ja: 'ピンク', zh: '粉' } },
  { id: 'peach', tier: 'fancy', css: 'linear-gradient(90deg,#ff7a8a,#ffb347)', name: { en: 'Sunset', ko: '노을', ja: '夕焼け', zh: '晚霞' } },
  { id: 'ocean', tier: 'fancy', css: 'linear-gradient(90deg,#1f8fd6,#2fc4a8)', name: { en: 'Ocean', ko: '바다', ja: '海', zh: '海洋' } },
  { id: 'berry', tier: 'fancy', css: 'linear-gradient(90deg,#c13fe4,#ff4f8a)', name: { en: 'Berry', ko: '베리', ja: 'ベリー', zh: '浆果' } },
  { id: 'gold', tier: 'dazzling', css: 'linear-gradient(90deg,#b8860b,#ffe680,#b8860b,#ffe680)', fx: 'flow', name: { en: 'Shining gold', ko: '빛나는 황금', ja: '輝く金', zh: '闪耀金' } },
  { id: 'rainbow', tier: 'dazzling', css: 'linear-gradient(90deg,#ff4f4f,#ff9f1f,#e6c200,#2fb84b,#2f8fe0,#8a4fe0,#ff4f4f)', fx: 'flow', name: { en: 'Rainbow', ko: '무지개', ja: '虹', zh: '彩虹' } },
];

// The operator badge: never sold. The operator turns it on with the master
// code (chat "/<code>"). Other players only see it once the server confirms
// that name belongs to an operator account (supabase/005_operators.sql), so
// copying the flag doesn't make anyone an operator.
export const OPERATOR_BADGE = { icon: '🛡️', name: { en: 'Operator', ko: '운영자', ja: '運営', zh: '运营', es: 'Operador', ar: 'المشرف', vi: 'Quản trị', hi: 'ऑपरेटर', id: 'Operator' } };

export const emblemById = (id) => EMBLEMS.find((e) => e.id === id) || null;
export const nameColorById = (id) => NAME_COLORS.find((c) => c.id === id) || null;
export const priceOf = (it) => TIERS[it.tier].price;

// What you own, kept in this browser like the rest of the save ("mk.").
const KEY = 'mk.emblems';
export class EmblemCollection {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.emblems = new Set((raw.emblems || []).filter((id) => emblemById(id)));
    this.colors = new Set((raw.colors || []).filter((id) => nameColorById(id)));
  }
  has(kind, id) { return (kind === 'emblem' ? this.emblems : this.colors).has(id); }
  // Pay for and keep one; returns 'owned', 'bought' or 'poor'.
  buy(kind, id, wallet) {
    const it = kind === 'emblem' ? emblemById(id) : nameColorById(id);
    if (!it) return 'poor';
    if (this.has(kind, id)) return 'owned';
    if (!wallet.spend(priceOf(it))) return 'poor';
    (kind === 'emblem' ? this.emblems : this.colors).add(id);
    try { this.storage?.setItem(KEY, JSON.stringify({ emblems: [...this.emblems], colors: [...this.colors] })); } catch { /* storage blocked */ }
    return 'bought';
  }
}

// Draw a name tag: [emblem] name, in the chosen colour. Uses textContent only
// (names come from other players).
// opts.operator: show the operator badge (only when it has been checked).
export function styleNameTag(tag, name, look = {}, opts = {}) {
  const em = emblemById(look.emblem);
  const col = nameColorById(look.nameColor);
  tag.replaceChildren();
  if (opts.operator) {
    const o = document.createElement('span');
    o.className = 'tag-operator';
    o.textContent = OPERATOR_BADGE.icon + ' ' + (OPERATOR_BADGE.name[opts.lang] || OPERATOR_BADGE.name.en);
    tag.append(o);
  }
  tag.classList.toggle('operator', !!opts.operator);
  if (em) {
    const b = document.createElement('span');
    b.className = 'tag-emblem tier-' + em.tier + (em.fx ? ' fx-' + em.fx : '');
    b.style.background = em.bg;
    b.textContent = em.icon;
    tag.append(b);
  }
  const n = document.createElement('span');
  n.className = 'tag-name';
  n.textContent = name;
  if (col) {
    if (col.css.startsWith('linear')) {
      n.classList.add('tag-grad');
      n.style.backgroundImage = col.css;
      if (col.fx) n.classList.add('fx-' + col.fx);
    } else n.style.color = col.css;
  }
  tag.append(n);
  tag.classList.toggle('dazzling', em?.tier === 'dazzling' || col?.tier === 'dazzling');
}
