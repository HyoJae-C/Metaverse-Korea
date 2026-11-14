// Rooftop Rumble between two people (rules: core/brawl.js). Each screen runs
// the same match from the same inputs. Our own buttons act a few ticks later
// (DELAY) and are sent ahead; until the other player's buttons arrive we
// guess they keep holding the stick as it was, show that, and when the real
// ones come we run the match again from the last tick both are known for.
// So nobody waits on the network to see their own punch.
//
// The host (side 0) also sends the whole match every two seconds: the other
// screen takes it if its own differs (two browsers' maths can differ in the
// last digit), so the two can never drift apart for long.
//
// Messages (plain objects; game/brawl-versus.js carries them):
//   { h, g, k, f, i }  h: ticks we have played, g: how far ahead of the
//                      other we seem to be, k: their inputs we have up to
//                      this tick, f: the tick of i[0], i: our inputs
//   { s, d }           the host's match after s ticks
import { newMatch, stepMatch, copyMatch, packMatch, unpackMatch } from './brawl.js';

export const DELAY = 3; // ticks between a press and the punch (50 ms)
export const SEND_EVERY = 4; // ticks between messages (15 a second)
export const MAX_AHEAD = 40; // ticks we play on guesses before waiting
export const SNAP_EVERY = 120;
const KEEP = 600; // ticks of inputs kept (for a host's match that arrives late)
const SOFT = new Set(['round', 'fight', 'ko', 'time', 'over']); // said once, only when certain

// An input as one small number, and back.
const BTN = ['p', 'k', 's1', 's2'];
export function packInput(inp) {
  if (!inp) return 0;
  let n = (Math.sign(inp.mx || 0) + 1) | ((Math.sign(inp.mz || 0) + 1) << 2) | ((Math.sign(inp.dash || 0) + 1) << 4);
  BTN.forEach((b, i) => { if (inp[b]) n |= 64 << i; });
  return n;
}
const NONE = packInput({});
export function unpackInput(n) {
  if (!Number.isInteger(n) || n < 0 || n > 1023) n = NONE;
  const part = (v) => ((v & 3) > 2 ? 0 : (v & 3) - 1);
  const out = { mx: part(n), mz: part(n >> 2) };
  const dash = part(n >> 4);
  if (dash) out.dash = dash;
  BTN.forEach((b, i) => { if (n & (64 << i)) out[b] = true; });
  return out;
}
const held = (n) => (n & 15) | (1 << 4); // the stick only: no buttons, no dash

