// Fishing contest with a friend (낚시 내기, Yozi 2026-11-20): two friends
// fishing in the same Han River park race for the best fish in three
// minutes, by the rule the asker picks (RULES). By default the rarest fish
// (most ★) wins, then the longer one (Yozi: a short axolotl is harder to
// catch than a long cutlassfish, so length alone isn't fair). No money on it, only the result. No DOM, so it can be unit-tested
// (game/fish-contest.js is the game side).
//
// Three minutes is about 10-12 fish by hand: a bite takes 2.5-8.5 s to come
// (core/fishing.js biteWait), reeling up to 5 s, plus the cast and the card.
//
// Messages, on the emote channel like gifts and high fives:
//   fc:ask:<to>:<cid>:<rule>      I ask <to> to a contest (RULES below)
//   fc:ok:<to>:<cid>              <to> asked me, I say yes: both count down now
//   fc:no:<to>:<cid>              no (or busy)
//   fc:fish:<to>:<cid>:<fish>:<cm>  I landed a fish (the boot doesn't count)
//   fc:end:<to>:<cid>:<cm>:<fish>:<a-b-c-d-e>  my time is up: my best and
//                                 how many fish of ★1 … ★5
//   fc:quit:<to>:<cid>            I stopped (walked off, closed the page)
// Both sides finish on their own clock; each sends its own final line and
// the result is worked out from both finals, so both screens agree.
// A length can't be bigger than that fish ever gets here (see sizeOk).

import { REAL_LENGTH } from './fish-tank.js';
import { fishById } from './fishing.js';

export const CONTEST_MS = 3 * 60 * 1000; // Yozi: 30 min was too long, 3 min is right
export const COUNTDOWN_MS = 3000; // 3, 2, 1
export const ASK_WAIT = 30 * 1000; // an ask runs out after this
export const FINAL_WAIT = 6000; // after my time is up, how long I wait for the friend's final line
export const ASK_RADIUS = 8; // m: both by the water, a few spots apart
export const SIZE_MIN = 0.8, SIZE_MAX = 1.2; // a fish's length: its kind's usual length × this

// The rule, picked by whoever asks (Yozi 2026-11-20):
//   rare  the rarest fish (most ★) wins; the same ★, the longer one (default)
//   sum   the most ★ added up over every fish caught; the same total, more
//         of the highest ★ (then the next ★ down…); then the longer fish
//   long  the longest fish
export const RULES = ['rare', 'sum', 'long'];
export const DEFAULT_RULE = 'rare';

const ID = /^[\w-]{1,64}$/;
const FISH_ID = /^[\w-]{1,40}$/;
const NUM = /^\d{1,5}$/;

// How many fish of each ★ (index 1-5; 0 unused), as sent: "3-2-0-0-1".
const countsText = (by) => [1, 2, 3, 4, 5].map((r) => Math.max(0, (by?.[r] | 0))).join('-');
const COUNTS = /^\d{1,3}(?:-\d{1,3}){4}$/;
export const sumOf = (by) => [1, 2, 3, 4, 5].reduce((a, r) => a + r * (by?.[r] || 0), 0);
export const countOf = (by) => [1, 2, 3, 4, 5].reduce((a, r) => a + (by?.[r] || 0), 0);

export function contestMsg(verb, to, cid, a, b, c) {
  if (verb === 'ask') return `fc:ask:${to}:${cid}:${RULES.includes(a) ? a : DEFAULT_RULE}`;
  if (verb === 'fish') return `fc:fish:${to}:${cid}:${a}:${b}`;
  if (verb === 'end') return `fc:end:${to}:${cid}:${a | 0}:${b || ''}:${countsText(c)}`;
  return `fc:${verb}:${to}:${cid}`;
}
// { verb, to, cid, rule?, fish?, cm?, n?, sum? } or null.
export function parseContest(e) {
  const p = String(e).split(':');
  if (p[0] !== 'fc' || p.length < 4 || !ID.test(p[2]) || !ID.test(p[3])) return null;
  const [, verb, to, cid] = p, rest = p.slice(4);
  if (verb === 'ask') return rest.length === 1 && RULES.includes(rest[0]) ? { verb, to, cid, rule: rest[0] } : null;
  if (verb === 'fish') return rest.length === 2 && FISH_ID.test(rest[0]) && NUM.test(rest[1]) ? { verb, to, cid, fish: rest[0], cm: +rest[1] } : null;
  if (verb === 'end') {
    const [cm, fish, counts] = rest;
    if (rest.length !== 3 || !NUM.test(cm) || !(fish === '' || FISH_ID.test(fish)) || !COUNTS.test(counts)) return null;
    return { verb, to, cid, cm: +cm, fish: fish || null, by: [0, ...counts.split('-').map(Number)] };
  }
  return ['ok', 'no', 'quit'].includes(verb) && !rest.length ? { verb, to, cid } : null;
}

