// Claw machine (인형뽑기) rules, no DOM so it can be unit-tested.
// The claw swings left and right; drop it over a prize. Lined up well, it
// grabs, but it can still slip on the way up. Each try costs coins: this is
// somewhere to spend them. Prizes are plushies to put in your home, or coins.

export const CLAW_COST = 1000; // won, like a real claw machine
export const SLIP = 0.3; // a good grab still slips 30% of the time
export const PRIZES = [
  { id: 'plush-simurugi', weight: 2, emoji: '😑', item: 'plush-simurugi' },
  { id: 'plush-mongle', weight: 3, emoji: '☁️', item: 'plush-mongle' },
  { id: 'plush-bear', weight: 3, emoji: '🧸', item: 'plush-bear' },
  { id: 'plush-mandu', weight: 3, emoji: '🥟', item: 'plush-mandu' },
  { id: 'coins5', weight: 4, emoji: '💰', coins: 5000 },
  { id: 'coins2', weight: 6, emoji: '🪙', coins: 2000 },
];

// The claw's x (0..1) at time t: a smooth swing, a bit faster each try.
export const clawX = (t, speed = 1) => 0.5 + 0.42 * Math.sin(t * 1.6 * speed);

// Lay out 5 prizes in the pit at random spots (x 0.1..0.9, apart).
export function layPrizes(rand = Math.random) {
  const total = PRIZES.reduce((a, p) => a + p.weight, 0);
  const pick = () => {
    let r = rand() * total;
    for (const p of PRIZES) { r -= p.weight; if (r < 0) return p; }
    return PRIZES[PRIZES.length - 1];
  };
  const out = [];
  for (let i = 0; i < 5; i++) out.push({ prize: pick(), x: 0.12 + i * 0.19 + (rand() - 0.5) * 0.06 });
  return out;
}

// Drop at x: the nearest prize within reach is grabbed; then it may slip.
// Returns { prize, slipped } or null for a miss.
export function drop(pit, x, rand = Math.random) {
  let best = null, bd = 0.055; // the claw's reach
  for (const p of pit) { const d = Math.abs(p.x - x); if (d < bd) { bd = d; best = p; } }
  if (!best) return null;
  // Dead centre almost never slips; at the edge of reach it slips more.
  const slip = SLIP * (0.5 + bd / 0.055);
  return { prize: best.prize, at: best, slipped: rand() < slip };
}
