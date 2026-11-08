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
