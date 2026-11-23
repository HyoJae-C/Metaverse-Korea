// How often to send our position. Every message reaches each person around
// us, and Supabase counts it once per receiver, so a crowd of k people
// sending r times a second costs about r·k² messages a second. We keep what
// each person receives near `budget` a second: alone or with a few people we
// send at the full rate, in a crowd each of us sends less (never below
// `min`). Other players' movement is smoothed between updates, so a lower
// rate mostly shows as slightly softer turns.
export function sendRate({ peers = 0, base, budget, min }) {
  if (peers <= 0) return base;
  return Math.max(min, Math.min(base, budget / peers));
}

// Presence updates (who we are and what we wear, for people who join the
// room later) at most once every `gap` ms. Supabase cuts a client off for a
// while when it updates its presence too often (ClientPresenceRateLimitReached),
// and then everyone else sees that player vanish. Flipping through hairstyles
// at the salon or trying clothes on changed the look, and with it the
// presence, several times a second (Yozi 2026-11-20: "other players suddenly
// vanish"). The look itself still goes out at once as a broadcast; only the
// presence copy waits, and the latest one is sent when the gap is over.
// Stepping into the next street cell also counts: the old cell's presence is
// dropped and the new one's added, and walking back and forth on a cell
// border did that several times a second in the same channel (still 13 cut
// offs on 2026-11-20 after the look fix). So untracking goes through here too:
// a null payload means "not in this room's presence", and only the latest
// wish is sent once the gap is over.
// Supabase's own rule is stricter than a gap, though: at most 5 presence
// updates per client in any 30 s (track and untrack both count; docs
// "ClientPresenceRateLimitReached"). A 3 s gap still allowed 10, so someone
// flipping through hairstyles in the salon chair for half a minute was cut
// off again (Yozi 2026-11-23: "at the salon, when a friend changes hair the
// other one vanishes": both screens lose each other, since the closed
// channel neither sends nor receives). So on top of the gap, at most `max`
// updates (4, one spare) go out in any `per` ms; a fresh join counts too.
// send(payload) does the track (or the untrack, for null); now() and timers
// are injectable for tests.
export const PRESENCE_MAX = 4, PRESENCE_PER = 30000;
export function createPresenceThrottle(send, { gap = 3000, max = PRESENCE_MAX, per = PRESENCE_PER, now = () => Date.now(), later = setTimeout, cancel = clearTimeout } = {}) {
  let pending = null, waiting = false, timer = null;
  const sent = []; // when the last `max` updates went out
  const stamp = () => { sent.push(now()); if (sent.length > max) sent.shift(); };
  // The earliest time the next update may go out.
  const nextAt = () => Math.max(sent.length ? sent[sent.length - 1] + gap : -Infinity, sent.length >= max ? sent[sent.length - max] + per : -Infinity);
  const flush = () => {
    timer = null;
    if (!waiting) return;
    const wait = nextAt() - now();
    if (wait > 0) { timer = later(flush, wait); return; } // (a join went out meanwhile)
    const p = pending;
    pending = null;
    waiting = false;
    stamp();
    send(p);
  };
  return {
    track(payload) {
      pending = payload;
      waiting = true;
      if (timer) return;
      const wait = nextAt() - now();
      if (wait <= 0) flush();
      else timer = later(flush, wait);
    },
    // A fresh join tracks at once: the server has no
    // presence for us yet. Clears anything waiting.
    now(payload) {
      if (timer) cancel(timer);
      timer = null;
      pending = null;
      waiting = false;
      stamp();
      send(payload);
    },
    // Untracked (listen-only) or gone: drop anything waiting.
    clear() {
      if (timer) cancel(timer);
      timer = null;
      pending = null;
      waiting = false;
    },
  };
}
