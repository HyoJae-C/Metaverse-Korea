// The skate park on Olympic Park's Peace Plaza, Songpa (map landmark "skatepark"): the layout, the ground
// height you ride on, and the tricks. Kept free of three.js and the DOM so
// it can be unit-tested; the scenery is in skatepark-model.js.
//
// Layout in metres from the park's centre: +x east, +z south (down on the
// map). A concrete pad 88 × 60 m with a fence round it and the gate on the
// north side (towards Olympic-ro). Quarter pipes at the west and east
// ends (with a flat deck on top), a funbox in the middle, two kickers in the
// south (one jumping east, one west, in their own lanes) and two grind
// rails, each with a low ramp up to its start.
//
// Riding (bike, skateboard, inline skates or kick scooter from the bike
// shop) you go up and over the ramps; a ramp that ends in a lip throws you
// into the air. Tap Trick to pop (an ollie / bunny hop) and to do a trick
// while you are in the air. A trick that fits the air time left is picked
// for you, so landing is easy; land in the middle of a trick and you bail.
// Tricks one after another (in the air, or within a moment of landing)
// make a combo: each different trick or rail in it raises the multiplier
// (up to ×5). A grind is one entry that grows while you slide, up to a cap.

export const PARK = { hx: 44, hz: 30, gate: [16, 28] }; // half-width, half-depth; the gate's x span on the north fence
export const PARK_SPEED = 9; // m/s: rides slow down to this inside the park (ramps are small)
export const GRAVITY = 15;
export const POP = 4.2; // m/s up for an ollie from flat ground
export const MAX_VY = 10;
export const VERT_POP_VY = 14; // popping on the way up a quarter pipe
export const COMBO_GAP = 1.2; // seconds on the ground before a combo is counted

// Ramps along x: `dir` +1 rises towards +x, -1 towards -x. `u0` is the toe
// (where it starts), `len` how far it rises, `h` its height.
//   quarter: curves up to a flat deck `deck` m deep, with a wall behind it
//            (a quarter pipe); near the top you go straight up ("vert")
//            and come back down.
//   kicker:  a straight wedge with a lip: ride off it into the air.
//   funbox:  up, a flat top, and down the other side.
export const RAMPS = [
  { id: 'qp-west', kind: 'quarter', dir: -1, u0: -31, len: 8.5, h: 3.0, deck: 3, z0: -26, z1: 26 },
  { id: 'qp-east', kind: 'quarter', dir: 1, u0: 31, len: 8.5, h: 3.0, deck: 3, z0: -26, z1: 26 },
  { id: 'funbox', kind: 'funbox', len: 4, top: 8, h: 1.4, z0: -6, z1: 6 },
  { id: 'kicker-west', kind: 'kicker', dir: 1, u0: -22, len: 4.5, h: 1.6, z0: 13.5, z1: 20.5 },
  { id: 'kicker-east', kind: 'kicker', dir: -1, u0: 22, len: 4.5, h: 1.6, z0: 21.5, z1: 28.5 },
  // Low ramps up to the rails' starts: ride up and you're on the rail.
  { id: 'rail-north-up', kind: 'kicker', dir: 1, u0: -22.5, len: 4, h: 0.6, z0: -19.2, z1: -16.8 },
  { id: 'rail-east-up', kind: 'kicker', dir: 1, u0: 5.5, len: 4, h: 0.6, z0: 4.8, z1: 7.2 },
];
// Grind rails: from a to b, top at height h.
export const RAILS = [
  { id: 'rail-north', a: [-19, -18], b: [7, -18], h: 0.6 },
  { id: 'rail-east', a: [9, 6], b: [27, 6], h: 0.6 },
];
// Walls you can't ride through (park coordinates), besides the fence: the
// backs of the quarter pipes.
export const QP_WALL = 0.6; // thickness

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Height of one ramp at (x, z), and how far up it you are (s, 0..1).
function rampAt(r, x, z) {
  if (z < r.z0 || z > r.z1) return null;
  if (r.kind === 'funbox') {
    const ax = Math.abs(x), half = r.top / 2;
    if (ax >= half + r.len) return null;
    if (ax <= half) return { y: r.h, s: 1, r };
    return { y: r.h * (half + r.len - ax) / r.len, s: (half + r.len - ax) / r.len, r };
  }
  const u = (x - r.u0) * r.dir; // metres up the ramp from its toe
  if (u <= 0) return null;
  if (r.kind === 'kicker') {
    if (u > r.len) return null; // past the lip: the back drops straight down
    const s = u / r.len;
    return { y: r.h * Math.pow(s, 1.25), s, r };
  }
  // quarter: curves up (steeper and steeper) to the deck at the top.
  if (u > r.len + (r.deck || 0)) return null;
  const s = Math.min(1, u / r.len);
  return { y: r.h * s * s, s, r };
}

