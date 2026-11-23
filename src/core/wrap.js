// Wrapped gifts: buy something in a shop gift-wrapped, carry the box in your
// bag, and hand it to a friend standing next to you, anywhere (Yozi
// 2026-11-21: "가방에서 꺼내면 줄 수 있게"). A letter on letter paper from a
// stationery shop can go with it. No DOM, so it can be unit-tested.
//
// How it works:
//   1. In a shop, "🎀 Gift-wrap" pays at once (the ledger note has 🎁🎀, so
//      the server can bind it to the friend later) and puts a box in the bag:
//        { kind: 'wrap', w: '<box id>', s: '<store id>', p: '<product id>',
//          c: coins paid, op: '<wallet op id>' | null, lt?: '<letter>' }
//      The box isn't sold and can't be thrown away; I can open it myself.
//   2. Next to a friend (WRAP_RANGE), the bag's "Hand it over" sends
//        'wrap:offer:<to>:<box id>:<store id>:<product id>:<1 with a letter, else 0>'
//      Only ids travel: the friend looks the product up in their own shop
//      data, so a message can't make up an item.
//   3. The friend sees a card (what's inside stays a surprise) and answers
//        'wrap:ok:<giver>:<box id>' or 'wrap:no:<giver>:<box id>:<reason>'
//      On ok the box leaves my bag, clothes get their receipt (gift_bind, as
//      for shop gifts) and the letter goes as a friend message, so it is kept
//      on the server like all chat (admins can read it). A no, or no answer,
//      and the box simply stays in my bag.

export const WRAP_RANGE = 5; // m: how close a friend must stand
export const WRAP_WAIT = 60 * 1000; // ms the giver waits for an answer
export const WRAP_SHOW = 50 * 1000; // ms a card stays up (less, so a late Accept still lands)
export const SNOOZE = 2 * 60 * 1000; // after a no, the same giver is turned away for this long
export const LETTER_MAX = 140; // characters in a letter (a friend message holds 200)
export const LETTER_MARK = '💌 '; // a letter's friend message starts with this
export const SHEETS_MAX = 30; // letter paper kept in one bag slot
export const REASONS = ['no', 'have', 'full', 'busy', 'late'];

const ID = '[\\w-]{1,64}';
const RE = new RegExp(`^wrap:(?:(offer):(${ID}):(${ID}):(${ID}):(${ID}):([01])|(ok):(${ID}):(${ID})|(no):(${ID}):(${ID}):(${REASONS.join('|')}))$`);

export function wrapMsg(verb, to, wid, a, b, letter) {
  if (verb === 'offer') return `wrap:offer:${to}:${wid}:${a}:${b}:${letter ? 1 : 0}`;
  if (verb === 'no') return `wrap:no:${to}:${wid}:${REASONS.includes(a) ? a : 'no'}`;
  return `wrap:ok:${to}:${wid}`;
}
// { verb, to, wid, store?, product?, letter?, reason? } or null.
export function parseWrap(e) {
  const m = RE.exec(String(e));
  if (!m) return null;
  if (m[1]) return { verb: 'offer', to: m[2], wid: m[3], store: m[4], product: m[5], letter: m[6] === '1' };
  if (m[7]) return { verb: 'ok', to: m[8], wid: m[9] };
  return { verb: 'no', to: m[11], wid: m[12], reason: m[13] };
}

// A letter as it is kept: one line, no control characters, LETTER_MAX long.
export const cleanLetter = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, LETTER_MAX);

const isId = (x) => typeof x === 'string' && /^[\w-]{1,64}$/.test(x);
// A box from a save, or null when it's broken.
export function wrapEntry(e) {
  if (!isId(e?.w) || !isId(e.s) || !isId(e.p)) return null;
  const out = { kind: 'wrap', w: e.w, s: e.s, p: e.p, c: Math.max(0, Math.min(1e9, Math.round(Number(e.c) || 0))), op: typeof e.op === 'string' && /^[0-9a-f-]{36}$/.test(e.op) ? e.op : null };
  const lt = cleanLetter(e.lt);
  if (lt) out.lt = lt;
  return out;
}
// Letter paper: { kind: 'letter', sips: sheets left }.
export function letterEntry(e) {
  const sips = Math.min(SHEETS_MAX, e?.sips | 0);
  return sips > 0 ? { kind: 'letter', sips } : null;
}
export const newWrapId = (now = Date.now(), rnd = Math.random) => (now.toString(36) + Math.floor(rnd() * 1679616).toString(36)).slice(-12);

// The offers I made and the cards I was shown.
export class WrapDesk {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.out = new Map(); // box id -> { to, name, at }
    this.in = new Map(); // box id -> { wid, from, name, store, product, letter, at }
    this.snoozed = new Map(); // giver id -> until (ms)
  }
  // Why I can't hand this box over now ('waiting': it, or a box to this
  // friend, is still waiting for an answer), or null.
  why(wid, to) {
    if (this.out.has(wid)) return 'waiting';
    for (const g of this.out.values()) if (g.to === to) return 'waiting';
    return null;
  }
  pending(wid) { return this.out.has(wid); }
  offer(wid, to, name) { this.out.set(wid, { to, name, at: this.now() }); }
  // The friend answered: only the friend it was offered to can settle it.
  answer(from, wid) {
    const g = this.out.get(wid);
    if (!g || g.to !== from) return null;
    this.out.delete(wid);
    return { wid, ...g };
  }
  // Offers nobody answered in time, or made to someone who left.
  expire(gone = () => false) {
    const done = [];
    for (const [wid, g] of this.out) if (this.now() - g.at > WRAP_WAIT || gone(g.to)) { this.out.delete(wid); done.push({ wid, ...g }); }
    return done;
  }
  // An offer came in: 'show', a reason to say no now, or null (a repeat).
  heard(from, name, m) {
    if (this.in.has(m.wid)) return null;
    if ((this.snoozed.get(from) || 0) > this.now()) return 'no';
    for (const c of this.in.values()) if (c.from === from) return 'busy';
    if (this.in.size >= 3) return 'busy';
    this.in.set(m.wid, { wid: m.wid, from, name, store: m.store, product: m.product, letter: !!m.letter, at: this.now() });
    return 'show';
  }
  cards() { return [...this.in.values()]; }
  reply(wid, ok) {
    const c = this.in.get(wid);
    if (!c) return null;
    this.in.delete(wid);
    if (!ok) this.snoozed.set(c.from, this.now() + SNOOZE);
    return c;
  }
  stale(gone = () => false) {
    const done = [];
    for (const [wid, c] of this.in) if (this.now() - c.at > WRAP_SHOW || gone(c.from)) { this.in.delete(wid); done.push(c); }
    return done;
  }
}
