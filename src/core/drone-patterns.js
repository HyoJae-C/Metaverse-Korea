// The drone show's patterns (Yozi 2026-11-21): the middle of the show
// (after the opening, up to the photo time) changes from show to show, one
// pattern each in turn (drone-sky.js patternOf; pattern A is its routine 1).
// Each pattern: mid(h) = the [seconds, step] list, evened by fit() to the
// middle's length; no scene stays over 15 seconds. h: { W, P, C } of
// drone-sky.js. The patterns' own pictures and moves are below.
// Downloaded with drone-sky.js.
import { BRUSH, addPictures } from './drone-pictures.js';

const { path, fill, line, circle, oval, seg, grad, radial, sparkle, heartPath } = BRUSH;

export const PATTERNS = {
  // C: the four seasons of Seoul
  C: {
    name: 'seasons',
    mid: ({ W, P, C }) => [
      [10, W(['서울의', '사계절'], { color: [C.PINK, C.SKYBLUE], morph: 2.5 })],
      [8, W(['봄'], { color: [C.PINK, C.WHITE] })],
      [14, P('blossom')],
      [8, W(['벚꽃'], { color: [C.PINK, C.WHITE] })],
      [14, P('butterfly')],
      [8, W(['나비야'], { color: [C.GOLD, C.PINK] })],
      [14, P('magpie')],
      [8, W(['반가워!'], { color: [C.SKYBLUE, C.WHITE] })],
      [14, P('clover')],
      [14, P('bike')],
      [8, W(['봄바람'], { color: [C.MINT, C.WHITE] })],
      [14, P('rainbow')],
      [8, W(['여름'], { color: [C.SKYBLUE, C.MINT] })],
      [14, P('umbrella')],
      [8, W(['장마'], { color: [C.SKYBLUE, C.WHITE] })],
      [14, P('watermelon')],
      [8, W(['수박'], { color: [C.RED, C.MINT] })],
      [14, P('bingsu')],
      [8, W(['빙수'], { color: [C.WHITE, C.RED] })],
      [14, P('fountain')],
      [8, W(['분수'], { color: [C.SKYBLUE, C.VIOLET] })],
      [14, P('duck')],
      [15, P('whale', { morph: 3 })],
      [8, W(['시원해!'], { color: [C.SKYBLUE, C.WHITE] })],
      [8, W(['가을'], { color: [C.GOLD, C.RED] })],
      [14, P('maple')],
      [8, W(['단풍'], { color: [C.RED, C.GOLD] })],
      [14, P('ginkgo')],
      [8, W(['은행잎'], { color: [C.GOLD, C.WHITE] })],
      [14, P('persimmon')],
      [14, P('rice')],
      [14, P('fullmoon')],
      [8, W(['한가위'], { color: [C.GOLD, C.WHITE] })],
      [8, W(['높은 하늘'], { color: [C.SKYBLUE, C.WHITE] })],
      [14, P('kite')],
      [14, P('palace')],
      [8, W(['겨울'], { color: [C.WHITE, C.SKYBLUE] })],
      [14, P('snowflake')],
      [8, W(['첫눈'], { color: [C.WHITE, C.SKYBLUE] })],
      [14, P('snowman')],
      [14, P('mitten')],
      [8, W(['따뜻해'], { color: [C.RED, C.GOLD] })],
      [14, P('tangerine')],
      [8, W(['귤'], { color: [C.GOLD, C.MINT] })],
      [14, P('tower')],
      [10, W(['언제 와도', '좋아'], { color: [C.PINK, C.GOLD] })],
      [8, W(['봄 여름', '가을 겨울'], { color: [C.MINT, C.VIOLET] })],
      [12, W([['서울 ', '♡']], C.HEART)],
      [14, P('hearts')],
    ],
  },
  // D: a picnic by the Han
  D: {
    name: 'han-picnic',
    mid: ({ W, P, C }) => [
      [10, W(['한강', '가자!'], { color: [C.SKYBLUE, C.MINT], morph: 2.5 })],
      [14, P('subway')],
      [8, W(['뚝섬역'], { color: [C.MINT, C.WHITE] })],
      [14, P('mat')],
      [8, W(['돗자리', '펴고'], { color: [C.GOLD, C.PINK] })],
      [14, P('butterfly')],
      [14, P('jindo')],
      [8, W(['멍멍!'], { color: [C.GOLD, C.WHITE] })],
      [14, P('kite')],
      [14, P('bike')],
      [8, W(['따릉따릉'], { color: [C.MINT, C.WHITE] })],
      [14, P('duck')],
      [8, W(['오리배'], { color: [C.GOLD, C.WHITE] })],
      [14, P('balloons')],
      [15, P('scooter', { morph: 3 })],
      [8, W(['배달', '왔어요!'], { color: [C.GOLD, C.RED] })],
      [14, P('chimaek')],
      [8, W(['치맥'], { color: [C.GOLD, C.RED] })],
      [14, P('ramen')],
      [8, W(['한강 라면'], { color: [C.RED, C.GOLD] })],
      [14, P('gimbap')],
      [8, W(['맛있다!'], { color: [C.GOLD, C.PINK] })],
      [14, P('watermelon')],
      [8, W(['수박도!'], { color: [C.RED, C.MINT] })],
      [14, P('guitar')],
      [8, W(['버스킹'], { color: [C.PINK, C.VIOLET] })],
      [14, P('cat')],
      [8, W(['야옹~'], { color: [C.GOLD, C.PINK] })],
      [14, P('cruise')],
      [8, W(['유람선'], { color: [C.SKYBLUE, C.WHITE] })],
      [15, P('whale', { morph: 3 })],
      [8, W(['뚝섬의', '전설'], { color: [C.SKYBLUE, C.WHITE] })],
      [14, P('bridge')],
      [14, P('fountain')],
      [8, W(['무지개', '분수'], { color: [C.SKYBLUE, C.VIOLET] })],
      [14, P('tent')],
      [8, W(['캠핑'], { color: [C.GOLD, C.MINT] })],
      [14, P('hansunset')],
      [8, W(['한강의', '노을'], { color: [C.GOLD, C.RED] })],
      [14, P('moon')],
      [14, P('star')],
      [8, W(['별이 떴다'], { color: [C.GOLD, C.WHITE] })],
      [8, W(['바람 좋다'], { color: [C.SKYBLUE, C.MINT] })],
      [14, P('wheel')],
      [10, W(['오늘', '좋은 하루'], { color: [C.PINK, C.GOLD] })],
      [8, W(['또 오자'], { color: [C.MINT, C.GOLD] })],
      [12, W([['한강 ', '♡']], C.HEART)],
      [14, P('hearts')],
    ],
  },
};

