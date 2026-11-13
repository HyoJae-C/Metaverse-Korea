// Rooftop Rumble on the arcade's wall screen: whoever plays sends the match
// to the room, and everyone else's screen plays the same match a moment
// later (rules: core/brawl.js). Not pictures: the two fighters' inputs, in
// small batches, and the whole match now and then for whoever walks in late
// (and in case two browsers' maths differ in the last digit).
//
// Messages (the room's emotes; game/arcade.js hands them over):
//   brawltv:s:<json>           { t, b, n, m }: the match (m) after t ticks.
//                              b: who the sender fights: another player's id,
//                              or 'r<n>' for the game's own rival n. n: the
//                              sender's and the other's names.
//   brawltv:i:<t>:<aa��>:<bb��>  both fighters' inputs from tick t on, two
//                              base-36 digits a tick
//   brawltv:x                  the match is over, or the player left
import { stepMatch, packMatch, unpackMatch } from './brawl.js';
import { packInput, unpackInput } from './brawl-net.js';

export const TV = 'brawltv:';
export const BATCH = 20; // ticks in a batch of inputs (3 messages a second)
export const KEY_EVERY = 300; // ticks between whole matches (5 s)
const BEHIND = 30; // ticks the screen stays behind what it has, to play evenly
const enc = (n) => n.toString(36).padStart(2, '0');

// Solo play advertises only a status, never inputs, HP or match snapshots.
export function createSoloCaster(send) {
  let ticks = 0, over = false;
  const status = () => send(TV + 'p');
  return {
    start() { status(); },
    step() { if (!over && ++ticks % KEY_EVERY === 0) status(); },
    end() { if (!over) { over = true; send(TV + 'x'); } },
  };
}

// The player's side. send(text): to the room. about: { b, n } (see above).
export function createCaster(send, about) {
  let t = 0, a = '', b = '', from = 0, over = false;
  const key = (m) => send(TV + 's:' + JSON.stringify({ t, ...about, m: packMatch(m) }));
  const flush = () => { if (a) send(`${TV}i:${from}:${a}:${b}`); a = b = ''; from = t; };
  return {
    // Before the first tick: the match as it starts.
    start(m) { key(m); },
    // After each tick: the inputs it was played with, and the match now.
    step(ia, ib, m) {
      if (over) return;
      a += enc(packInput(ia)); b += enc(packInput(ib)); t++;
      if (t % BATCH === 0) flush();
      if (t % KEY_EVERY === 0) key(m);
    },
    end() { if (over) return; over = true; flush(); send(TV + 'x'); },
  };
}

// The screen's side: one match at a time, from whoever was heard first.
export function createViewer() {
  let from = null, info = null, match = null, t = 0, heardAt = 0, now = 0;
  let queue = []; // [ia, ib] for ticks t, t + 1, ��
  let next = null; // a whole match for a tick we have not reached yet
  let fresh = false, playing = false;
  const drop = () => { from = info = match = next = null; queue = []; t = 0; playing = false; };
  const take = (k) => { match = unpackMatch(k.m); t = k.t; queue = []; next = null; info = { b: k.b, n: k.n }; fresh = true; playing = false; };
  return {
    get from() { return from; },
    get stale() { return !!from && now - heardAt >= 4; }, // (nothing heard for a while: another match may take the screen)
    get info() { return info; },
    get match() { return match; },
    // True once after a new match (or the same one from a later point) was taken: stand the fighters again.
    renewed() { const f = fresh; fresh = false; return f; },
    // A message from player `id`. False when it was not one of ours.
    heard(id, text) {
      if (typeof text !== 'string' || !text.startsWith(TV)) return false;
      const kind = text[TV.length], body = text.slice(TV.length + 2);
      if (from && id !== from) { if (now - heardAt < 4) return true; drop(); } // (one match at a time; a silent one gives way)
      if (kind === 'x') { if (id === from) drop(); return true; }
      if (kind === 'p') {
        const changed = from !== id || !info?.solo;
        drop(); from = id; info = { solo: true }; heardAt = now;
        fresh = changed;
        return true;
      }
      if (kind === 's') {
        let k;
        try { k = JSON.parse(body); } catch { return true; }
        if (!k?.m?.a || !k.m.b || !Number.isInteger(k.t) || typeof k.b !== 'string') return true;
        heardAt = now;
        if (from === id && match && k.t === t + queue.length) { next = k; return true; } // (in step: checked when we get there)
        from = id;
        try { take(k); } catch { drop(); }
        return true;
      }
      if (kind === 'i' && id === from && match) {
        const [t0, a, b] = body.split(':');
        heardAt = now;
        if (+t0 !== t + queue.length || !a || a.length !== b?.length || a.length > 400) return true; // (a hole: the next whole match mends it)
        for (let i = 0; i + 1 < a.length; i += 2) queue.push([unpackInput(parseInt(a.slice(i, i + 2), 36)), unpackInput(parseInt(b.slice(i, i + 2), 36))]);
      }
      return true;
    },
    // Once every 1/60 s: plays what there is, a little behind. Returns what happened.
    tick() {
      now += 1 / 60;
      if (from && now - heardAt > 6) drop(); // (they closed the game, or left the room)
      if (!match) return [];
      if (!playing && queue.length >= BEHIND) playing = true;
      if (!queue.length) { playing = false; return []; }
      if (!playing) return [];
      const out = [];
      for (let n = queue.length > BEHIND + BATCH * 2 ? 2 : 1; n > 0 && queue.length; n--) { // (fallen behind: catch up)
        const [ia, ib] = queue.shift();
        out.push(...stepMatch(match, ia, ib));
        t++;
        if (next && next.t === t) { const q = queue; try { match = unpackMatch(next.m); } catch { /* keep ours */ } queue = q; next = null; }
      }
      return out;
    },
  };
}

// Several screens: each match gets one, a new match takes a free screen (or
// one whose match fell silent), and a match too many is not shown.
export function createScreens(n = 2) {
  const views = Array.from({ length: n }, () => createViewer());
  return {
    views,
    heard(id, text) {
      if (typeof text !== 'string' || !text.startsWith(TV)) return false;
      const v = views.find((q) => q.from === id) || (['s', 'p'].includes(text[TV.length]) ? views.find((q) => !q.from) || views.find((q) => q.stale) : null);
      v?.heard(id, text);
      return true;
    },
  };
}
