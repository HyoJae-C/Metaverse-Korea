// Gym (헬스장) rules, no DOM so it can be unit-tested.
// Six exercises; finishing a set counts as one workout. Each workout makes
// walking and running a tiny bit faster (+0.01%), up to +1% in total (100 sets), so
// regulars move a touch quicker without it changing the game.

export const BOOST_PER_WORKOUT = 0.0001; // +0.01%
export const MAX_BOOST = 0.01; // +1%
export const EXERCISES = {
  treadmill: { icon: '🏃', mode: 'mash', seconds: 15, goal: 40, name: { en: 'Treadmill', ko: '러닝머신', ja: 'ランニングマシン', zh: '跑步机' } },
  dumbbell: { icon: '💪', mode: 'timing', reps: 10, name: { en: 'Dumbbell curls', ko: '아령', ja: 'ダンベル', zh: '哑铃' } },
  bench: { icon: '🏋️', mode: 'timing', reps: 8, name: { en: 'Bench press', ko: '벤치프레스', ja: 'ベンチプレス', zh: '卧推' } },
  pushup: { icon: '🙇', mode: 'timing', reps: 12, name: { en: 'Push-ups', ko: '푸시업', ja: '腕立て伏せ', zh: '俯卧撑' } },
  situp: { icon: '🧘', mode: 'timing', reps: 12, name: { en: 'Sit-ups', ko: '윗몸일으키기', ja: '腹筋', zh: '仰卧起坐' } },
  pullup: { icon: '🤸', mode: 'timing', reps: 8, name: { en: 'Pull-ups', ko: '턱걸이', ja: '懸垂', zh: '引体向上' } },
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
    try { raw = JSON.parse(storage?.getItem(KEY) || '{}') || {}; } catch { /* broken save */ }
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

// The gym's trainer, 김석윤: what he says when you talk to him.
// [Korean, romanisation, English].
export const TRAINER_NAME = { en: 'Trainer Kim Seokyun', ko: '김석윤 트레이너', ja: 'キム・ソクユン トレーナー', zh: '金锡允教练' };
export const TRAINER_LINES = [
  ['전 울지 않아요. 울면 근손실이 생기니까요.', 'jeon ulji anayo. ulmyeon geunsonsiri saenggini-kkayo.', "I don't cry. Crying makes you lose muscle."],
  ['하나만 더! 진짜 마지막 하나만 더!', 'hanaman deo! jinjja majimak hanaman deo!', 'One more! Really, just one more!'],
  ['오늘 하체 안 하면 내일도 안 해요.', 'oneul hache an hamyeon naeildo an haeyo.', "Skip leg day today and you'll skip it tomorrow too."],
  ['닭가슴살은 맛으로 먹는 게 아니에요. 의리로 먹는 거예요.', 'dakgaseumsareun maseuro meongneun ge anieyo. uiriro meongneun geoyeyo.', "You don't eat chicken breast for the taste. You eat it out of loyalty."],
  ['근육은 배신하지 않아요.', 'geunyugeun baesinhaji anayo.', 'Muscles never betray you.'],
  ['엘리베이터요? 계단이 무료 헬스장이에요.', 'ellibeiteoyo? gyedani muryo helseujang-ieyo.', 'The lift? The stairs are a free gym.'],
  ['쉬는 시간은 30초! 폰 내려놓으세요!', 'swineun siganeun samsipcho! pon naeryeonoeuseyo!', 'Thirty seconds of rest! Put the phone down!'],
  ['자극 느껴지시죠? 그게 성장이에요.', 'jageuk neukkyeojisijyo? geuge seongjang-ieyo.', "Feel the burn? That's growth."],
  ['철봉 매달리기 10초부터 시작해 봐요.', 'cheolbong maedalligi sipchobuteo sijakae bwayo.', 'Start by hanging from the bar for ten seconds.'],
];
// The next line to say: never the same one twice in a row.
export function nextTrainerLine(last, rand = Math.random) {
  if (TRAINER_LINES.length < 2) return 0;
  let i = Math.floor(rand() * (TRAINER_LINES.length - 1));
  if (i >= last && last >= 0) i++;
  return i;
}
