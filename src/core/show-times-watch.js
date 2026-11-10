// The operators' show times (supabase/033_show_times.sql): when the
// Ttukseom drone show and the Yeouido fireworks start. Read on start, live
// on the 'showtimes' channel when they change, and checked again every few
// minutes in case a live message was missed. onSettings(raw) gets the
// server's { drone: [...] | null, fireworks: [...] | null } (minutes after
// midnight KST; null = the default). Without the SQL set up nothing comes
// and the default times stay.
const RECHECK_MS = 5 * 60 * 1000;

export function watchShowTimes(client, onSettings) {
  let ch = null, stopped = false;
  const read = () => client.rpc('show_times').then(({ data, error }) => {
    if (!stopped && !error && data) onSettings(data);
  }, () => {});
  try {
    ch = client.channel('showtimes', { config: { private: true } });
    ch.on('broadcast', { event: 's' }, ({ payload }) => { if (!stopped && payload) onSettings(payload); }).subscribe();
  } catch (e) { console.info('[show times] not listening:', e?.message); }
  read();
  const timer = setInterval(() => { if (!document.hidden) read(); }, RECHECK_MS);
  return () => {
    stopped = true;
    clearInterval(timer);
    if (ch) client.removeChannel(ch);
  };
}

// Sets them (operators only, from the operator page). Each list: start
// times as minutes after midnight KST, or null for the default.
// → { ok, data } or { error }
export async function setShowTimes(client, drone, fireworks) {
  const { data, error } = await client.rpc('ops_set_show_times', { drone_starts: drone, fireworks_starts: fireworks });
  if (!error) return { ok: true, data };
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  return { error: error.message || 'network' };
}
