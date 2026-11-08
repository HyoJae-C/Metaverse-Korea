// Yoga & pilates studio (숨 요가·필라테스) rules, no DOM so it can be unit-tested.
// Yoga: follow the class through six poses, keeping your balance in each.
// Pilates: lie on a reformer and push out on the out-breath, come back on
// the in-breath. A finished flow or set counts as one workout, the same as a
// gym set (core/gym.js), so it adds to the tiny speed boost.

// The class flow, in order. `id` is the pose others see (the "ac" field).
export const YOGA_FLOW = [
  { id: 'ymountain', icon: '🙌', name: { en: 'Mountain pose', ko: '산 자세', ja: '山のポーズ', zh: '山式' }, cue: { en: 'Arms up, stand tall.', ko: '두 팔을 위로, 길게 서요.', ja: '両腕を上に、まっすぐ立って。', zh: '双臂上举，站直。' } },
  { id: 'ytree', icon: '🌳', name: { en: 'Tree pose', ko: '나무 자세', ja: '木のポーズ', zh: '树式' }, cue: { en: 'One foot on the other leg. Find a still point.', ko: '한 발을 다리 안쪽에. 한 곳을 바라봐요.', ja: '片足を脚の内側に。一点を見つめて。', zh: '一只脚放在另一条腿内侧，盯住一点。' } },
  { id: 'ywarrior', icon: '⚔️', name: { en: 'Warrior II', ko: '전사 자세 2', ja: '戦士のポーズII', zh: '战士二式' }, cue: { en: 'Front knee bent, arms long to the sides.', ko: '앞 무릎을 굽히고 두 팔은 옆으로 길게.', ja: '前の膝を曲げ、両腕を横に長く。', zh: '前膝弯曲，双臂向两侧伸长。' } },
  { id: 'ydog', icon: '🐕', name: { en: 'Downward dog', ko: '다운독', ja: 'ダウンドッグ', zh: '下犬式' }, cue: { en: 'Hips high, heels down.', ko: '엉덩이는 높이, 뒤꿈치는 바닥으로.', ja: 'お尻を高く、かかとは床へ。', zh: '臀部抬高，脚跟向下。' } },
  { id: 'ycobra', icon: '🐍', name: { en: 'Cobra', ko: '코브라 자세', ja: 'コブラのポーズ', zh: '眼镜蛇式' }, cue: { en: 'Chest up, shoulders down.', ko: '가슴은 들고 어깨는 내려요.', ja: '胸を上げて、肩は下げて。', zh: '抬胸，沉肩。' } },
  { id: 'ylotus', icon: '🪷', name: { en: 'Seated meditation', ko: '명상 자세', ja: '瞑想のポーズ', zh: '冥想坐' }, cue: { en: 'Sit, close your eyes, breathe.', ko: '앉아서 눈을 감고 숨을 쉬어요.', ja: '座って目を閉じ、呼吸して。', zh: '坐下，闭眼，呼吸。' } },
];
export const YOGA_POSES = YOGA_FLOW.map((p) => p.id);

export const STUDIO_EX = {
  yoga: { icon: '🧘', mode: 'flow', hold: 3, seconds: 75, name: { en: 'Yoga flow', ko: '요가 플로우', ja: 'ヨガフロー', zh: '瑜伽流' } },
  reformer: { icon: '🤸', mode: 'breath', reps: 8, period: 4, name: { en: 'Pilates reformer', ko: '필라테스 리포머', ja: 'ピラティス リフォーマー', zh: '普拉提核心床' } },
};

// The class at the front: the instructor and the members on the mats move
// through the flow together, a new pose every POSE_SECONDS.
export const POSE_SECONDS = 7;
export const classPose = (t) => YOGA_FLOW[Math.floor(Math.max(0, t) / POSE_SECONDS) % YOGA_FLOW.length].id;

