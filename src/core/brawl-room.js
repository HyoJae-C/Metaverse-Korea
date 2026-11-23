// How many two-player Rooftop Rumble matches are on in the arcade right now.
// The arcade has two wall screens, one a match, and a match between two
// people is the game's heaviest use of the realtime service, so only
// MAX_VERSUS run at a time; a fight against the game's own rivals is always
// free (it sends next to nothing).
//
// Counted from what the room already hears: the host of a match sends it to
// the wall screens (core/brawl-tv.js: brawltv:s… with who they fight, then
// brawltv:i… once a second, brawltv:x at the end).
export const MAX_VERSUS = 2;
const QUIET_MS = 8000; // nothing heard for this long: that match is over (they left)

export function createVersusTally(max = MAX_VERSUS) {
  const live = new Map(); // the host's id → { foe, at }
  return {
    // A brawltv: message from player `from`, at time `now` (ms).
    heard(from, text, now) {
      const kind = text[8];
      if (kind === 's') {
        const foe = /"b":"([^"]*)"/.exec(text)?.[1];
        if (foe && !/^r\d/.test(foe)) live.set(from, { foe, at: now }); // (r<n>: one of the game's rivals)
        else live.delete(from);
      } else if (kind === 'i') { const m = live.get(from); if (m) m.at = now; }
      else live.delete(from); // x: over, p: playing alone
    },
    // Matches on between other people (not one `me` is in).
    count(now, me) {
      let n = 0;
      for (const [host, m] of live) {
        if (now - m.at > QUIET_MS) live.delete(host);
        else if (host !== me && m.foe !== me) n++;
      }
      return n;
    },
    full(now, me) { return this.count(now, me) >= max; },
    clear() { live.clear(); },
  };
}
