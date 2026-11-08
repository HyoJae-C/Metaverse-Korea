// The operators' weather setting (supabase/023_weather.sql): read on start,
// live on the 'weather' channel when it changes, and checked again every
// few minutes in case a live message was missed. onSettings(raw) gets the
// server's { season, fixed, from, until } (core/weather.js weatherSettings).
// Without the SQL set up nothing comes and the default weather stays.
const RECHECK_MS = 5 * 60 * 1000;

export function watchWeather(client, onSettings) {
  let ch = null, stopped = false;
  const read = () => client.rpc('weather_settings').then(({ data, error }) => {
    if (!stopped && !error && data) onSettings(data);
  }, () => {});
  try {
    ch = client.channel('weather', { config: { private: true } });
    ch.on('broadcast', { event: 'w' }, ({ payload }) => { if (!stopped && payload) onSettings(payload); }).subscribe();
  } catch (e) { console.info('[weather] not listening:', e?.message); }
  read();
  const timer = setInterval(() => { if (!document.hidden) read(); }, RECHECK_MS);
  return () => {
    stopped = true;
    clearInterval(timer);
    if (ch) client.removeChannel(ch);
  };
}

// Sets it (operators only, from the operator page). → { ok, data } or { error }
export async function setWeather(client, season, fixed, minutes) {
  const { data, error } = await client.rpc('ops_set_weather', { new_season: season, fix: fixed || null, minutes });
  if (!error) return { ok: true, data };
  if (error.code === '42501') return { error: 'operator' };
  if (error.code === 'PGRST202' || error.code === '42883') return { error: 'setup' };
  return { error: error.message || 'network' };
}
