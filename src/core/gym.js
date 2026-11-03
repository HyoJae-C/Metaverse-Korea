// Gym (헬스장) rules, no DOM so it can be unit-tested.
// Four exercises; finishing a set counts as one workout. Each workout makes
// walking and running a tiny bit faster (+0.01%), up to +1% in total (100 sets), so
// regulars move a touch quicker without it changing the game.

export const BOOST_PER_WORKOUT = 0.0001; // +0.01%
export const MAX_BOOST = 0.01; // +1%
export const EXERCISES = {
  treadmill: { icon: '🏃', mode: 'mash', seconds: 15, goal: 40, name: { en: 'Treadmill', ko: '러닝머신', ja: 'ランニングマシン', zh: '跑步机' } },
  dumbbell: { icon: '💪', mode: 'timing', reps: 10, name: { en: 'Dumbbell curls', ko: '아령', ja: 'ダンベル', zh: '哑铃' } },
  bench: { icon: '🏋️', mode: 'timing', reps: 8, name: { en: 'Bench press', ko: '벤치프레스', ja: 'ベンチプレス', zh: '卧推' } },
  pushup: { icon: '🙇', mode: 'timing', reps: 12, name: { en: 'Push-ups', ko: '푸시업', ja: '腕立て伏せ', zh: '俯卧撑' } },
};

// Speed multiplier for a number of workouts.
export const boostFor = (workouts) => 1 + Math.min(MAX_BOOST, Math.max(0, workouts | 0) * BOOST_PER_WORKOUT);

// The timing bar: a marker sweeps 0..1..0; a rep counts when it's in the
// zone. The zone narrows a little as the set goes on (it gets heavier).
export const markerAt = (t, speed = 1) => { const u = (t * 0.9 * speed) % 2; return u < 1 ? u : 2 - u; };
export function zoneFor(rep, reps) {
  const width = 0.3 - 0.12 * (rep / Math.max(1, reps));
  return [0.5 - width / 2, 0.5 + width / 2];
}
export const inZone = (x, [a, b]) => x >= a && x <= b;

const KEY = 'mk.gym';
export class GymLog {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    let raw = {};
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}'); } catch { /* broken save */ }
    this.workouts = Math.max(0, raw.workouts | 0);
    this.byKind = raw.byKind && typeof raw.byKind === 'object' ? raw.byKind : {};
  }
  get boost() { return boostFor(this.workouts); }
  // A finished set: one more workout. Returns the new speed multiplier.
  finishSet(kind) {
    this.workouts++;
    this.byKind[kind] = (this.byKind[kind] | 0) + 1;
    try { this.storage?.setItem(KEY, JSON.stringify({ workouts: this.workouts, byKind: this.byKind })); } catch { /* storage blocked */ }
    return this.boost;
  }
}
