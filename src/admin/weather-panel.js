// The operator page's Weather tab (supabase/023_weather.sql): pick a season
// (it changes how often it rains or snows) and hold a weather for a while,
// for every player at once. Shows what's set and the next few hours.
import { SEASON_ODDS, SEASONS, WEATHER_ICON, WEATHER_SLOT_MS, seasonAt, weatherAt, weatherSettings } from '../core/weather-roll.js';
import { setWeather } from '../core/weather-watch.js';

const SETUP = 'Run <code>supabase/023_weather.sql</code> once in the Supabase dashboard (SQL Editor → New query → paste → Run, then <code>notify pgrst, \'reload schema\';</code>), then reload this page.';
const SEASON_NAME = {
  default: 'Default (기본)', auto: 'Auto: follow the calendar (자동: 달력대로)',
  spring: 'Spring (봄)', summer: 'Summer (여름)', autumn: 'Autumn (가을)', winter: 'Winter (겨울)',
};
const KIND_NAME = { clear: 'clear 맑음', cloudy: 'cloudy 흐림', fog: 'fog 안개', rain: 'rain 비', snow: 'snow 눈', storm: 'storm 폭풍' };
const odds = (season) => (SEASON_ODDS[season === 'auto' ? seasonAt(Date.now()) : season] || SEASON_ODDS.default)
  .map(([k, p]) => `${WEATHER_ICON[k]} ${Math.round(p * 100)}%`).join(' · ');
const time = (ms) => new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export function createWeatherPanel({ client, $, escapeHtml, setStatus, notOperator }) {
  const season = $('wxSeason'), fixed = $('wxFixed'), mins = $('wxMinutes');
  season.replaceChildren(...SEASONS.map((s) => new Option(SEASON_NAME[s], s)));
  fixed.replaceChildren(new Option('No (roll by season)', ''), ...Object.keys(KIND_NAME).map((k) => new Option(`${WEATHER_ICON[k]} ${KIND_NAME[k]}`, k)));
  const showOdds = () => { $('wxOdds').textContent = odds(season.value); };
  season.onchange = showOdds;
  fixed.onchange = () => { mins.disabled = !fixed.value; };

  function render(raw) {
    const s = weatherSettings(raw);
    season.value = s.season;
    const holding = s.fixed && Date.now() < s.until;
    fixed.value = holding ? s.fixed : '';
    mins.disabled = !holding;
    showOdds();
    const now = Date.now();
    const lines = [`Season: <b>${escapeHtml(SEASON_NAME[s.season])}</b>${s.season === 'auto' ? ` (now ${seasonAt(now)})` : ''}`];
    if (holding) lines.push(`Holding <b>${WEATHER_ICON[s.fixed]} ${KIND_NAME[s.fixed]}</b> ${Number.isFinite(s.until) ? 'until ' + time(s.until) : 'until changed'}`);
    if (raw?.at) lines.push(`<span class="muted">Changed ${new Date(raw.at).toLocaleString()}${raw.by ? ' by ' + escapeHtml(raw.by) : ''}</span>`);
    $('wxNow').innerHTML = lines.join('<br>');
    // The next 6 hours, slot by slot, as every game will roll them.
    const start = Math.floor(now / WEATHER_SLOT_MS) * WEATHER_SLOT_MS;
    $('wxNext').replaceChildren(...Array.from({ length: 12 }, (_, i) => {
      const t = start + i * WEATHER_SLOT_MS, k = weatherAt(Math.max(t, i ? t : now), s);
      const d = document.createElement('span');
      d.className = 'wxslot';
      d.title = KIND_NAME[k];
      d.textContent = `${time(t)} ${WEATHER_ICON[k]}`;
      return d;
    }));
  }

  async function load() {
    const { data, error } = await client.rpc('ops_weather');
    if (error) {
      if (error.code === '42501') return notOperator();
      $('wxNow').innerHTML = error.code === 'PGRST202' || error.code === '42883' ? SETUP : escapeHtml(error.message);
      return;
    }
    render(data);
  }

  $('wxSave').onclick = async () => {
    const m = Number(mins.value);
    const what = fixed.value ? `${KIND_NAME[fixed.value]} ${m ? 'for ' + (m >= 60 ? m / 60 + ' h' : m + ' min') : 'until you change it'}` : 'no held weather';
    if (!confirm(`Change the weather for every player now?\n\nSeason: ${SEASON_NAME[season.value]}\n${what}`)) return;
    $('wxSave').disabled = true;
    const r = await setWeather(client, season.value, fixed.value, m);
    $('wxSave').disabled = false;
    if (r.error === 'operator') return notOperator();
    if (!r.ok) { setStatus(r.error === 'setup' ? 'Run supabase/023_weather.sql first.' : 'Could not change: ' + r.error); return; }
    setStatus('Weather changed ' + new Date().toLocaleTimeString());
    render(r.data);
  };
  $('wxReload').onclick = load;
  return { load };
}
