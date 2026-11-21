// Operators start a show now: "/드론쇼" (the Ttukseom drone show) or
// "/불꽃놀이" (the Yeouido fireworks) in the chat (game/chat.js); add
// "취소" to call it off ("/드론쇼취소", "/불꽃놀이취소").
// supabase/060_drone_now.sql and 061_fireworks_now.sql.
// The server keeps the starts on the weather setting, so every game gets
// them with the weather (core/weather-watch.js: on start, live, every 5
// minutes) and adds each to the timetable as one extra show (show-clock.js
// setExtraShow). The sky turns at once (the drones rise, Yeouido's dusk);
// the show starts 3 minutes later. The regular timetable does not change.
import { setExtraShow, DRONES, FIREWORKS } from './show-clock.js';

// command → { kind, cancel }
export const SHOW_NOW = {
  '드론쇼': { kind: 'drone', cancel: false },
  '드론쇼취소': { kind: 'drone', cancel: true },
  '불꽃놀이': { kind: 'fireworks', cancel: false },
  '불꽃놀이취소': { kind: 'fireworks', cancel: true },
};
const WHICH = { drone: DRONES, fireworks: FIREWORKS };
const RPC = { drone: 'ops_drone_now', fireworks: 'ops_fireworks_now' };

const at = (iso) => { const ms = iso ? Date.parse(iso) : NaN; return Number.isFinite(ms) ? ms : null; };

// The weather payload's drone_at / fireworks_at (ISO times, or null). A
// field the server doesn't send yet leaves that show alone.
export function applyShowNow(raw) {
  if (!raw) return;
  for (const kind of Object.keys(WHICH)) if (`${kind}_at` in raw) setExtraShow(WHICH[kind], at(raw[`${kind}_at`]));
}

// → { ok, start (ms) | null } or { error: 'operator' | 'setup' | message }
export async function startShowNow(client, { kind, cancel }) {
  if (!client) return { error: 'setup' };
  const { data, error } = await client.rpc(RPC[kind], { cancel });
  if (!error) {
    const start = at(data);
    setExtraShow(WHICH[kind], start); // at once here, even if the live message is late
    return { ok: true, start };
  }
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  return { error: error.message || 'network' };
}
