// The train's station search (Yozi 2026-11-27: with 24+ stations, finding
// one in the list got hard). Matches any language's name, ignoring case,
// spaces, dashes and a "역" / "Station" / "駅" / "站" typed on the end.
// Korean also matches while it is still being typed ("며" → 명동, "설" →
// 서울) and by initial consonants only ("ㅁㄷ" → 명동).

const SUFFIX = /(역|station|stn|駅|站)$/;

const clean = (s) => String(s || '').toLowerCase().normalize('NFKC').replace(/[\s\-–·'’.,()]/g, '');
// Hangul syllables into jamo (NFKC in clean() has already turned the
// compatibility jamo people type, ㅁ U+3141, into the leading jamo U+1106),
// so "며" is a prefix of "명".
const jamo = (s) => s.normalize('NFKD');
const initials = (s) => [...s].map((ch) => {
  const c = ch.charCodeAt(0) - 0xac00;
  return c >= 0 && c < 11172 ? String.fromCharCode(0x1100 + Math.floor(c / 588)) : ch;
}).join('');

export function normalizeQuery(q) {
  return clean(q).replace(SUFFIX, '');
}

// name: { ko, en, ja, … }; q: what the player typed. An empty query matches all.
export function stationMatches(name = {}, q) {
  const query = normalizeQuery(q);
  if (!query) return true;
  const names = Object.values(name).map(clean).filter(Boolean);
  if (names.some((n) => n.includes(query))) return true;
  if (!/[ᄀ-ᇿ가-힣]/.test(query)) return false;
  // Only initial consonants typed (ᄆ after NFKC): compare with each name's
  // initials.
  if (/^[ᄀ-ᄒ]+$/.test(query)) return names.some((n) => initials(n).includes(query));
  const qj = jamo(query);
  // The last syllable may still be taking its final consonant from the next
  // one ("설" on the way to "서울"): try it without that final too.
  const tries = [qj, qj.replace(/[\u11a8-\u11c2]$/, '')];
  return names.some((n) => { const nj = jamo(n); return tries.some((t) => t && nj.includes(t)); });
}