// Ground height in the park at (x, z) (park coordinates): 0 on the pad, up
// on a ramp. Returns { y, s, r } (r: the ramp, or null).
export function parkGround(x, z) {
  let best = { y: 0, s: 0, r: null };
  for (const r of RAMPS) {
    const g = rampAt(r, x, z);
    if (g && g.y > best.y) best = g;
  }
  return best;
}

export const inPark = (x, z, pad = 0) => Math.abs(x) <= PARK.hx + pad && Math.abs(z) <= PARK.hz + pad;

// The nearest rail within `reach` of (x, z): { rail, t (0..1 along it), d }.
export function railNear(x, z, reach = 0.9) {
  let best = null;
  for (const rail of RAILS) {
    const [ax, az] = rail.a, [bx, bz] = rail.b;
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = clamp(((x - ax) * dx + (z - az) * dz) / L2, 0, 1);
    const d = Math.hypot(x - (ax + dx * t), z - (az + dz * t));
    if (d <= reach && (!best || d < best.d)) best = { rail, t, d };
  }
  return best;
}

// Polygons for the map's "blockers" (world metres): the fence (with the
// gate left open) and the walls behind the quarter pipes' decks.
export function parkBlockers(cx, cz) {
  const { hx, hz, gate } = PARK, T = 0.4;
  const rect = (x0, z0, x1, z1) => ({ p: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]].map(([x, z]) => [cx + x, cz + z]) });
  return [
    rect(-hx - T, -hz - T, gate[0], -hz), // north, west of the gate
    rect(gate[1], -hz - T, hx + T, -hz), // north, east of the gate
    rect(-hx - T, hz, hx + T, hz + T), // south
    rect(-hx - T, -hz, -hx, hz), // west
    rect(hx, -hz, hx + T, hz), // east
    ...RAMPS.filter((r) => r.kind === 'quarter').map((r) => {
      const top = r.u0 + r.dir * (r.len + (r.deck || 0)); // the back of the deck
      const [x0, x1] = r.dir > 0 ? [top, top + QP_WALL] : [top - QP_WALL, top];
      return rect(x0, r.z0, x1, r.z1);
    }),
  ];
}

