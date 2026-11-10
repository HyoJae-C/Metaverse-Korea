// Which country a player is probably playing from, for the operator's
// country statistics (admin.html → Overview, supabase/010_countries.sql).
//
// Guessed from the browser's time zone setting (Asia/Seoul → KR), never from
// the IP address: nothing about the connection is looked at or stored. It is
// a guess: a traveller whose phone keeps their home time zone counts for
// home, and a VPN doesn't change it. `source` says how the guess was made so
// a more exact way (for example a server-side IP lookup that keeps only the
// country) can be added later next to it.
import { TZ_COUNTRY } from '../data/tz-country.js';

export const UNKNOWN = 'XX';

// 'KR' for 'Asia/Seoul'; UNKNOWN for UTC, empty or made-up names.
export function countryFromTimeZone(tz) {
  return (typeof tz === 'string' && TZ_COUNTRY[tz]) || UNKNOWN;
}

export function browserTimeZone() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
}

export function guessCountry(tz = browserTimeZone()) {
  return { country: countryFromTimeZone(tz), source: 'tz' };
}

// Korean calendar day ('2026-11-07'), the day the server counts in.
export function kstDay(now = Date.now()) {
  return new Date(now + 9 * 3600e3).toISOString().slice(0, 10);
}

// Report once per account per Korean day (the server keeps one row per
// account and day anyway; this just saves the call). `send` resolves true
// when the server took it. The note lives outside the "mk." keys so it isn't
// copied into the cloud save.
const NOTE = 'mkcountry';
export async function reportCountryOnce({ uid, send, storage = globalThis.localStorage, now = Date.now(), tz }) {
  if (!uid || !send) return false;
  const stamp = `${uid}|${kstDay(now)}`;
  try { if (storage?.getItem(NOTE) === stamp) return false; } catch { /* storage blocked: just send */ }
  const ok = await send(guessCountry(tz)).catch(() => false);
  if (ok) try { storage?.setItem(NOTE, stamp); } catch { /* fine */ }
  return ok;
}