// ---- how the patterns' pictures move (p, t as MOVES in drone-sky.js) ---------
const turn = (p, cx, cy, a) => {
  const dx = p[0] - cx, dy = p[1] - cy, c = Math.cos(a), s = Math.sin(a);
  p[0] = cx + dx * c - dy * s; p[1] = cy + dx * s + dy * c;
};
const twinkle = (p, t) => 0.6 + 0.4 * Math.sin(t * 3 + p[0] * 1.7 + p[1]);
export const PATTERN_MOVES = {
  // the wings flap (squeezed towards the body), and it drifts
  butterfly: (p, t) => { if (p[2] === 1) p[0] *= 0.55 + 0.45 * Math.abs(Math.cos(t * 3.2)); p[1] += Math.sin(t * 1.3) * 0.6; p[0] += Math.sin(t * 0.8) * 0.8; },
  // the rain falls
  umbrella: (p, t) => { if (p[2] !== 1) return 1; p[1] -= (t * 3 + p[0] * 1.3 + 40) % 4; return 0.8; },
  watermelon: (p, t) => turn(p, 0, -7, Math.sin(t * 1.6) * 0.07),
  bingsu: (p, t) => (p[2] === 1 ? twinkle(p, t) : 1),
  // the leaves rock as they fall
  maple: (p, t) => { turn(p, 0, 0, Math.sin(t * 1.4) * 0.18); p[1] += Math.sin(t * 0.9) * 0.6; },
  ginkgo: (p, t) => { const c = [-8.4, 0.2, 8.6][p[2]] ?? 0; turn(p, c, 2, Math.sin(t * 1.5 + p[2] * 1.4) * 0.2); p[1] -= ((t * 0.5 + p[2] * 0.7) % 3) - 1.5; },
  mitten: (p, t) => turn(p, [-5.4, 5.4][p[2]] ?? 0, -7, Math.sin(t * 2.6 + p[2] * Math.PI) * 0.12), // they wave
  tangerine: (p, t) => { if (p[2] === 1) p[1] += Math.abs(Math.sin(t * 2.2)) * 0.8; },
  mat: (p, t) => (p[2] === 1 ? twinkle(p, t) : 1),
  // the balloons sway on their strings
  balloons: (p, t) => { const k = (p[1] + 9) / 18; p[0] += Math.sin(t * 1.4 + p[2]) * 0.9 * k; },
  // rides across, left to right, the wheels turning
  scooter: (p, t) => {
    if (p[2] === 1) turn(p, -5.4, -5.6, -t * 5); else if (p[2] === 2) turn(p, 5.6, -5.6, -t * 5);
    p[0] = p[0] * 0.8 - 9 + (t / 15) * 18;
  },
  // the notes float up
  guitar: (p, t) => { if (p[2] !== 1) return 1; p[1] += ((t * 0.9 + p[0] * 0.4) % 3) - 1.5; p[0] += Math.sin(t * 2 + p[1]) * 0.3; return twinkle(p, t); },
  cruise: (p, t) => { if (p[2] === 1) { p[0] += Math.sin(t * 2 + p[0] * 0.5) * 0.4; return twinkle(p, t); } p[1] += Math.sin(t * 1.4) * 0.25; p[0] += Math.sin(t * 0.5) * 1.2; return 1; },
  // the jets rise and fall, the colours run along
  fountain: (p, t) => { if (p[2] !== 1) return 1; const k = 0.75 + 0.25 * Math.sin(t * 2.4 + p[0] * 0.5); p[1] = -3.4 + (p[1] + 3.4) * k; return 0.7 + 0.3 * Math.sin(t * 4 + p[0]); },
  tent: (p, t) => (p[2] === 1 ? 0.55 + 0.45 * Math.sin(t * 5 + p[0] * 3 + p[1] * 2) : 1), // the campfire flickers
  // the sun sinks towards the river, its path on the water shimmers
  hansunset: (p, t) => { if (p[2] === 1) p[1] -= Math.min(1, t / 13) * 3.2; else if (p[2] === 2) { p[0] += Math.sin(t * 2.4 + p[1] * 3) * 0.35; return twinkle(p, t); } return 1; },
};