// --- Tricks ---------------------------------------------------------------
// Four tiers by air time, five tricks per tier for each ride. The more air
// you have when you tap, the higher the tier (the biggest that still fits),
// and the five in it take turns.
//   1 low:        a pop on flat ground
//   2 middle:     off a kicker or the funbox
//   3 high:       a popped kicker, or up a quarter pipe
//   4 very high:  big vert off a quarter pipe
// pose(p) for p 0..1: spin (turn round, radians), flip (forward/back
// flip), roll (sideways), rideRoll / rideSpin (the board or bike alone:
// kickflips, shove-its, tail whips), tuck (crouch, 0..1).
// `types`: which rides can do it. pts: base points.
const TAU = Math.PI * 2;
const ease = (p) => p * p * (3 - 2 * p);
const arc = (p) => Math.sin(p * Math.PI);
export const TIER_DUR = [0, 0.42, 0.6, 0.82, 1.05]; // seconds a trick of each tier takes
export const TIER_NAME = {
  1: { en: 'Low air', ko: '낮은 체공', ja: '低い', zh: '低空' },
  2: { en: 'Mid air', ko: '중간 체공', ja: '中くらい', zh: '中空' },
  3: { en: 'High air', ko: '높은 체공', ja: '高い', zh: '高空' },
  4: { en: 'Huge air', ko: '아주 높은 체공', ja: 'とても高い', zh: '超高空' },
};
const T = (tier, id, types, pts, name, pose) => ({ id, tier, types, dur: TIER_DUR[tier], pts, name, pose });
const SK = ['skate'], IN = ['inline'], BK = ['bike', 'kick'];
export const TRICKS = [
  // 1. Low air
  T(1, 'ollie', SK, 50, { en: 'Ollie', ko: '알리', ja: 'オーリー', zh: '豚跳' }, (p) => ({ tuck: arc(p) * 0.6 })),
  T(1, 'kickflip', SK, 110, { en: 'Kickflip', ko: '킥플립', ja: 'キックフリップ', zh: '尖翻' }, (p) => ({ rideRoll: ease(p) * TAU, tuck: arc(p) * 0.7 })),
  T(1, 'heelflip', SK, 110, { en: 'Heelflip', ko: '힐플립', ja: 'ヒールフリップ', zh: '跟翻' }, (p) => ({ rideRoll: -ease(p) * TAU, tuck: arc(p) * 0.7 })),
  T(1, 'jump', IN, 50, { en: 'Jump', ko: '점프', ja: 'ジャンプ', zh: '跳跃' }, (p) => ({ tuck: arc(p) * 0.6 })),
  T(1, 'spread', IN, 100, { en: 'Spread Eagle', ko: '스프레드 이글', ja: 'スプレッドイーグル', zh: '展翅跳' }, (p) => ({ roll: arc(p) * 0.45, tuck: arc(p) * 0.2 })),
  T(1, 'hop', BK, 50, { en: 'Bunny Hop', ko: '버니합', ja: 'バニーホップ', zh: '兔跳' }, (p) => ({ tuck: arc(p) * 0.6 })),
  T(1, 'nofoot', BK, 100, { en: 'No Footer', ko: '노 푸터', ja: 'ノーフッター', zh: '无脚' }, (p) => ({ roll: arc(p) * 0.35, tuck: arc(p) * 0.3 })),
  T(1, 'nohand', BK, 110, { en: 'Tabletop', ko: '테이블탑', ja: 'テーブルトップ', zh: '平台跳' }, (p) => ({ roll: arc(p) * 0.9, tuck: arc(p) * 0.4 })),
  T(1, 'tuckjump', ['inline', 'kick'], 100, { en: 'Tuck Jump', ko: '턱 점프', ja: 'タックジャンプ', zh: '抱膝跳' }, (p) => ({ tuck: arc(p) })),
  T(1, 'shove', SK, 100, { en: 'Pop Shove-it', ko: '팝 쇼빗', ja: 'ポップショービット', zh: '转板' }, (p) => ({ rideSpin: ease(p) * Math.PI, tuck: arc(p) * 0.6 })),
  T(1, 'nollie', SK, 90, { en: 'Nollie', ko: '놀리', ja: 'ノーリー', zh: '前豚跳' }, (p) => ({ flip: arc(p) * 0.3, tuck: arc(p) * 0.6 })),
  T(1, 'mute', IN, 110, { en: 'Mute Grab', ko: '뮤트 그랩', ja: 'ミュートグラブ', zh: '静音抓' }, (p) => ({ tuck: arc(p) * 0.8, roll: -arc(p) * 0.3 })),
  T(1, 'xjump', IN, 90, { en: 'X Jump', ko: 'X 점프', ja: 'Xジャンプ', zh: 'X跳' }, (p) => ({ roll: arc(p) * 0.25, flip: -arc(p) * 0.25 })),
  T(1, 'onefoot', BK, 90, { en: 'One Footer', ko: '원 푸터', ja: 'ワンフッター', zh: '单脚' }, (p) => ({ roll: arc(p) * 0.2, tuck: arc(p) * 0.3 })),
  T(1, 'seatgrab', ['bike'], 110, { en: 'Seat Grab', ko: '시트 그랩', ja: 'シートグラブ', zh: '抓座' }, (p) => ({ roll: arc(p) * 0.4, tuck: arc(p) * 0.6 })),
  // 2. Middle air
  T(2, 'tre', SK, 280, { en: '360 Flip', ko: '360 플립', ja: '360フリップ', zh: '360尖翻' }, (p) => ({ rideRoll: ease(p) * TAU, rideSpin: ease(p) * TAU, tuck: arc(p) * 0.8 })),
  T(2, 'varial', SK, 260, { en: 'Varial Kickflip', ko: '배리얼 킥플립', ja: 'ヴァリアルキックフリップ', zh: '转板尖翻' }, (p) => ({ rideRoll: ease(p) * TAU, rideSpin: ease(p) * Math.PI, tuck: arc(p) * 0.7 })),
  T(2, 'grab', ['skate', 'inline'], 250, { en: 'Indy Grab', ko: '인디 그랩', ja: 'インディーグラブ', zh: '印第抓板' }, (p) => ({ tuck: arc(p), roll: arc(p) * 0.35 })),
  T(2, 'japan', IN, 260, { en: 'Japan Air', ko: '재팬 에어', ja: 'ジャパンエア', zh: '日式腾空' }, (p) => ({ tuck: arc(p) * 0.9, roll: -arc(p) * 0.4 })),
  T(2, 'rocket', IN, 270, { en: 'Rocket Air', ko: '로켓 에어', ja: 'ロケットエア', zh: '火箭腾空' }, (p) => ({ flip: arc(p) * 0.5, tuck: arc(p) * 0.8 })),
  T(2, 'whip', BK, 280, { en: 'Tail Whip', ko: '테일윕', ja: 'テイルホイップ', zh: '甩尾' }, (p) => ({ rideSpin: ease(p) * TAU, tuck: arc(p) * 0.5 })),
  T(2, 'superman', BK, 260, { en: 'Superman', ko: '슈퍼맨', ja: 'スーパーマン', zh: '超人' }, (p) => ({ flip: -arc(p) * 0.6, tuck: arc(p) * 0.2 })),
  T(2, 'turndown', BK, 250, { en: 'Turndown', ko: '턴다운', ja: 'ターンダウン', zh: '下压转把' }, (p) => ({ rideRoll: -arc(p) * 0.9, roll: arc(p) * 0.3, tuck: arc(p) * 0.4 })),
  T(2, 'hardflip', SK, 290, { en: 'Hardflip', ko: '하드플립', ja: 'ハードフリップ', zh: '硬翻' }, (p) => ({ rideRoll: ease(p) * TAU, rideSpin: -ease(p) * Math.PI, tuck: arc(p) * 0.8 })),
  T(2, 'melon', SK, 255, { en: 'Melon Grab', ko: '멜론 그랩', ja: 'メロングラブ', zh: '甜瓜抓板' }, (p) => ({ tuck: arc(p), roll: -arc(p) * 0.35 })),
  T(2, 'safety', IN, 255, { en: 'Safety Grab', ko: '세이프티 그랩', ja: 'セーフティグラブ', zh: '安全抓' }, (p) => ({ tuck: arc(p) })),
  T(2, 'lui', IN, 290, { en: 'Lui Kang', ko: '루이 캉', ja: 'ルイカン', zh: '劈腿踢' }, (p) => ({ flip: -arc(p) * 0.4, roll: arc(p) * 0.5 })),
  T(2, 'candybar', BK, 270, { en: 'Candy Bar', ko: '캔디바', ja: 'キャンディバー', zh: '糖果棒' }, (p) => ({ roll: arc(p) * 0.5, tuck: arc(p) * 0.5 })),
  T(2, 'lookback', BK, 290, { en: 'Lookback', ko: '룩백', ja: 'ルックバック', zh: '回望' }, (p) => ({ spin: arc(p) * 0.6, rideRoll: arc(p) * 0.7, tuck: arc(p) * 0.3 })),
  // 3. High air
  T(3, 'spin360', ['skate', 'inline', 'bike', 'kick'], 400, { en: '360 Spin', ko: '360 스핀', ja: '360スピン', zh: '360旋转' }, (p) => ({ spin: ease(p) * TAU, tuck: arc(p) * 0.6 })),
  T(3, 'backflip', ['skate', 'inline', 'bike', 'kick'], 450, { en: 'Backflip', ko: '백플립', ja: 'バックフリップ', zh: '后空翻' }, (p) => ({ flip: -ease(p) * TAU, tuck: arc(p) })),
  T(3, 'kfindy', SK, 420, { en: 'Kickflip Indy', ko: '킥플립 인디', ja: 'キックフリップインディー', zh: '尖翻抓板' }, (p) => ({ rideRoll: ease(Math.min(1, p * 1.6)) * TAU, tuck: arc(p), roll: arc(p) * 0.3 })),
  T(3, 'japan360', IN, 420, { en: '360 Japan', ko: '360 재팬', ja: '360ジャパン', zh: '360日式' }, (p) => ({ spin: ease(p) * TAU, tuck: arc(p) * 0.9, roll: -arc(p) * 0.4 })),
  T(3, 'whip360', BK, 430, { en: '360 Tail Whip', ko: '360 테일윕', ja: '360テイルホイップ', zh: '360甩尾' }, (p) => ({ spin: ease(p) * TAU, rideSpin: ease(p) * TAU, tuck: arc(p) * 0.6 })),
  T(3, 'bigspin', SK, 440, { en: 'Bigspin', ko: '빅스핀', ja: 'ビッグスピン', zh: '大转' }, (p) => ({ spin: ease(p) * TAU, rideSpin: ease(p) * TAU, tuck: arc(p) * 0.6 })),
  T(3, 'doublekf', SK, 460, { en: 'Double Kickflip', ko: '더블 킥플립', ja: 'ダブルキックフリップ', zh: '双尖翻' }, (p) => ({ rideRoll: ease(p) * TAU * 2, tuck: arc(p) * 0.8 })),
  T(3, 'mute360', IN, 430, { en: '360 Mute', ko: '360 뮤트', ja: '360ミュート', zh: '360静音抓' }, (p) => ({ spin: ease(p) * TAU, tuck: arc(p) * 0.8, roll: -arc(p) * 0.3 })),
  T(3, 'cork360', IN, 460, { en: 'Cork 360', ko: '코크 360', ja: 'コーク360', zh: '螺旋360' }, (p) => ({ spin: ease(p) * TAU, roll: arc(p) * 0.8, tuck: arc(p) * 0.6 })),
  T(3, 'doublewhip', BK, 460, { en: 'Double Tail Whip', ko: '더블 테일윕', ja: 'ダブルテイルホイップ', zh: '双甩尾' }, (p) => ({ rideSpin: ease(p) * TAU * 2, tuck: arc(p) * 0.6 })),
  T(3, 'nohand360', BK, 440, { en: '360 No Hander', ko: '360 노 핸더', ja: '360ノーハンダー', zh: '360放手' }, (p) => ({ spin: ease(p) * TAU, roll: arc(p) * 0.6, tuck: arc(p) * 0.3 })),
  // 4. Very high air
  T(4, 'mctwist', ['skate', 'inline'], 750, { en: 'McTwist', ko: '맥트위스트', ja: 'マックツイスト', zh: '麦克扭转' }, (p) => ({ spin: ease(p) * TAU, flip: -ease(p) * TAU, tuck: arc(p) })),
  T(4, 'spin720', ['skate', 'inline', 'bike', 'kick'], 700, { en: '720 Spin', ko: '720 스핀', ja: '720スピン', zh: '720旋转' }, (p) => ({ spin: ease(p) * TAU * 2, tuck: arc(p) * 0.8 })),
  T(4, 'kfback', SK, 800, { en: 'Kickflip Backflip', ko: '킥플립 백플립', ja: 'キックフリップバックフリップ', zh: '尖翻后空翻' }, (p) => ({ flip: -ease(p) * TAU, rideRoll: ease(p) * TAU, tuck: arc(p) })),
  T(4, 'doubleback', ['inline', 'bike', 'kick'], 850, { en: 'Double Backflip', ko: '더블 백플립', ja: 'ダブルバックフリップ', zh: '双后空翻' }, (p) => ({ flip: -ease(p) * TAU * 2, tuck: arc(p) })),
  T(4, 'frontflip', ['skate', 'bike', 'kick'], 750, { en: 'Front Flip', ko: '프론트플립', ja: 'フロントフリップ', zh: '前空翻' }, (p) => ({ flip: ease(p) * TAU, tuck: arc(p) })),
  T(4, 'whipback', BK, 800, { en: 'Backflip Tail Whip', ko: '백플립 테일윕', ja: 'バックフリップテイルホイップ', zh: '后空翻甩尾' }, (p) => ({ flip: -ease(p) * TAU, rideSpin: ease(p) * TAU, tuck: arc(p) })),
  T(4, 'kfmctwist', SK, 880, { en: 'Kickflip McTwist', ko: '킥플립 맥트위스트', ja: 'キックフリップマックツイスト', zh: '尖翻麦克扭转' }, (p) => ({ spin: ease(p) * TAU, flip: -ease(p) * TAU, rideRoll: ease(p) * TAU, tuck: arc(p) })),
  T(4, 'flair', ['inline', 'bike', 'kick'], 820, { en: 'Flair', ko: '플레어', ja: 'フレア', zh: '后空翻转体' }, (p) => ({ flip: -ease(p) * TAU, spin: ease(p) * TAU, roll: arc(p) * 0.4, tuck: arc(p) * 0.8 })),
  T(4, 'spin1080', IN, 900, { en: '1080 Spin', ko: '1080 스핀', ja: '1080スピン', zh: '1080旋转' }, (p) => ({ spin: ease(p) * TAU * 3, tuck: arc(p) * 0.9 })),
];
export const TRICK_BY_ID = Object.fromEntries(TRICKS.map((k) => [k.id, k]));
export const GRIND_NAME = {
  skate: { en: '50-50 Grind', ko: '50-50 그라인드', ja: '50-50グラインド', zh: '50-50滑杆' },
  bike: { en: 'Peg Grind', ko: '페그 그라인드', ja: 'ペググラインド', zh: '脚踏杆滑杆' },
  inline: { en: 'Soul Grind', ko: '소울 그라인드', ja: 'ソウルグラインド', zh: '灵魂滑杆' },
  kick: { en: 'Feeble Grind', ko: '피블 그라인드', ja: 'フィーブルグラインド', zh: '弱滑杆' },
};
export const GRIND_PTS = 60; // to get on the rail
export const GRIND_TICK = 10; // every half second on it
export const GRIND_MAX = 200; // one grind's most
export const NO_POSE = { spin: 0, flip: 0, roll: 0, rideRoll: 0, rideSpin: 0, tuck: 0 };

