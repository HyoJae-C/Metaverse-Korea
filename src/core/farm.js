// The weekend farm (주말농장): everyone has the same twelve beds in the
// glasshouse of the Yongsan Family Park allotments. Buy a seed, plant it,
// water it once on the way, pick it when it is grown and sell it at the stand.
// Crops grow in real time (also while you are away) and never die.
//
// Rules (Yozi 2026-11-21): money earned by effort has no daily limit, so
// nothing here is counted per day; the beds and the growing time are the
// only limit. All five crops and all twelve beds are open from the start.
// Short crops earn more an hour but need you there; long crops earn more a
// visit. Watered in its second half, a crop sells for half as much again.
//
// The server (supabase/064_farm.sql) keeps the beds, the clock and the
// money; the numbers here must match its farm_crops table, which wins when
// they differ. No DOM here, so it can be unit-tested.

export const FARM_BEDS = 12;
export const FRESH = 1.5; // a watered crop's price, times the plain one

const MIN = 60e3;
// grow: real minutes from seed to harvest. seed, sell: won.
export const CROPS = [
  { id: 'lettuce', emoji: '🥗', grow: 20, seed: 200, sell: 500 },
  { id: 'tomato', emoji: '🍅', grow: 60, seed: 400, sell: 1200 },
  { id: 'potato', emoji: '🥔', grow: 180, seed: 600, sell: 2000 },
  { id: 'chili', emoji: '🌶️', grow: 360, seed: 800, sell: 3000 },
  { id: 'cabbage', emoji: '🥬', grow: 720, seed: 1000, sell: 3400 },
];
export const cropById = (id) => CROPS.find((c) => c.id === id) || null;

// What a crop sells for: plain, or fresh (watered).
export const sellPrice = (crop, fresh) => (crop ? Math.round(crop.sell * (fresh ? FRESH : 1)) : 0);

// A bed as the server gives it: { crop, at (planted, ms), wet (watered, ms or null) }.
// Returns where it stands now:
//   stage  'empty' | 'sprout' | 'thirsty' | 'growing' | 'ripe'
//   t      0..1 grown
//   left   ms until ripe
//   fresh  watered in time (sells for more)
// A bed gets thirsty at half time and stays so until watered or ripe; water
// counts only from then on (so there is a reason to come back), and once
// ripe it is too late.
export function bedState(bed, now = Date.now()) {
  const crop = cropById(bed?.crop);
  if (!crop || !Number.isFinite(bed.at)) return { stage: 'empty', t: 0, left: 0, fresh: false, crop: null };
  const span = crop.grow * MIN;
  const t = Math.max(0, Math.min(1, (now - bed.at) / span));
  const fresh = Number.isFinite(bed.wet) && bed.wet >= bed.at + span / 2 && bed.wet <= bed.at + span;
  const left = Math.max(0, bed.at + span - now);
  const stage = t >= 1 ? 'ripe' : t < 0.5 ? 'sprout' : fresh ? 'growing' : 'thirsty';
  return { stage, t, left, fresh, crop };
}

// What you can do at a bed now: 'plant' | 'water' | 'pick' | null (wait).
export function bedAct(bed, now = Date.now()) {
  const s = bedState(bed, now);
  return s.stage === 'empty' ? 'plant' : s.stage === 'thirsty' ? 'water' : s.stage === 'ripe' ? 'pick' : null;
}

// "1 h 20 min", "12 min", "under a minute" as { h, m } for the UI to word.
export function timeLeft(ms) {
  const m = Math.ceil(Math.max(0, ms) / MIN);
  return { h: Math.floor(m / 60), m: m % 60 };
}

// The barn: what you picked and have not sold, { '<crop>': n, '<crop>+': n }
// ('+' = fresh). What it is all worth.
export const barnKey = (cropId, fresh) => cropId + (fresh ? '+' : '');
export function barnWorth(barn) {
  let sum = 0;
  for (const [k, n] of Object.entries(barn || {})) {
    const fresh = k.endsWith('+');
    const crop = cropById(fresh ? k.slice(0, -1) : k);
    if (crop && n > 0) sum += sellPrice(crop, fresh) * Math.floor(n);
  }
  return sum;
}
export const barnCount = (barn) => Object.values(barn || {}).reduce((a, n) => a + (n > 0 ? Math.floor(n) : 0), 0);

// Won an hour from one bed kept busy with a crop (for the balance tests).
export const hourly = (crop, fresh) => ((sellPrice(crop, fresh) - crop.seed) * 60) / crop.grow;
