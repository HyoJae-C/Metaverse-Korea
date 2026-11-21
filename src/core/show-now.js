// Operators start the Ttukseom drone show now: "/드론쇼" in the chat
// (game/chat.js), "/드론쇼취소" calls it off (supabase/060_drone_now.sql).
// The server keeps the start on the weather setting, so every game gets it
// with the weather (core/weather-watch.js: on start, live, every 5 minutes)
// and adds it to the timetable as one extra show (show-clock.js
// setExtraShow). The drones rise at once; the show starts 3 minutes later.
// The regular timetable does not change.
import { setExtraShow, DRONES } from './show-clock.js';

export const DRONE_NOW = { '드론쇼': false, '드론쇼취소': true }; // command → cancel

// The weather payload's drone_at (an ISO time, or null).
export function applyShowNow(raw) {
  if (!raw || !('drone_at' in raw)) return;
  const at = raw.drone_at ? Date.parse(raw.drone_at) : NaN;
  setExtraShow(DRONES, Number.isFinite(at) ? at : null);
}

// → { ok, start (ms) | null } or { error: 'operator' | 'setup' | message }
export async function startDroneNow(client, cancel = false) {
  if (!client) return { error: 'setup' };
  const { data, error } = await client.rpc('ops_drone_now', { cancel });
  if (!error) {
    const start = data ? Date.parse(data) : null;
    setExtraShow(DRONES, start); // at once here, even if the live message is late
    return { ok: true, start };
  }
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  return { error: error.message || 'network' };
}