// The trick's pose at t seconds after it started (null once it is over).
export function trickPose(id, t) {
  const k = TRICK_BY_ID[id];
  if (!k || !(t >= 0) || t > k.dur) return null;
  return { ...NO_POSE, ...k.pose(t / k.dur) };
}

// Which trick to do with `air` seconds left in the air: the highest tier
// whose tricks still fit, taking turns among its five.
// n: how many tricks you have done (for the turns). null if nothing fits.
export const TIER_AIR = [0, 0.45, 0.68, 1.0, 1.5]; // seconds of air each tier needs
export function tierFor(air) {
  let t = 0;
  for (let k = 1; k < TIER_AIR.length; k++) if (air >= TIER_AIR[k]) t = k;
  return t;
}
export function pickTrick(type, air, n = 0) {
  const tier = tierFor(air);
  const list = TRICKS.filter((k) => k.tier === tier && k.types.includes(type));
  return list.length ? list[n % list.length] : null;
}

// Seconds until falling from y (going up at vy) back down to `ground`.
export function airTime(y, vy, ground = 0, g = GRAVITY) {
  const h = y - ground; // below `ground` (popping up a ramp): the time until you come down onto it
  return Math.max(0, (vy + Math.sqrt(Math.max(0, vy * vy + 2 * g * h))) / g);
}

