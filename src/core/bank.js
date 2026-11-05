// Bank transfers (송금): send coins to a friend who is in the same bank with
// you. No DOM, so it can be unit-tested.
//
// How it works (the same shape as gifts, see core/gifts.js):
//   1. At the teller, the sender picks a friend, an amount and a memo. The
//      amount plus the fee is paid at once and the offer goes out on the
//      emote channel:
//        'bank:offer:<to>:<transfer id>:<coins>:<memo>'
//      The memo is one of MEMOS (no free text, so nothing to moderate).
//   2. The friend sees a card and taps Accept or No thanks. They answer
//        'bank:ok:<sender>:<id>' or 'bank:no:<sender>:<id>:<reason>'
//      (reason: no = declined, limit = they can't take more today,
//      busy = another transfer is waiting, late = the offer ran out).
//   3. A 'no', no answer within WAIT, or either of them leaving the bank
//      gives the sender everything back, fee included.
//
// Why there are limits: a gift (PR #90) only ever turns coins into things,
// so it can't move coins from one account to another. A transfer does, and
// that lets someone open many accounts, collect each one's travel money
// and ads, and pour it all into one account. The rules keep that slow and
// small without getting in the way of friends:
//   - only accounts that have played for MIN_AGE_DAYS can send (a brand new
//     account can't pass on its welcome money at once),
//   - each transfer is SEND_MIN to SEND_MAX coins, and costs a FEE
//     (it disappears, so moving coins around always loses some),
//   - a sender can send DAY_OUT coins in SENDS_PER_DAY transfers a day,
//   - and anyone can receive at most DAY_IN coins a day, so ten accounts
//     sending to one still add up to DAY_IN a day,
//   - both have to stand in the bank, and the friend has to accept.
//
// Like the wallet, this lives in the browser for now, so the receiving side
// trusts the sender's numbers. Before coins can buy anything of value,
// balances and transfers must move to a server that checks these same rules.

export const SEND_MIN = 10;
export const SEND_MAX = 200;
export const FEE = 5;
export const DAY_OUT = 300; // coins a sender can send a day
export const SENDS_PER_DAY = 3; // transfers a sender can make a day
export const DAY_IN = 300; // coins anyone can receive a day
export const MIN_AGE_DAYS = 3; // days since first played before you can send
export const WAIT = 90 * 1000; // ms the sender waits for an answer
export const SHOW = 75 * 1000; // ms the card stays up (less, so a late Accept isn't refunded too)
export const SNOOZE = 2 * 60 * 1000; // after a no, the same sender is turned away for this long
export const MAX_IN = 2; // transfer cards shown at a time
export const MEMOS = ['thanks', 'food', 'coffee', 'birthday', 'payback', 'trip'];
export const REASONS = ['no', 'limit', 'busy', 'late'];
const DAY = 24 * 60 * 60 * 1000;
const KEY = 'mk.bank';

const ID = '[\\w-]{1,64}';
const RE = new RegExp(`^bank:(?:(offer):(${ID}):(${ID}):(\\d{1,4}):(${MEMOS.join('|')})|(ok):(${ID}):(${ID})|(no):(${ID}):(${ID}):(${REASONS.join('|')}))$`);

export function bankMsg(verb, to, tid, a, b) {
  if (verb === 'offer') return `bank:offer:${to}:${tid}:${a | 0}:${MEMOS.includes(b) ? b : MEMOS[0]}`;
  if (verb === 'no') return `bank:no:${to}:${tid}:${REASONS.includes(a) ? a : 'no'}`;
  return `bank:ok:${to}:${tid}`;
}
// { verb, to, tid, coins?, memo?, reason? } or null.
export function parseBank(e) {
  const m = RE.exec(String(e));
  if (!m) return null;
  if (m[1]) return { verb: 'offer', to: m[2], tid: m[3], coins: Number(m[4]), memo: m[5] };
  if (m[6]) return { verb: 'ok', to: m[7], tid: m[8] };
  return { verb: 'no', to: m[10], tid: m[11], reason: m[12] };
}

