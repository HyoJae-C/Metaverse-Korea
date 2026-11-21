// The drone show's event patterns (Yozi 2026-11-21): for a few days around
// Christmas, the year's end, New Year and Chuseok the middle of the show
// (after the opening, up to the photo time) is the event's own pictures and
// lines, instead of the usual pattern. Outside those days: eventOf() is null.
// Downloaded with drone-sky.js.
import { BRUSH, addPictures } from './drone-pictures.js';

const { path, fill, line, circle, oval, seg, grad, radial, starPath, sparkle, head } = BRUSH;
const TAU = Math.PI * 2;
const KST = 9 * 3600e3;

// Chuseok (the 15th of the 8th lunar month), by year: [month, day].
const CHUSEOK = { 2027: [9, 15], 2028: [10, 3], 2029: [9, 22], 2030: [9, 12], 2031: [10, 1], 2032: [9, 19] };
const DAY = 86400e3;

// Which event the show starting at `start` (ms) belongs to, by its date in
// Korea: { key, year } or null. year: the one the lines name.
export function eventOf(start) {
  const d = new Date(start + KST), y = d.getUTCFullYear(), m = d.getUTCMonth() + 1, day = d.getUTCDate();
  if (m === 12 && day >= 20 && day <= 25) return { key: 'christmas', year: y };
  if (m === 12 && day >= 26) return { key: 'goodbye', year: y };
  if (m === 1 && day <= 5) return { key: 'newyear', year: y };
  const c = CHUSEOK[y];
  if (c) { // the day before, the day and the day after
    const at = Date.UTC(y, c[0] - 1, c[1]), now = Date.UTC(y, m - 1, day);
    if (Math.abs(now - at) <= DAY) return { key: 'chuseok', year: y };
  }
  return null;
}

// ---- the lines and pictures of each event ------------------------------------
// Each: mid(h) = the [seconds, step] list between the opening and the photo
// time, bye = the good-night line. No scene stays over MAX_SCENE seconds;
// midOf evens the times so the list is MID_SECONDS long and the photo time
// stays where it is.
// h: { W, P, year, C } of drone-sky.js: C has its colours and HEART, the
// options of a line whose ♡ (part 1) is red and beats.
export const MID_SECONDS = 589;
export const EVENTS = {
  christmas: {
    bye: ['메리', '크리스마스'],
    mid: ({ W, P, C }) => [
      [10, W(['12월의', '서울'], { color: [C.WHITE, C.SKYBLUE] })],
      [14, P('snowflake')],
      [8, W(['눈이 와요'], { color: [C.WHITE, C.SKYBLUE] })],
      [14, P('moon')],
      [8, W(['고요한 밤'], { color: [C.GOLD, C.WHITE] })],
      [14, P('snowman')],
      [9, W(['같이 만들래?'], { color: [C.WHITE, C.SKYBLUE] })],
      [15, P('xmastree', { morph: 3 })],
      [8, W(['반짝반짝'], { color: [C.GOLD, C.MINT] })],
      [14, P('wreath')],
      [14, P('candycane')],
      [8, W(['달콤해'], { color: [C.RED, C.WHITE] })],
      [14, P('gingerman')],
      [8, W(['안녕!'], { color: [C.GOLD, C.WHITE] })],
      [14, P('stocking')],
      [9, W(['양말 걸었어?'], { color: [C.RED, C.MINT] })],
      [14, P('santa')],
      [8, W(['호 호 호!'], { color: [C.RED, C.WHITE] })],
      [15, P('sleigh', { morph: 3 })],
      [8, W(['어디 가요?'], { color: [C.GOLD, C.WHITE] })],
      [8, W(['모두서울로!'], { color: [C.PINK, C.GOLD] })],
      [14, P('gift')],
      [8, W(['선물이야'], { color: [C.RED, C.GOLD] })],
      [14, P('bell')],
      [8, W(['딸랑딸랑'], { color: [C.GOLD, C.RED] })],
      [14, P('tower')],
      [10, W(['남산의', '크리스마스'], { color: [C.MINT, C.RED] })],
      [14, P('anothertower')],
      [14, P('wheel')],
      [14, P('coaster')],
      [8, W(['모두랜드'], { color: [C.PINK, C.GOLD] })],
      [14, P('star')],
      [9, W(['소원 빌어'], { color: [C.VIOLET, C.GOLD] })],
      [14, P('dipper')],
      [10, W(['별이', '빛나는 밤'], { color: [C.VIOLET, C.SKYBLUE] })],
      [14, P('shootingstar')],
      [14, P('firework')],
      [12, W(['MERRY', 'CHRISTMAS'], { color: [C.RED, C.MINT], morph: 2.5 })],
      [10, W(['메리', '크리스마스'], { color: [C.MINT, C.GOLD] })],
      [14, P('snowman')],
      [8, W(['눈사람도', '안녕'], { color: [C.WHITE, C.SKYBLUE] })],
      [14, P('xmastree')],
      [8, W(['사 랑'], { color: C.PINK })],
      [14, P('heart')],
      [9, W(['선물은', '너야'], { color: [C.PINK, C.GOLD] })],
      [12, W([['너 ', '♡']], C.HEART)],
      [14, P('hearts')],
      [8, W(['따뜻한 밤'], { color: [C.GOLD, C.PINK] })],
    ],
  },
  goodbye: {
    bye: (y) => ['수고했어', String(y)],
    mid: ({ W, P, C, year }) => [
      [12, W([String(year)], { color: [C.GOLD, C.WHITE], morph: 2.5 })],
      [10, W(['올해의', '마지막 밤들'], { color: [C.SKYBLUE, C.VIOLET] })],
      [14, P('calendar')],
      [15, P('hourglass', { morph: 3 })],
      [9, W(['시간이', '흘러가'], { color: [C.GOLD, C.WHITE] })],
      [8, W(['기억나?'], { color: [C.PINK, C.GOLD] })],
      [14, P('blossom')],
      [8, W(['봄'], { color: [C.PINK, C.WHITE] })],
      [14, P('palace')],
      [8, W(['경복궁'], { color: [C.GOLD, C.RED] })],
      [14, P('hanbok')],
      [14, P('fan')],
      [14, P('janggu')],
      [14, P('taekwondo')],
      [8, W(['태권!'], { color: [C.WHITE, C.SKYBLUE] })],
      [14, P('tower')],
      [8, W(['남산'], { color: [C.MINT, C.SKYBLUE] })],
      [14, P('subway')],
      [14, P('duck')],
      [14, P('bike')],
      [14, P('bridge')],
      [8, W(['한강'], { color: [C.SKYBLUE, C.MINT] })],
      [14, P('chimaek')],
      [14, P('ramen')],
      [8, W(['맛있었지?'], { color: [C.GOLD, C.RED] })],
      [14, P('rainbow')],
      [8, W(['좋은 날도'], { color: [C.GOLD, C.PINK] })],
      [14, P('moon')],
      [8, W(['힘든 날도'], { color: [C.VIOLET, C.SKYBLUE] })],
      [14, P('anothertower')],
      [8, W(['모두타워'], { color: [C.VIOLET, C.SKYBLUE] })],
      [14, P('wheel')],
      [14, P('coaster')],
      [8, W(['모두랜드'], { color: [C.PINK, C.GOLD] })],
      [10, W(['함께 걸은', '서울'], { color: [C.MINT, C.SKYBLUE] })],
      [10, W(['와 줘서', '고마워'], { color: [C.PINK, C.GOLD] })],
      [15, P('clock', { morph: 3 })],
      [8, W(['곧 새해야'], { color: [C.GOLD, C.WHITE] })],
      [10, W([[String(year).slice(0, 1), String(year).slice(1, 2), String(year).slice(2, 3), String(year).slice(3)]], { color: C.WHITE, parts: [0, 0.8, 1.6, 2.4] })],
      [12, W(['GOODBYE', String(year)], { color: [C.SKYBLUE, C.PINK], morph: 2.5 })],
      [10, W(['수고했어', String(year)], { color: [C.GOLD, C.PINK] })],
      [14, P('firework')],
      [8, W(['내년에도'], { color: [C.MINT, C.GOLD] })],
      [12, W([['함께 ', '♡']], C.HEART)],
      [14, P('hearts')],
      [14, P('star')],
      [8, W(['안녕'], { color: [C.GOLD, C.WHITE] })],
    ],
  },
  newyear: {
    bye: ['새해 복 많이', '받으세요'],
    mid: ({ W, P, C, year }) => [
      [12, W([String(year)], { color: [C.GOLD, C.RED], morph: 2.5 })],
      [12, W(['HAPPY', 'NEW YEAR'], { color: [C.GOLD, C.PINK], morph: 2.5 })],
      [15, P('bosingak', { morph: 3 })],
      [8, W(['댕 ~'], { color: [C.GOLD, C.WHITE] })],
      [10, W(['보신각', '제야의 종'], { color: [C.GOLD, C.RED] })],
      [14, P('firework')],
      [15, P('sunrise', { morph: 3 })],
      [9, W(['새해', '첫 해'], { color: [C.RED, C.GOLD] })],
      [14, P('shootingstar')],
      [8, W(['소원 빌어'], { color: [C.VIOLET, C.GOLD] })],
      [14, P('tteokguk')],
      [8, W(['떡국'], { color: [C.WHITE, C.GOLD] })],
      [8, W(['한 살 더!'], { color: [C.PINK, C.GOLD] })],
      [14, P('hanbok')],
      [8, W(['세배'], { color: [C.PINK, C.GOLD] })],
      [14, P('pouch')],
      [10, W(['복 많이', '받으세요'], { color: [C.GOLD, C.RED] })],
      [14, P('yut')],
      [8, W(['윷이야!'], { color: [C.GOLD, C.WHITE] })],
      [14, P('kite')],
      [8, W(['하늘 높이'], { color: [C.SKYBLUE, C.WHITE] })],
      [14, P('magpie')],
      [10, W(['까치 까치', '설날은'], { color: [C.SKYBLUE, C.WHITE] })],
      [14, P('tiger')],
      [8, W(['어흥!'], { color: [C.GOLD, C.RED] })],
      [14, P('jindo')],
      [8, W(['멍멍!'], { color: [C.GOLD, C.WHITE] })],
      [14, P('janggu')],
      [14, P('fan')],
      [14, P('palace')],
      [14, P('taegukgi')],
      [14, P('mugunghwa')],
      [14, P('clover')],
      [8, W(['행운'], { color: [C.MINT, C.GOLD] })],
      [14, P('dipper')],
      [8, W(['꿈'], { color: [C.VIOLET, C.PINK] })],
      [14, P('blossom')],
      [8, W(['곧 봄이야'], { color: [C.PINK, C.WHITE] })],
      [14, P('rainbow')],
      [12, W(['새해 복 많이', '받으세요'], { color: [C.GOLD, C.RED] })],
      [14, P('star')],
      [10, W([`${year}년도`], { color: [C.GOLD, C.WHITE] })],
      [14, P('heart')],
      [12, W([['함께 ', '♡']], C.HEART)],
      [14, P('hearts')],
      [10, W(['올해도', '잘 부탁해'], { color: [C.MINT, C.GOLD] })],
      [8, W(['건강하자'], { color: [C.GOLD, C.PINK] })],
    ],
  },
  chuseok: {
    bye: ['풍성한', '한가위'],
    mid: ({ W, P, C }) => [
      [12, W(['추 석'], { color: [C.GOLD, C.RED], morph: 2.5 })],
      [10, W(['한가위'], { color: [C.GOLD, C.WHITE] })],
      [15, P('fullmoon', { morph: 3 })],
      [8, W(['보름달'], { color: [C.GOLD, C.WHITE] })],
      [8, W(['방아 쿵쿵'], { color: [C.GOLD, C.WHITE] })],
      [14, P('moonrabbit')],
      [8, W(['달토끼'], { color: [C.GOLD, C.WHITE] })],
      [14, P('rice')],
      [9, W(['황금 들판'], { color: [C.GOLD, C.MINT] })],
      [14, P('persimmon')],
      [9, W(['감이', '익었네'], { color: [C.GOLD, C.RED] })],
      [14, P('magpie')],
      [14, P('chestnut')],
      [8, W(['알밤'], { color: [C.GOLD, C.WHITE] })],
      [14, P('songpyeon')],
      [8, W(['송편'], { color: [C.MINT, C.PINK] })],
      [10, W(['예쁘게', '빚어야지'], { color: [C.PINK, C.GOLD] })],
      [14, P('hanbok')],
      [8, W(['고운 한복'], { color: [C.PINK, C.GOLD] })],
      [15, P('ganggang', { morph: 3 })],
      [8, W(['강강술래'], { color: [C.GOLD, C.PINK] })],
      [8, W(['같이 돌자!'], { color: [C.PINK, C.SKYBLUE] })],
      [14, P('janggu')],
      [10, W(['덩기덕', '쿵더러러'], { color: [C.GOLD, C.RED] })],
      [14, P('mask')],
      [14, P('fan')],
      [14, P('kite')],
      [14, P('yut')],
      [8, W(['모야!'], { color: [C.GOLD, C.WHITE] })],
      [14, P('tiger')],
      [8, W(['어흥!'], { color: [C.GOLD, C.RED] })],
      [14, P('jindo')],
      [8, W(['멍멍!'], { color: [C.GOLD, C.WHITE] })],
      [14, P('palace')],
      [10, W(['가을의', '서울'], { color: [C.GOLD, C.RED] })],
      [14, P('pouch')],
      [14, P('dipper')],
      [14, P('star')],
      [8, W(['둥근 달'], { color: [C.GOLD, C.WHITE] })],
      [14, P('shootingstar')],
      [8, W(['소원 빌어'], { color: [C.VIOLET, C.GOLD] })],
      [15, P('fullmoon')],
      [12, W(['풍성한', '한가위'], { color: [C.GOLD, C.RED], morph: 2.5 })],
      [10, W(['HAPPY', 'CHUSEOK'], { color: [C.GOLD, C.PINK] })],
      [8, W(['가 족'], { color: C.PINK })],
      [12, W([['모두 ', '♡']], C.HEART)],
      [14, P('hearts')],
      [8, W(['넉넉한 밤'], { color: [C.GOLD, C.WHITE] })],
    ],
  },
};

