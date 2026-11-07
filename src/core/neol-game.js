// Neolttwigi (널뛰기) rules, no DOM (ui/neol-ui.js draws it).
//
// Two people stand on the ends of a long board laid over a straw bundle and
// take turns jumping: when one lands, the other flies up. You and a partner
// (a friendly local) jump in turn. Tap PUSH just as you land: good timing
// sends your partner higher, and they send you back up just as high, so a
// run of good landings climbs. A late or early push loses height.
// Ten landings a round; the score is how high you flew in all.

export const NEOL_GAME = 'neol';
export const G = 9.8;
export const JUMPS = 10;
export const WINDOW = 0.22; // seconds either side of the landing that still count
export const V0 = 2.8; // first launch speed (about 40 cm up)
export const VMIN = 2.2, VMAX = 6.2; // about 25 cm .. 2 m
export const MEDAL_METRES = { gold: 13, silver: 9.5, bronze: 6 };

export const heightOf = (v) => (v * v) / (2 * G);
export const airTime = (v) => (2 * v) / G;

// Timing quality 0..1 from how far the tap was from the landing (seconds,
// negative = early).
export function pushQuality(err) {
  if (err == null || !Number.isFinite(err)) return 0;
  return Math.max(0, 1 - Math.abs(err) / WINDOW);
}
export const pushLabel = (q) => (q >= 0.8 ? 'perfect' : q >= 0.45 ? 'good' : q > 0 ? 'ok' : 'miss');

// Your partner's launch speed after you land at speed v with quality q.
export function pushed(v, q) {
  const n = v * 0.82 + q * 1.7 - (q === 0 ? 0.4 : 0);
  return Math.max(VMIN, Math.min(VMAX, n));
}
// The partner always pushes back well: you go up about as high as they did.
export const partnerReturn = (v) => Math.max(VMIN, Math.min(VMAX, v * 0.97 + 0.15));

export function neolMedal(metres) {
  for (const m of ['gold', 'silver', 'bronze']) if (metres >= MEDAL_METRES[m]) return m;
  return null;
}

// The rhythm of a round: you fly (v), land and push; your partner flies,
// lands and sends you up again.
export class NeolRound {
  constructor() {
    this.v = V0; // your current launch speed
    this.jumps = []; // { h, q, label }
    this.partnerV = 0;
  }
  get done() { return this.jumps.length >= JUMPS; }
  get metres() { return Math.round(this.jumps.reduce((a, j) => a + j.h, 0) * 10) / 10; }
  get best() { return this.jumps.reduce((a, j) => Math.max(a, j.h), 0); }
  // You land; err is the push timing (null: no push). Returns the jump.
  land(err) {
    if (this.done) return null;
    const q = pushQuality(err);
    const jump = { h: heightOf(this.v), q, label: pushLabel(q) };
    this.jumps.push(jump);
    this.partnerV = pushed(this.v, q);
    this.v = partnerReturn(this.partnerV);
    return jump;
  }
}