export class Bank {
  // firstSeen: when this player first played, if known from elsewhere (the
  // oldest budget book entry); used only the first time, then kept.
  constructor(storage = globalThis.localStorage, now = () => Date.now(), today = () => new Date().toDateString(), firstSeen = null) {
    Object.assign(this, { storage, now, today });
    this.out = null; // the one transfer I'm waiting on: { tid, to, name, coins, memo, at }
    this.in = new Map(); // transfer id -> { tid, from, name, coins, memo, at }
    this.snoozed = new Map(); // sender id -> until (ms)
    let s = {};
    try { s = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
    const num = (v) => Math.max(0, Math.floor(Number(v) || 0));
    const since = num(s.since) || Math.min(this.now(), num(firstSeen) || Infinity);
    this.s = { since, day: String(s.day || ''), sent: num(s.sent), sends: num(s.sends), got: num(s.got) };
    if (!s.since) this._save();
    this.seq = 0;
  }
  _roll() { if (this.s.day !== this.today()) Object.assign(this.s, { day: this.today(), sent: 0, sends: 0, got: 0 }); }
  _save() { try { this.storage?.setItem(KEY, JSON.stringify(this.s)); } catch { /* storage blocked */ } }

  // Whole days until this account can send (0 = it can).
  daysToGo() {
    const left = this.s.since + MIN_AGE_DAYS * DAY - this.now();
    return left > 0 ? Math.ceil(left / DAY) : 0;
  }
  // What's left today: { coins, sends, inCoins }. A transfer still waiting
  // counts as sent until it's answered.
  left() {
    this._roll();
    const wait = this.out ? this.out.coins : 0;
    return {
      coins: Math.max(0, DAY_OUT - this.s.sent - wait),
      sends: Math.max(0, SENDS_PER_DAY - this.s.sends - (this.out ? 1 : 0)),
      inCoins: Math.max(0, DAY_IN - this.s.got),
    };
  }
  // The most I can send now with `balance` coins (fee included), or 0.
  maxSend(balance) {
    const l = this.left();
    if (!l.sends) return 0;
    const n = Math.min(SEND_MAX, l.coins, Math.floor(balance) - FEE);
    return n >= SEND_MIN ? n : 0;
  }

  // Why I can't send `coins` now: 'new' (account too new), 'waiting' (one is
  // already waiting), 'sends' or 'limit' (today's transfers or coins are
  // used up), 'amount' (outside SEND_MIN..SEND_MAX), 'poor' (not enough
  // coins for it and the fee); or null when I can.
  why(coins, balance) {
    if (this.daysToGo() > 0) return 'new';
    if (this.out) return 'waiting';
    const l = this.left();
    if (!l.sends) return 'sends';
    if (!Number.isInteger(coins) || coins < SEND_MIN || coins > SEND_MAX) return 'amount';
    if (coins > l.coins) return 'limit';
    if (coins + FEE > balance) return 'poor';
    return null;
  }

  // I paid and sent an offer: remember it. Returns the transfer id.
  send({ to, name, coins, memo }) {
    const tid = `${this.now().toString(36)}${(this.seq++).toString(36)}`.slice(-12);
    this.out = { tid, to, name, coins, memo, at: this.now() };
    return tid;
  }

  // The friend answered. Only the friend it was for can settle it.
  // Returns { t, refund } (refund: coins to give back, fee included), or null.
  answer(from, tid, verb) {
    const t = this.out;
    if (!t || t.tid !== tid || t.to !== from) return null;
    this.out = null;
    if (verb === 'ok') {
      this._roll();
      this.s.sent += t.coins;
      this.s.sends += 1;
      this._save();
      return { t, refund: 0 };
    }
    return { t, refund: t.coins + FEE };
  }

  // The offer if nobody answered in time, or it was made to someone who
  // left (gone(id) true): taken off, to refund. Else null.
  expire(gone = () => false) {
    const t = this.out;
    if (!t || (this.now() - t.at <= WAIT && !gone(t.to))) return null;
    this.out = null;
    return t;
  }

  // I'm leaving the bank: the offer still waiting is taken off (to refund),
  // and the cards go.
  cancelAll() {
    const t = this.out;
    this.out = null;
    this.in.clear();
    return t;
  }

  // An offer came in. Returns 'show' (put up a card), a reason to say no
  // right away ('no', 'busy', 'limit'), or null to ignore it (a repeat).
  heard(from, name, { tid, coins, memo }) {
    if (this.in.has(tid)) return null;
    if ((this.snoozed.get(from) || 0) > this.now()) return 'no';
    if (coins < SEND_MIN || coins > SEND_MAX) return 'no';
    for (const t of this.in.values()) if (t.from === from) return 'busy';
    if (this.in.size >= MAX_IN) return 'busy';
    if (coins > this.left().inCoins) return 'limit';
    this.in.set(tid, { tid, from, name, coins, memo, at: this.now() });
    return 'show';
  }

  // Cards to show, oldest first.
  cards() { return [...this.in.values()]; }

  // I tapped Accept or No thanks: the card goes. Returns { t, ok } where ok
  // is false when I said no, or when taking it would go over today's limit
  // (then the answer to send is 'limit'); null when there's no such card.
  // A no keeps that sender away for SNOOZE.
  reply(tid, ok) {
    const t = this.in.get(tid);
    if (!t) return null;
    this.in.delete(tid);
    if (!ok) { this.snoozed.set(t.from, this.now() + SNOOZE); return { t, ok: false, reason: 'no' }; }
    this._roll();
    if (this.s.got + t.coins > DAY_IN) return { t, ok: false, reason: 'limit' };
    this.s.got += t.coins;
    this._save();
    return { t, ok: true };
  }

  // Cards that ran out or whose sender left: taken off.
  stale(gone = () => false) {
    const done = [];
    for (const [tid, t] of this.in) if (this.now() - t.at > SHOW || gone(t.from)) { this.in.delete(tid); done.push(t); }
    return done;
  }
}
