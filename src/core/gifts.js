// Gifts: buy something in a shop for another player in the same shop. No DOM,
// so it can be unit-tested.
//
// How it works:
//   1. The giver picks a friend in the shop. Their coins are paid at once and
//      the offer goes out on the emote channel:
//        'gift:offer:<to>:<gift id>:<store id>:<product id>'
//      Only ids travel: the friend looks the product up in their own copy of
//      the shop data, so a message can't make up an item or a price.
//   2. The friend sees a card and taps Accept or No thanks. They answer
//        'gift:ok:<giver>:<gift id>' or 'gift:no:<giver>:<gift id>:<reason>'
//      (reason: no = declined, have = already owns it, full = bag full,
//      busy = too many gifts waiting, late = the offer ran out).
//   3. A 'no', no answer within GIFT_WAIT, or either of them leaving the shop
//      gives the giver their coins back.
//
// Coins only ever leave the giver and items can't be sold back for coins, so
// gifts can't be used to farm coins between two accounts. The limits below
// stop gift spam: a few gifts waiting at a time, one per friend, a daily cap,
// and a friend who just said no can't be asked again for a little while.
//
// Like the wallet, all of this lives in the browser for now. Before coins
// can buy anything of value, gifts must go through a server.

export const GIFT_WAIT = 90 * 1000; // ms the giver waits for an answer
export const GIFT_SHOW = 75 * 1000; // ms the card stays up (less, so a late Accept isn't refunded too)
export const GIFTS_PER_DAY = 10; // accepted gifts a giver can send a day
export const MAX_OUT = 3; // gifts waiting for an answer at a time
export const MAX_IN = 3; // gift cards shown at a time
export const SNOOZE = 2 * 60 * 1000; // after a no, the same giver is turned away for this long
export const REASONS = ['no', 'have', 'full', 'busy', 'late'];
const KEY = 'mk.gifts';

const ID = '[\\w-]{1,64}';
const RE = new RegExp(`^gift:(?:(offer):(${ID}):(${ID}):(${ID}):(${ID})|(ok):(${ID}):(${ID})|(no):(${ID}):(${ID}):(${REASONS.join('|')}))$`);

export function giftMsg(verb, to, gid, a, b) {
  if (verb === 'offer') return `gift:offer:${to}:${gid}:${a}:${b}`;
  if (verb === 'no') return `gift:no:${to}:${gid}:${REASONS.includes(a) ? a : 'no'}`;
  return `gift:ok:${to}:${gid}`;
}
// { verb, to, gid, store?, product?, reason? } or null.
export function parseGift(e) {
  const m = RE.exec(String(e));
  if (!m) return null;
  if (m[1]) return { verb: 'offer', to: m[2], gid: m[3], store: m[4], product: m[5] };
  if (m[6]) return { verb: 'ok', to: m[7], gid: m[8] };
  return { verb: 'no', to: m[10], gid: m[11], reason: m[12] };
}

export class GiftBox {
  constructor(storage = globalThis.localStorage, now = () => Date.now(), today = () => new Date().toDateString()) {
    Object.assign(this, { storage, now, today });
    this.out = new Map(); // gift id -> { to, name, store, product, coins, at }
    this.in = new Map(); // gift id -> { from, name, store, product, at }
    this.snoozed = new Map(); // giver id -> until (ms)
    let s = {};
    try { s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    this.s = { day: String(s.day || ''), n: Math.max(0, s.n | 0) };
    this.seq = 0;
  }
  _roll() { if (this.s.day !== this.today()) this.s = { day: this.today(), n: 0 }; }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }

  // Gifts still allowed today.
  left() { this._roll(); return Math.max(0, GIFTS_PER_DAY - this.s.n); }

  // Why I can't send this friend a gift now ('limit', 'busy', 'waiting'),
  // or null when I can.
  why(to) {
    if (this.left() - this.out.size <= 0) return 'limit';
    if (this.out.size >= MAX_OUT) return 'busy';
    for (const g of this.out.values()) if (g.to === to) return 'waiting';
    return null;
  }

  // I paid and sent an offer: remember it. Returns the gift id.
  // paid: the wallet op id of the payment, so a refund gives back exactly that.
  send({ to, name, store, product, coins, paid = null }) {
    const gid = `${this.now().toString(36)}${(this.seq++).toString(36)}`.slice(-12);
    this.out.set(gid, { to, name, store, product, coins, paid, at: this.now() });
    return gid;
  }

  // The friend answered. Only the friend it was for can settle it.
  // Returns { gift, refund } (refund: coins to give back), or null.
  answer(from, gid, verb) {
    const g = this.out.get(gid);
    if (!g || g.to !== from) return null;
    this.out.delete(gid);
    if (verb === 'ok') {
      this._roll();
      this.s.n += 1;
      this._save();
      return { gift: g, refund: 0 };
    }
    return { gift: g, refund: g.coins };
  }

  // Offers nobody answered in time, or made to someone who left (gone(id)
  // true): taken off the list, to refund.
  expire(gone = () => false) {
    const done = [];
    for (const [gid, g] of this.out) {
      if (this.now() - g.at > GIFT_WAIT || gone(g.to)) { this.out.delete(gid); done.push(g); }
    }
    return done;
  }

  // Every offer still waiting (I'm leaving the shop): taken off, to refund.
  cancelAll() {
    const done = [...this.out.values()];
    this.out.clear();
    this.in.clear();
    return done;
  }

  // An offer came in. Returns 'show' (put up a card), or a reason to say no
  // right away ('busy'), or null to ignore it (a repeat).
  heard(from, name, { gid, store, product }) {
    if (this.in.has(gid)) return null;
    if ((this.snoozed.get(from) || 0) > this.now()) return 'no';
    for (const g of this.in.values()) if (g.from === from) return 'busy';
    if (this.in.size >= MAX_IN) return 'busy';
    this.in.set(gid, { gid, from, name, store, product, at: this.now() });
    return 'show';
  }

  // Cards to show, oldest first.
  cards() { return [...this.in.values()]; }

  // I tapped Accept or No thanks (or a card ran out): the card goes.
  // A no keeps that giver away for SNOOZE.
  reply(gid, ok) {
    const g = this.in.get(gid);
    if (!g) return null;
    this.in.delete(gid);
    if (!ok) this.snoozed.set(g.from, this.now() + SNOOZE);
    return g;
  }

  // Cards that ran out or whose giver left: taken off.
  stale(gone = () => false) {
    const done = [];
    for (const [gid, g] of this.in) if (this.now() - g.at > GIFT_SHOW || gone(g.from)) { this.in.delete(gid); done.push(g); }
    return done;
  }
}