// One rider in the park. Call step() every frame with the ground under you
// (park coordinates); it returns your height and what happened.
//   events: { kind: 'trick', trick, pts, mult } | { kind: 'grind', pts }
//           | { kind: 'land', total, mult } (a combo counted)
//           | { kind: 'bail', lost }
export class Skater {
  constructor(type = 'skate') { this.type = type; this.reset(); }
  reset() {
    this.y = 0; this.vy = 0; this.air = false; this.vert = false;
    this.grind = null; // { rail, t, time }
    this.offRail = null; // { rail, t }: just dropped off this rail
    this.fromY = null; // height you took off from (in the air)
    this.trick = null; // { id, t }
    this.done = 0; // tricks done (for picking)
    this.combo = []; // points of tricks in the combo so far
    this.used = []; // trick ids in the combo so far
    this.ground = 0; // time on the ground since the last trick
    this.popAsked = false;
  }
  get comboPts() { return this.combo.reduce((a, b) => a + b, 0); }
  // Different tricks and rails in a combo raise the multiplier (up to ×5);
  // doing the same one again doesn't.
  get mult() { return Math.min(5, new Set(this.used).size); }
  // Tap Trick: pop off the ground (or the rail), or do a trick in the air.
  tap() { this.popAsked = true; }
  // Leaving the park or getting off: count the combo so far (if you were
  // mid-trick in the air, it's lost). Returns the events, like step().
  finish() {
    const events = [];
    if (!this.air || !this.trick) this._endCombo(events);
    this.reset();
    return events;
  }
  // Stopped on a rail (or steered off it): drop down.
  leaveRail() {
    if (!this.grind) return;
    this.offRail = { rail: this.grind.rail, t: 0.6 };
    this.grind = null;
    this.air = true;
    this.vy = 0;
  }