// The longest a scene stays (Yozi 2026-11-21: after 15 seconds it gets
// boring), and the shortest a picture or a line may get when times are evened.
export const MAX_SCENE = 15;
// The middle part of `event` ({ key, year }), exactly MID_SECONDS long: what
// is missing (or too much) is shared out a second at a time, pictures first
// (10 to MAX_SCENE s), then the lines (6 to 10 s).
export function midOf(event, h) {
  const list = EVENTS[event.key].mid({ ...h, year: event.year });
  let left = MID_SECONDS - list.reduce((a, [d]) => a + d, 0);
  const d = Math.sign(left);
  for (const [lo, hi, pick] of [[10, MAX_SCENE, (s) => s.shape], [6, 10, (s) => !s.shape]]) {
    for (let moved = true; left !== 0 && moved;) {
      moved = false;
      for (const step of list) if (left !== 0 && pick(step[1]) && step[0] + d >= lo && step[0] + d <= hi) { step[0] += d; left -= d; moved = true; }
    }
  }
  return list;
}

// ---- how the event pictures move (p, t as MOVES in drone-sky.js) -------------
const turn = (p, cx, cy, a) => {
  const dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(a), s = Math.sin(a);
  p[0] = cx + dx * c - dy * s; p[1] = cy + dx * s + dy * c;
};
const twinkle = (p, t) => 0.6 + 0.4 * Math.sin(t * 3 + p[0] * 1.7 + p[1]);
export const EVENT_MOVES = {
  // the lights blink, the star glows
  xmastree: (p, t) => (p[2] === 1 ? 0.35 + 0.65 * (Math.sin(t * 4 + p[0] * 2.3 + p[1] * 1.7) > 0 ? 1 : 0.2) : p[2] === 2 ? 0.75 + 0.25 * Math.sin(t * 5) : 1),
  snowflake: (p, t) => { if (p[2] === 0) turn(p, 0, 0, t * 0.25); else { p[1] -= (t * 0.6 + p[0] * 0.37 + 20) % 4 - 2; return twinkle(p, t); } return 1; },
  santa: (p, t) => { if (p[2] === 1) turn(p, 3.2, 8.4, Math.sin(t * 3) * 0.25); }, // the hat's pompom
  // flies across, right to left, bobbing; the reindeer's legs gallop
  sleigh: (p, t) => {
    if (p[2] === 2) return twinkle(p, t);
    p[1] += Math.sin(t * 1.6 + p[0] * 0.15) * 0.5;
    p[0] = p[0] * 0.8 + 9 - (t / 15) * 18; // (across in the 15 s it stays)
    return 1;
  },
  gift: (p, t) => { if (p[2] === 1) { const k = 1 + 0.08 * Math.sin(t * 3); p[0] *= k; p[1] = 4.6 + (p[1] - 4.6) * k; } },
  snowman: (p, t) => { if (p[2] === 1) { p[1] -= (t * 0.9 + p[0] * 0.53 + 30) % 3 - 1.5; return twinkle(p, t); } return 1; },
  bell: (p, t) => { if (p[2] === 0) turn(p, 0, 7.6, Math.sin(t * 2.6) * 0.16); else if (p[2] === 1) turn(p, 0, 7.6, Math.sin(t * 2.6 - 0.7) * 0.34); },
  // the sand runs down
  hourglass: (p, t) => { if (p[2] === 1) { p[1] -= (t * 2.2 + p[0] * 3) % 5.4; return 0.6 + 0.4 * Math.sin(t * 6 + p[1]); } return 1; },
  // the log swings and strikes; the bell shivers
  bosingak: (p, t) => {
    const k = Math.max(0, Math.sin(t * 1.3)) ** 6;
    if (p[2] === 1) p[0] -= k * 2.2;
    else if (p[2] === 2) return 0.3 + 0.7 * k;
    return 1;
  },
  // the sun comes up, its rays turn
  sunrise: (p, t) => {
    const up = Math.min(1, t / 14) * 7 - 7;
    if (p[2] === 1) p[1] += up;
    else if (p[2] === 2) { p[1] += up; return 0.55 + 0.45 * Math.sin(t * 2 + p[0]); }
    return 1;
  },
  tteokguk: (p, t) => { if (p[2] === 1) { p[0] += Math.sin(p[1] * 1.1 - t * 2.5) * 0.5; return 0.8; } return 1; }, // the steam
  fullmoon: (p, t) => { if (p[2] === 1) turn(p, 0.4, -0.6, -(Math.max(0, Math.sin(t * 3)) ** 2) * 0.35); else if (p[2] === 2) return twinkle(p, t); return 1; },
  songpyeon: (p, t) => { if (p[2] === 1) { p[0] += Math.sin(p[1] * 1.1 - t * 2.2) * 0.4; return 0.8; } return 1; },
  // the ring of dancers goes round under the moon
  ganggang: (p, t) => {
    if (p[2] === 0) return 1;
    const a = t * 0.22 + ((p[2] - 1) / 8) * TAU, a0 = ((p[2] - 1) / 8) * TAU;
    p[0] += 11.4 * (Math.cos(a) - Math.cos(a0)); p[1] += 3.9 * (Math.sin(a) - Math.sin(a0));
    p[1] += Math.abs(Math.sin(t * 3 + p[2])) * 0.35;
    return 1;
  },
  candycane: (p, t) => turn(p, 0, -8, Math.sin(t * 1.8) * 0.08),
  wreath: (p, t) => (p[2] === 1 ? 0.4 + 0.6 * (Math.sin(t * 4 + p[0] * 2.1 + p[1] * 1.3) > 0 ? 1 : 0.3) : 1),
  stocking: (p, t) => turn(p, 0, 9.4, Math.sin(t * 2) * 0.08),
  gingerman: (p, t) => { if (p[2] === 1) turn(p, 4.2, 1.6, Math.sin(t * 5) * 0.3); }, // it waves
  // the hands run on to midnight
  clock: (p, t) => { if (p[2] === 1) turn(p, 0, 0, -Math.min(1, t / 11) * 0.5); else if (p[2] === 2) turn(p, 0, 0, -Math.min(1, t / 11) * 0.5 / 12); },
  calendar: (p, t) => { if (p[2] === 1) turn(p, 9.0, -7.6, Math.max(0, Math.sin(t * 1.6)) * 0.12); }, // the page's corner lifts
  // the sticks are tossed and fall
  yut: (p, t) => { const k = Math.abs(Math.sin(t * 1.1)), c = [-7.2, -2.4, 2.4, 7.2][p[2]]; p[1] += k * 3.2; turn(p, c, k * 3.2, Math.sin(t * 1.1) * 0.5 * (p[2] % 2 ? 1 : -1)); },
  chestnut: (p, t) => { if (p[2] === 1) p[1] += Math.abs(Math.sin(t * 2.4)) * 0.9; },
  rice: (p, t) => { p[0] += Math.sin(t * 1.5 + p[0] * 0.3) * 0.35 * ((p[1] + 10) / 20); },
  persimmon: (p, t) => { if (p[2] === 1) turn(p, 0, 9, Math.sin(t * 1.2 + p[0] * 0.2) * 0.02); },
};

