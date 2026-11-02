// Samgyeopsal grilling minigame rules (no DOM, so it can be unit-tested).
// Four slices of pork belly sit on the grill. The side facing down cooks;
// tap a slice to flip it, and serve it once both sides are golden. Each side
// is scored by how close it got to golden brown when it left the heat:
// raw scores low, burnt scores zero. The round's score gives a medal.

export const SLICES = 4;
export const GOLDEN = 0.8; // perfect doneness of a side
export const BURNT = 1.05; // past this a side is burnt
export const MEDALS = [
  ['gold', 90, '🥇'],
  ['silver', 75, '🥈'],
  ['bronze', 55, '🥉'],
];
export const MEDAL_REWARD = { gold: 30, silver: 20, bronze: 10 }; // first time each

// One side's score, 0..1, from how cooked it is.
export function sideScore(c) {
  if (c >= BURNT) return 0;
  return Math.max(0, 1 - Math.abs(c - GOLDEN) / 0.4);
}

// Doneness label for a side: raw, cooking, golden, burnt.
export function doneness(c) {
  if (c >= BURNT) return 'burnt';
  if (c >= GOLDEN - 0.1) return 'golden';
  if (c >= 0.3) return 'cooking';
  return 'raw';
}

export function medalFor(score) {
  return MEDALS.find(([, min]) => score >= min)?.[0] || null;
}
export const medalIcon = (m) => MEDALS.find(([id]) => id === m)?.[2] || '';
export const medalRank = (m) => (m ? 3 - MEDALS.findIndex(([id]) => id === m) : 0); // gold 3 … none 0

export class Grill {
  // rand is injectable for tests. Each slice cooks at its own speed (a side
  // takes about 6 to 9 seconds), so you can't just flip them all at once.
  constructor(rand = Math.random) {
    this.slices = Array.from({ length: SLICES }, () => ({
      sides: [0, 0], // doneness of side A and side B
      down: 0, // which side faces the grill
      rate: 0.09 + rand() * 0.045,
      served: false,
      score: 0,
    }));
    this.time = 0;
  }

  step(dt) {
    this.time += dt;
    for (const s of this.slices) if (!s.served) s.sides[s.down] = Math.min(1.4, s.sides[s.down] + s.rate * dt);
  }

  flip(i) {
    const s = this.slices[i];
    if (s && !s.served) s.down = 1 - s.down;
  }

  // Take a slice off the grill. Returns its score (0..1).
  serve(i) {
    const s = this.slices[i];
    if (!s || s.served) return s?.score ?? 0;
    s.served = true;
    s.score = (sideScore(s.sides[0]) + sideScore(s.sides[1])) / 2;
    return s.score;
  }

  get done() { return this.slices.every((s) => s.served); }

  // Round score 0..100 (served slices only count once all are off).
  get score() { return Math.round((this.slices.reduce((a, s) => a + s.score, 0) / SLICES) * 100); }
}

// Medals kept on this device (and in the cloud save): { grill: 'gold' }.
const MEDAL_KEY = 'mk.medals';
export class Medals {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    try { this.m = JSON.parse(storage?.getItem(MEDAL_KEY) || '{}') || {}; } catch { this.m = {}; }
  }
  best(game) { return this.m[game] || null; }
  // Records a medal; returns the coins earned for medals better than before.
  add(game, medal) {
    const before = medalRank(this.m[game]), now = medalRank(medal);
    if (now <= before) return 0;
    let coins = 0;
    for (const [id] of MEDALS) if (medalRank(id) > before && medalRank(id) <= now) coins += MEDAL_REWARD[id];
    this.m[game] = medal;
    try { this.storage?.setItem(MEDAL_KEY, JSON.stringify(this.m)); } catch { /* storage blocked */ }
    return coins;
  }
}
