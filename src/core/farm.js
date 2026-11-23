// The weekend farm (주말농장): everyone has the same twelve beds in the
// glasshouse of the Yongsan Family Park allotments. Buy a seed, plant it,
// water it once a day, pick it when it is grown and sell it at the stand.
// Crops grow in real time (also while you are away) and never die.
//
// Rules (Yozi 2026-11-21): money earned by effort has no daily limit, so
// nothing here is counted per day; the beds and the growing time are the
// only limit. Twelve crops, each with its own number of days (1 to 30), and
// a crop is as hard as it is long: it wants water once every
// Korean day. Watered on enough days it sells fresh; otherwise plain.
// Plain, every crop earns the same a day (3,000 won a bed); fresh, a longer
// crop earns more a day, so the long ones are for those who come every day
// ("coming every day should pay more"). A crop of ten days or more forgives
// one missed day in ten. All beds are open from the start.
//
// Where a seed comes from (Yozi 2026-11-21), `from`:
//   'farm'  the three basic ones, bought at the bed (lettuce, strawberry,
//           carrot)
//   'shop'  sold at the seed shop by Heunginjimun (game/seed-shop.js): they
//           wait in your seed pouch, which the server keeps (not a bag
//           item, so it can't be traded)
//   'rare'  not sold (napa cabbage, ginseng): to be found some rare way
//           later; until then nobody has them
//
// The server (supabase/064_farm.sql, 066_farm_days.sql, 067_farm_seeds.sql) keeps the beds, the
// clock and the money; the numbers here must match its farm_crops table,
// which wins when they differ. No DOM here, so it can be unit-tested.

export const FARM_BEDS = 12;
const MIN = 60e3, DAY_MIN = 1440, KST = 9 * 3600e3;
// from: where its seed comes from (above). days: real days from seed to
// harvest. seed: won. sell, fresh: what one
// sells for, plain and fresh.
export const CROPS = [
  { id: 'lettuce', from: 'farm', emoji: '🥗', days: 1, seed: 500, sell: 3500, fresh: 4500 },
  { id: 'sprout', from: 'shop', emoji: '🌱', days: 2, seed: 1000, sell: 7000, fresh: 10000 },
  { id: 'spinach', from: 'shop', emoji: '🍃', days: 3, seed: 1500, sell: 10500, fresh: 15800 },
  { id: 'strawberry', from: 'farm', emoji: '🍓', days: 4, seed: 2000, sell: 14000, fresh: 22000 },
  { id: 'carrot', from: 'farm', emoji: '🥕', days: 5, seed: 2500, sell: 17500, fresh: 30000 },
  { id: 'tomato', from: 'shop', emoji: '🍅', days: 6, seed: 3000, sell: 21000, fresh: 37500 },
  { id: 'broccoli', from: 'shop', emoji: '🥦', days: 7, seed: 3500, sell: 24500, fresh: 45500 },
  { id: 'cucumber', from: 'shop', emoji: '🥒', days: 8, seed: 4000, sell: 28000, fresh: 55200 },
  { id: 'corn', from: 'shop', emoji: '🌽', days: 10, seed: 5000, sell: 35000, fresh: 75000 },
  { id: 'pumpkin', from: 'shop', emoji: '🎃', days: 15, seed: 7500, sell: 52500, fresh: 127500 },
  { id: 'cabbage', from: 'rare', emoji: '🥬', days: 20, seed: 10000, sell: 70000, fresh: 180000 },
  { id: 'ginseng', from: 'rare', emoji: '🌿', days: 30, seed: 15000, sell: 105000, fresh: 285000 },
].map((c) => ({ ...c, grow: c.days * DAY_MIN })); // grow: minutes, as the server counts
export const SEED_PACK_MAX = 99; // seeds of one kind bought at once
export const cropById = (id) => CROPS.find((c) => c.id === id) || null;
export const cropDays = (crop) => Math.max(1, Math.round((crop?.grow || 0) / DAY_MIN));
// How many waterings make a crop fresh: one for each day it grows, less one
// for every ten days (10 and 15 days forgive one missed day, 30 forgive 3).
export const waterings = (crop) => { const d = cropDays(crop); return d - Math.floor(d / 10); };

// What a crop sells for: plain, or fresh (watered on enough days).
export const sellPrice = (crop, fresh) => (crop ? (fresh ? crop.fresh : crop.sell) : 0);

// The Korean date a moment falls on, as a day number (the watering day
// turns over at 00:00 KST, like the daily missions).
export const kstDayNo = (ms) => Math.floor((ms + KST) / 86400e3);

// A bed as the server gives it: { crop, at (planted, ms), wet (last
// watered, ms or null), n (times watered) }. Returns where it stands now:
//   stage  'empty' | 'thirsty' | 'growing' | 'ripe'
//   t      0..1 grown
//   left   ms until ripe
//   n, need  times watered, and how many make it fresh
//   fresh  watered on enough days (sells for more)
// A bed is thirsty once each Korean day until it has had all its
// waterings or is ripe; once ripe it is too late.
export function bedState(bed, now = Date.now()) {
  const crop = cropById(bed?.crop);
  if (!crop || !Number.isFinite(bed.at)) return { stage: 'empty', t: 0, left: 0, n: 0, need: 0, fresh: false, crop: null };
  const span = crop.grow * MIN, need = waterings(crop);
  const t = Math.max(0, Math.min(1, (now - bed.at) / span));
  const n = Math.max(0, Math.min(need, Math.floor(Number(bed.n) || 0)));
  const left = Math.max(0, bed.at + span - now);
  const today = Number.isFinite(bed.wet) && kstDayNo(bed.wet) === kstDayNo(now);
  const stage = t >= 1 ? 'ripe' : n < need && !today ? 'thirsty' : 'growing';
  return { stage, t, left, n, need, fresh: n >= need, crop };
}

// What you can do at a bed now: 'plant' | 'water' | 'pick' | null (wait).
export function bedAct(bed, now = Date.now()) {
  const s = bedState(bed, now);
  return s.stage === 'empty' ? 'plant' : s.stage === 'thirsty' ? 'water' : s.stage === 'ripe' ? 'pick' : null;
}

// "2 d 3 h", "1 h 20 min", "12 min" as { d, h, m } for the UI to word.
export function timeLeft(ms) {
  const m = Math.ceil(Math.max(0, ms) / MIN);
  return { d: Math.floor(m / DAY_MIN), h: Math.floor((m % DAY_MIN) / 60), m: m % 60 };
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

// Won a day from one bed kept busy with a crop (for the balance tests).
export const daily = (crop, fresh) => (sellPrice(crop, fresh) - crop.seed) / cropDays(crop);