// The usual length of a kind, in cm (10 cm for one without a length).
const usual = (id) => Math.round((REAL_LENGTH[id] || 0.1) * 100);
// This catch's length in cm.
export function fishLength(id, rand = Math.random) {
  return Math.max(1, Math.round(usual(id) * (SIZE_MIN + rand() * (SIZE_MAX - SIZE_MIN))));
}
export const stars = (id) => (id ? fishById(id)?.rarity || 0 : 0);
// Is catch a ({ fish, cm }) better than b? The longer one under 'long',
// else the rarer, then the longer.
export function better(a, b, rule = DEFAULT_RULE) {
  if (rule === 'long') return a.cm > b.cm;
  const sa = stars(a.fish), sb = stars(b.fish);
  return sa !== sb ? sa > sb : a.cm > b.cm;
}
// Who wins: 'me' | 'them' | 'tie'. Each side: { cm, fish, by } (its best
// catch and how many of each ★).
//   sum: the ★ added up; the same, more ★5, then ★4 … (Yozi); then the longer fish.
//   rare / long: the best fish (better()); the same one is a draw.
// Nothing left to tell them apart (or no fish on either side): 'tie', a draw.
export function winner(me, them, rule = DEFAULT_RULE) {
  const pick = (x) => (x > 0 ? 'me' : x < 0 ? 'them' : null);
  if (rule === 'sum') {
    const w = pick(sumOf(me.by) - sumOf(them.by)) || [5, 4, 3, 2, 1].map((r) => pick((me.by?.[r] || 0) - (them.by?.[r] || 0))).find(Boolean) || pick(me.cm - them.cm);
    return w || 'tie';
  }
  if (better(me, them, rule)) return 'me';
  if (better(them, me, rule)) return 'them';
  return 'tie'; // the same best fish: a draw (Yozi 2026-11-20)
}
// Could this fish really be that long? (a made-up line is ignored)
export function sizeOk(id, cm) {
  const f = fishById(id);
  return !!f && !f.trash && cm >= 1 && cm <= Math.ceil(usual(id) * SIZE_MAX) + 1;
}

// One contest at a time. now(): ms.
export class FishContest {
  constructor(now = () => Date.now()) {
    this.now = now;
    this.asks = new Map(); // id -> { cid, at }: friends who asked me
    this.out = null; // { to, cid, at }: my ask
    this.c = null; // the running contest
  }
  get on() { return !!this.c && !this.c.done; }
  // The friend I'm in a contest with (or null).
  get with() { return this.on ? this.c.with : null; }

  ask(to, cid, rule = DEFAULT_RULE) {
    if (this.on) return false;
    this.out = { to, cid, rule: RULES.includes(rule) ? rule : DEFAULT_RULE, at: this.now() };
    return true;
  }
  asked(id) { const a = this.asks.get(id); return !!a && this.now() - a.at < ASK_WAIT; }
  askedMe(id) { return this.asked(id) ? this.asks.get(id).cid : null; }
  // The rule the friend picked when asking me (or null).
  ruleOf(id) { return this.asked(id) ? this.asks.get(id).rule : null; }
  get rule() { return this.c?.rule || DEFAULT_RULE; }
  waitingFor(id) { return !!this.out && this.out.to === id && this.now() - this.out.at < ASK_WAIT; }