// side: 0 the host (the left fighter in the rules), 1 the guest.
// send(msg): to the other player. styles: [host's, guest's].
// onSure(ia, ib, match): each tick once it is certain, in order (the host
// shows the match on the arcade's wall screen from these: core/brawl-tv.js).
export function createSession({ side, styles, send, onSure }) {
  let conf = newMatch(styles[0], styles[1], true); // the match after `sure` ticks, certain
  let sure = 0;
  let head = 0; // ticks we have played
  let shown = copyMatch(conf);
  const mine = new Map(), theirs = new Map(); // tick → input
  let theirsTo = -1; // their inputs are known up to this tick
  let acked = -1; // they have ours up to this tick
  let theirGap = null, skip = 0;
  let sinceSend = 0;
  const said = new Map(); // what was shown or played: key → tick
  const snaps = new Map(); // tick → our match then (JSON), to compare with the host's
  let softTo = 0; // round calls up to this tick were said (the host's match can take us back)
  let pending = null; // a host's match for a tick we have not reached

  for (let t = 0; t < DELAY; t++) mine.set(t, NONE);
  const inputAt = (map, t) => unpackInput(map.get(t) ?? NONE);
  const guess = (t) => unpackInput(t <= theirsTo ? theirs.get(t) : held(theirs.get(theirsTo) ?? NONE));
  const step = (m, t, certain) => {
    const me = inputAt(mine, t), them = certain ? inputAt(theirs, t) : guess(t);
    return side ? stepMatch(m, them, me) : stepMatch(m, me, them);
  };
  // An event is shown once: a hit guessed and then confirmed a few ticks
  // either side is the same hit. Round calls and knock-outs wait until certain.
  function fresh(ev, t, certain, out) {
    for (const e of ev) {
      if (SOFT.has(e.k)) { if (certain && t >= softTo) out.push(e); continue; }
      const key = e.k + ':' + (e.by ?? e.who ?? '') + ':' + (e.move ?? '');
      const last = said.get(key);
      if (last != null && Math.abs(t - last) <= 10) continue;
      said.set(key, t);
      out.push(e);
    }
  }
  function advance(out) {
    while (sure < head && sure <= theirsTo) {
      fresh(step(conf, sure, true), sure, true, out);
      if (onSure) { const me = inputAt(mine, sure), them = inputAt(theirs, sure); onSure(side ? them : me, side ? me : them, conf); }
      sure++;
      softTo = Math.max(softTo, sure);
      if (sure % SNAP_EVERY === 0) {
        const d = JSON.stringify(packMatch(conf));
        if (side === 0) send({ s: sure, d });
        else { snaps.set(sure, d); if (snaps.size > 6) snaps.delete(snaps.keys().next().value); }
      }
      if (pending && pending.s === sure) { take(pending); pending = null; }
    }
    shown = copyMatch(conf);
    for (let t = sure; t < head; t++) fresh(step(shown, t, false), t, false, out);
    for (const t of mine.keys()) { if (t >= sure - KEEP) break; mine.delete(t); theirs.delete(t); }
  }
  // The host's match after s ticks: ours should be the same.
  function take({ s, d }) {
    if (s > sure) { pending = { s, d }; return; }
    const own = snaps.get(s);
    if (own === d || s < sure - KEEP + DELAY) return;
    if (own == null && s !== sure) return; // (too old to compare)
    try { conf = unpackMatch(JSON.parse(d)); } catch { return; }
    sure = s;
    for (const t of [...snaps.keys()]) if (t >= s) snaps.delete(t);
    snaps.set(s, d);
  }

  const api = {
    get match() { return shown; },
    get head() { return head; },
    get sure() { return sure; },
    get certain() { return conf; },
    get waiting() { return head - sure >= MAX_AHEAD; }, // (standing still for the other player)
    // Once every 1/60 s with what the player holds and pressed: what happened.
    tick(inp) {
      const out = [], at = head + DELAY;
      // (A tick we could not play keeps its presses for the next.)
      mine.set(at, (mine.has(at) ? mine.get(at) & 0x3c0 : 0) | packInput(inp));
      const gap = head + DELAY - 1 - theirsTo; // how far ahead of what we heard from them
      let go = head - sure < MAX_AHEAD;
      // Ahead of the other screen: let it catch up, one tick in six.
      if (go && theirGap != null && gap - theirGap > 3 && ++skip >= 6) { skip = 0; go = false; }
      if (go) head++;
      advance(out);
      if (++sinceSend >= SEND_EVERY) {
        sinceSend = 0;
        const from = Math.max(acked + 1, at - 30, 0), i = [];
        for (let t = from; t <= (go ? at : at - 1); t++) i.push(mine.get(t) ?? NONE);
        send({ h: head, g: gap, k: theirsTo, f: from, i });
      }
      return out;
    },
    // A message from the other player.
    receive(msg) {
      if (!msg || typeof msg !== 'object') return;
      if (typeof msg.d === 'string' && Number.isInteger(msg.s)) { if (side === 1) take(msg); return; }
      if (!Array.isArray(msg.i) || !Number.isInteger(msg.f) || msg.f < 0 || msg.i.length > 64) return;
      if (Number.isInteger(msg.k)) acked = Math.max(acked, Math.min(msg.k, head + DELAY));
      if (Number.isFinite(msg.g)) theirGap = msg.g;
      if (msg.f > theirsTo + 1) return; // (a hole: the next message fills it)
      for (let j = 0; j < msg.i.length; j++) {
        const t = msg.f + j;
        if (t > theirsTo) { theirs.set(t, msg.i[j] | 0); theirsTo = t; }
      }
    },
  };
  return api;
}