// Balance: a marker that drifts on its own (st = { x: 0..1, v }); you nudge
// it back with ◀ ▶. It sways harder in the harder poses.
export const BALANCE_ZONE = [0.34, 0.66];
export const SWAY = { ymountain: 0.7, ytree: 1.4, ywarrior: 1.1, ydog: 1, ycobra: 0.9, ylotus: 0.6 };
export function driftStep(st, dt, sway = 1, rand = Math.random) {
  st.v += (rand() - 0.5) * 2.4 * sway * dt + (st.x - 0.5) * 0.9 * sway * dt; // a little pull away from the middle
  st.v *= Math.max(0, 1 - dt * 0.8);
  st.x += st.v * dt;
  if (st.x < 0) { st.x = 0; st.v = Math.abs(st.v) * 0.3; }
  if (st.x > 1) { st.x = 1; st.v = -Math.abs(st.v) * 0.3; }
  return st;
}
export const nudge = (st, dir) => { st.v = st.v * 0.4 + dir * 0.32; return st; };
export const inBalance = (x) => x >= BALANCE_ZONE[0] && x <= BALANCE_ZONE[1];
// Holding a pose: fills while balanced, slips back a little while not.
export const holdStep = (held, balanced, dt) => Math.max(0, held + (balanced ? dt : -dt * 0.5));

// Breathing on the reformer: each cycle is an in-breath (come back, let go of
// PUSH) and then an out-breath (push out, hold PUSH).
export function breathAt(t, period = STUDIO_EX.reformer.period) {
  const c = Math.max(0, t) / period;
  const u = c % 1;
  return { cycle: Math.floor(c), push: u >= 0.5, u: u < 0.5 ? u * 2 : (u - 0.5) * 2 };
}
// A rep counts when you breathed with the guide most of the cycle.
export const goodRep = (right, total) => total > 0 && right / total >= 0.7;

// The instructor, 윤하늘: what she says when you talk to her.
// [Korean, romanisation, English].
export const INSTRUCTOR_NAME = { en: 'Instructor Yoon Haneul', ko: '윤하늘 강사', ja: 'ユン・ハヌル 講師', zh: '尹天空老师' };
export const INSTRUCTOR_LINES = [
  ['들이마시고... 내쉬고... 잘하고 있어요.', 'deurimasigo... naeswigo... jalhago isseoyo.', "Breathe in... and out... you're doing great."],
  ['어깨에 힘 빼세요. 귀랑 어깨는 멀리멀리.', 'eokkae-e him ppaeseyo. gwirang eokkaeneun meollimeolli.', 'Drop your shoulders. Ears far away from them.'],
  ['오늘 매트 위에 온 것만으로도 잘한 거예요.', 'oneul maeteu wie on geonmaneurodo jalhan geoyeyo.', 'Just getting on the mat today is a win.'],
  ['배꼽을 등 쪽으로 쏙! 필라테스는 코어예요.', 'baekkobeul deung jjogeuro ssok! pillateseuneun koeoyeyo.', 'Belly button to your spine! Pilates is all core.'],
  ['다리가 떨리는 건 몸이 깨어나는 소리예요.', 'dariga tteollineun geon momi kkae-eonaneun soriyeyo.', 'Shaky legs are just your body waking up.'],
  ['옆 사람 말고 어제의 나랑만 비교해요.', 'yeop saram malgo eoje-ui narangman bigyohaeyo.', "Don't compare with the person next to you. Only with yesterday's you."],
  ['사바아사나는 자는 시간이 아니에요... 아마도요.', 'sabaasananeun janeun sigani anieyo... amadoyo.', "Savasana isn't nap time... probably."],
  ['숨 참지 마세요! 다들 얼굴 빨개졌어요.', 'sum chamji maseyo! dadeul eolgul ppalgaejyeosseoyo.', "Don't hold your breath! Everyone's going red."],
];
// The next line to say: never the same one twice in a row.
export function nextInstructorLine(last, rand = Math.random) {
  let i = Math.floor(rand() * (INSTRUCTOR_LINES.length - 1));
  if (i >= last && last >= 0) i++;
  return i;
}
