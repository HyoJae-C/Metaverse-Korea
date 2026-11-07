// Anonymous play-session records, so the operator can see retention (D1/D7),
// session length and how often people play (admin.html → Retention,
// supabase/011_play_sessions.sql). No third-party tracker.
//
// What is sent, once a minute while the tab is visible: a random id for this
// session, the region, a rough device class (phone / tablet / desktop), the
// average frame rate, where the player first came from (?src= on their first
// visit, e.g. an invite link) and a few counts for this session: fish caught,
// coins earned and spent, purchases, chat messages sent and seconds spent
// with someone else close by. The server adds the account id the game
// already uses for saves and its own clock. Nothing else: no IP address, no
// browser string, no position, no chat text.

export const BEAT_MS = 60000; // one report a minute while playing
export const FIRST_BEAT_MS = 15000; // the first one a little after starting
export const NEW_SESSION_GAP_MS = 30 * 60000; // hidden this long → a new session
export const NEAR_M = 25; // "together": another player within this many metres

const SRC_NOTE = 'mksrc'; // outside the "mk." keys, so it stays on this device

// 'phone', 'tablet' or 'desktop' from the screen and pointer, never the
// browser's user-agent string.
export function deviceClass({ touch = false, width = 1280, height = 800 } = {}) {
  if (!touch) return 'desktop';
  return Math.min(width, height) >= 600 ? 'tablet' : 'phone';
}

// A short, safe label for where a player came from ('ext', 'reddit', ...),
// or '' when there is none or it isn't a plain word.
export function cleanSrc(s) {
  const v = String(s ?? '').trim().toLowerCase();
  return /^[a-z0-9_-]{1,16}$/.test(v) ? v : '';
}

// The first ?src= this device ever saw, kept on the device. A later link
// with another src doesn't change it: we want how they first arrived.
export function firstSrc(search = '', storage = globalThis.localStorage) {
  let saved = '';
  try { saved = cleanSrc(storage?.getItem(SRC_NOTE)); } catch { /* storage blocked */ }
  if (saved) return saved;
  const now = cleanSrc(new URLSearchParams(search).get('src'));
  if (now) try { storage?.setItem(SRC_NOTE, now); } catch { /* fine */ }
  return now;
}