  _startTrick(air, events) {
    const k = pickTrick(this.type, air, this.done);
    if (!k) return;
    this.trick = { id: k.id, t: 0 };
    this.done++;
    // The same trick again in one combo counts for less each time.
    const again = this.used.filter((id) => id === k.id).length;
    this.used.push(k.id);
    const pts = Math.round(k.pts / (1 + again));
    this.combo.push(pts);
    this.ground = 0;
    events.push({ kind: 'trick', trick: k, pts, mult: this.mult });
  }
  _startGrind(rail, events) {
    this.y = rail.rail.h; this.fromY = null;
    // The same rail again in one combo counts for less each time.
    const key = 'grind:' + rail.rail.id, again = this.used.filter((id) => id === key).length;
    this.used.push(key);
    const scale = 1 / (1 + again);
    this.grind = { rail: rail.rail, t: rail.t, t0: rail.t, best: rail.t, dir: 0, time: 0, entry: this.combo.length, scale };
    const pts = Math.round(GRIND_PTS * scale);
    this.combo.push(pts);
    this.ground = 0;
    events.push({ kind: 'grind', pts, mult: this.mult, start: true });
  }
  _endCombo(events) {
    if (!this.combo.length) return;
    const mult = this.mult, total = this.comboPts * mult;
    this.combo = []; this.used = [];
    events.push({ kind: 'land', total, mult });
  }

