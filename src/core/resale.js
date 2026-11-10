// Second-hand shops (Hongdae's VINTAGE GARAGE, Seongsu's Gaeul Vintage):
// sell clothes you bought back for coins. No DOM, so it can be unit-tested.
//
// Only clothes you paid for yourself can be sold, for a small part of what
// you paid (RESALE_PCT, 25%; with the server wallet the server's
// wallet_settings.resell_pct). Gifts and items from codes have no receipt,
// so they can't: otherwise two accounts could pass gifts back and forth and
// farm coins (see core/gifts.js). Selling always pays less than buying, so
// buying to sell never makes coins.
//
// Receipts are kept on this device: { item id: { paid, op, bn } } where op
// is the purchase's id on the server's coin ledger (null in a browser-only
// wallet) and bn the purchase's note there. The server pays from its own
// ledger, so a receipt edited here can't raise the price or sell one
// purchase twice (supabase/017_resale.sql).
import { noteText } from './wallet.js';
import { OLD_COIN_WON } from './money.js';

export const RESALE_PCT = 25; // shops pay 25% of what you paid
const KEY = 'mk.paid';
const SCANNED = 'mk.paidScan';

// What a shop pays for something you bought for `paid` coins (rounded down,
// as the server does).
export const resaleCoins = (paid, pct = RESALE_PCT) => (paid > 0 && pct > 0 ? Math.floor((paid * pct) / 100) : 0);

export class Receipts {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    this.map = {};
    for (const [id, r] of Object.entries(raw)) {
      // Receipts from before won (no w) were in coins.
      const paid = Math.floor(Number(r?.paid) || 0) * (r?.w ? 1 : OLD_COIN_WON);
      if (paid > 0) this.map[id] = { paid, op: typeof r.op === 'string' ? r.op : null, bn: typeof r.bn === 'string' ? r.bn : null, w: 1, ...(r.list > 0 ? { list: Math.floor(r.list) } : {}) };
    }
  }
  // The receipt for this item, or null (it can't be sold).
  get(id) { return this.map[id] || null; }
  paid(id) { return this.map[id]?.paid || 0; }
  // paid: won; op: the purchase's ledger id; note: its budget book note;
  // list: the new price, for clothes bought second-hand at Potato Market
  // (core/market.js counts mat prices from it).
  record(id, paid, op = null, note = null, list = 0) {
    if (!(paid > 0)) return;
    this.map[id] = { paid: Math.floor(paid), op: op || null, bn: noteText(note), w: 1, ...(list > 0 ? { list: Math.floor(list) } : {}) };
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
// Returns { item id: receipt } (no ledger id: the server finds the
// purchase by its note and price).
export function scanLedger(log, owned, items, isGift = () => false) {
  const out = {}, used = new Set();
  for (const id of owned) {
    const it = items[id];
    if (!it?.wear || !(it.price > 0) || !it.name?.en) continue;
    const i = log.findIndex((e, k) => !used.has(k) && e?.n === -it.price && e.note?.name?.en === it.name.en && !isGift(e.note));
    if (i < 0) continue;
    used.add(i);
    out[id] = { paid: it.price, op: null, bn: noteText(log[i].note), w: 1 };
  }
  return out;
}

// What I can sell here: owned clothes with a receipt, as
// [{ id, paid, coins }] (coins: what the shop pays).
export function sellable(owned, items, receipts, pct = RESALE_PCT) {
  return owned.filter((id) => items[id]?.wear && receipts.paid(id) > 0)
    .map((id) => ({ id, paid: receipts.paid(id), coins: resaleCoins(receipts.paid(id), pct) }))
    .filter((r) => r.coins > 0);
}
