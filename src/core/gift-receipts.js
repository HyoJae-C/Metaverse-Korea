// Receipts for clothes received as gifts (supabase/036_gift_receipts.sql),
// so a friend can sell them like clothes they bought (Yozi, 2026-11-11:
// every way to get clothes keeps a record).
//
// The giver's purchase is on the server's ledger. When the friend accepts,
// the giver's game tells the server who got it (gift_bind, with the friend's
// player id); the friend's game then asks my_gifts and keeps that purchase's
// op id as the receipt. Binds wait on this device until the server has
// answered, so a gift accepted just before closing the page still counts.
// No DOM, so it can be unit-tested.

const KEY = 'mk.giftBind';
const KEEP_MS = 3 * 24 * 3600 * 1000; // the server binds gifts up to 3 days old
const DROP = ['ok', 'bad', 'noref'];

export class GiftReceipts {
  // wallet: the wallet, or a function that returns it (main.js makes it later).
  constructor({ wallet, storage = globalThis.localStorage, now = () => Date.now() }) {
    this._wallet = typeof wallet === 'function' ? wallet : () => wallet;
    this.storage = storage;
    this.now = now;
    this.busy = null;
    let raw = [];
    try { raw = JSON.parse(storage?.getItem(KEY) || '[]'); } catch { /* broken save */ }
    this.wait = (Array.isArray(raw) ? raw : []).filter((b) => b && typeof b.op === 'string' && typeof b.to === 'string' && typeof b.item === 'string');
  }
  get wallet() { return this._wallet(); }
  _save() {
    try {
      if (this.wait.length) this.storage?.setItem(KEY, JSON.stringify(this.wait.slice(-50)));
      else this.storage?.removeItem(KEY);
    } catch { /* storage blocked */ }
  }
  async _rpc(fn, args) {
    const c = this.wallet?.client;
    if (!c) return null;
    try {
      const { data, error } = await Promise.race([c.rpc(fn, args), new Promise((r) => setTimeout(() => r({ error: { message: 'timeout' } }), 8000))]);
      return error ? null : data;
    } catch { return null; }
  }
  // The giver: my gift (op: its purchase's op id) of clothes `item` was
  // accepted by player id `to`.
  bind(op, to, item) {
    if (!op || !to || !item || !this.wallet?.server) return;
    if (!this.wait.some((b) => b.op === op)) this.wait.push({ op, to, item, at: this.now() });
    this._save();
    return this.run();
  }
  // Send the binds still waiting. Resolves how many are still waiting.
  run() {
    if (this.busy) return this.busy;
    this.busy = (async () => {
      this.wait = this.wait.filter((b) => !(this.now() - b.at > KEEP_MS));
      if (this.wait.length && this.wallet?.server && (await this.wallet.flush())) {
        for (const b of [...this.wait]) {
          const res = await this._rpc('gift_bind', { p_op: b.op, p_to: b.to, p_item: b.item });
          if (DROP.includes(res?.status)) this.wait = this.wait.filter((x) => x !== b);
        }
      }
      this._save();
      this.busy = null;
      return this.wait.length;
    })();
    return this.busy;
  }
  // The friend: receipts for clothes given to me that I have and that have
  // none yet. Resolves how many were added.
  async sync(inventory, receipts, items) {
    if (!this.wallet?.server) return 0;
    const rows = await this._rpc('my_gifts');
    if (!Array.isArray(rows)) return 0;
    let n = 0;
    for (const r of rows) {
      if (!items[r?.item]?.wear || !inventory.has(r.item) || receipts.paid(r.item) > 0 || !(Number(r.price) > 0)) continue;
      receipts.record(r.item, Number(r.price), String(r.op), null);
      n++;
    }
    return n;
  }
}