export function newSessionId(rand = globalThis.crypto) {
  if (rand?.randomUUID) return rand.randomUUID();
  const b = new Uint8Array(16);
  if (rand?.getRandomValues) rand.getRandomValues(b);
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// The counts for one session. coins(balance) turns wallet balance changes
// into earned / spent; spending also counts as a purchase.
export function createCounts() {
  const c = { fish: 0, coinsIn: 0, coinsOut: 0, buys: 0, chats: 0, nearSec: 0, ads: 0, errors: 0, quests: 0 };
  let bal = null;
  return {
    c,
    fish() { c.fish++; },
    chat() { c.chats++; },
    ad() { c.ads++; }, // a rewarded ad watched to the end
    error() { c.errors++; },
    quest() { c.quests++; }, // a square mission reported (not the first path)
    near(sec) { c.nearSec += sec; },
    coins(balance) {
      const b = Math.max(0, Math.floor(Number(balance) || 0));
      if (bal !== null) {
        const d = b - bal;
        if (d > 0) c.coinsIn += d;
        else if (d < 0) { c.coinsOut -= d; c.buys++; }
      }
      bal = b;
    },
    reset() { for (const k of Object.keys(c)) c[k] = 0; },
    snapshot() { return { ...c, nearSec: Math.round(c.nearSec) }; },
  };
}

// Is anyone else within NEAR_M of me? me = {x, z}; others = iterable of {x, z}.
export function someoneNear(me, others, r = NEAR_M) {
  if (!me) return false;
  for (const o of others) if (o && Math.hypot(o.x - me.x, o.z - me.z) <= r) return true;
  return false;
}

// Average frames per second, counted with requestAnimationFrame while the
// tab is visible. fps() returns the average since the last call (0 = none).
export function createFpsMeter(raf = globalThis.requestAnimationFrame, now = () => performance.now()) {
  let frames = 0, since = now(), on = true;
  const tick = () => { if (!on) return; frames++; raf(tick); };
  if (raf) raf(tick);
  return {
    fps() {
      const t = now(), s = (t - since) / 1000;
      const v = s > 0.5 ? Math.round(frames / s) : 0;
      frames = 0; since = t;
      return Math.min(240, v);
    },
    stop() { on = false; },
  };
}

// Runs the reports. get() → { region, device, src } or null (not playing
// right now: still starting, a test room, another tab took over).
// send(report) resolves false when the server can't take it (SQL not run
// yet), which stops the reports for this visit. tick(sec) is called every
// second so the caller can add to counts (e.g. nearSec). Returns stop().
export function startSessionReports({
  get, send, counts, fps, tick,
  doc = globalThis.document, now = () => Date.now(), newId = newSessionId,
  beatMs = BEAT_MS, firstMs = FIRST_BEAT_MS, gapMs = NEW_SESSION_GAP_MS,
  setTimer = setInterval, clearTimer = clearInterval,
}) {
  let id = newId(), off = false, busy = false;
  let next = now() + firstMs, hiddenAt = null;
  const beat = async () => {
    if (off || busy) return;
    const info = get();
    if (!info) return;
    busy = true;
    try {
      const ok = await send({ id, ...info, fps: fps?.fps() || 0, counts: counts.snapshot() });
      if (ok === false) off = true;
    } catch { /* try again next time */ }
    busy = false;
  };
  const timer = setTimer(() => {
    if (off || doc?.hidden) return;
    tick?.(1);
    if (now() >= next) { next = now() + beatMs; beat(); }
  }, 1000);
  const onVis = () => {
    if (!doc) return;
    if (doc.hidden) { hiddenAt = now(); beat(); return; } // one last report as they leave
    if (hiddenAt !== null && now() - hiddenAt >= gapMs) {
      id = newId(); counts.reset(); fps?.fps(); // back after a long break: a new session
      next = now() + firstMs;
    }
    hiddenAt = null;
  };
  doc?.addEventListener?.('visibilitychange', onVis);
  return () => {
    off = true;
    clearTimer(timer);
    doc?.removeEventListener?.('visibilitychange', onVis);
  };
}

// An error message as it is sent to the operator's error list
// (supabase/014_retention_more.sql): digits become #, so no position or
// other numbers leave the device, and it is cut short. No account id is
// kept with it on the server.
export function cleanError(msg) {
  return String(msg ?? '').replace(/https?:\/\/\S+/g, '<url>').replace(/[0-9]+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 120);
}

// Sends at most `max` different error messages per page visit, each once.
export function createErrorSender(send, max = 3) {
  const seen = new Set();
  return (msg) => {
    const m = cleanError(msg);
    if (!m || seen.has(m) || seen.size >= max) return false;
    seen.add(m);
    Promise.resolve().then(() => send(m)).catch(() => {});
    return true;
  };
}

// One page visit and how far it got, for the loading funnel:
// 1 page open, 2 pressed Play, 3 world loaded, 4 played a minute.
// send(report) resolves false when the server can't take it (SQL not run
// yet), which stops the reports for this visit. Each stage is sent once, in
// order; a later stage implies the earlier ones.
export const STAGE = { OPEN: 1, PRESSED: 2, LOADED: 3, MINUTE: 4 };
export function createVisit({ send, isNew = false, device = '', src = '', newId = newSessionId, now = () => performance.now() }) {
  const id = newId();
  let stage = 0, failed = false, off = false, pressedAt = null, loadMs = 0;
  const post = () => {
    if (off) return;
    const report = { id, stage, loadMs, isNew, failed, device, src };
    Promise.resolve().then(() => send(report))
      .then((ok) => { if (ok === false) off = true; }).catch(() => {});
  };
  return {
    id,
    get stage() { return stage; },
    get loadMs() { return loadMs; },
    reach(n) {
      if (n <= stage) return false;
      if (n === STAGE.PRESSED) pressedAt = now();
      if (n === STAGE.LOADED && pressedAt !== null) loadMs = Math.max(1, Math.round(now() - pressedAt));
      stage = n;
      post();
      return true;
    },
    fail() { if (failed) return; failed = true; post(); },
  };
}
