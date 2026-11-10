// Rules for the live café's voice (game/live-stage.js, game/live-voice.js).
//
// The voice itself goes straight from the singer's browser to each listener's
// (WebRTC). To set that up, the two browsers trade a few small messages over
// the room's realtime channel, as emotes starting with 'lv:':
//   on   the singer stepped up { since, muted }      (to everyone)
//   off  the singer stepped down                      (to everyone)
//   m    the singer's mic muted or not { muted }      (to everyone)
//   hi   "is anyone singing? send me the voice"       (to everyone)
//   o    the singer's offer { to, sdp, since, muted } (to one listener)
//   a    the listener's answer { to, sdp }            (to the singer)
//   q    I joined the line { at }                      (to everyone)
//   uq   I left the line                               (to everyone)
// Old clients don't know 'lv:' emotes and ignore them.
export const LIVE_PREFIX = 'lv:';
const KINDS = new Set(['on', 'off', 'm', 'hi', 'o', 'a', 'q', 'uq']);
const MAX_LEN = 16000; // an SDP with its ICE candidates is a few KB

export const liveMsg = (m) => LIVE_PREFIX + JSON.stringify(m);

export function parseLive(e) {
  if (typeof e !== 'string' || !e.startsWith(LIVE_PREFIX) || e.length > MAX_LEN) return null;
  let m;
  try { m = JSON.parse(e.slice(LIVE_PREFIX.length)); } catch { return null; }
  if (!m || typeof m !== 'object' || !KINDS.has(m.k)) return null;
  if ((m.k === 'o' || m.k === 'a') && (typeof m.sdp !== 'string' || typeof m.to !== 'string')) return null;
  if (m.since != null && !Number.isFinite(m.since)) return null;
  if (m.k === 'q' && !Number.isFinite(m.at)) return null;
  return m;
}

// Two people stepped up at once: whoever started first keeps the stage (the
// smaller id on a tie), so both browsers agree without asking a server.
export function stageWinner(a, b) {
  if (a.since !== b.since) return a.since < b.since ? a : b;
  return a.id < b.id ? a : b;
}

// Singing needs an account at least a day old (a new account can listen
// right away). Off-line test builds (the 'local' provider) skip this.
export const PERFORM_MIN_AGE_MS = 24 * 3600 * 1000;
export function canPerform({ user, required, now = Date.now() }) {
  if (!required) return true;
  const born = Date.parse(user?.created_at || '');
  return Number.isFinite(born) && now - born >= PERFORM_MIN_AGE_MS;
}

// How far the singer may step from the mic before the mic turns off.
export const STAGE_REACH = 2.6;
export const offStage = (p, spot) => !spot || Math.hypot(p.x - spot.x, p.z - spot.z) > STAGE_REACH;

// Taking turns (Yozi asked for a rule like a real open mic): one singer at a
// time, 5 minutes each when someone is waiting in line (Yozi 2026-11-11); with nobody waiting
// you can keep singing. When the stage frees up, the first person in line has
// NEXT_GRACE_MS to step up before anyone else may.
export const SLOT_MS = 5 * 60 * 1000;
export const NEXT_GRACE_MS = 45 * 1000;
// The line, first come first served: [{ id, at }] (at: when they joined it).
export const lineOrder = (line) => [...line].sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : 1));
export const timeUp = ({ since, now, waiting }) => waiting > 0 && now - since >= SLOT_MS;
// Who has the stage first, if not me: the head of the line, for a short
// while after the last singer stepped down.
export function nextUp({ me, line, freeAt, now }) {
  const head = lineOrder(line)[0];
  if (!head || head.id === me) return null;
  return now - freeAt < NEXT_GRACE_MS ? head.id : null;
}
export const clock = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
