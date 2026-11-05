// Second-hand shops (Hongdae's Vintage Garage, Seongsu's Second Fashion):
// sell clothes you bought back for coins. No DOM, so it can be unit-tested.
//
// Only clothes you paid for yourself can be sold, for part of what you paid.
// Gifts and items from codes have no receipt, so they can't: otherwise two
// accounts could pass gifts back and forth and farm coins (see core/gifts.js).
// Selling always pays less than buying, so buying to sell never makes coins.
//
// Receipts are kept on this device like the wallet: { item id: coins paid }.

export const RESALE_RATE = 0.5; // half of what you paid
const KEY = 'mk.paid';
const SCANNED = 'mk.paidScan';

// What a shop pays for something you bought for `paid` coins.
export const resaleCoins = (paid) => (paid > 0 ? Math.max(1, Math.floor(paid * RESALE_RATE)) : 0);

export class Receipts {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    this.map = {};
    for (const [id, n] of Object.entries(raw)) if (Number.isFinite(n) && n > 0) this.map[id] = Math.floor(n);
  }
  // Coins paid for this item (0: no receipt, it can't be sold).
  paid(id) { return this.map[id] || 0; }
  record(id, coins) {
    if (!(coins > 0)) return;
    this.map[id] = Math.floor(coins);
    this._save();
  }
  forget(id) {
    if (!(id in this.map)) return;
    delete this.map[id];
    this._save();
  }
  // Clothes bought before receipts existed: once, find them in the budget
  // book (see scanLedger). Returns how many were found.
  scanOnce(log, owned, items, isGift) {
    try { if (this.storage?.getItem(SCANNED)) return 0; } catch { return 0; }
    const found = scanLedger(log, owned.filter((id) => !this.paid(id)), items, isGift);
    Object.assign(this.map, found);
    this._save();
    try { this.storage?.setItem(SCANNED, '1'); } catch { /* storage blocked */ }
    return Object.keys(found).length;
  }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.map)); } catch { /* storage blocked */ } }
}

// Owned clothes that the budget book shows I paid for myself: a spend of
// exactly the item's price, noted with its name, and not a gift for someone
// else (isGift(note)). Each budget book line counts for one item only.
// Returns { item id: coins }.
export function scanLedger(log, owned, items, isGift = () => false) {
  const out = {}, used = new Set();
  for (const id of owned) {
    const it = items[id];
    if (!it?.wear || !(it.price > 0) || !it.name?.en) continue;
    const i = log.findIndex((e, k) => !used.has(k) && e?.n === -it.price && e.note?.name?.en === it.name.en && !isGift(e.note));
    if (i < 0) continue;
    used.add(i);
    out[id] = it.price;
  }
  return out;
}

// What I can sell here: owned clothes with a receipt, as
// [{ id, paid, coins }] (coins: what the shop pays).
export function sellable(owned, items, receipts) {
  return owned.filter((id) => items[id]?.wear && receipts.paid(id) > 0).map((id) => ({ id, paid: receipts.paid(id), coins: resaleCoins(receipts.paid(id)) }));
}
