// 물광 (dewy "glass skin") from the skin clinic in Gangnam (Yozi 2026-11-27:
// "one treatment, and your face shines for 7 days"). The look carries the
// time it ends (look.glow, ms); everyone's game draws the shine until then
// (core/hair-styles.js buildGlow), so others see it too. No DOM here, so the
// rules can be unit-tested.
export const GLOW_DAYS = 7;
export const DAY_MS = 24 * 3600 * 1000;
export const GLOW_MS = GLOW_DAYS * DAY_MS;
// The price (game/derm.js): proposed, waiting for Yozi's word (a real 물광
// treatment in Seoul is ₩100,000-300,000; a 7-day autumn hat is ₩30,000).
export const GLOW_PRICE = 50000;
// A new treatment is offered again only in the last day (so a second one
// right away doesn't throw the first's days away).
export const RENEW_MS = DAY_MS;

// Milliseconds of shine left (0: none). A time further off than one
// treatment (a wrong clock, or an edited save) counts as none.
export function glowLeft(look, now = Date.now()) {
  const g = look?.glow;
  if (!Number.isFinite(g)) return 0;
  const left = g - now;
  return left > 0 && left <= GLOW_MS + DAY_MS ? left : 0;
}
// Whole days left, rounded up (1 on the last day).
export const glowDays = (look, now = Date.now()) => Math.ceil(glowLeft(look, now) / DAY_MS);
// Can a treatment be had now (none on, or in its last day)?
export const canTreat = (look, now = Date.now()) => glowLeft(look, now) <= RENEW_MS;
// The look after a treatment: 7 days from now.
export const treated = (look, now = Date.now()) => ({ ...look, glow: now + GLOW_MS });
// The look once the shine is over (null if it isn't).
export const glowOver = (look, now = Date.now()) => (look?.glow != null && !glowLeft(look, now) ? { ...look, glow: null } : null);
