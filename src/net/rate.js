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
// send(payload) does the track (or the untrack, for null); now() and timers
// are injectable for tests.
export function createPresenceThrottle(send, { gap = 3000, now = () => Date.now(), later = setTimeout, cancel = clearTimeout } = {}) {
  let last = -Infinity, pending = null, waiting = false, timer = null;
  const flush = () => {
    timer = null;
    if (!waiting) return;
    const p = pending;
    pending = null;
    waiting = false;
    last = now();
    send(p);
  };
  return {
    track(payload) {
      pending = payload;
      waiting = true;
      if (timer) return;
      const wait = last + gap - now();
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
      last = now();
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