  // dt seconds; g: parkGround(x, z) where you are now; rail: railNear(x, z)
  // (or null). Returns { y, events }.
  step(dt, g, rail = null) {
    const events = [];
    dt = Math.min(dt, 0.05);
    const tap = this.popAsked;
    this.popAsked = false;
    if (this.offRail && (this.offRail.t -= dt) <= 0) this.offRail = null;
    if (rail && this.offRail?.rail === rail.rail) rail = null;
    if (this.trick) {
      this.trick.t += dt;
      if (this.trick.t >= TRICK_BY_ID[this.trick.id].dur) this.trick = null;
    }
    if (this.grind) {
      // On the rail: follow it until you ride off its end (or pop off).
      // Turning back along it drops you off too (no riding to and fro).
      const back = this.grind.dir && rail && (rail.t - this.grind.best) * this.grind.dir < -0.01;
      if (!rail || rail.rail !== this.grind.rail || rail.t <= 0 || rail.t >= 1 || tap || back) {
        if (!tap) this.offRail = { rail: this.grind.rail, t: 0.6 }; // dropped off: not straight back on
        this.grind = null;
        this.air = true;
        this.vy = tap ? POP * 0.85 : 1.2;
        if (tap) this._startTrick(airTime(this.y, this.vy, g.y), events);
      } else {
        if (!this.grind.dir && Math.abs(rail.t - this.grind.t0) > 0.01) this.grind.dir = Math.sign(rail.t - this.grind.t0);
        if (this.grind.dir && (rail.t - this.grind.best) * this.grind.dir > 0) this.grind.best = rail.t;
        const before = Math.floor(this.grind.time * 2);
        this.grind.time += dt;
        this.grind.t = rail.t;
        this.y = rail.rail.h;
        // The whole grind is one entry in the combo: it grows while you
        // slide, up to GRIND_MAX (so it can't pile up the multiplier).
        if (Math.floor(this.grind.time * 2) > before) {
          const i = this.grind.entry, add = Math.round(Math.min(GRIND_TICK * this.grind.scale, GRIND_MAX * this.grind.scale - this.combo[i]));
          if (add > 0) { this.combo[i] += add; events.push({ kind: 'grind', pts: add, mult: this.mult }); }
        }
        return { y: this.y, events };
      }
    }
    if (!this.air) {
      if (tap && g.r?.kind === 'quarter' && this.vy > 0.3) {
        // Pop on the way up a quarter pipe: the biggest air in the park, the
        // higher up the more. You come down at the top (the coping).
        this.air = true; this.vert = true;
        // Air time (back down to the coping) grows the higher up you pop.
        const A = 1.38 + 0.6 * clamp(g.s, 0, 1);
        this.vy = clamp((GRAVITY * A) / 2 - (this.y - g.r.h) / A, 5, VERT_POP_VY);
        this._startTrick(airTime(this.y, this.vy, g.r.h), events);
      } else if (tap) {
        // Pop: an ollie, plus whatever the ramp under you adds.
        this.air = true;
        this.vy = clamp(Math.max(0, this.vy) + POP, POP, MAX_VY);
        this._startTrick(airTime(this.y, this.vy, g.y), events);
      } else {
        // At the top of a rail's ramp, level with the rail: onto it.
        if (rail && Math.abs(Math.max(g.y, this.y) - rail.rail.h) < 0.12 && rail.t > 0 && rail.t < 0.9) {
          this._startGrind(rail, events);
          return { y: this.y, events };
        }
        // Stay on the ground only if it curves up at least as fast as a
        // throw would fall: off a lip or over a crest you fly.
        const yPred = this.y + this.vy * dt - 0.5 * GRAVITY * dt * dt;
        const vert = g.r?.kind === 'quarter' && g.s >= 0.8 && this.vy > 1.5; // near the top of a quarter pipe, going up
        if (g.y - this.y > 0.3) {
          // Stepped onto a ramp from its side or back: up you go, no throw.
          this.y = g.y; this.vy = 0;
        } else if (vert) {
          this.air = true; this.vert = true;
          this.vy = clamp(this.vy * 1.1 + 3, 5, MAX_VY);
        } else if (g.y >= yPred - 0.04 || this.vy <= 0.5) {
          const vy = (g.y - this.y) / Math.max(dt, 1e-3);
          this.vy = clamp(vy, -MAX_VY, MAX_VY);
          this.y = g.y;
        } else {
          this.air = true;
          this.vy = clamp(this.vy * 1.15, 0, MAX_VY); // ramps throw you a little higher than real ones
        }
        this.ground += dt;
        if (!this.air && this.ground > COMBO_GAP) this._endCombo(events);
        if (!this.air) return { y: this.y, events };
      }
    }
    // In the air.
    if (this.fromY == null) this.fromY = this.y; // where you took off
    if (tap && !this.trick) this._startTrick(airTime(this.y, this.vy, g.y), events);
    this.vy -= GRAVITY * dt;
    this.y += this.vy * dt;
    // Coming down onto a rail: grind it.
    if (rail && this.vy < 0 && this.y <= rail.rail.h + 0.15 && this.y >= rail.rail.h - 0.35 && rail.t > 0.02 && rail.t < 0.98) {
      this.air = false; this.vert = false; this.vy = 0;
      this.trick = null;
      this._startGrind(rail, events);
      return { y: this.y, events };
    }
    if (this.y <= g.y) {
      // Landed. Mid-trick (less than three quarters done) is a bail, unless
      // you came down on a ramp above where you took off (popped into it):
      // then the trick is just cut short.
      const k = this.trick && TRICK_BY_ID[this.trick.id];
      if (k && this.trick.t < k.dur * 0.75 && g.y <= this.fromY + 0.15) {
        const lost = this.comboPts * this.mult;
        this.combo = []; this.used = [];
        events.push({ kind: 'bail', lost });
      }
      this.trick = null;
      this.air = false; this.vert = false; this.fromY = null;
      this.y = g.y;
      this.vy = 0;
      this.ground = 0;
    }
    return { y: this.y, events };
  }

  // The pose to draw now (NO_POSE when not doing a trick).
  pose() { return (this.trick && trickPose(this.trick.id, this.trick.t)) || NO_POSE; }
}

// --- Score ------------------------------------------------------------------
// A landed combo adds to today's points and may set a new best combo. Just
// for fun: points don't pay coins. saved: { day, pts, best }.
export function bankPoints(saved, day, pts) {
  const s = saved?.day === day ? { ...saved } : { day, pts: 0, best: saved?.best || 0 };
  delete s.paid;
  s.pts += Math.max(0, Math.round(pts));
  s.best = Math.max(s.best || 0, Math.round(pts));
  return s;
}
