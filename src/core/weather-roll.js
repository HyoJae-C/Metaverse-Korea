// The weather roll, shared by the game and the operator page (no three.js).
// Weather: rolled from the clock, the same for every player.

export const WEATHER_ICON = { clear: '☀️', cloudy: '☁️', fog: '🌫️', rain: '🌧️', snow: '❄️', storm: '⛈️' };

// Game weather (no live data): every 30 minutes the same roll for everyone,
// from the clock: clear 80 %, rain 10 %, snow 10 %.
export const WEATHER_SLOT_MS = 30 * 60 * 1000;
export const WEATHER_ODDS = [['clear', 0.8], ['rain', 0.1], ['snow', 0.1]];

// Operators can pick a season (admin.html → Weather, supabase/023_weather.sql):
// it changes the odds of the roll. "auto" follows Seoul's calendar.
export const SEASON_ODDS = {
  default: WEATHER_ODDS,
  spring: [['clear', 0.7], ['cloudy', 0.1], ['rain', 0.15], ['fog', 0.05]],
  summer: [['clear', 0.6], ['cloudy', 0.1], ['rain', 0.2], ['storm', 0.1]],
  autumn: [['clear', 0.75], ['cloudy', 0.1], ['rain', 0.1], ['fog', 0.05]],
  winter: [['clear', 0.55], ['cloudy', 0.1], ['snow', 0.3], ['fog', 0.05]],
};
export const SEASONS = ['default', 'auto', 'spring', 'summer', 'autumn', 'winter'];
// Seoul's season at a moment: Mar-May spring, Jun-Aug summer, Sep-Nov autumn.
export function seasonAt(ms) {
  const m = new Date(ms + 9 * 3600 * 1000).getUTCMonth();
  return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
}
// The server's setting ({ season, fixed, from, until }) made safe to use.
export function weatherSettings(raw) {
  const season = SEASONS.includes(raw?.season) ? raw.season : 'default';
  const fixed = WEATHER_ICON[raw?.fixed] ? raw.fixed : null;
  const from = Date.parse(raw?.from), until = Date.parse(raw?.until);
  return { season, fixed, from: Number.isFinite(from) ? from : -Infinity, until: Number.isFinite(until) ? until : Infinity };
}
// The weather at a moment for everyone: a weather an operator is holding,
// else the season's roll for that 30-minute slot.
export function weatherAt(ms, settings = null) {
  const s = settings || { season: 'default', fixed: null };
  if (s.fixed && ms >= s.from && ms < s.until) return s.fixed;
  const season = s.season === 'auto' ? seasonAt(ms) : s.season;
  return rolledWeather(ms, SEASON_ODDS[season] || WEATHER_ODDS);
}

export function rolledWeather(nowMs = Date.now(), odds = WEATHER_ODDS) {
  let h = Math.floor(nowMs / WEATHER_SLOT_MS) >>> 0; // integer hash of the slot
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b) >>> 0;
  const u = ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  let acc = 0;
  for (const [kind, p] of odds) { acc += p; if (u < acc) return kind; }
  return 'clear';
}

