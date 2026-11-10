// The operators' drone show times (supabase/033_drone_show.sql): read on
// start, live on the 'droneshow' channel when they change, and checked again
// every few minutes in case a live message was missed. onSettings(raw) gets
// the server's { minutes: [...] } (drone-show.js setDroneShowTimes).
// Without the SQL set up nothing comes and the default times stay.
const RECHECK_MS = 5 * 60 * 1000;

export function watchDroneShow(client, onSettings) {
  let ch = null, stopped = false;
  const read = () => client.rpc('drone_show_settings').then(({ data, error }) => {
    if (!stopped && !error && data) onSettings(data);
  }, () => {});
  try {
    ch = client.channel('droneshow', { config: { private: true } });
    ch.on('broadcast', { event: 'd' }, ({ payload }) => { if (!stopped && payload) onSettings(payload); }).subscribe();
  } catch (e) { console.info('[drone show] not listening:', e?.message); }
  read();
  const timer = setInterval(() => { if (!document.hidden) read(); }, RECHECK_MS);
  return () => {
    stopped = true;
    clearInterval(timer);
    if (ch) client.removeChannel(ch);
  };
}

// Sets them (operators only, from the operator page). minutes: start times
// as minutes after midnight KST, or null for the default. → { ok, data } or { error }
export async function setDroneShow(client, minutes) {
  const { data, error } = await client.rpc('ops_set_drone_show', { starts: minutes });
  if (!error) return { ok: true, data };
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  return { error: error.message || 'network' };
}