// ---- the patterns' pictures (as PICTURES in drone-pictures.js) ---------------
addPictures({
  // A butterfly: four wings with spots (part 1: they flap), body and feelers.
  butterfly: { layers: 2, draw(c, l) {
    if (l === 0) {
      oval(c, 0, -0.4, 0.75, 4.6); fill(c, '#8a5a3a'); circle(c, 0, 4.6, 1.0); fill(c, '#8a5a3a');
      for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 0.3, 5.4); c.quadraticCurveTo(sx * 1.6, 8.4, sx * 3.0, 8.6); line(c, '#e8c27a', 0.26); circle(c, sx * 3.0, 8.6, 0.4); fill(c, '#e8c27a'); }
      return;
    }
    for (const sx of [-1, 1]) {
      c.beginPath(); c.moveTo(sx * 0.8, 2.0); c.bezierCurveTo(sx * 4, 10.6, sx * 13.4, 9.4, sx * 11.6, 3.0); c.bezierCurveTo(sx * 10.6, 0.2, sx * 4, 0.0, sx * 0.8, 0.6); c.closePath();
      fill(c, radial(c, sx * 6, 4.4, 0.5, 7.4, ['#fff0a0', '#ffb020', '#ff7a2a']));
      c.beginPath(); c.moveTo(sx * 0.8, 0.0); c.bezierCurveTo(sx * 5, 0.2, sx * 10.4, -2.0, sx * 8.6, -6.4); c.bezierCurveTo(sx * 6.4, -9.6, sx * 2.0, -6.4, sx * 0.8, -2.6); c.closePath();
      fill(c, radial(c, sx * 5, -3.6, 0.5, 6, ['#ffd0ec', '#ff8cc0', '#ff5ca8']));
      circle(c, sx * 7.4, 5.2, 1.5); fill(c, '#ffffff'); circle(c, sx * 4.2, 3.4, 0.8); fill(c, '#ffffff'); circle(c, sx * 5.4, -4.2, 1.1); fill(c, '#fff3c4');
    }
  } },

  // An umbrella in the rain: a red-and-white canopy, a hooked handle
  // (part 1: the rain, falling).
  umbrella: { layers: 2, dens: [1, 0.7], draw(c, l) {
    if (l === 1) { for (let k = 0; k < 14; k++) { const x = -12.8 + k * 1.95, y = -1.6 - ((k * 3.7) % 6); seg(c, [x, y], [x - 0.4, y - 1.5], '#7fd4ff', 0.24); if (Math.abs(x) > 10.8) seg(c, [x, y + 8], [x - 0.4, y + 6.5], '#7fd4ff', 0.24); } return; }
    seg(c, [0, 8.6], [0, 9.8], '#fff3c4', 0.6);
    for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(0, 0.6); c.arc(0, 0.6, 10.4, (k / 6) * Math.PI, ((k + 1) / 6) * Math.PI); c.closePath(); fill(c, k % 2 ? '#ffffff' : '#ff5a6a'); }
    c.save(); c.globalCompositeOperation = 'destination-out'; for (let k = 0; k < 4; k++) { circle(c, -7.8 + k * 5.2, -0.6, 2.7); fill(c, '#000'); } c.restore();
    c.beginPath(); c.moveTo(0, 1.4); c.lineTo(0, -7.0); c.arc(-1.5, -7.0, 1.5, 0, Math.PI, true); line(c, '#fff3c4', 0.75);
  } },

  // A slice of watermelon: red flesh with seeds, white and green rind.
  watermelon: { layers: 1, draw(c) {
    c.beginPath(); c.arc(0, 5.4, 12.6, Math.PI, 0); c.closePath(); fill(c, '#2fbf68');
    c.beginPath(); c.arc(0, 5.4, 11.4, Math.PI, 0); c.closePath(); fill(c, '#d8ffe0');
    c.beginPath(); c.arc(0, 5.4, 10.4, Math.PI, 0); c.closePath(); fill(c, radial(c, 0, 5.4, 1, 10.4, ['#ff7a8a', '#ff4a5a', '#e8243a']));
    for (const [x, y] of [[-6.4, 2.6], [-3.2, -0.6], [0, 2.4], [3.2, -0.6], [6.4, 2.6], [-1.8, -3.6], [1.8, -3.6]]) { oval(c, x, y, 0.5, 0.85); fill(c, '#3a2410'); }
    for (let k = 0; k < 9; k++) { const a = Math.PI + (k + 0.5) * (Math.PI / 9); seg(c, [Math.cos(a) * 11.7, 5.4 + Math.sin(a) * 11.7], [Math.cos(a) * 12.5, 5.4 + Math.sin(a) * 12.5], '#1f8a4a', 0.5); }
  } },

  // Patbingsu: a glass bowl, a mound of shaved ice, red beans, rice cakes,
  // a cherry (part 1: the ice sparkles).
  bingsu: { layers: 2, dens: [1, 0.8], draw(c, l) {
    if (l === 1) { for (const [x, y, r] of [[-4.6, 3.6, 0.7], [3.8, 4.8, 0.6], [-1.0, 6.4, 0.6], [5.6, 1.6, 0.55], [-6.2, 0.8, 0.55]]) sparkle(c, x, y, r, '#ffffff'); return; }
    c.beginPath(); c.moveTo(-9.6, -1.0); c.quadraticCurveTo(-8.4, -7.2, -2.4, -7.4); c.lineTo(2.4, -7.4); c.quadraticCurveTo(8.4, -7.2, 9.6, -1.0); c.closePath(); fill(c, grad(c, -9, 0, 9, 0, ['#7fd4ff', '#d0f0ff', '#7fd4ff']));
    c.beginPath(); c.rect(-1.0, -9.0, 2.0, 1.6); fill(c, '#7fd4ff'); c.beginPath(); c.roundRect(-4.4, -9.8, 8.8, 1.0, 0.5); fill(c, '#bfe8ff');
    c.beginPath(); c.moveTo(-9.0, -1.0); c.bezierCurveTo(-8.4, 5.0, -3.4, 8.6, 0, 8.8); c.bezierCurveTo(3.4, 8.6, 8.4, 5.0, 9.0, -1.0); c.closePath(); fill(c, radial(c, -1.6, 4, 0.5, 9, ['#ffffff', '#f2f8ff', '#d8ecff']));
    for (const [x, y] of [[-3.6, 1.6], [-1.6, 0.4], [0.6, 1.4], [2.6, 0.2], [-0.4, 2.8], [3.8, 1.8], [-5.2, 0.2]]) { circle(c, x, y, 0.85); fill(c, '#a83a3a'); }
    for (const [x, y, col] of [[-5.6, 3.6, '#ffe9a0'], [5.4, 3.8, '#ffc0dc'], [3.0, 5.6, '#a8f0b8']]) { c.beginPath(); c.roundRect(x - 0.9, y - 0.6, 1.8, 1.2, 0.4); fill(c, col); }
    circle(c, 0, 8.8, 1.1); fill(c, '#ff3048'); c.beginPath(); c.moveTo(0, 9.6); c.quadraticCurveTo(1.0, 10.6, 2.2, 10.2); line(c, '#3fd27a', 0.24);
    seg(c, [6.4, 6.0], [10.4, 9.4], '#e8c27a', 0.4);
  } },

  // A red maple leaf: seven pointed lobes, veins, a stem (it rocks).
  maple: { layers: 1, draw(c) {
    // half the outline (the right side), tip by tip: [degrees, length]
    const tips = [[90, 9.6], [48, 8.4], [10, 8.6], [-28, 6.2]], right = [];
    tips.forEach(([deg, r], i) => {
      const a = (deg * Math.PI) / 180;
      for (const [da, k] of [[0.16, 0.62], [0.07, 0.8], [0, 1], [-0.07, 0.8], [-0.16, 0.62]]) right.push([Math.cos(a + da) * r * k, Math.sin(a + da) * r * k]);
      const next = tips[i + 1];
      if (next) { const m = ((deg + next[0]) / 2) * (Math.PI / 180); right.push([Math.cos(m) * 3.4, Math.sin(m) * 3.4]); }
    });
    right.push([1.2, -3.4]);
    const pts = right.slice(2), left = pts.slice().reverse().map(([x, y]) => [-x, y]);
    c.save(); c.translate(0, -0.6);
    path(c, [[0, 9.6], ...pts, [0, -3.0], ...left]); fill(c, radial(c, 0, 1, 0.5, 10, ['#ffb040', '#ff5a3a', '#e8243a']));
    for (const [deg, r] of [[90, 8.4], [48, 7.2], [132, 7.2], [10, 7.4], [170, 7.4], [-28, 5.0], [208, 5.0]]) { const a = (deg * Math.PI) / 180; seg(c, [0, -1.0], [Math.cos(a) * r, Math.sin(a) * r], '#ffe066', 0.18); }
    c.beginPath(); c.moveTo(0, -3.0); c.quadraticCurveTo(0.4, -6.6, 1.8, -9.0); line(c, '#e8a04a', 0.4);
    c.restore();
  } },

  // Three ginkgo leaves, gold fans with a notch (parts 0 to 2: each rocks
  // and drifts down).
  ginkgo: { layers: 3, draw(c, l) {
    const [x, y, s, rot] = [[-8.4, 2.6, 0.85, 0.25], [0.2, -3.2, 1.0, -0.1], [8.6, 3.2, 0.8, -0.35]][l];
    c.save(); c.translate(x, y); c.rotate(rot); c.scale(s, s);
    c.beginPath(); c.moveTo(0, -1.6); c.bezierCurveTo(-3.0, -0.4, -6.4, 1.6, -5.6, 4.6); c.quadraticCurveTo(-3.0, 6.4, -0.5, 5.2); c.lineTo(0, 3.4); c.lineTo(0.5, 5.2); c.quadraticCurveTo(3.0, 6.4, 5.6, 4.6); c.bezierCurveTo(6.4, 1.6, 3.0, -0.4, 0, -1.6); c.closePath();
    fill(c, radial(c, 0, -1.6, 0.5, 7, ['#fff3a0', '#ffd23a', '#ffb020']));
    for (const a of [-0.8, -0.4, 0.4, 0.8]) seg(c, [0, -1.4], [Math.sin(a) * 6.0, -1.4 + Math.cos(a) * 6.0], '#fff8d0', 0.14);
    c.beginPath(); c.moveTo(0, -1.6); c.quadraticCurveTo(0.3, -3.6, -0.6, -5.4); line(c, '#e8b020', 0.34);
    c.restore();
  } },

  // A pair of red mittens with white cuffs and a snowflake each, on a
  // string (parts 0 and 1: they wave).
  mitten: { layers: 2, draw(c, l) {
    const sx = l ? 1 : -1, x = sx * 5.4;
    c.beginPath(); c.moveTo(x - 3.4, -5.0); c.lineTo(x - 3.4, 2.6); c.bezierCurveTo(x - 3.4, 8.6, x + 3.4, 8.6, x + 3.4, 2.6); c.lineTo(x + 3.4, -5.0); c.closePath();
    fill(c, grad(c, x - 3.4, 0, x + 3.4, 0, ['#ff5a6a', '#e8243a', '#c8102e']));
    oval(c, x + sx * 4.2, 0.6, 1.5, 2.6, -sx * 0.5); fill(c, '#e8243a');
    c.beginPath(); c.roundRect(x - 4.0, -7.6, 8.0, 2.8, 1.0); fill(c, '#ffffff');
    for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; seg(c, [x - Math.cos(a) * 1.9, 2.0 - Math.sin(a) * 1.9], [x + Math.cos(a) * 1.9, 2.0 + Math.sin(a) * 1.9], '#ffffff', 0.3); }
    c.beginPath(); c.moveTo(x, -7.6); c.quadraticCurveTo(x - sx * 2.6, -10.4, x - sx * 5.4, -9.4); line(c, '#fff3c4', 0.22);
  } },

  // Tangerines in a basket: three with leaves, and one peeled on top that
  // hops (part 1).
  tangerine: { layers: 2, draw(c, l) {
    const fruit = (x, y, r) => { circle(c, x, y, r); fill(c, radial(c, x - r * 0.3, y + r * 0.3, 0.2, r, ['#ffd070', '#ff9a2a', '#f07a10'])); circle(c, x, y + r * 0.86, 0.3); fill(c, '#5fa04a'); oval(c, x + 1.0, y + r + 0.3, 1.2, 0.5, 0.4); fill(c, '#3fd27a'); };
    if (l === 1) { fruit(0.4, 5.6, 2.9); return; }
    fruit(-5.2, 0.6, 3.1); fruit(5.6, 0.4, 3.1); fruit(0.2, -0.4, 3.2);
    c.beginPath(); c.moveTo(-10.4, -1.6); c.quadraticCurveTo(-9.0, -9.2, -3.0, -9.4); c.lineTo(3.0, -9.4); c.quadraticCurveTo(9.0, -9.2, 10.4, -1.6); c.closePath(); fill(c, grad(c, 0, -1.6, 0, -9.4, ['#e8b878', '#b87a3a']));
    for (let k = 0; k < 6; k++) seg(c, [-9.2 + k * 3.6, -2.6], [-7.0 + k * 3.0, -9.0], '#f0d8a0', 0.2);
    c.beginPath(); c.roundRect(-11.0, -2.6, 22.0, 1.3, 0.6); fill(c, '#f0d8a0');
  } },

  // A picnic mat by the river: a checked mat seen from the side, a basket,
  // a drink and a sandwich; part 1: sparkles.
  mat: { layers: 2, dens: [1, 0.7], draw(c, l) {
    if (l === 1) { for (const [x, y, r] of [[-11.6, 6.6, 0.8], [11.0, 7.6, 0.7], [-8.6, 9.0, 0.5], [6.6, 9.2, 0.5], [12.4, 3.0, 0.55]]) sparkle(c, x, y, r, '#fff3c4'); return; }
    path(c, [[-13.4, -8.4], [13.4, -8.4], [9.6, -2.4], [-9.6, -2.4]]);
    fill(c, '#ff8cb8');
    c.save(); path(c, [[-13.4, -8.4], [13.4, -8.4], [9.6, -2.4], [-9.6, -2.4]]); c.clip();
    for (let k = -6; k <= 6; k += 2) { path(c, [[k * 2.2, -8.4], [k * 2.2 + 2.2, -8.4], [k * 1.6 + 1.6, -2.4], [k * 1.6, -2.4]]); fill(c, '#ffffff'); }
    for (const y of [-6.9, -3.9]) { c.beginPath(); c.rect(-14, y, 28, 0.5); fill(c, '#ff5ca8'); }
    c.restore();
    // the basket
    c.beginPath(); c.moveTo(-8.6, -1.4); c.lineTo(-7.6, -6.0); c.lineTo(-1.6, -6.0); c.lineTo(-0.6, -1.4); c.closePath(); fill(c, grad(c, 0, -1.4, 0, -6, ['#e8b878', '#b87a3a']));
    c.beginPath(); c.arc(-4.6, -1.4, 3.4, 0, Math.PI); line(c, '#b87a3a', 0.4);
    c.beginPath(); c.roundRect(-9.0, -2.0, 8.8, 1.1, 0.5); fill(c, '#f0d8a0');
    oval(c, -6.2, -0.6, 1.2, 0.9); fill(c, '#ff4a5a'); oval(c, -3.4, -0.4, 1.3, 1.0); fill(c, '#ffd23a');
    // a drink with a straw and a sandwich
    c.beginPath(); c.moveTo(3.0, -1.0); c.lineTo(3.6, -6.0); c.lineTo(6.2, -6.0); c.lineTo(6.8, -1.0); c.closePath(); fill(c, grad(c, 0, -1, 0, -6, ['#ffd0ec', '#ff8cc0']));
    c.beginPath(); c.rect(2.6, -1.2, 4.6, 0.6); fill(c, '#ffffff'); seg(c, [5.2, -1.0], [6.4, 2.4], '#7fd4ff', 0.3);
    path(c, [[8.4, -6.0], [12.6, -6.0], [10.5, -2.6]]); fill(c, '#fff3c4'); seg(c, [8.9, -5.0], [12.1, -5.0], '#5fe08f', 0.4); seg(c, [9.4, -4.2], [11.6, -4.2], '#ff5a5a', 0.4);
  } },

  // A bunch of balloons on their strings (parts 0 to 4: each sways).
  balloons: { layers: 5, draw(c, l) {
    const [x, y, col] = [[-7.2, 3.6, ['#ffd0ec', '#ff5ca8']], [-3.0, 6.4, ['#fff3b0', '#ffc93a']], [1.6, 4.0, ['#d0f0ff', '#46b4ff']], [5.6, 6.6, ['#d8ffe4', '#3fd27a']], [8.4, 2.4, ['#e2d4ff', '#9a6cff']]][l];
    c.beginPath(); c.moveTo(x, y - 3.2); c.quadraticCurveTo(x * 0.5, -3.0, 0.4, -9.6); line(c, '#fff3c4', 0.16);
    oval(c, x, y, 2.6, 3.1); fill(c, radial(c, x - 0.8, y + 1.0, 0.2, 3.2, ['#ffffff', col[0], col[1]]));
    path(c, [[x - 0.5, y - 3.5], [x + 0.5, y - 3.5], [x, y - 2.9]]); fill(c, col[1]);
  } },

  // A delivery scooter with its box (it rides across); part 1 and 2: the
  // wheels (they turn).
  scooter: { layers: 3, dens: [1, 1.2, 1.2], draw(c, l) {
    if (l) {
      const x = l === 1 ? -5.4 : 5.6;
      circle(c, x, -5.6, 2.3); fill(c, '#c8ccd8'); c.save(); c.globalCompositeOperation = 'destination-out'; circle(c, x, -5.6, 1.5); fill(c, '#000'); c.restore();
      for (let k = 0; k < 3; k++) { const a = (k * Math.PI) / 3; seg(c, [x - Math.cos(a) * 1.5, -5.6 - Math.sin(a) * 1.5], [x + Math.cos(a) * 1.5, -5.6 + Math.sin(a) * 1.5], '#e6ecf8', 0.2); }
      return;
    }
    // the body
    c.beginPath(); c.moveTo(-7.4, -4.6); c.lineTo(-7.4, -2.4); c.lineTo(-1.6, -2.4); c.lineTo(-0.4, -5.0); c.lineTo(3.2, -5.0); c.lineTo(5.2, 0.6); c.lineTo(6.6, 0.6); c.lineTo(6.2, -4.6); c.closePath(); fill(c, grad(c, -7, 0, 7, 0, ['#46b4ff', '#7fd4ff', '#46b4ff']));
    c.beginPath(); c.roundRect(-7.2, -2.4, 5.4, 1.0, 0.5); fill(c, '#3a2410');
    seg(c, [5.4, 0.6], [4.2, 2.6], '#c8ccd8', 0.4); seg(c, [3.4, 2.8], [5.2, 2.4], '#3a2410', 0.5);
    circle(c, 6.6, -0.6, 0.6); fill(c, '#fff3a0');
    // the box with a heart
    c.beginPath(); c.roundRect(-9.6, -1.4, 5.0, 4.8, 0.5); fill(c, '#ff5a6a'); heartPath(c, 0.07, -7.1, 0.9); fill(c, '#ffffff');
    // the rider
    path(c, [[-3.6, -1.4], [-0.6, -1.4], [1.6, 2.6], [-1.6, 3.6]]); fill(c, '#ffd23a');
    seg(c, [0.6, 2.2], [4.0, 2.4], '#ffd23a', 0.9); seg(c, [-1.6, -1.6], [1.4, -4.4], '#3f5ad8', 1.0);
    circle(c, -0.2, 5.2, 1.7); fill(c, '#ffd7b8'); c.beginPath(); c.arc(-0.2, 5.4, 1.9, 0, Math.PI); c.closePath(); fill(c, '#ff5a6a');
    c.beginPath(); c.rect(-0.2, 5.0, 2.2, 0.6); fill(c, '#bfe8ff');
  } },

  // A busker's guitar leaning, with notes floating up (part 1).
  guitar: { layers: 2, dens: [1, 0.9], draw(c, l) {
    if (l === 1) {
      for (const [x, y] of [[6.6, 5.6], [9.8, 1.6], [10.6, 7.6]]) { oval(c, x, y, 0.95, 0.7, -0.3); fill(c, '#ffd166'); seg(c, [x + 0.8, y], [x + 0.8, y + 3.2], '#ffd166', 0.26); seg(c, [x + 0.8, y + 3.2], [x + 2.2, y + 2.6], '#ffd166', 0.4); }
      return;
    }
    c.save(); c.rotate(-0.5);
    c.beginPath(); c.rect(-0.8, 0.6, 1.6, 9.0); fill(c, '#8a5a3a'); c.beginPath(); c.roundRect(-1.3, 9.2, 2.6, 2.6, 0.5); fill(c, '#b87a3a');
    for (const y of [9.8, 10.6, 11.2]) { circle(c, -1.6, y, 0.3); fill(c, '#fff3c4'); circle(c, 1.6, y, 0.3); fill(c, '#fff3c4'); }
    oval(c, 0, -5.6, 5.0, 4.4); fill(c, radial(c, 0, -5.6, 0.5, 5, ['#ffd070', '#f09a3a', '#c8702a']));
    oval(c, 0, -0.6, 3.6, 3.2); fill(c, radial(c, 0, -0.6, 0.5, 3.6, ['#ffd070', '#f09a3a', '#c8702a']));
    circle(c, 0, -2.6, 1.5); fill(c, '#5a3418');
    c.beginPath(); c.rect(-1.6, -7.4, 3.2, 0.7); fill(c, '#5a3418');
    for (const x of [-0.45, 0, 0.45]) seg(c, [x, -7.0], [x, 9.4], '#fff8e0', 0.1);
    c.restore();
  } },

  // A Han river cruise boat with lit windows and a flag; part 1: the
  // water.
  cruise: { layers: 2, dens: [1, 0.6], draw(c, l) {
    if (l === 1) { for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-13.4, -6.2 - k * 1.5); for (let x = -13.4; x <= 13.4; x += 2.4) c.quadraticCurveTo(x + 0.6, -5.6 - k * 1.5, x + 1.2, -6.2 - k * 1.5), c.quadraticCurveTo(x + 1.8, -6.8 - k * 1.5, x + 2.4, -6.2 - k * 1.5); line(c, k % 2 ? '#7fd4ff' : '#46b4ff', 0.26); } return; }
    c.beginPath(); c.moveTo(-11.6, -1.0); c.lineTo(11.8, -1.0); c.lineTo(9.0, -5.2); c.lineTo(-9.6, -5.2); c.closePath(); fill(c, grad(c, 0, -1, 0, -5.2, ['#ffffff', '#bfe0ff']));
    c.beginPath(); c.rect(-11.6, -1.9, 23.4, 0.7); fill(c, '#ff5a6a');
    c.beginPath(); c.roundRect(-8.0, -1.0, 14.6, 3.2, 0.6); fill(c, '#e6f0ff');
    for (let k = 0; k < 6; k++) { c.beginPath(); c.roundRect(-7.2 + k * 2.3, -0.2, 1.6, 1.7, 0.3); fill(c, '#ffd75a'); }
    c.beginPath(); c.roundRect(-4.6, 2.2, 7.6, 2.4, 0.6); fill(c, '#ffffff');
    for (let k = 0; k < 3; k++) { c.beginPath(); c.roundRect(-3.8 + k * 2.3, 2.7, 1.5, 1.3, 0.3); fill(c, '#ffd75a'); }
    c.beginPath(); c.rect(3.6, 2.2, 1.6, 3.6); fill(c, '#ff5a6a');
    seg(c, [-6.4, 2.2], [-6.4, 7.0], '#c8ccd8', 0.24); path(c, [[-6.4, 7.0], [-3.4, 6.2], [-6.4, 5.4]]); fill(c, '#46b4ff');
    for (let k = 0; k < 8; k++) { circle(c, -9.4 + k * 2.7, -3.0, 0.3); fill(c, '#46b4ff'); }
  } },

  // The rainbow fountain of a Han bridge: the deck and piers, and jets
  // arcing down in rainbow colours (part 1: they rise and fall).
  fountain: { layers: 2, dens: [0.8, 1.3], draw(c, l) {
    if (l === 1) {
      const cols = ['#ff5a5a', '#ffa040', '#ffe066', '#5fe08f', '#46b4ff', '#6a7cff', '#b48cff'];
      for (let k = 0; k < 14; k++) { const x = -12.4 + k * 1.9; c.beginPath(); c.moveTo(x, 3.2); c.quadraticCurveTo(x + (k % 2 ? 1.6 : -1.6), 2.6, x + (k % 2 ? 2.4 : -2.4), -3.4); line(c, cols[k % 7], 0.4); }
      return;
    }
    c.beginPath(); c.rect(-14, 3.2, 28, 1.6); fill(c, '#c8ccd8'); c.beginPath(); c.rect(-14, 4.8, 28, 0.5); fill(c, '#ffd166');
    for (const x of [-9.4, 0, 9.4]) { c.beginPath(); c.rect(x - 0.9, -6.6, 1.8, 9.8); fill(c, '#9aa4b8'); }
    for (let k = 0; k < 9; k++) { circle(c, -12.6 + k * 3.15, 6.2, 0.36); fill(c, '#fff3c4'); }
    for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(-14, -7.2 - k * 1.3); for (let x = -14; x <= 14; x += 2.8) c.quadraticCurveTo(x + 0.7, -6.7 - k * 1.3, x + 1.4, -7.2 - k * 1.3), c.quadraticCurveTo(x + 2.1, -7.7 - k * 1.3, x + 2.8, -7.2 - k * 1.3); line(c, '#46b4ff', 0.24); }
  } },

  // A tent at the Nanji camp site: an orange tent with its door open, a
  // string of lights, a tree; part 1: the campfire.
  tent: { layers: 2, dens: [1, 1.3], draw(c, l) {
    if (l === 1) {
      c.beginPath(); c.moveTo(8.4, -8.2); c.quadraticCurveTo(6.6, -5.2, 8.0, -3.6); c.quadraticCurveTo(8.2, -5.0, 9.2, -5.4); c.quadraticCurveTo(9.0, -3.4, 10.0, -2.2); c.quadraticCurveTo(12.4, -5.0, 11.0, -8.2); c.closePath(); fill(c, grad(c, 0, -8.2, 0, -2.2, ['#ffe066', '#ff9a2a', '#ff4a3a']));
      return;
    }
    path(c, [[-10.6, -8.6], [-2.6, 4.6], [5.4, -8.6]]); fill(c, grad(c, -10, 0, 5, 0, ['#ffb040', '#ff8a2a', '#f06a10']));
    path(c, [[-4.6, -8.6], [-2.6, -1.4], [-0.6, -8.6]]); fill(c, '#5a3418');
    path(c, [[-2.6, -1.4], [-0.6, -8.6], [1.2, -8.6]]); fill(c, '#ffd070');
    seg(c, [-2.6, 4.6], [-2.6, 5.8], '#c8ccd8', 0.3); path(c, [[-2.6, 5.8], [-0.4, 5.2], [-2.6, 4.6]]); fill(c, '#ff5a6a');
    seg(c, [-10.6, -8.6], [-12.6, -9.4], '#e8c27a', 0.2); seg(c, [5.4, -8.6], [6.6, -9.4], '#e8c27a', 0.2);
    c.beginPath(); c.moveTo(-2.6, 5.4); c.quadraticCurveTo(5, 3.0, 12.6, 7.4); line(c, '#fff3c4', 0.14);
    for (let k = 0; k < 6; k++) { const t = (k + 0.5) / 6, x = -2.6 + t * 15.2, y = 5.4 + (7.4 - 5.4) * t - 6.2 * t * (1 - t) * 0.72; circle(c, x, y - 0.4, 0.5); fill(c, ['#ff5ca8', '#ffd23a', '#7fd4ff'][k % 3]); }
    seg(c, [7.2, -8.6], [12.2, -8.2], '#a8743a', 0.5); seg(c, [7.4, -8.0], [12.0, -8.8], '#8a5a3a', 0.5);
    c.beginPath(); c.rect(-13.6, -9.4, 27.2, 0.5); fill(c, '#5fe08f');
    for (const [x, y, r] of [[-11.6, 6.6, 0.7], [-7.6, 8.6, 0.5], [9.6, 1.4, 0.5]]) sparkle(c, x, y, r, '#fff3c4');
  } },

  // Sunset over the Han: the far bank's skyline, the river; part 1: the
  // sun (it sinks), part 2: its path on the water.
  hansunset: { layers: 3, dens: [1, 1.2, 0.8], draw(c, l) {
    if (l === 2) { for (let k = 0; k < 6; k++) { const w = 1.6 + k * 0.9, y = -4.6 - k * 0.95; c.beginPath(); c.rect(-w, y, w * 2, 0.4); fill(c, k % 2 ? '#ffd166' : '#ff9a4a'); } return; }
    if (l === 1) { circle(c, 0, 4.4, 4.6); fill(c, radial(c, 0, 4.4, 0.5, 4.6, ['#fff3b0', '#ffb020', '#ff5a3a'])); return; }
    // clouds lit pink
    for (const [x, y, s] of [[-9.6, 7.0, 1.0], [8.6, 8.0, 0.9]]) for (const [dx, dy, r] of [[0, 0, 1.5], [1.7, 0.3, 1.2], [-1.7, 0.2, 1.1]]) { circle(c, x + dx * s, y + dy * s, r * s); fill(c, '#ff9ab8'); }
    // the skyline
    for (const [x, w, h] of [[-14, 2.2, 2.6], [-11.6, 1.8, 4.4], [-9.6, 2.4, 3.0], [-7.0, 1.6, 5.4], [-5.2, 2.4, 2.4], [4.0, 2.2, 3.0], [6.4, 1.6, 6.4], [8.2, 2.6, 3.6], [11.0, 1.8, 4.8], [12.9, 1.2, 2.4]]) { c.beginPath(); c.rect(x, -3.6, w, h); fill(c, '#7c6ad8'); }
    c.beginPath(); c.rect(-14, -4.0, 28, 0.5); fill(c, '#b48cff');
    for (let k = 0; k < 2; k++) for (const sx of [-1, 1]) { c.beginPath(); c.moveTo(sx * 5.4, -6.4 - k * 2.2); c.quadraticCurveTo(sx * 9, -5.8 - k * 2.2, sx * 13.4, -6.6 - k * 2.2); line(c, '#46b4ff', 0.24); }
  } },
});