  // A message from `from` (to me). Returns what the game should do:
  //   'asked' (show the ask), 'start' (they said yes: count down), 'no',
  //   'fish' (their catch counts), 'final' (their final line came: maybe
  //   the result), 'quit', or null (nothing).
  heard(from, m) {
    const t = this.now();
    if (m.verb === 'ask') {
      if (this.on) return 'busy';
      this.asks.set(from, { cid: m.cid, rule: RULES.includes(m.rule) ? m.rule : DEFAULT_RULE, at: t });
      return 'asked';
    }
    if (m.verb === 'ok') {
      if (!this.out || this.out.to !== from || this.out.cid !== m.cid || t - this.out.at >= ASK_WAIT || this.on) return null;
      const rule = this.out.rule;
      this.out = null;
      this._start(from, m.cid, rule);
      return 'start';
    }
    if (m.verb === 'no') {
      if (this.out?.to === from && this.out.cid === m.cid) { this.out = null; return 'no'; }
      return null;
    }
    const c = this.c;
    if (!c || c.with !== from || c.cid !== m.cid) return null;
    if (m.verb === 'quit') {
      if (c.done) return null;
      c.done = true; c.quit = 'them';
      return 'quit';
    }
    if (m.verb === 'fish') {
      if (c.done && c.theirFinal) return null;
      if (!sizeOk(m.fish, m.cm)) return null;
      c.them.by[stars(m.fish)] += 1;
      if (better(m, c.them, c.rule)) Object.assign(c.them, { cm: m.cm, fish: m.fish });
      return 'fish';
    }
    if (m.verb === 'end') {
      if (c.theirFinal) return null;
      const ok = m.cm === 0 ? !m.fish : sizeOk(m.fish, m.cm) && m.by[stars(m.fish)] > 0;
      c.theirFinal = ok ? { cm: m.cm, fish: m.fish, by: m.by } : { ...c.them, by: [...c.them.by] };
      return 'final';
    }
    return null;
  }

  // I say yes to `from`'s ask: returns the cid to send back, or null.
  accept(from) {
    const cid = this.askedMe(from);
    if (!cid || this.on) return null;
    const rule = this.ruleOf(from);
    this.asks.delete(from);
    this.out = null;
    this._start(from, cid, rule);
    return cid;
  }
  decline(from) {
    const cid = this.askedMe(from);
    this.asks.delete(from);
    return cid;
  }

  _start(id, cid, rule = DEFAULT_RULE) {
    const t = this.now();
    this.c = { with: id, cid, rule, go: t + COUNTDOWN_MS, end: t + COUNTDOWN_MS + CONTEST_MS,
      me: { cm: 0, fish: null, by: [0, 0, 0, 0, 0, 0] }, them: { cm: 0, fish: null, by: [0, 0, 0, 0, 0, 0] }, done: false, sent: false, theirFinal: null };
  }
  // 'count' (3-2-1), 'fish' (go!), 'wait' (my time is up, waiting for theirs), or null.
  phase() {
    const c = this.c;
    if (!c || c.done) return null;
    const t = this.now();
    if (t < c.go) return 'count';
    if (t < c.end) return 'fish';
    return 'wait';
  }
  secondsLeft() {
    const c = this.c;
    if (!c) return 0;
    const t = this.now();
    return Math.max(0, Math.ceil(((t < c.go ? c.go : c.end) - t) / 1000));
  }
  // I landed a fish. Returns its length in cm while the contest is on, else null.
  caught(id, rand = Math.random) {
    if (this.phase() !== 'fish') return null;
    const f = fishById(id);
    if (!f || f.trash) return null;
    const cm = fishLength(id, rand);
    const me = this.c.me;
    me.by[f.rarity || 1] += 1;
    if (better({ fish: id, cm }, me, this.c.rule)) Object.assign(me, { cm, fish: id });
    return cm;
  }
  // My final line, once (when my time is up), or null.
  final() {
    const c = this.c;
    if (!c || c.sent || this.phase() !== 'wait') return null;
    c.sent = true;
    c.sentAt = this.now();
    return { ...c.me, by: [...c.me.by] };
  }
  // The result once both finals are in (or theirs is late): { me, them,
  // win: 'me' | 'them' | 'tie' }, once. Null before that.
  result() {
    const c = this.c;
    if (!c || c.done || !c.sent) return null;
    if (!c.theirFinal && this.now() - c.sentAt < FINAL_WAIT) return null;
    const them = c.theirFinal || c.them;
    c.done = true;
    return { me: { ...c.me, by: [...c.me.by] }, them: { ...them, by: [...them.by] }, win: winner(c.me, them, c.rule), rule: c.rule };
  }
  // It stops: I walked off (who 'me'), or the friend is gone ('them').
  // Returns { to, cid } to tell the friend, or null.
  quit(who = 'me') {
    const c = this.c;
    if (!c || c.done) return null;
    c.done = true; c.quit = who;
    return { to: c.with, cid: c.cid };
  }
}
