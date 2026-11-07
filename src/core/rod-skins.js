// Fishing rod skins: bought at the park's fish stand, worn whenever you fish,
// and seen by everyone nearby (the held kind travels as 'rod:<skin>').
// A better rod never changes which fish bite, but holds on better: hold is
// how much it cuts the chance a hooked fish slips off at the end (0.2 = -20%).
export const ROD_SKINS = [
  { id: 'basic', price: 0, hold: 0, name: { ko: '기본 낚싯대', en: 'Basic rod', ja: '基本の釣り竿', zh: '基础鱼竿' },
    grip: '#b5462f', pole: '#2b3a4a', tip: '#e8473b', reel: '#c9cdd2', line: '#f2f2f2' },
  { id: 'bamboo', price: 50, hold: 0.1, name: { ko: '대나무 낚싯대', en: 'Bamboo rod', ja: '竹の釣り竿', zh: '竹鱼竿' },
    grip: '#7a5230', pole: '#c8a85a', tip: '#a8c464', reel: '#8a6a3c', line: '#f5efd8' },
  { id: 'sakura', price: 120, hold: 0.15, name: { ko: '벚꽃 낚싯대', en: 'Cherry blossom rod', ja: '桜の釣り竿', zh: '樱花鱼竿' },
    grip: '#ffffff', pole: '#f7b6cc', tip: '#ff6f9f', reel: '#ffe1ea', line: '#ffd3e2' },
  { id: 'carbon', price: 200, hold: 0.25, name: { ko: '카본 블랙 낚싯대', en: 'Carbon black rod', ja: 'カーボンブラックの釣り竿', zh: '碳黑鱼竿' },
    grip: '#1b1b1f', pole: '#2a2a30', tip: '#29d3c2', reel: '#9aa3ad', line: '#cfe9ff' },
  { id: 'gold', price: 600, hold: 0.35, name: { ko: '황금 낚싯대', en: 'Golden rod', ja: '黄金の釣り竿', zh: '黄金鱼竿' },
    grip: '#6b1d1d', pole: '#e2b53c', tip: '#fff1a8', reel: '#f4d36b', line: '#fff6cc', shine: true },
  { id: 'aurora', price: 1500, hold: 0.5, name: { ko: '오로라 낚싯대', en: 'Aurora rod', ja: 'オーロラの釣り竿', zh: '极光鱼竿' },
    grip: '#2d1b4e', pole: '#7b6cff', tip: '#7cf7d4', reel: '#c9b8ff', line: '#e2fbff', glow: true },
];
export const rodHold = (id) => rodSkin(id).hold || 0;
export const rodSkin = (id) => ROD_SKINS.find((s) => s.id === id) || ROD_SKINS[0];
// The held kind for a skin ('rod' for the basic one, so older clients still see a rod).
export const rodKind = (id) => (id && id !== 'basic' && ROD_SKINS.some((s) => s.id === id) ? 'rod:' + id : 'rod');

const KEY = 'mk.rodskins';
export class RodSkins {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { raw = {}; }
    this.owned = new Set(['basic', ...(Array.isArray(raw.owned) ? raw.owned.filter((id) => ROD_SKINS.some((s) => s.id === id)) : [])]);
    this.equipped = this.owned.has(raw.equipped) ? raw.equipped : 'basic';
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify({ owned: [...this.owned], equipped: this.equipped })); } catch { /* storage blocked */ } }
  has(id) { return this.owned.has(id); }
  // Pay for a skin and wear it; false when it is unknown or the coins are short.
  buy(id, wallet, note) {
    const s = ROD_SKINS.find((x) => x.id === id);
    if (!s) return false;
    if (!this.owned.has(id)) {
      if (!wallet.spend(s.price, note)) return false;
      this.owned.add(id);
    }
    this.equipped = id;
    this._save();
    return true;
  }
  equip(id) {
    if (!this.owned.has(id)) return false;
    this.equipped = id;
    this._save();
    return true;
  }
}