// ---- the event pictures (as PICTURES in drone-pictures.js) -------------------
addPictures({
  // A Christmas tree: three tiers, a trunk, a garland; part 1: the lights
  // (they blink), part 2: the star on top.
  xmastree: { layers: 3, dens: [1, 1.6, 1.4], draw(c, l) {
    if (l === 2) { starPath(c, 0, 8.2, 1.8, 0.75); fill(c, radial(c, 0, 8.2, 0.1, 1.8, ['#ffffff', '#ffe066', '#ffb020'])); return; }
    if (l === 1) {
      const cols = ['#ff4a5a', '#ffd23a', '#46b4ff', '#ff8cc0', '#ffffff'];
      [[-1.2, 4.6], [1.4, 3.4], [-2.6, 1.2], [0.2, 1.8], [2.8, 0.2], [-4.2, -2.2], [-1.4, -1.6], [1.6, -2.6], [4.4, -3.0], [-5.6, -5.4], [-2.6, -5.0], [0.4, -5.8], [3.2, -5.2], [6.0, -5.8]]
        .forEach(([x, y], k) => { circle(c, x, y, 0.55); fill(c, cols[k % cols.length]); });
      return;
    }
    c.beginPath(); c.rect(-1.3, -9.4, 2.6, 2.6); fill(c, '#b87a3a');
    for (const [top, bot, w] of [[7.2, 2.0, 4.2], [4.4, -2.4, 6.2], [1.0, -7.0, 8.2]]) {
      path(c, [[0, top], [w, bot], [-w, bot]]); fill(c, grad(c, 0, top, 0, bot, ['#7cf2a4', '#2fbf68', '#1f9a52']));
    }
    for (const [y, w] of [[2.6, 3.4], [-1.8, 5.4], [-6.4, 7.4]]) { c.beginPath(); c.moveTo(-w, y + 0.6); c.quadraticCurveTo(0, y - 1.4, w, y + 0.6); line(c, '#ffe9a0', 0.22); }
  } },

  // A snow crystal: six arms with branches (it turns), small flakes falling (part 1).
  snowflake: { layers: 2, dens: [1.3, 0.7], edge: 1, draw(c, l) {
    if (l === 1) { for (const [x, y, r] of [[-11, 6, 0.8], [10.6, 7.4, 0.7], [-12, -5, 0.6], [11.6, -4, 0.8], [-8, -8.4, 0.5], [7.6, -8.6, 0.6], [-5, 8.8, 0.5]]) sparkle(c, x, y, r, '#e6f6ff'); return; }
    for (let k = 0; k < 6; k++) {
      c.save(); c.rotate((k * TAU) / 6);
      seg(c, [0, 0], [0, 8.6], '#ffffff', 0.7);
      for (const [y, w] of [[3.2, 2.4], [5.6, 1.9], [7.4, 1.1]]) { seg(c, [0, y], [w, y + w * 0.75], '#bfe8ff', 0.5); seg(c, [0, y], [-w, y + w * 0.75], '#bfe8ff', 0.5); }
      c.restore();
    }
    for (let k = 0; k < 6; k++) { const a = (k * TAU) / 6 + TAU / 12; path(c, [[0, 0], [Math.cos(a - 0.5) * 2.2, Math.sin(a - 0.5) * 2.2], [Math.cos(a) * 3, Math.sin(a) * 3], [Math.cos(a + 0.5) * 2.2, Math.sin(a + 0.5) * 2.2]]); fill(c, '#7fd4ff'); }
    circle(c, 0, 0, 1.1); fill(c, '#ffffff');
  } },

  // Santa's face: red hat with white brim, a big beard, rosy cheeks (part 1:
  // the hat's tip and pompom wag).
  santa: { layers: 2, draw(c, l) {
    if (l === 1) {
      c.beginPath(); c.moveTo(3.2, 8.4); c.quadraticCurveTo(8.8, 8.4, 9.0, 3.4); c.lineTo(6.8, 4.0); c.quadraticCurveTo(6.4, 6.4, 2.6, 6.2); c.closePath(); fill(c, '#e8243a');
      circle(c, 8.2, 2.8, 1.4); fill(c, '#ffffff');
      return;
    }
    c.beginPath(); c.moveTo(-6.0, 4.6); c.quadraticCurveTo(-5.0, 10.2, 1.6, 10.0); c.quadraticCurveTo(5.4, 9.6, 6.0, 4.6); c.closePath(); fill(c, grad(c, 0, 10, 0, 5, ['#ff5a6a', '#e8243a']));
    circle(c, 0, 0.4, 5.6); fill(c, '#ffb48a');
    // the beard
    c.beginPath(); c.moveTo(-5.9, 0.6); c.bezierCurveTo(-7.8, -6.0, -3.4, -9.8, 0, -9.6); c.bezierCurveTo(3.4, -9.8, 7.8, -6.0, 5.9, 0.6); c.quadraticCurveTo(4.4, -3.6, 0, -3.0); c.quadraticCurveTo(-4.4, -3.6, -5.9, 0.6); c.closePath(); fill(c, '#ffffff');
    for (const sx of [-1, 1]) { oval(c, sx * 1.9, -2.2, 2.1, 0.9, sx * 0.25); fill(c, '#e6f0ff'); } // the moustache
    oval(c, 0, -4.2, 1.1, 0.7); fill(c, '#e8243a'); // the mouth
    circle(c, 0, -0.8, 1.0); fill(c, '#ff5a4a'); // the nose
    for (const sx of [-1, 1]) { circle(c, sx * 2.3, 1.6, 0.6); fill(c, '#46b4ff'); circle(c, sx * 3.9, -0.6, 0.9); fill(c, '#ff7a7a'); }
    c.beginPath(); c.roundRect(-7.0, 3.4, 14.0, 2.4, 1.2); fill(c, '#ffffff'); // the brim
  } },

  // Santa's sleigh pulled by two reindeer (Rudolph in front, red nose),
  // flying across the sky; part 1: the sleigh, part 2: stardust behind.
  sleigh: { layers: 3, dens: [1, 1.1, 0.6], draw(c, l) {
    if (l === 2) { for (const [x, y, r] of [[12.4, 1.6, 0.6], [13.2, -1.2, 0.45], [10.8, -3.0, 0.5], [12.6, 4.2, 0.4], [9.8, 3.6, 0.45]]) sparkle(c, x, y, r, '#fff3c4'); return; }
    if (l === 1) {
      c.beginPath(); c.moveTo(2.6, 0.6); c.lineTo(9.4, 0.6); c.quadraticCurveTo(10.6, 3.4, 9.6, 4.4); c.lineTo(8.2, 1.9); c.lineTo(4.4, 1.9); c.quadraticCurveTo(3.6, -0.4, 2.6, 0.6); c.closePath(); c.rect(3.2, -2.6, 6.2, 3.3); fill(c, grad(c, 0, 2, 0, -2.6, ['#ff5a6a', '#d0183a']));
      c.beginPath(); c.moveTo(1.8, -2.2); c.quadraticCurveTo(1.4, -4.0, 3.4, -4.0); c.lineTo(10.4, -4.0); line(c, '#ffd166', 0.4);
      seg(c, [4.6, -2.6], [4.6, -4.0], '#ffd166', 0.3); seg(c, [8.4, -2.6], [8.4, -4.0], '#ffd166', 0.3);
      // santa and the sack
      circle(c, 5.6, 3.4, 1.2); fill(c, '#ffd7b8'); path(c, [[4.5, 4.0], [6.8, 4.0], [6.9, 5.8]]); fill(c, '#e8243a'); circle(c, 6.9, 5.9, 0.45); fill(c, '#ffffff');
      oval(c, 5.4, 2.6, 1.1, 0.7); fill(c, '#ffffff');
      circle(c, 8.4, 3.0, 1.7); fill(c, '#e8c27a');
      return;
    }
    const deer = (x, y, nose) => {
      oval(c, x, y, 2.4, 1.15); fill(c, '#c98a5a'); // body
      path(c, [[x - 1.6, y + 0.4], [x - 3.0, y + 2.4], [x - 2.0, y + 2.6], [x - 0.8, y + 0.9]]); fill(c, '#c98a5a'); // neck
      oval(c, x - 3.2, y + 2.9, 1.25, 0.8, 0.3); fill(c, '#d89a66'); // head
      circle(c, x - 4.3, y + 2.6, 0.42); fill(c, nose);
      for (const dx of [-0.4, 0.5]) { c.beginPath(); c.moveTo(x - 2.8 + dx, y + 3.5); c.lineTo(x - 2.4 + dx, y + 5.2); c.moveTo(x - 2.6 + dx, y + 4.4); c.lineTo(x - 1.7 + dx, y + 5.0); line(c, '#f0d8a0', 0.24); }
      for (const [dx, a] of [[-1.6, -0.5], [-0.9, 0.25], [1.2, -0.35], [1.9, 0.45]]) seg(c, [x + dx, y - 0.6], [x + dx + Math.sin(a) * 2.4, y - 0.6 - Math.cos(a) * 2.4], '#b87a4a', 0.42);
      path(c, [[x + 2.2, y + 0.5], [x + 3.0, y + 1.3], [x + 2.4, y - 0.2]]); fill(c, '#fff0dc');
    };
    deer(-8.4, 0.4, '#ff3048'); deer(-2.6, -0.6, '#3a2410');
    seg(c, [-6.2, 0.6], [-4.8, -0.2], '#ffd166', 0.2); seg(c, [-0.4, -0.4], [2.8, -0.6], '#ffd166', 0.2);
  } },

  // A present: a red box with a gold ribbon (part 1: the bow breathes)
  gift: { layers: 2, draw(c, l) {
    if (l === 1) {
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, 4.6); c.bezierCurveTo(sx * 2, 9.6, sx * 7.4, 9.0, sx * 5.6, 5.6); c.bezierCurveTo(sx * 4.6, 4.2, sx * 2, 4.4, 0, 4.6); c.closePath(); fill(c, '#ffd23a'); }
      circle(c, 0, 4.9, 1.0); fill(c, '#ffe9a0');
      return;
    }
    c.beginPath(); c.rect(-7.0, -8.6, 14.0, 10.0); fill(c, grad(c, -7, 0, 7, 0, ['#ff5a6a', '#e8243a', '#c8102e']));
    c.beginPath(); c.rect(-7.8, 1.4, 15.6, 3.0); fill(c, '#ff7a8a');
    c.beginPath(); c.rect(-1.2, -8.6, 2.4, 13.0); fill(c, '#ffd23a');
    c.beginPath(); c.rect(-7.0, -4.6, 14.0, 1.6); fill(c, '#ffd23a');
    for (const [x, y] of [[-4.4, -1.2], [4.4, -1.2], [-4.4, -6.8], [4.4, -6.8]]) sparkle(c, x, y, 0.8, '#ffe0e6');
  } },

  // A snowman: two snowballs, a red scarf, a bucket hat, a carrot nose,
  // twig arms (part 1: snow falling around).
  snowman: { layers: 2, dens: [1, 0.6], draw(c, l) {
    if (l === 1) { for (const [x, y] of [[-11, 7], [-8, 2], [-12, -3], [-9.6, -7.4], [10, 8], [8.6, 3], [12, -1], [9.6, -6.4], [-5, 9], [5.4, 9.2]]) { circle(c, x, y, 0.4); fill(c, '#e6f6ff'); } return; }
    seg(c, [-4.4, -2.2], [-8.4, 1.0], '#b87a4a', 0.4); seg(c, [-7.2, 0.0], [-8.2, -1.2], '#b87a4a', 0.3);
    seg(c, [4.4, -2.2], [8.4, 1.0], '#b87a4a', 0.4); seg(c, [7.2, 0.0], [8.6, -0.6], '#b87a4a', 0.3);
    circle(c, 0, -4.8, 4.9); fill(c, radial(c, -1.4, -3.4, 0.5, 5.2, ['#ffffff', '#f2f8ff', '#cfe6ff']));
    circle(c, 0, 2.6, 3.5); fill(c, radial(c, -1, 3.6, 0.4, 3.8, ['#ffffff', '#f2f8ff', '#cfe6ff']));
    c.beginPath(); c.roundRect(-3.6, -0.8, 7.2, 1.5, 0.7); fill(c, '#e8243a'); c.beginPath(); c.rect(1.4, -3.6, 1.5, 3.0); fill(c, '#e8243a');
    c.beginPath(); c.rect(-2.4, 5.4, 4.8, 3.0); fill(c, '#46b4ff'); c.beginPath(); c.rect(-3.4, 5.0, 6.8, 0.8); fill(c, '#2f8ad8');
    for (const sx of [-1, 1]) { circle(c, sx * 1.2, 3.4, 0.4); fill(c, '#3a2410'); }
    path(c, [[0, 2.7], [0, 1.9], [2.6, 2.2]]); fill(c, '#ff8a2a');
    c.beginPath(); c.arc(0, 2.0, 1.5, 1.15 * Math.PI, 1.85 * Math.PI); line(c, '#3a2410', 0.22);
    for (const y of [-3.2, -5.2, -7.2]) { circle(c, 0, y, 0.42); fill(c, '#3a2410'); }
  } },

  // A gold bell with a red bow and holly (part 0: the bell swings, part 1:
  // the clapper swings after it, part 2: the bow).
  bell: { layers: 3, draw(c, l) {
    if (l === 2) {
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(0, 7.6); c.bezierCurveTo(sx * 2, 10.4, sx * 6.0, 9.8, sx * 4.4, 7.2); c.bezierCurveTo(sx * 3.4, 6.2, sx * 1.4, 6.8, 0, 7.6); c.closePath(); fill(c, '#e8243a'); }
      circle(c, 0, 7.6, 0.8); fill(c, '#ff7a8a');
      return;
    }
    if (l === 1) { circle(c, 0, -7.4, 1.3); fill(c, '#ffb020'); return; }
    c.beginPath(); c.moveTo(-1.6, 6.6); c.bezierCurveTo(-5.4, 5.6, -4.6, -1.6, -7.8, -5.0); c.lineTo(7.8, -5.0); c.bezierCurveTo(4.6, -1.6, 5.4, 5.6, 1.6, 6.6); c.closePath();
    fill(c, grad(c, -7, 0, 7, 0, ['#ffb020', '#ffe066', '#fff3b0', '#ffd23a', '#f09a10']));
    c.beginPath(); c.roundRect(-8.4, -6.2, 16.8, 1.5, 0.7); fill(c, '#ffe9a0');
    c.beginPath(); c.moveTo(-4.9, 1.6); c.quadraticCurveTo(0, 0.6, 4.9, 1.6); line(c, '#f09a10', 0.25);
  } },

  // An hourglass: wooden ends, glass bulbs, sand on top and a heap below
  // (part 1: the falling grains).
  hourglass: { layers: 2, dens: [1, 1.2], draw(c, l) {
    if (l === 1) { for (let k = 0; k < 9; k++) { circle(c, (k % 2 ? 0.22 : -0.22), 0.8 - k * 0.2, 0.2); fill(c, '#ffe066'); } return; }
    for (const y of [8.0, -9.2]) { c.beginPath(); c.roundRect(-6.4, y, 12.8, 1.2, 0.5); fill(c, '#d89a5a'); }
    for (const sx of [-1, 1]) seg(c, [sx * 5.6, 8.0], [sx * 5.6, -8.0], '#b87a3a', 0.4);
    c.beginPath(); c.moveTo(-4.6, 8.0); c.bezierCurveTo(-4.6, 3.4, -0.6, 2.0, -0.6, 0); c.bezierCurveTo(-0.6, -2.0, -4.6, -3.4, -4.6, -8.0); c.lineTo(4.6, -8.0); c.bezierCurveTo(4.6, -3.4, 0.6, -2.0, 0.6, 0); c.bezierCurveTo(0.6, 2.0, 4.6, 3.4, 4.6, 8.0); c.closePath();
    line(c, '#bfe8ff', 0.35);
    c.beginPath(); c.moveTo(-3.4, 5.0); c.bezierCurveTo(-2.6, 3.0, -0.5, 2.0, -0.4, 0.6); c.lineTo(0.4, 0.6); c.bezierCurveTo(0.5, 2.0, 2.6, 3.0, 3.4, 5.0); c.closePath(); fill(c, grad(c, 0, 5, 0, 0.6, ['#ffe9a0', '#ffc94a']));
    c.beginPath(); c.moveTo(-4.2, -7.6); c.quadraticCurveTo(0, -1.6, 4.2, -7.6); c.closePath(); fill(c, grad(c, 0, -3, 0, -7.6, ['#ffe9a0', '#ffb020']));
    for (const [x, y, r] of [[-10.4, 6.4, 0.8], [10.6, 4.0, 0.7], [-11.0, -4.6, 0.6], [10.2, -6.6, 0.75]]) sparkle(c, x, y, r, '#fff3c4');
  } },

  // The Bosingak bell in its pavilion: a tiled roof on red posts, the big
  // bronze bell; part 1: the striking log on its ropes, part 2: the ring of
  // sound.
  bosingak: { layers: 3, dens: [1, 1, 0.7], draw(c, l) {
    if (l === 2) { for (const r of [5.0, 6.2, 7.4]) { c.beginPath(); c.arc(0, -2.6, r, -0.5, 0.5); line(c, '#ffe9a0', 0.24); c.beginPath(); c.arc(0, -2.6, r, Math.PI - 0.5, Math.PI + 0.5); line(c, '#ffe9a0', 0.24); } return; }
    if (l === 1) { c.beginPath(); c.roundRect(4.6, -3.6, 6.4, 1.3, 0.6); fill(c, '#d89a5a'); seg(c, [6.0, -2.3], [6.0, 3.0], '#fff3c4', 0.16); seg(c, [9.8, -2.3], [9.8, 3.0], '#fff3c4', 0.16); return; }
    // the roof
    c.beginPath(); c.moveTo(-13.4, 4.6); c.quadraticCurveTo(-9.6, 4.4, -7.6, 8.4); c.lineTo(7.6, 8.4); c.quadraticCurveTo(9.6, 4.4, 13.4, 4.6); c.quadraticCurveTo(10, 3.0, 9.4, 3.0); c.lineTo(-9.4, 3.0); c.quadraticCurveTo(-10, 3.0, -13.4, 4.6); c.closePath();
    fill(c, grad(c, 0, 8.4, 0, 3, ['#6a7c9a', '#46566e']));
    c.beginPath(); c.rect(-8.0, 8.4, 16.0, 0.7); fill(c, '#9ab0cc');
    c.beginPath(); c.rect(-10.2, 2.0, 20.4, 1.0); fill(c, '#2fbf88');
    for (const x of [-9.4, 8.4]) { c.beginPath(); c.rect(x, -9.2, 1.0, 11.2); fill(c, '#e8243a'); }
    c.beginPath(); c.rect(-11.4, -9.8, 22.8, 0.8); fill(c, '#c8ccd8');
    // the bell
    seg(c, [0, 2.0], [0, 0.8], '#d8b060', 0.5);
    c.beginPath(); c.moveTo(-2.4, 0.8); c.quadraticCurveTo(-3.8, 0.2, -3.9, -6.2); c.lineTo(3.9, -6.2); c.quadraticCurveTo(3.8, 0.2, 2.4, 0.8); c.closePath();
    fill(c, grad(c, -4, 0, 4, 0, ['#e8a820', '#ffd75a', '#fff0a0', '#ffc93a', '#e09a18']));
    c.beginPath(); c.rect(-3.9, -1.2, 7.8, 0.4); fill(c, '#c87a10'); c.beginPath(); c.rect(-3.9, -5.4, 7.8, 0.4); fill(c, '#c87a10');
    circle(c, 0, -3.2, 0.9); fill(c, '#fff3b0');
  } },

  // The first sunrise over the mountains and the sea of clouds; part 1: the
  // sun (it comes up), part 2: its rays.
  sunrise: { layers: 3, dens: [1, 1.2, 0.8], draw(c, l) {
    if (l === 2) { for (let k = 0; k <= 8; k++) { const a = (k / 8) * Math.PI; seg(c, [Math.cos(a) * 6.6, -1.6 + Math.sin(a) * 6.6], [Math.cos(a) * (k % 2 ? 8.4 : 9.8), -1.6 + Math.sin(a) * (k % 2 ? 8.4 : 9.8)], k % 2 ? '#ffd166' : '#ff9a4a', 0.45); } return; }
    if (l === 1) { circle(c, 0, -1.6, 5.4); fill(c, radial(c, 0, -1.6, 0.5, 5.4, ['#fff3b0', '#ffb020', '#ff5a3a'])); return; }
    path(c, [[-14, -10], [-14, -6.4], [-9.6, -3.0], [-6.4, -5.8], [-3.4, -4.4], [0, -6.8], [3.6, -4.6], [7.4, -2.6], [10.6, -5.4], [14, -4.0], [14, -10]]);
    fill(c, grad(c, 0, -2, 0, -10, ['#8a7cf0', '#4a5ac0']));
    for (const [a, b] of [[[-9.6, -3.0], [-8.2, -4.6]], [[7.4, -2.6], [8.8, -4.4]]]) { path(c, [a, [a[0] + 1.6, a[1] - 1.5], b, [a[0] - 1.5, a[1] - 1.5]]); fill(c, '#ffffff'); }
  } },

  // A bowl of tteokguk: white bowl, clear soup, sliced rice cakes, egg
  // garnish, seaweed and green onion; part 1: the steam.
  tteokguk: { layers: 2, dens: [1, 0.6], draw(c, l) {
    if (l === 1) { for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x, 3.8); c.bezierCurveTo(x - 1.6, 5.4, x + 1.6, 6.8, x, 9.0); line(c, '#e6f0ff', 0.4); } return; }
    c.beginPath(); c.moveTo(-10.6, 0.6); c.bezierCurveTo(-10, -6.4, -5.4, -8.6, 0, -8.6); c.bezierCurveTo(5.4, -8.6, 10, -6.4, 10.6, 0.6); c.closePath(); fill(c, grad(c, -10, 0, 10, 0, ['#5a9af0', '#8cc0ff', '#4a86e0']));
    c.beginPath(); c.rect(-3.4, -9.6, 6.8, 1.0); fill(c, '#4a86e0');
    c.beginPath(); c.moveTo(-9.8, -3.0); c.quadraticCurveTo(0, -5.2, 9.8, -3.0); line(c, '#ffffff', 0.35);
    oval(c, 0, 0.8, 10.8, 3.0); fill(c, '#ffffff'); oval(c, 0, 0.8, 9.8, 2.4); fill(c, '#ffc94a');
    for (const [x, y, a] of [[-5.8, 0.9, 0.3], [-1.8, 1.8, -0.2], [2.2, 0.2, 0.2], [6.0, 1.2, -0.3], [-2.2, -0.5, 0.1]]) { oval(c, x, y, 2.0, 0.95, a); fill(c, '#ffffff'); }
    for (const [x, y] of [[2.6, 1.7], [-7.4, -0.2]]) { c.beginPath(); c.rect(x, y, 2.2, 0.7); fill(c, '#3fd27a'); }
    for (const [x, y] of [[-4.6, 2.2], [5.6, -0.4]]) { c.beginPath(); c.rect(x, y, 2.0, 0.7); fill(c, '#ff5a5a'); }
  } },

  // The full moon of Chuseok with the rabbit pounding rice cakes inside
  // (part 1: the arm and mallet), part 2: little stars around.
  fullmoon: { layers: 3, dens: [1, 1.2, 0.6], draw(c, l) {
    if (l === 2) { for (const [x, y, r] of [[-12, 7, 0.8], [12, 7.6, 0.7], [-12.6, -3, 0.55], [12.4, -2, 0.6], [-10.4, -8, 0.5], [10.6, -8.2, 0.5]]) sparkle(c, x, y, r, '#fff3c4'); return; }
    if (l === 1) {
      seg(c, [0.4, -0.6], [3.0, 2.0], '#ffffff', 1.1);
      seg(c, [3.0, 2.0], [4.6, -1.4], '#a05a20', 0.5);
      c.save(); c.translate(4.8, -1.9); c.rotate(0.5); c.beginPath(); c.rect(-1.7, -0.7, 3.4, 1.4); fill(c, '#a05a20'); c.restore();
      return;
    }
    circle(c, 0, 0, 9.6); fill(c, radial(c, 0, 0, 1, 9.6, ['#ffc23a', '#ffb020', '#ffd75a']));
    path(c, [[2.6, -3.4], [7.2, -3.4], [6.2, -7.0], [3.6, -7.0]]); fill(c, '#a05a20'); oval(c, 4.9, -3.4, 2.3, 0.55); fill(c, '#ffffff');
    oval(c, -2.2, -3.6, 3.2, 3.5, 0.1); fill(c, '#ffffff'); circle(c, -1.8, 1.4, 2.6); fill(c, '#ffffff');
    for (const [x, a] of [[-3.1, 0.25], [-0.8, -0.12]]) { oval(c, x, 5.6, 0.9, 2.8, a); fill(c, '#ffffff'); oval(c, x, 5.6, 0.4, 2.0, a); fill(c, '#ff8cb0'); }
    circle(c, -0.7, 1.8, 0.42); fill(c, '#e8243a');
    circle(c, -5.4, -5.0, 1.0); fill(c, '#ffffff');
  } },

  // Songpyeon on a plate with pine needles: half-moon rice cakes in white,
  // pink, green and yellow; part 1: the steam.
  songpyeon: { layers: 2, dens: [1, 0.6], draw(c, l) {
    if (l === 1) { for (const x of [-4.4, 0.4, 5]) { c.beginPath(); c.moveTo(x, 4.6); c.bezierCurveTo(x - 1.4, 6.0, x + 1.4, 7.4, x, 9.2); line(c, '#e6f0ff', 0.36); } return; }
    oval(c, 0, -4.6, 12.4, 3.6); fill(c, grad(c, 0, -1, 0, -8.2, ['#d8a868', '#a8743a']));
    oval(c, 0, -4.0, 11.0, 2.8); fill(c, '#e8c088');
    for (let k = 0; k < 14; k++) seg(c, [-9 + k * 1.4, -4.6 + (k % 3) * 0.5], [-8.2 + k * 1.4, -2.6 + (k % 2) * 0.6], '#3fae6a', 0.14);
    const cake = (x, y, a, col) => {
      c.save(); c.translate(x, y); c.rotate(a);
      c.beginPath(); c.moveTo(-3.3, 0); c.quadraticCurveTo(0, 4.4, 3.3, 0); c.quadraticCurveTo(0, -1.3, -3.3, 0); c.closePath(); fill(c, grad(c, 0, 2.4, 0, -0.8, col));
      c.beginPath(); c.moveTo(-2.6, 0.9); c.quadraticCurveTo(0, 3.5, 2.6, 0.9); line(c, 'rgba(255,255,255,0.9)', 0.14);
      c.restore();
    };
    cake(-6.4, -3.2, 0.12, ['#ffffff', '#e6ecf8']); cake(0.2, -3.6, -0.05, ['#ffc0dc', '#ff8cb8']); cake(6.6, -3.2, -0.14, ['#a8f0b8', '#5fd08a']);
    cake(-3.2, -0.4, -0.1, ['#fff0a0', '#ffd23a']); cake(3.6, -0.4, 0.1, ['#ffffff', '#e6ecf8']); cake(0.2, 2.4, 0.04, ['#a8f0b8', '#5fd08a']);
  } },

  // Ganggangsullae: eight dancers in hanbok hand in hand in a ring (parts 1
  // to 8: they go round), under the full moon (part 0).
  ganggang: { layers: 9, dens: [0.7, 1, 1, 1, 1, 1, 1, 1, 1], draw(c, l) {
    if (l === 0) {
      circle(c, 0, 7.0, 2.7); fill(c, radial(c, -0.8, 7.6, 0.4, 3.0, ['#fffbe0', '#ffe68a', '#ffc94a']));
      for (const [x, y, r] of [[-11.6, 7.6, 0.6], [11.4, 8.0, 0.6], [-6.4, 9.0, 0.45], [6.4, 5.4, 0.45]]) sparkle(c, x, y, r, '#fff3c4');
      return;
    }
    const a = ((l - 1) / 8) * TAU, x = Math.cos(a) * 11.4, y = -3.8 + Math.sin(a) * 3.9;
    const skirt = ['#ff5ca8', '#46b4ff', '#ffd23a', '#7cf2c4', '#ff5a5a', '#b48cff', '#ff9a4a', '#5fe08f'][l - 1];
    path(c, [[x - 0.9, y + 1.2], [x + 0.9, y + 1.2], [x + 2.0, y - 2.6], [x - 2.0, y - 2.6]]); fill(c, skirt);
    c.beginPath(); c.rect(x - 0.95, y + 1.1, 1.9, 1.3); fill(c, '#ffffff');
    seg(c, [x - 0.9, y + 2.0], [x - 2.3, y + 1.2], '#ffffff', 0.45); seg(c, [x + 0.9, y + 2.0], [x + 2.3, y + 1.2], '#ffffff', 0.45);
    head(c, x, y + 3.3, 0.95, '#3a2410');
  } },

  // A persimmon tree in autumn: a bare branching tree with orange fruit
  // and a few leaves (part 1: it sways a little), a magpie's share on top.
  persimmon: { layers: 2, draw(c, l) {
    if (l === 0) { c.beginPath(); c.moveTo(-1.4, -9.6); c.quadraticCurveTo(-0.6, -5, -0.9, -1.6); c.lineTo(0.9, -1.6); c.quadraticCurveTo(0.6, -5, 1.6, -9.6); c.closePath(); fill(c, '#a8743a'); oval(c, 0, -9.4, 7.4, 0.6); fill(c, '#e8c27a'); return; }
    const br = [[[0, -1.8], [-6.4, 2.6]], [[0, -1.8], [6.6, 2.0]], [[0, -1.8], [0.4, 6.4]], [[-3.6, 0.6], [-9.6, 0.4]], [[-4.6, 1.4], [-5.6, 6.4]], [[3.8, 0.4], [10, 0.2]], [[4.6, 1.0], [6.4, 6.6]], [[0.2, 3.0], [-2.6, 7.4]], [[0.3, 4.0], [3.0, 8.0]]];
    for (const [a, b] of br) seg(c, a, b, '#a8743a', 0.45);
    for (const [x, y] of [[-6.6, 1.4], [-9.8, -0.6], [-5.6, 5.2], [7.0, 0.8], [10.2, -0.8], [6.6, 5.4], [-2.8, 6.2], [3.2, 6.8], [0.4, 5.0], [-2.6, 2.4], [2.8, 2.6]]) {
      circle(c, x, y - 1.1, 1.35); fill(c, radial(c, x - 0.4, y - 0.7, 0.2, 1.5, ['#ffc070', '#ff8a2a', '#f06a10']));
      c.beginPath(); c.rect(x - 0.5, y, 1.0, 0.36); fill(c, '#5fa04a');
    }
    for (const [x, y, a] of [[-8.4, 2.6, 0.5], [8.6, 2.4, -0.5], [-1.2, 8.4, 0.3], [5.0, 8.6, -0.3]]) { oval(c, x, y, 1.1, 0.5, a); fill(c, '#ffb040'); }
  } },

  // A candy cane with a green bow
  candycane: { layers: 1, draw(c) {
    c.save(); c.beginPath(); c.moveTo(-1.2, -9.0); c.lineTo(-1.2, 3.6); c.arc(2.6, 3.6, 3.8, Math.PI, 0, true); c.lineTo(6.4, 1.6);
    c.lineWidth = 3.0; c.strokeStyle = '#ffffff'; c.stroke(); c.clip?.(); c.restore();
    for (let k = 0; k < 7; k++) seg(c, [-2.6, -8.6 + k * 2.0], [0.2, -7.4 + k * 2.0], '#e8243a', 0.8);
    for (let k = 0; k < 6; k++) { const a = Math.PI - (k / 5.4) * Math.PI; seg(c, [2.6 + Math.cos(a - 0.12) * 2.4, 3.6 + Math.sin(a - 0.12) * 2.4], [2.6 + Math.cos(a + 0.12) * 5.2, 3.6 + Math.sin(a + 0.12) * 5.2], '#e8243a', 0.8); }
    for (const sx of [-1, 1]) { path(c, [[-1.2, -3.4], [-1.2 + sx * 4.2, -1.6], [-1.2 + sx * 4.2, -5.2]]); fill(c, '#3fd27a'); }
    circle(c, -1.2, -3.4, 0.9); fill(c, '#a8f0b8');
    for (const [x, y, r] of [[-9, 6, 0.8], [10.6, -3, 0.7], [-8.4, -6.6, 0.6]]) sparkle(c, x, y, r, '#fff3c4');
  } },

  // A wreath: a ring of green leaves with a red bow; part 1: berries and
  // lights (they blink).
  wreath: { layers: 2, dens: [1, 1.5], draw(c, l) {
    if (l === 1) { const cols = ['#ff4a5a', '#ffd23a', '#ffffff']; for (let k = 0; k < 14; k++) { const a = (k / 14) * TAU + 0.2, r = k % 2 ? 6.2 : 7.6; if (Math.abs(a - TAU * 0.75) < 0.5) continue; circle(c, Math.cos(a) * r, 0.6 + Math.sin(a) * r, 0.6); fill(c, cols[k % 3]); } return; }
    for (let k = 0; k < 26; k++) { const a = (k / 26) * TAU; oval(c, Math.cos(a) * 6.9, 0.6 + Math.sin(a) * 6.9, 2.3, 1.1, a + 0.9); fill(c, k % 2 ? '#2fbf68' : '#5fe08f'); }
    for (const sx of [-1, 1]) { path(c, [[0, -6.4], [sx * 4.4, -4.4], [sx * 4.4, -8.6]]); fill(c, '#e8243a'); path(c, [[0, -6.4], [sx * 1.0, -9.8], [sx * 2.6, -9.4]]); fill(c, '#ff5a6a'); }
    circle(c, 0, -6.4, 1.0); fill(c, '#ff7a8a');
  } },

  // A Christmas stocking with a present peeking out
  stocking: { layers: 1, draw(c) {
    seg(c, [0, 9.4], [-1.6, 6.8], '#ffd166', 0.3);
    c.beginPath(); c.rect(-2.6, 4.4, 4.4, 2.6); fill(c, '#46b4ff'); c.beginPath(); c.rect(-0.9, 4.4, 0.9, 2.6); fill(c, '#ffd23a');
    c.beginPath(); c.moveTo(-4.2, 3.0); c.lineTo(-3.6, -4.6); c.bezierCurveTo(-3.4, -9.4, 0.6, -9.4, 5.6, -9.0); c.bezierCurveTo(9.4, -8.4, 9.2, -3.4, 5.6, -3.6); c.lineTo(3.2, -3.4); c.lineTo(3.2, 3.0); c.closePath();
    fill(c, grad(c, -4, 0, 9, 0, ['#ff5a6a', '#e8243a', '#c8102e']));
    c.beginPath(); c.roundRect(-5.0, 2.4, 9.0, 2.6, 1.2); fill(c, '#ffffff');
    oval(c, 6.6, -6.4, 2.0, 1.6); fill(c, '#ffffff'); oval(c, -2.4, -7.4, 1.6, 1.3, 0.6); fill(c, '#ffffff');
    for (const [x, y] of [[-1.4, 0.2], [1.0, -1.8], [-1.2, -4.0]]) sparkle(c, x, y, 0.8, '#ffe0e6');
  } },

  // A gingerbread man with icing (part 1: the arm that waves)
  gingerman: { layers: 2, draw(c, l) {
    const B = '#d8904a';
    if (l === 1) { seg(c, [3.6, 1.6], [7.4, 4.2], B, 2.6); c.beginPath(); c.arc(6.6, 3.6, 1.3, 0.2, 1.6); line(c, '#ffffff', 0.3); return; }
    seg(c, [-3.6, 1.6], [-7.4, 0.2], B, 2.6);
    seg(c, [-1.8, -3.4], [-3.4, -8.4], B, 3.0); seg(c, [1.8, -3.4], [3.4, -8.4], B, 3.0);
    c.beginPath(); c.roundRect(-3.6, -4.6, 7.2, 7.6, 2.4); fill(c, B);
    circle(c, 0, 6.0, 3.6); fill(c, B);
    for (const sx of [-1, 1]) { circle(c, sx * 1.3, 6.6, 0.45); fill(c, '#ffffff'); c.beginPath(); c.arc(sx * 3.4, -8.0, 1.3, 0.2, 2.6); line(c, '#ffffff', 0.3); }
    c.beginPath(); c.arc(0, 5.6, 1.7, 1.15 * Math.PI, 1.85 * Math.PI); line(c, '#ffffff', 0.32);
    c.beginPath(); c.arc(-6.6, 0.4, 1.3, 1.6, 3.6); line(c, '#ffffff', 0.3);
    for (const [y, col] of [[1.2, '#ff4a5a'], [-0.8, '#3fd27a'], [-2.8, '#ff4a5a']]) { circle(c, 0, y, 0.6); fill(c, col); }
    path(c, [[-1.6, 2.6], [1.6, 2.6], [0, 1.9]]); fill(c, '#e8243a');
  } },

  // A clock a few minutes to midnight: gold rim, 12 ticks; part 1: the
  // minute hand, part 2: the hour hand (they run on to twelve).
  clock: { layers: 3, dens: [1, 1.4, 1.4], draw(c, l) {
    if (l === 1) { c.save(); c.rotate(0.5); seg(c, [0, 0], [0, 6.6], '#ffffff', 0.6); c.restore(); return; }
    if (l === 2) { c.save(); c.rotate(0.5 / 12 + 0.02); seg(c, [0, 0], [0, 4.2], '#ffd166', 0.8); c.restore(); return; }
    circle(c, 0, 0, 9.4); fill(c, '#ffd166');
    c.save(); c.globalCompositeOperation = 'destination-out'; circle(c, 0, 0, 8.4); fill(c, '#000'); c.restore();
    for (let k = 0; k < 12; k++) { const a = (k / 12) * TAU; seg(c, [Math.sin(a) * 7.0, Math.cos(a) * 7.0], [Math.sin(a) * (k % 3 ? 7.6 : 8.0), Math.cos(a) * (k % 3 ? 7.6 : 8.0)], k ? '#bfe8ff' : '#ff5a5a', k % 3 ? 0.3 : 0.55); }
    circle(c, 0, 0, 0.7); fill(c, '#ffffff');
    for (const [x, y, r] of [[-12, 7, 0.8], [12, 6, 0.7], [-12.4, -6, 0.6], [12.2, -7, 0.7]]) sparkle(c, x, y, r, '#fff3c4');
  } },

  // A wall calendar on its last page: red top and a big gold "31"
  // (part 1: the page's corner, lifting).
  calendar: { layers: 2, draw(c, l) {
    if (l === 1) { path(c, [[9.0, -7.6], [5.6, -7.6], [9.0, -4.2]]); fill(c, '#bfe8ff'); return; }
    c.beginPath(); c.roundRect(-9.0, -7.6, 18.0, 15.0, 1.0); line(c, '#ffffff', 0.5);
    c.beginPath(); c.roundRect(-9.0, 4.0, 18.0, 4.4, 1.0); fill(c, '#e8243a');
    for (const x of [-5, 5]) { c.beginPath(); c.roundRect(x - 0.5, 7.2, 1.0, 2.4, 0.5); fill(c, '#c8ccd8'); }
    c.save(); c.globalCompositeOperation = 'destination-out'; path(c, [[9.6, -8.2], [5.4, -8.2], [9.6, -4.0]]); fill(c, '#000'); c.restore();
    c.save(); c.scale(1, -1); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#ffd166'; c.font = '900 10.5px sans-serif'; c.fillText('31', 0, 2.4); c.restore();
  } },

  // Four yut sticks (윷놀이), round backs and flat marked faces (parts 0 to
  // 3: each is tossed).
  yut: { layers: 4, draw(c, l) {
    const x = [-7.2, -2.4, 2.4, 7.2][l], face = l !== 1;
    c.beginPath(); c.roundRect(x - 1.5, -7.0, 3.0, 14.0, 1.5); fill(c, face ? grad(c, x - 1.5, 0, x + 1.5, 0, ['#ffe9c0', '#fff6e0', '#f0d8a0']) : grad(c, x - 1.5, 0, x + 1.5, 0, ['#a8743a', '#d89a5a', '#a8743a']));
    if (face) for (const y of [-4, 0, 4]) { seg(c, [x - 0.8, y - 0.8], [x + 0.8, y + 0.8], '#3a2410', 0.3); seg(c, [x - 0.8, y + 0.8], [x + 0.8, y - 0.8], '#3a2410', 0.3); }
  } },

  // Chestnuts: an open spiky burr with two nuts, and one that hops out (part 1).
  chestnut: { layers: 2, draw(c, l) {
    const nut = (x, y, s) => { c.beginPath(); c.moveTo(x, y + 2.6 * s); c.bezierCurveTo(x + 3.4 * s, y + 1.4 * s, x + 3.2 * s, y - 2.4 * s, x, y - 2.4 * s); c.bezierCurveTo(x - 3.2 * s, y - 2.4 * s, x - 3.4 * s, y + 1.4 * s, x, y + 2.6 * s); c.closePath(); fill(c, radial(c, x - 0.8 * s, y + 0.6 * s, 0.2, 3.4 * s, ['#e89a5a', '#b8602a', '#8a3f18'])); oval(c, x, y - 1.9 * s, 1.9 * s, 0.6 * s); fill(c, '#f0d8a0'); };
    if (l === 1) { nut(7.6, -5.6, 1.1); return; }
    for (let k = 0; k < 30; k++) { const a = Math.PI * 0.05 + (k / 29) * Math.PI * 0.9 + Math.PI, r = 7.4; seg(c, [-2.6 + Math.cos(a) * r * 0.85, 0.6 + Math.sin(a) * r * 0.85], [-2.6 + Math.cos(a) * (r + 1.5), 0.6 + Math.sin(a) * (r + 1.5)], '#a8d04a', 0.22); }
    c.beginPath(); c.arc(-2.6, 0.6, 7.0, Math.PI, 0, false); c.closePath(); fill(c, grad(c, 0, 0.6, 0, -6.4, ['#c8e06a', '#7fb03a']));
    oval(c, -2.6, 0.6, 7.0, 1.6); fill(c, '#fff3c4');
    nut(-5.2, 2.6, 1.0); nut(0.2, 2.8, 1.05);
    for (const [x, y, a] of [[8.6, 6.4, 0.5], [10.6, 2.6, -0.4]]) { oval(c, x, y, 1.6, 0.7, a); fill(c, '#ffb040'); }
  } },

  // Ripe rice: golden stalks bending with grain (they sway).
  rice: { layers: 1, draw(c) {
    for (let k = 0; k < 9; k++) {
      const x = -12.4 + k * 2.75, lean = 0.8 + (k % 3) * 0.25, top = 5.2 + (k % 3) * 0.9;
      c.beginPath(); c.moveTo(x, -9.4); c.quadraticCurveTo(x + lean * 0.4, 0, x + lean * 2.2, top); line(c, '#a8d04a', 0.3);
      for (let j = 0; j < 6; j++) { const t = j / 5, gx = x + lean * (2.2 + t * 1.6), gy = top - t * 3.6 - t * t * 1.0; oval(c, gx, gy, 0.85, 0.5, 0.6 * Math.sign(lean)); fill(c, j % 2 ? '#ffd23a' : '#ffb020'); }
      seg(c, [x, -9.4], [x - lean * 1.6, -3.4], '#7fd05a', 0.26);
    }
  } },
});
