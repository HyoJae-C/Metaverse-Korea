// Tells the server where we are on the map, so operators can see live player
// spots on admin.html (supabase/008_player_where.sql). Players can't read it.
//
// Cheap on purpose: one tiny request every few seconds while walking, every
// 20 seconds while standing still, and straight away (after a short pause)
// when we walk into or out of a shop. The server keeps one row per account.

export const WHERE_MOVE_MS = 3000; // walking: at most this often
export const WHERE_IDLE_MS = 20000; // standing still: a heartbeat
export const WHERE_PLACE_MS = 1200; // entered / left a shop
export const WHERE_MIN_MOVE = 2; // metres that count as moving

// Should we report now? last = { x, z, place, t } of the last report (or
// null), cur = { x, z, place } now, now = ms.
export function whereDue(last, cur, now) {
  if (!last) return true;
  const since = now - last.t;
  if (since >= WHERE_IDLE_MS) return true;
  if (cur.place !== last.place) return since >= WHERE_PLACE_MS;
  return since >= WHERE_MOVE_MS && Math.hypot(cur.x - last.x, cur.z - last.z) >= WHERE_MIN_MOVE;
}

// Checks once a second. get() returns { name, place, x, z } or null (not
// reporting right now, e.g. in a test room); send(spot) does the request and
// resolves to false when the server can't take it (SQL not run yet), which
// stops the reports for this visit. Returns stop().
export function startWhereReports({ get, send, interval = 1000 }) {
  let last = null, busy = false, off = false;
  const tick = async () => {
    if (busy || off) return;
    const cur = get();
    if (!cur || !Number.isFinite(cur.x) || !Number.isFinite(cur.z)) return;
    const now = Date.now();
    if (!whereDue(last, cur, now)) return;
    busy = true;
    last = { ...cur, t: now };
    try {
      if ((await send(cur)) === false) off = true;
    } catch { /* try again next time */ }
    busy = false;
  };
  const timer = setInterval(tick, interval);
  return () => clearInterval(timer);
}
