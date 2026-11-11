// The pictures of the drone light show (drone-sky.js), painted like the
// words: each one is drawn with fills and colours on a hidden canvas the
// size of the sky (28 m × 20 m), and the drones take spots on it, about a
// third along the outlines and colour edges (so the shapes read sharp) and
// the rest on an even grid inside (so they read full, like the letters).
// Each drone keeps the colour of its spot. Downloaded with drone-sky.js.
//
// A picture: { draw(c, layer), layers?, dens?, edge? }. draw paints one
// layer (0 … layers-1) in metres, u right and v up, (0, 0) in the middle;
// each layer is a part a step's move() can animate (p[2]). dens: how thickly
// each layer is filled with drones (default 1), edge: the share on outlines.

const TAU = Math.PI * 2;
export const PIC_W = 28, PIC_H = 20; // metres
const PX = 20, CW = PIC_W * PX, CH = PIC_H * PX; // canvas pixels
const S = 2; // read every 2nd pixel
const GW = CW / S, GH = CH / S;
const GLOW = 0.9;
const LIN = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

// ---- drawing helpers (metres) ------------------------------------------------
const path = (c, pts, close = true) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); if (close) c.closePath(); };
const fill = (c, col) => { c.fillStyle = col; c.fill(); };
const line = (c, col, w) => { c.strokeStyle = col; c.lineWidth = w; c.stroke(); };
const circle = (c, x, y, r) => { c.beginPath(); c.arc(x, y, r, 0, TAU); };
const oval = (c, x, y, rx, ry, rot = 0) => { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); };
const seg = (c, a, b, col, w) => { c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); line(c, col, w); };
const grad = (c, x0, y0, x1, y1, stops) => { const g = c.createLinearGradient(x0, y0, x1, y1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
const radial = (c, x, y, r0, r1, stops) => { const g = c.createRadialGradient(x, y, r0, x, y, r1); stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s)); return g; };
const heartPath = (c, s, cx, cy, steps = 72) => path(c, Array.from({ length: steps }, (_, i) => {
  const t = (i / steps) * TAU;
  return [cx + 16 * Math.sin(t) ** 3 * s, cy + (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s];
}));
const starPath = (c, x, y, r1, r0, k = 5, rot = Math.PI / 2) => path(c, Array.from({ length: k * 2 }, (_, i) => {
  const a = rot + (i * Math.PI) / k, r = i % 2 ? r0 : r1;
  return [x + Math.cos(a) * r, y + Math.sin(a) * r];
}));
const sparkle = (c, x, y, r, col) => { starPath(c, x, y, r, r * 0.28, 4); fill(c, col); };
// a person's head with hair (front view)
const head = (c, x, y, r, hair = '#c98a5a', skin = '#ffd7b8') => {
  circle(c, x, y, r); fill(c, skin);
  c.beginPath(); c.arc(x, y + r * 0.1, r * 1.04, 0.15 * Math.PI, 0.85 * Math.PI); c.closePath(); fill(c, hair);
};

// ---- the pictures ------------------------------------------------------------
export const PICTURES = {
  // A fan of the fan dance (부채춤): pink silk with a peony, gold ribs,
  // a feather fringe; part 1: the fringe (it shimmers).
  fan: { layers: 2, draw(c, l) {
    const cx = 0, cy = -8.6, R = 13.6, a0 = 0.22, a1 = Math.PI - 0.22;
    if (l === 1) {
      for (let k = 0; k <= 26; k++) {
        const a = a0 + ((a1 - a0) * k) / 26;
        circle(c, cx + Math.cos(a) * (R + 0.15), cy + Math.sin(a) * (R + 0.15), 0.85);
        fill(c, k % 2 ? '#ffe3f0' : '#ffffff');
      }
      return;
    }
    c.beginPath(); c.arc(cx, cy, R, a0, a1); c.arc(cx, cy, 2.6, a1, a0, true); c.closePath();
    fill(c, radial(c, cx, cy, 2.6, R, ['#ff6aa8', '#e8246a', '#c8104e']));
    for (let k = 1; k < 8; k++) { // ribs
      const a = a0 + ((a1 - a0) * k) / 8;
      seg(c, [cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6], [cx + Math.cos(a) * (R - 0.6), cy + Math.sin(a) * (R - 0.6)], '#ffe08a', 0.2);
    }
    // a big peony with two leaves
    oval(c, -5.0, -1.6, 3.4, 1.3, 0.45); fill(c, '#5fe08f');
    oval(c, 5.2, -1.8, 3.4, 1.3, -0.45); fill(c, '#5fe08f');
    for (let k = 0; k < 6; k++) { const a = (k / 6) * TAU + 0.3; circle(c, Math.cos(a) * 2.8, 1.4 + Math.sin(a) * 2.8, 2.2); fill(c, '#fff0f6'); }
    circle(c, 0, 1.4, 2.0); fill(c, '#ff4f96'); circle(c, 0, 1.4, 0.8); fill(c, '#ffd166');
    // the gathered ribs and the pivot
    c.beginPath(); c.moveTo(cx - 2.4, cy + 1); c.lineTo(cx, cy - 1); c.lineTo(cx + 2.4, cy + 1); c.arc(cx, cy, 2.6, a0, a1, false); c.closePath();
    fill(c, '#e6b06a');
    circle(c, cx, cy, 0.55); fill(c, '#fff3c4');
  } },

  // N Seoul Tower on Namsan: the mountain (dimmer, fewer drones), the white
  // shaft, the round observation deck with lit windows, the red-and-white mast.
  tower: { layers: 2, dens: [0.45, 1.9], draw(c, l) {
    if (l === 0) {
      c.beginPath(); c.moveTo(-14, -10); c.lineTo(-14, -7.2);
      c.bezierCurveTo(-9, -6.4, -6, -3.6, -2.4, -3.3); c.lineTo(2.4, -3.3);
      c.bezierCurveTo(6, -3.6, 9, -6.4, 14, -7.4); c.lineTo(14, -10); c.closePath();
      fill(c, grad(c, 0, -3.3, 0, -10, ['#4fe08a', '#2fae68', '#1e7f4e']));
      for (const [x, y, r] of [[-9, -6, 0.9], [-6.5, -4.7, 1], [-4, -3.8, 0.8], [4.2, -3.9, 0.9], [7, -5, 1], [10, -6.3, 0.9]]) { circle(c, x, y, r); fill(c, '#5ff09a'); }
      return;
    }
    path(c, [[-2.6, -3.4], [-2.2, -2.2], [2.2, -2.2], [2.6, -3.4]]); fill(c, '#d8e6f5'); // the base hall
    path(c, [[-0.9, -2.2], [-0.55, 2.8], [0.55, 2.8], [0.9, -2.2]]); fill(c, grad(c, -0.9, 0, 0.9, 0, ['#c9dcf0', '#ffffff', '#c9dcf0']));
    path(c, [[-0.55, 2.6], [-2.6, 3.7], [2.6, 3.7], [0.55, 2.6]]); fill(c, '#e8f0fa'); // the flare under the deck
    path(c, [[-2.9, 3.7], [-3.0, 5.5], [3.0, 5.5], [2.9, 3.7]]); fill(c, '#f4f8ff'); // the deck
    path(c, [[-2.95, 4.2], [-3.0, 5.0], [3.0, 5.0], [2.95, 4.2]]); fill(c, '#6fd0ff'); // the window band
    for (let x = -2.5; x <= 2.6; x += 0.62) { circle(c, x, 4.6, 0.17); fill(c, '#ffe28a'); }
    path(c, [[-3.0, 5.5], [-2.1, 6.3], [2.1, 6.3], [3.0, 5.5]]); fill(c, '#e2ecf8'); // the cap
    path(c, [[-0.7, 6.3], [-0.55, 7.4], [0.55, 7.4], [0.7, 6.3]]); fill(c, '#ffffff');
    for (let k = 0; k < 5; k++) { const y0 = 7.4 + k * 0.42; path(c, [[-0.32, y0], [-0.28, y0 + 0.42], [0.28, y0 + 0.42], [0.32, y0]]); fill(c, k % 2 ? '#ffffff' : '#ff4a4a'); }
    seg(c, [0, 9.5], [0, 9.9], '#ffffff', 0.12);
    circle(c, 0, 9.95, 0.22); fill(c, '#ff5a5a');
    for (const [x, y] of [[-4.2, 4.6], [4.2, 4.6], [0, 8.8]]) sparkle(c, x, y, 0.5, '#bfe8ff');
  } },

  // Geunjeongjeon of Gyeongbokgung: two-tier stone terrace and steps, red
  // pillars and lattice doors, painted dancheong bands under both roofs,
  // the two curved tiled roofs with upturned eaves and the white ridge.
  palace: { layers: 1, draw(c) {
    const dan = (x0, x1, y0, y1) => {
      path(c, [[x0, y0], [x0, y1], [x1, y1], [x1, y0]]); fill(c, '#33d39b');
      for (let x = x0 + 0.6; x < x1 - 0.3; x += 1.2) { circle(c, x, (y0 + y1) / 2, (y1 - y0) * 0.28); fill(c, ((x - x0) / 1.2 | 0) % 2 ? '#ff5a5a' : '#ffd166'); }
    };
    const roof = (w0, w1, yEave, yTop, lift, col) => { // eaves at ±w0, top at ±w1
      c.beginPath(); c.moveTo(-w0 - 0.4, yEave + lift);
      c.quadraticCurveTo(-w0 + 2.4, yEave - 0.25, -w0 + 4, yEave); c.lineTo(w0 - 4, yEave);
      c.quadraticCurveTo(w0 - 2.4, yEave - 0.25, w0 + 0.4, yEave + lift);
      c.quadraticCurveTo(w1 + 1.6, yTop - 0.6, w1, yTop); c.lineTo(-w1, yTop);
      c.quadraticCurveTo(-w1 - 1.6, yTop - 0.6, -w0 - 0.4, yEave + lift); c.closePath();
      fill(c, grad(c, 0, yTop, 0, yEave, col));
      c.save(); c.clip();
      for (let x = -w0; x <= w0; x += 0.55) seg(c, [x * (w1 / w0), yTop], [x, yEave], 'rgba(220,235,255,0.55)', 0.09);
      c.restore();
      c.beginPath(); c.moveTo(-w0 - 0.4, yEave + lift); c.quadraticCurveTo(-w0 + 2.4, yEave - 0.25, -w0 + 4, yEave); c.lineTo(w0 - 4, yEave); c.quadraticCurveTo(w0 - 2.4, yEave - 0.25, w0 + 0.4, yEave + lift);
      line(c, '#f4f8ff', 0.26);
    };
    // terraces, railings and steps
    path(c, [[-13.6, -9.8], [-13.6, -8.4], [13.6, -8.4], [13.6, -9.8]]); fill(c, '#d9cfb6');
    path(c, [[-11.6, -8.4], [-11.6, -7.0], [11.6, -7.0], [11.6, -8.4]]); fill(c, '#ebe2cc');
    for (const [w, y] of [[13.6, -8.4], [11.6, -7.0]]) { seg(c, [-w, y + 0.35], [w, y + 0.35], '#fff6e0', 0.1); for (let x = -w; x <= w + 0.01; x += 1.36) seg(c, [x, y], [x, y + 0.5], '#fff6e0', 0.12); }
    for (let k = 0; k < 6; k++) seg(c, [-1.6, -9.6 + k * 0.48], [1.6, -9.6 + k * 0.48], '#fffaf0', 0.16);
    // the hall
    path(c, [[-10.2, -7.0], [-10.2, -1.3], [10.2, -1.3], [10.2, -7.0]]); fill(c, '#a8402c');
    for (const x of [-6.6, -3.3, 0, 3.3, 6.6]) { // lattice doors
      path(c, [[x - 1.3, -6.7], [x - 1.3, -2.1], [x + 1.3, -2.1], [x + 1.3, -6.7]]); fill(c, '#ffc86a');
      for (let y = -6.4; y < -2.2; y += 0.55) seg(c, [x - 1.3, y], [x + 1.3, y], '#c9662e', 0.07);
      for (let xx = x - 1.0; xx < x + 1.3; xx += 0.65) seg(c, [xx, -6.7], [xx, -2.1], '#c9662e', 0.07);
    }
    for (const x of [-9.9, -8.25, -4.95, -1.65, 1.65, 4.95, 8.25, 9.9]) { path(c, [[x - 0.32, -7.0], [x - 0.32, -1.3], [x + 0.32, -1.3], [x + 0.32, -7.0]]); fill(c, '#ff4a3a'); }
    dan(-10.8, 10.8, -1.3, -0.2);
    roof(13.2, 8.6, -0.2, 2.5, 1.3, ['#9db4da', '#7d97c6']);
    // upper storey
    path(c, [[-8, 2.5], [-8, 3.2], [8, 3.2], [8, 2.5]]); fill(c, '#ff4a3a');
    dan(-8.6, 8.6, 3.2, 4.0);
    roof(10.8, 4.6, 4.0, 7.2, 1.2, ['#a9bfe2', '#86a0cc']);
    path(c, [[-4.4, 7.2], [0, 8.6], [4.4, 7.2]]); fill(c, '#b9cbea'); // the gable
    path(c, [[-1.8, 7.5], [0, 8.2], [1.8, 7.5]]); fill(c, '#ffd166');
    c.beginPath(); c.moveTo(-5.8, 9.2); c.quadraticCurveTo(-5.2, 8.5, -4.4, 8.6); c.lineTo(4.4, 8.6); c.quadraticCurveTo(5.2, 8.5, 5.8, 9.2); line(c, '#ffffff', 0.4);
  } },

  // Someone waving hello (part 1: the waving arm)
  waver: { layers: 2, draw(c, l) {
    if (l === 1) {
      seg(c, [1.6, 2.4], [3.6, 3.4], '#5ef2c0', 1.1);
      seg(c, [3.6, 3.4], [4.6, 7.0], '#ffd7b8', 0.85);
      circle(c, 4.8, 7.6, 0.75); fill(c, '#ffd7b8');
      return;
    }
    head(c, 0, 5.4, 2.1);
    circle(c, -0.7, 5.5, 0.22); fill(c, '#7a4a2a'); circle(c, 0.7, 5.5, 0.22); fill(c, '#7a4a2a');
    c.beginPath(); c.arc(0, 4.9, 0.8, Math.PI * 1.15, Math.PI * 1.85, false); line(c, '#ff6a6a', 0.18);
    path(c, [[-2.2, 3.0], [-2.6, -3.2], [2.6, -3.2], [2.2, 3.0]]); fill(c, grad(c, 0, 3, 0, -3.2, ['#7cf2c4', '#3fd6a0']));
    seg(c, [-1.6, 2.4], [-3.6, -2.2], '#5ef2c0', 1.1); circle(c, -3.8, -2.7, 0.7); fill(c, '#ffd7b8');
    path(c, [[-2.4, -3.2], [-2.6, -9.0], [-0.6, -9.0], [0, -4.4], [0.6, -9.0], [2.6, -9.0], [2.4, -3.2]]); fill(c, '#5a8cff');
    oval(c, -1.7, -9.3, 1.3, 0.5); fill(c, '#ffffff'); oval(c, 1.7, -9.3, 1.3, 0.5); fill(c, '#ffffff');
  } },

  // A woman in hanbok: yellow jeogori with a red ribbon, striped saekdong
  // sleeves, a wide pink skirt, hair in a bun with a gold pin.
  hanbok: { layers: 1, draw(c) {
    c.beginPath(); c.moveTo(-2.2, 1.6); c.bezierCurveTo(-4.5, -3, -8.5, -6, -8.6, -9.6); c.lineTo(8.6, -9.6); c.bezierCurveTo(8.5, -6, 4.5, -3, 2.2, 1.6); c.closePath();
    fill(c, grad(c, -8, 0, 8, 0, ['#ff3f86', '#ff7ab0', '#ff3f86']));
    for (const x of [-4, 0, 4]) { c.beginPath(); c.moveTo(x * 0.25, 1); c.quadraticCurveTo(x * 0.9, -4, x * 1.6, -9.4); line(c, '#ffb0d0', 0.14); }
    path(c, [[-7.6, -9.6], [-7.8, -8.6], [7.8, -8.6], [7.6, -9.6]]); fill(c, '#ffd166');
    // the jacket and the sleeves (rainbow stripes)
    path(c, [[-2.6, 4.4], [-2.8, 1.2], [2.8, 1.2], [2.6, 4.4]]); fill(c, '#ffe066');
    const sleeve = (sx) => {
      for (let k = 0; k < 6; k++) {
        path(c, [[sx * (2.2 + k * 0.62), 4.2 - k * 0.55], [sx * (2.2 + k * 0.62), 2.0 - k * 0.55], [sx * (2.2 + (k + 1) * 0.62), 2.0 - (k + 1) * 0.55], [sx * (2.2 + (k + 1) * 0.62), 4.2 - (k + 1) * 0.55]]);
        fill(c, ['#ff5a5a', '#ffd166', '#5fe08f', '#5ab4ff', '#b48cff', '#ffffff'][k]);
      }
      circle(c, sx * 6.3, 0.2, 0.75); fill(c, '#ffd7b8');
    };
    sleeve(-1); sleeve(1);
    path(c, [[-0.9, 4.4], [0, 2.6], [0.9, 4.4]]); fill(c, '#ffffff'); // the collar
    path(c, [[0.2, 2.6], [1.6, 0.0], [2.2, 0.2], [0.8, 2.6]]); fill(c, '#ff4a4a'); // the goreum ribbon
    path(c, [[0.4, 2.6], [-0.6, -0.4], [0.0, -0.6], [0.9, 2.4]]); fill(c, '#ff4a4a');
    circle(c, 0, 2.6, 0.45); fill(c, '#ff4a4a');
    head(c, 0, 6.6, 2.0, '#b8743f');
    circle(c, 0, 8.9, 1.1); fill(c, '#b8743f'); // the bun
    seg(c, [-2, 8.9], [2, 8.9], '#ffd166', 0.3); circle(c, 2.1, 8.9, 0.35); fill(c, '#ff5a5a');
    circle(c, -0.7, 6.5, 0.2); fill(c, '#7a4a2a'); circle(c, 0.7, 6.5, 0.2); fill(c, '#7a4a2a');
    circle(c, -1.2, 5.9, 0.35); fill(c, '#ffa0a0'); circle(c, 1.2, 5.9, 0.35); fill(c, '#ffa0a0');
    c.beginPath(); c.arc(0, 6.0, 0.6, Math.PI * 1.2, Math.PI * 1.8); line(c, '#ff5a6a', 0.16);
  } },

  // The janggu hourglass drum, its ropes, and the stick (part 1: it beats)
  janggu: { layers: 2, draw(c, l) {
    if (l === 1) {
      seg(c, [4.6, 1.2], [10.6, 7.4], '#ffe08a', 0.42); circle(c, 4.5, 1.1, 0.5); fill(c, '#fff3c4');
      return;
    }
    const body = (sx) => { path(c, [[sx * 7.4, 4.2], [sx * 1.2, 1.2], [sx * 1.2, -1.2], [sx * 7.4, -4.2]]); fill(c, grad(c, 0, 4, 0, -4, ['#ff6a5a', '#d92e3a'])); };
    body(-1); body(1);
    for (const x of [-4.6, 4.6]) { const h = 1.2 + ((Math.abs(x) - 1.2) / 6.2) * 3; seg(c, [x, -h], [x, h], '#ffd166', 0.32); }
    for (const x of [-8.6, 8.6]) { oval(c, x * 0.88, 0, 1.4, 4.9); fill(c, '#ff4a4a'); oval(c, x, 0, 1.6, 5.2); fill(c, '#fff1d8'); oval(c, x, 0, 1.0, 3.6); fill(c, '#ffe2b0'); }
    for (let k = 0; k < 9; k++) { // the ropes, zigzag between the heads
      const y = -4.6 + k * 1.15;
      seg(c, [-7.6, y], [7.6, y + (k % 2 ? -0.6 : 0.6)], '#ffb3b3', 0.12);
    }
    for (let k = 0; k < 9; k++) { const y = -4.6 + k * 1.15; circle(c, 7.7, y, 0.22); fill(c, '#5ab4ff'); }
    seg(c, [-11.6, -6.2], [-7.0, -1.2], '#e8c27a', 0.5); // the other stick (a mallet)
    circle(c, -7.0, -1.2, 0.8); fill(c, '#fff3c4');
  } },

  // The Hahoe mask (yangban): smiling crescent eyes, round cheeks, the
  // loose jaw with its big smile.
  mask: { layers: 1, draw(c) {
    c.beginPath(); c.moveTo(0, 9.4); c.bezierCurveTo(7.2, 9.4, 8.2, 3, 7.4, -0.6); c.lineTo(-7.4, -0.6); c.bezierCurveTo(-8.2, 3, -7.2, 9.4, 0, 9.4); c.closePath();
    fill(c, radial(c, 0, 4, 1, 9, ['#ffe9c4', '#ffcf90', '#e8a868']));
    for (const sx of [-1, 1]) {
      c.beginPath(); c.moveTo(sx * 1.0, 5.6); c.quadraticCurveTo(sx * 3.4, 8.2, sx * 5.8, 5.8); line(c, '#ff4a2a', 0.9); // brow
      c.beginPath(); c.moveTo(sx * 1.2, 3.4); c.quadraticCurveTo(sx * 3.3, 6.0, sx * 5.4, 3.5); c.quadraticCurveTo(sx * 3.3, 4.4, sx * 1.2, 3.4); fill(c, '#ff4a2a'); // eye
      circle(c, sx * 4.9, 1.4, 1.4); fill(c, '#ff8cc0'); // cheek
      for (let k = 0; k < 2; k++) { c.beginPath(); c.arc(sx * 6.4, 3.0 - k * 1.0, 1.0, sx > 0 ? 2.3 : -0.8, sx > 0 ? 3.9 : 0.8); line(c, '#ffffff', 0.25); } // wrinkles
    }
    for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(0, 8.8 - k * 0.7, 2.6 - k * 0.3, Math.PI * 1.15, Math.PI * 1.85); line(c, '#ffffff', 0.22); }
    path(c, [[0, 4.4], [-1.4, 0.7], [0, 0.2], [1.4, 0.7]]); fill(c, '#fff0d0'); // nose
    c.beginPath(); c.moveTo(-6.0, -0.2); c.quadraticCurveTo(0, -3.8, 6.0, -0.2); c.quadraticCurveTo(0, -1.6, -6.0, -0.2); fill(c, '#ff4a2a'); // the smile
    c.beginPath(); c.moveTo(-6.2, -1.2); c.quadraticCurveTo(-6, -7.4, 0, -8.2); c.quadraticCurveTo(6, -7.4, 6.2, -1.2); c.quadraticCurveTo(0, -4.2, -6.2, -1.2); // the jaw
    fill(c, grad(c, 0, -1.2, 0, -8.2, ['#ffd9a0', '#e8a868']));
    for (const sx of [-1, 1]) { circle(c, sx * 6.6, -1.0, 0.45); fill(c, '#ffffff'); }
  } },

  // A taekwondo kick in a white dobok and black belt (part 1: the kicking leg)
  taekwondo: { layers: 2, draw(c, l) {
    if (l === 1) {
      seg(c, [0.6, -1.4], [5.6, 1.4], '#ffffff', 2.0);
      seg(c, [5.6, 1.4], [10.4, 3.4], '#ffffff', 1.7);
      oval(c, 11.3, 3.8, 1.2, 0.6, 0.4); fill(c, '#ffd7b8');
      for (const k of [0, 1, 2]) { c.beginPath(); c.arc(9, 2, 3.2 + k * 0.9, 1.6, 2.4); line(c, '#7fd4ff', 0.18); }
      return;
    }
    head(c, -3.2, 6.6, 1.7, '#8a5a3a');
    path(c, [[-4.6, 4.8], [-2.0, 5.0], [1.0, -0.6], [-1.6, -1.6]]); fill(c, '#ffffff'); // body
    path(c, [[-3.0, 4.9], [-2.4, 3.2], [-1.8, 4.9]]); fill(c, '#d8e6f5'); // collar
    seg(c, [-2.6, 4.4], [-6.6, 6.6], '#ffffff', 1.3); circle(c, -7.0, 6.9, 0.65); fill(c, '#ffd7b8');
    seg(c, [-2.2, 4.0], [1.2, 3.6], '#ffffff', 1.3); circle(c, 1.7, 3.6, 0.65); fill(c, '#ffd7b8');
    path(c, [[-2.0, -0.4], [1.2, 0.6], [1.5, -0.2], [-1.7, -1.2]]); fill(c, '#3a3a4a'); // belt
    seg(c, [-0.2, -0.6], [-1.0, -2.6], '#3a3a4a', 0.35); seg(c, [0.2, -0.4], [0.6, -2.4], '#3a3a4a', 0.35);
    seg(c, [-0.4, -1.4], [-2.2, -6.4], '#ffffff', 2.0); seg(c, [-2.2, -6.4], [-2.6, -9.2], '#ffffff', 1.7);
    oval(c, -2.0, -9.5, 1.3, 0.5); fill(c, '#ffd7b8');
  } },

  // Modu Tower (the game's tall tower) over the night skyline with lit
  // windows (part 0, fewer drones)
  anothertower: { layers: 2, dens: [0.5, 1.6], draw(c, l) {
    if (l === 0) {
      for (const [x, w, h, col] of [[-13, 3.4, 4.6, '#6c84b8'], [-9.4, 3, 6.4, '#7d97c6'], [-6.3, 2.6, 3.8, '#6c84b8'], [5.6, 2.8, 4.4, '#7d97c6'], [8.6, 3.2, 6.8, '#6c84b8'], [12, 2.8, 3.6, '#7d97c6']]) {
        path(c, [[x - w / 2, -10], [x - w / 2, -10 + h], [x + w / 2, -10 + h], [x + w / 2, -10]]); fill(c, col);
        for (let y = -9.4; y < -10 + h - 0.4; y += 0.9) for (let xx = x - w / 2 + 0.5; xx < x + w / 2 - 0.3; xx += 0.8) { path(c, [[xx, y], [xx, y + 0.4], [xx + 0.35, y + 0.4], [xx + 0.35, y]]); fill(c, (xx * 7 + y * 3) % 3 > 1 ? '#ffe28a' : '#9fb8e0'); }
      }
      return;
    }
    const w = (y) => 2.6 * (1 - ((y + 10) / 19.6) ** 1.6) + 0.5; // half width at height y
    const pts = [];
    for (let y = -10; y <= 9.6; y += 0.4) pts.push([-w(y), y]);
    for (let y = 9.6; y >= -10; y -= 0.4) pts.push([w(y), y]);
    path(c, pts); fill(c, grad(c, -3, 0, 3, 0, ['#7fbfff', '#e6f4ff', '#9fd0ff']));
    seg(c, [0, -10], [0, 7.4], 'rgba(255,255,255,0.9)', 0.12); // the seam
    for (let y = -9; y < 8; y += 1.1) seg(c, [-w(y), y], [w(y), y], '#ffe28a', 0.1);
    path(c, [[-0.5, 7.6], [-0.18, 9.8], [0.18, 9.8], [0.5, 7.6]]); fill(c, '#ffffff'); // the crown
    seg(c, [-0.9, 8.0], [-0.4, 9.4], '#bfe8ff', 0.15); seg(c, [0.9, 8.0], [0.4, 9.4], '#bfe8ff', 0.15);
    circle(c, 0, 9.85, 0.2); fill(c, '#ff5a5a');
  } },

  // Mugunghwa, the national flower: five pink petals, the deep red heart
  // (dansim) with its rays, the stamen
  mugunghwa: { layers: 1, draw(c) {
    oval(c, -8.4, -6.4, 4, 1.6, 0.6); fill(c, '#3fd27a'); oval(c, 8.6, -6.0, 4, 1.6, -0.6); fill(c, '#3fd27a');
    seg(c, [-11, -8.4], [-6, -4.6], '#9ff0b8', 0.12); seg(c, [11, -8.0], [6, -4.4], '#9ff0b8', 0.12);
    for (let k = 0; k < 5; k++) {
      const a = Math.PI / 2 + (k * TAU) / 5, x = Math.cos(a) * 4.6, y = Math.sin(a) * 4.6;
      oval(c, x, y, 4.6, 3.7, a); fill(c, radial(c, x * 0.3, y * 0.3, 0.5, 7, ['#ff9fd6', '#ffc0e4', '#ffe0f0']));
      c.beginPath(); c.moveTo(x * 0.25, y * 0.25); c.lineTo(x * 1.6, y * 1.6); line(c, 'rgba(255,120,190,0.8)', 0.12);
    }
    circle(c, 0, 0, 2.6); fill(c, '#e8206a');
    for (let k = 0; k < 15; k++) { const a = (k / 15) * TAU; seg(c, [0, 0], [Math.cos(a) * 3.8, Math.sin(a) * 3.8], '#e8206a', 0.2); }
    seg(c, [0, 0], [1.4, 3.2], '#ffffff', 0.5); circle(c, 1.5, 3.4, 0.6); fill(c, '#ffe066');
  } },

  // A Line 2 train on the elevated track (part 1: the train, it rolls in)
  subway: { layers: 2, dens: [0.5, 1.5], draw(c, l) {
    if (l === 0) {
      path(c, [[-14, -3.6], [-14, -2.6], [14, -2.6], [14, -3.6]]); fill(c, '#a9b6cc');
      for (const x of [-10, -2, 6, 13]) { path(c, [[x - 0.8, -10], [x - 0.8, -3.6], [x + 0.8, -3.6], [x + 0.8, -10]]); fill(c, '#8796b0'); path(c, [[x - 1.6, -4.4], [x - 1.6, -3.6], [x + 1.6, -3.6], [x + 1.6, -4.4]]); fill(c, '#8796b0'); }
      seg(c, [-14, -2.45], [14, -2.45], '#e8eef5', 0.12);
      for (let x = -13; x < 14; x += 2.2) { circle(c, x, -3.1, 0.14); fill(c, '#ffe28a'); }
      return;
    }
    const car = (x0, x1, nose) => {
      c.beginPath(); c.moveTo(x0, -2.2); c.lineTo(x0, 2.6);
      if (nose) { c.lineTo(x1 - 1.6, 2.6); c.quadraticCurveTo(x1 + 0.2, 2.4, x1, -0.4); c.lineTo(x1, -2.2); } else { c.lineTo(x1, 2.6); c.lineTo(x1, -2.2); }
      c.closePath(); fill(c, grad(c, 0, 2.6, 0, -2.2, ['#ffffff', '#d8e2ee']));
      path(c, [[x0, -1.0], [x0, -0.4], [x1, -0.4], [x1, -1.0]]); fill(c, '#3ad16b');
      for (let x = x0 + 0.8; x < x1 - 1.4; x += 2.6) { path(c, [[x, 0.2], [x, 1.9], [x + 1.6, 1.9], [x + 1.6, 0.2]]); fill(c, '#8fdcff'); }
      if (nose) { path(c, [[x1 - 1.4, 0.2], [x1 - 1.4, 1.9], [x1 - 0.2, 1.6], [x1 - 0.05, 0.2]]); fill(c, '#5ab4ff'); circle(c, x1 - 0.5, -1.5, 0.3); fill(c, '#ffe28a'); }
      for (const x of [x0 + 1.4, x0 + 2.8, x1 - 2.8, x1 - 1.4]) { circle(c, x, -2.3, 0.5); fill(c, '#7d8aa0'); }
    };
    car(-12.6, -0.4, false); car(0.2, 12.2, true);
  } },

  // A Ttareungi rental bike with its basket (parts 1 and 2: the wheels spin)
  bike: { layers: 3, draw(c, l) {
    const wheel = (x) => {
      circle(c, x, -4, 4.2); line(c, '#e8eef5', 0.5);
      circle(c, x, -4, 3.6); line(c, '#7d8aa0', 0.2);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; seg(c, [x, -4], [x + Math.cos(a) * 3.6, -4 + Math.sin(a) * 3.6], '#cfe0f5', 0.12); }
      circle(c, x, -4, 0.45); fill(c, '#ffffff');
    };
    if (l === 1) return wheel(-7.6);
    if (l === 2) return wheel(7.6);
    const G = '#3fdc74';
    seg(c, [-7.6, -4], [-1.2, -4], G, 0.6); seg(c, [-1.2, -4], [-2.8, 2.8], G, 0.6);
    seg(c, [-2.8, 2.8], [-7.6, -4], G, 0.55); seg(c, [-1.2, -4], [4.6, 2.4], G, 0.7);
    seg(c, [4.6, 2.4], [7.6, -4], G, 0.6); seg(c, [4.6, 2.4], [5.2, 4.4], G, 0.55);
    seg(c, [5.2, 4.4], [3.6, 5.0], '#ffffff', 0.45); seg(c, [5.2, 4.4], [6.0, 4.8], '#ffffff', 0.45);
    oval(c, -3.0, 3.4, 1.6, 0.45); fill(c, '#5a6a80'); seg(c, [-2.8, 2.8], [-3, 3.2], G, 0.4);
    path(c, [[5.8, 2.6], [6.0, 5.4], [10.2, 5.4], [9.8, 2.6]]); fill(c, '#ffffff'); // the basket
    for (let x = 6.6; x < 9.8; x += 0.8) seg(c, [x, 2.7], [x, 5.3], '#bfe8ff', 0.1);
    seg(c, [5.9, 4.0], [10, 4.0], '#bfe8ff', 0.1);
    circle(c, -1.2, -4, 0.8); fill(c, '#d8e6f5'); // the pedals
    seg(c, [-1.2, -4], [0.2, -5.6], '#d8e6f5', 0.3);
    circle(c, 10.0, 1.6, 0.35); fill(c, '#ffe28a'); // the lamp
  } },

  // A Han River bridge at night: lit arches over the piers, the deck's
  // lamps, the reflection in the water (part 1: it shimmers)
  bridge: { layers: 2, dens: [1.3, 0.3], draw(c, l) {
    if (l === 1) {
      for (let k = 0; k < 4; k++) {
        const y = -5.8 - k * 1.0;
        for (let x = -13.4 + (k % 2) * 0.6; x < 13.6; x += 1.4) seg(c, [x, y], [x + 0.6, y], ['#ffd166', '#7fd4ff', '#ff8cc0'][(Math.floor(x / 4.2) + 9) % 3], 0.16);
      }
      return;
    }
    path(c, [[-14, -4.4], [-14, -3.4], [14, -3.4], [14, -4.4]]); fill(c, '#d8e2ee');
    for (const x0 of [-14, -4.67, 4.67]) {
      const x1 = x0 + 9.33, mx = (x0 + x1) / 2;
      c.beginPath(); c.moveTo(x0, -3.4); c.quadraticCurveTo(mx, 6.6, x1, -3.4); line(c, '#7fd4ff', 0.55);
      for (let k = 1; k < 8; k++) { const x = x0 + (k * 9.33) / 8, f = (x - x0) / 9.33, y = -3.4 + 10 * 2 * f * (1 - f) * 1.0 - 0.0; seg(c, [x, -3.4], [x, -3.4 + (y + 3.4) * 0.98], '#bfe8ff', 0.12); }
      path(c, [[x0 - 0.5, -5.0], [x0 - 0.5, -4.4], [x0 + 0.5, -4.4], [x0 + 0.5, -5.0]]); fill(c, '#a9b6cc');
    }
    for (let x = -13.4; x < 14; x += 1.1) { circle(c, x, -3.0, 0.2); fill(c, '#ffe28a'); }
    for (const x of [-10, -2, 7]) { path(c, [[x, -2.6], [x, -1.6], [x + 1.6, -1.6], [x + 1.6, -2.6]]); fill(c, x < 0 ? '#ff6a6a' : '#ffffff'); } // cars
  } },

  // Chimaek: fried chicken in its box and a mug of beer
  chimaek: { layers: 1, draw(c) {
    path(c, [[-13, -1.2], [-12.0, -9.0], [0.6, -9.0], [1.6, -1.2]]); fill(c, '#ffffff');
    for (let k = 0; k < 7; k++) { const x = -12.6 + k * 2.0; path(c, [[x, -1.2], [x + 0.13, -9.0], [x + 1.0, -9.0], [x + 0.9, -1.2]]); fill(c, '#ff4a4a'); }
    const piece = (x, y, r) => { // a crispy piece: a bumpy blob
      c.beginPath();
      for (let k = 0; k <= 20; k++) { const a = (k / 20) * TAU, rr = r * (1 + 0.12 * Math.sin(k * 2.3)); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr * 0.8); }
      fill(c, radial(c, x - r * 0.3, y + r * 0.3, 0.2, r * 1.2, ['#ffd27a', '#f2a03a', '#d07a20']));
    };
    piece(-10, 0.4, 2.4); piece(-5.4, 1.2, 2.6); piece(-1.4, 0.2, 2.2);
    for (const [x, y, a] of [[-8, 3.6, 0.6], [-3, 4.0, -0.4]]) { // drumsticks
      oval(c, x, y, 2.4, 1.4, a); fill(c, '#f2a03a');
      const bx = x + Math.cos(a + Math.PI) * 3.0, by = y + Math.sin(a + Math.PI) * 3.0;
      seg(c, [x, y], [bx, by], '#fff6e0', 0.5); circle(c, bx, by, 0.5); fill(c, '#fff6e0');
    }
    // the beer
    c.beginPath(); c.arc(10.4, 0, 2.4, -Math.PI / 2, Math.PI / 2); line(c, '#e6f4ff', 0.6); // handle
    path(c, [[3.6, 4.4], [4.0, -8.6], [10.0, -8.6], [10.4, 4.4]]); fill(c, grad(c, 0, 4, 0, -8.6, ['#ffd84a', '#ffb020']));
    for (const [x, y, r] of [[5.6, -6, 0.3], [8, -3.6, 0.25], [6.6, -1, 0.3], [8.6, 1.4, 0.22], [5.2, 1.8, 0.2]]) { circle(c, x, y, r); fill(c, '#fff3c4'); }
    for (const [x, y, r] of [[4.2, 4.8, 1.4], [6.2, 5.6, 1.6], [8.4, 5.4, 1.5], [10.0, 4.8, 1.2], [5.4, 4.4, 1.2], [9.2, 4.2, 1.2]]) { circle(c, x, y, r); fill(c, '#ffffff'); }
    seg(c, [4.6, 3.6], [4.9, -7.6], 'rgba(255,255,255,0.7)', 0.3); // the shine
  } },

  // A bowl (a yellow pot) of Han River ramyeon: noodles, an egg, spring
  // onion, chopsticks, and steam (part 1: the steam sways)
  ramen: { layers: 2, dens: [1, 0.7], draw(c, l) {
    if (l === 1) {
      for (const x of [-4.4, -0.6, 3.2]) { c.beginPath(); for (let k = 0; k <= 14; k++) c.lineTo(x + Math.sin(k * 0.8) * 0.7, 2.6 + k * 0.48); line(c, '#e8f4ff', 0.4); }
      return;
    }
    oval(c, -10.6, -1.2, 1.6, 0.8); line(c, '#ffd166', 0.45); oval(c, 10.6, -1.2, 1.6, 0.8); line(c, '#ffd166', 0.45);
    c.beginPath(); c.moveTo(-9.4, 0); c.lineTo(-8.2, -7.0); c.quadraticCurveTo(0, -8.2, 8.2, -7.0); c.lineTo(9.4, 0); c.closePath();
    fill(c, grad(c, -9, 0, 9, 0, ['#e8a830', '#ffe08a', '#ffc94a', '#e8a830']));
    for (const y of [-2.4, -4.6]) { c.beginPath(); c.moveTo(-8.9, y); c.quadraticCurveTo(0, y - 1, 8.9, y); line(c, '#ffefb0', 0.12); }
    oval(c, 0, 0, 9.6, 1.9); fill(c, '#ffe9a8');
    oval(c, 0, 0.1, 8.8, 1.45); fill(c, '#ff6a2c');
    c.save(); oval(c, 0, 0.1, 8.8, 1.45); c.clip();
    for (let k = 0; k < 9; k++) { c.beginPath(); for (let x = -8.6; x <= 8.6; x += 0.3) c.lineTo(x, -1.2 + k * 0.32 + Math.sin(x * 2.2 + k) * 0.18); line(c, '#ffe9a8', 0.13); }
    c.restore();
    oval(c, -3.2, 0.4, 1.9, 1.0); fill(c, '#ffffff'); circle(c, -3.2, 0.45, 0.6); fill(c, '#ffa020');
    for (const [x, y] of [[1.6, 0.6], [2.6, 0.2], [3.4, 0.8], [4.6, 0.3], [0.8, -0.2], [5.6, 0.7]]) { circle(c, x, y, 0.22); fill(c, '#6fea8a'); }
    seg(c, [2.4, -0.2], [10.6, 8.6], '#f0b060', 0.38); seg(c, [3.8, -0.4], [12.0, 7.6], '#f0b060', 0.38);
  } },

  // A duck boat (오리배) with two people under the roof, on the waves
  // (part 1: the waves)
  duck: { layers: 2, dens: [1, 0.6], draw(c, l) {
    if (l === 1) {
      for (let k = 0; k < 3; k++) { c.beginPath(); for (let x = -13.6; x <= 13.6; x += 0.3) c.lineTo(x, -6.0 - k * 1.3 + Math.sin(x * 0.9 + k * 1.7) * 0.4); line(c, k ? '#5ab4ff' : '#9fdcff', 0.32); }
      return;
    }
    c.beginPath(); c.moveTo(-10.6, 2.4); c.quadraticCurveTo(-10.4, -1, -9.0, -2.6); c.quadraticCurveTo(-1, -5.4, 6.6, -3.0);
    c.quadraticCurveTo(8.6, -1.6, 8.2, 0.6); c.lineTo(-7.6, 0.6); c.closePath();
    fill(c, grad(c, 0, 0.6, 0, -4.4, ['#ffe066', '#ffc020']));
    oval(c, -2.4, -1.6, 4.2, 1.2, 0.08); fill(c, '#fff0a0'); // the wing
    c.beginPath(); c.moveTo(4.6, 0.4); c.quadraticCurveTo(6.2, 2.6, 5.6, 4.6); c.lineTo(7.6, 4.8); c.quadraticCurveTo(8.4, 2.2, 7.8, 0.4); c.closePath(); fill(c, '#ffd23f'); // neck
    circle(c, 7.4, 5.8, 2.2); fill(c, '#ffe066'); // head
    path(c, [[9.2, 6.2], [11.6, 5.6], [9.3, 4.9]]); fill(c, '#ff9a2e');
    circle(c, 7.9, 6.5, 0.4); fill(c, '#3a2a1a'); circle(c, 8.0, 6.6, 0.13); fill(c, '#ffffff');
    path(c, [[-8.6, 5.4], [-8.2, 6.3], [2.8, 6.3], [3.2, 5.4]]); fill(c, '#ff5a5a'); // the roof
    for (let x = -8.2; x < 3; x += 1.4) { path(c, [[x, 5.4], [x + 0.7, 5.4], [x + 0.6, 6.3], [x + 0.1, 6.3]]); fill(c, '#ffffff'); }
    seg(c, [-7.6, 0.6], [-7.6, 5.4], '#ffffff', 0.3); seg(c, [2.4, 0.6], [2.4, 5.4], '#ffffff', 0.3);
    head(c, -4.6, 2.6, 0.95, '#8a5a3a'); head(c, -1.2, 2.6, 0.95, '#d8a060');
    path(c, [[-5.6, 0.6], [-5.4, 1.6], [-3.8, 1.6], [-3.6, 0.6]]); fill(c, '#7fd4ff');
    path(c, [[-2.2, 0.6], [-2.0, 1.6], [-0.4, 1.6], [-0.2, 0.6]]); fill(c, '#ff8cc0');
  } },

  // The blue whale, Ttukseom's legendary fish, as in the fish book: round
  // blue body, white belly, a flipper, a big eye, the tail curled up
  // (part 1: the spout, part 2: the tail flaps). It swims right to left.
  whale: { layers: 3, dens: [1, 0.8, 1], draw(c, l) {
    if (l === 1) {
      for (const [x, y, r] of [[-7.4, 4.9, 0.45], [-7.9, 6.0, 0.5], [-7.0, 6.2, 0.45], [-8.9, 6.9, 0.55], [-6.0, 7.0, 0.5], [-7.5, 7.4, 0.45], [-9.7, 7.6, 0.4], [-5.2, 7.8, 0.4]]) { circle(c, x, y, r); fill(c, '#c8ecff'); }
      return;
    }
    if (l === 2) {
      c.beginPath(); c.moveTo(4.6, 2.6); c.quadraticCurveTo(6.6, 3.4, 7.4, 5.4); c.lineTo(8.8, 5.0); c.quadraticCurveTo(8.0, 2.0, 5.2, 0.6); c.closePath(); fill(c, '#3c8eff');
      oval(c, 7.0, 6.9, 1.9, 1.15, 0.65); fill(c, grad(c, 5, 8, 9, 6, ['#6cbcff', '#3c8eff']));
      oval(c, 10.0, 6.6, 2.0, 1.15, -0.35); fill(c, grad(c, 8, 7, 12, 6, ['#6cbcff', '#3c8eff']));
      return;
    }
    const body = () => {
      c.beginPath(); c.moveTo(-12.6, -0.4);
      c.bezierCurveTo(-12.6, 3.6, -6.4, 4.8, -1.4, 4.0);
      c.bezierCurveTo(2.0, 3.5, 3.8, 3.2, 5.4, 2.0);
      c.bezierCurveTo(6.4, 1.2, 6.2, -0.4, 4.2, -1.6);
      c.bezierCurveTo(0.6, -4.4, -5.8, -5.2, -9.4, -3.8);
      c.bezierCurveTo(-11.8, -2.9, -12.6, -1.8, -12.6, -0.4); c.closePath();
    };
    body(); fill(c, grad(c, 0, 4.6, 0, -2, ['#7cc8ff', '#47a2ff', '#2f7cf0']));
    c.save(); body(); c.clip();
    oval(c, -5.0, -4.1, 8.4, 3.0, 0.08); fill(c, grad(c, 0, -1.4, 0, -6, ['#ffffff', '#e6f2ff']));
    c.restore();
    oval(c, -1.8, -2.6, 3.2, 1.2, -0.55); fill(c, '#3c8eff'); // the flipper
    c.beginPath(); c.moveTo(-12.4, -1.0); c.quadraticCurveTo(-10.2, -1.9, -7.6, -1.6); line(c, '#2a68d8', 0.16); // the mouth
    circle(c, -8.4, 0.7, 1.3); fill(c, '#ffffff'); circle(c, -8.5, 0.6, 0.85); fill(c, '#10183a'); // the eye
    circle(c, -8.15, 0.95, 0.3); fill(c, '#ffffff');
    oval(c, -6.2, 3.2, 2.6, 0.5, 0.05); fill(c, '#a8dcff'); // the shine on its back
  } },

  // A heart
  heart: { layers: 1, draw(c) { heartPath(c, 0.55, 0, 1); fill(c, radial(c, -2, 3, 0.5, 10, ['#ffc0dc', '#ff5ca8', '#ff3a6a'])); } },

  // A Ferris wheel (part 1: the wheel turns, parts 2 to 9: the cabins ride)
  wheel: { layers: 10, dens: [0.7, 1, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4], draw(c, l) {
    const hx = 0, hy = 1.2, R = 7.6;
    if (l === 0) {
      seg(c, [hx, hy], [-5.4, -9.6], '#e8eef5', 0.5); seg(c, [hx, hy], [5.4, -9.6], '#e8eef5', 0.5);
      seg(c, [-3.6, -6.4], [3.6, -6.4], '#e8eef5', 0.3);
      path(c, [[-7, -10], [-7, -9.4], [7, -9.4], [7, -10]]); fill(c, '#a9b6cc');
      return;
    }
    if (l === 1) {
      circle(c, hx, hy, R); line(c, '#ffffff', 0.32);
      circle(c, hx, hy, R - 0.8); line(c, '#ff8cc0', 0.18);
      for (let k = 0; k < 16; k++) { const a = (k / 16) * TAU; seg(c, [hx, hy], [hx + Math.cos(a) * R, hy + Math.sin(a) * R], k % 2 ? '#bfe8ff' : '#ffd166', 0.1); }
      for (let k = 0; k < 32; k++) { const a = (k / 32) * TAU; circle(c, hx + Math.cos(a) * R, hy + Math.sin(a) * R, 0.16); fill(c, '#ffe28a'); }
      circle(c, hx, hy, 0.8); fill(c, '#ffffff');
      return;
    }
    const k = l - 2, a = Math.PI / 2 + (k / 8) * TAU, x = hx + Math.cos(a) * R, y = hy + Math.sin(a) * R;
    const col = ['#ff5a5a', '#ffd166', '#5fe08f', '#5ab4ff', '#b48cff', '#ff8cc0', '#7cf2c4', '#ffa040'][k];
    seg(c, [x, y], [x, y - 0.5], '#ffffff', 0.12);
    c.beginPath(); c.moveTo(x - 0.9, y - 0.5); c.lineTo(x + 0.9, y - 0.5); c.quadraticCurveTo(x + 1.2, y - 2.4, x, y - 2.5); c.quadraticCurveTo(x - 1.2, y - 2.4, x - 0.9, y - 0.5); fill(c, col);
    path(c, [[x - 0.6, y - 0.9], [x - 0.6, y - 1.6], [x + 0.6, y - 1.6], [x + 0.6, y - 0.9]]); fill(c, '#e6f4ff');
  } },

  // A roller coaster: the track on its supports (part 1: the train runs)
  coaster: { layers: 2, dens: [1, 1.8], draw(c, l) {
    if (l === 1) {
      for (let k = 0; k < 3; k++) {
        const x = -11.6 + k * 1.7, y = coasterY(x), a = Math.atan((coasterY(x + 0.1) - coasterY(x - 0.1)) / 0.2);
        c.save(); c.translate(x, y); c.rotate(a);
        c.beginPath(); c.moveTo(-0.75, 0.25); c.lineTo(0.75, 0.25); c.lineTo(0.75, 1.1); c.quadraticCurveTo(0, 1.4, -0.75, 1.1); c.closePath(); fill(c, ['#ff4a4a', '#ffd166', '#5ab4ff'][k]);
        circle(c, 0, 1.45, 0.32); fill(c, '#ffd7b8');
        c.restore();
      }
      return;
    }
    for (let x = -12.4; x <= 13.6; x += 3.2) seg(c, [x, -9.8], [x, coasterY(x) - 0.3], '#8796b0', 0.16);
    c.beginPath(); for (let x = -14; x <= 14; x += 0.2) c.lineTo(x, coasterY(x)); line(c, '#ff5a5a', 0.45);
    c.beginPath(); for (let x = -14; x <= 14; x += 0.2) c.lineTo(x, coasterY(x) - 0.45); line(c, '#ffffff', 0.18);
    path(c, [[-14, -10], [-14, -9.6], [14, -9.6], [14, -10]]); fill(c, '#a9b6cc');
  } },

  // Two hearts (part 1: the front one beats)
  hearts: { layers: 2, draw(c, l) {
    if (l === 0) { heartPath(c, 0.42, -3.6, 1.4); fill(c, radial(c, -4.6, 3, 0.5, 8, ['#ffc0dc', '#ff5ca8'])); return; }
    heartPath(c, 0.38, 4.2, -0.6); fill(c, radial(c, 3.2, 1.2, 0.5, 7, ['#ff9a9a', '#ff3a4a']));
    for (const [x, y] of [[-10, 6], [10.4, 5.4], [-9, -6], [11, -5]]) sparkle(c, x, y, 0.8, '#ffffff');
  } },

  // The photo frame: a wide heart ring with little sparkles
  frame: { layers: 1, draw(c) {
    heartPath(c, 0.66, 0, 1.6, 96); fill(c, grad(c, -11, 0, 11, 0, ['#ff8cc0', '#ff3f86', '#ff5a5a']));
    c.save(); c.globalCompositeOperation = 'destination-out'; heartPath(c, 0.58, 0, 1.75, 96); fill(c, '#000'); c.restore();
    for (const [x, y, r] of [[-11.6, 8.4, 0.9], [11.8, 8.0, 0.7], [-12.2, -4, 0.6], [12, -3.4, 0.8]]) sparkle(c, x, y, r, '#fff3c4');
  } },

  // K-pop light sticks held up (parts 0 to 2: each sways)
  lightstick: { layers: 3, draw(c, l) {
    const x = [-7.6, 0, 7.6][l], col = [['#ffd0ec', '#ff5ca8'], ['#e2d4ff', '#9a6cff'], ['#d0f0ff', '#46b4ff']][l];
    path(c, [[x - 0.45, -9.6], [x - 0.6, -1.4], [x + 0.6, -1.4], [x + 0.45, -9.6]]); fill(c, '#f4f8ff');
    path(c, [[x - 0.7, -2.2], [x - 0.7, -1.2], [x + 0.7, -1.2], [x + 0.7, -2.2]]); fill(c, col[1]);
    circle(c, x, -5.6, 0.25); fill(c, col[1]);
    circle(c, x, 2.4, 3.6); fill(c, radial(c, x - 0.8, 3.2, 0.3, 3.8, ['#ffffff', col[0], col[1]]));
    heartPath(c, 0.1, x, 2.6); fill(c, '#ffffff');
    for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; seg(c, [x + Math.cos(a) * 4.3, 2.4 + Math.sin(a) * 4.3], [x + Math.cos(a) * 5.0, 2.4 + Math.sin(a) * 5.0], col[0], 0.18); }
  } },

  // A gold star with a bright core (it turns)
  star: { layers: 1, draw(c) {
    starPath(c, 0, 0, 9.4, 3.9); fill(c, radial(c, 0, 0, 0.5, 9.4, ['#fffbe0', '#ffe066', '#ffb020']));
    starPath(c, 0, 0, 5.2, 2.1); fill(c, '#fff3b0');
    for (let k = 0; k < 5; k++) { const a = Math.PI / 2 + (k * TAU) / 5; seg(c, [0, 0], [Math.cos(a) * 9, Math.sin(a) * 9], '#ffffff', 0.12); }
  } },

  // A crescent moon with soft craters, and tiny stars around (part 1)
  moon: { layers: 2, dens: [1, 0.8], draw(c, l) {
    if (l === 1) { for (const [x, y, r] of [[8, 6, 0.7], [11, 1, 0.5], [7, -5.6, 0.6], [-11, 7, 0.5], [12, -7.4, 0.45]]) sparkle(c, x, y, r, '#fff3c4'); return; }
    circle(c, -1, 0, 9); fill(c, radial(c, -4, 1, 1, 9, ['#fffbe8', '#fff0b0', '#ffd166']));
    c.save(); c.globalCompositeOperation = 'destination-out'; circle(c, 2.6, 1.4, 7.6); fill(c, '#000'); c.restore();
    for (const [x, y, r] of [[-6.8, 2.6, 0.9], [-5.6, -3.4, 0.7], [-8.2, -1.2, 0.5], [-3.4, -6.4, 0.6]]) { circle(c, x, y, r); fill(c, '#f0d890'); }
  } },

  // The Big Dipper: seven stars and the lines between (parts 0 to 6: they
  // twinkle), with faint stars behind (part 7)
  dipper: { layers: 8, dens: [1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 1.4, 0.7], draw(c, l) {
    const S7 = [[-11.6, 6.4], [-6.8, 5.0], [-2.6, 2.6], [1.4, 0.4], [2.0, -4.6], [8.6, -5.4], [9.6, 0.2]];
    if (l === 7) {
      for (let k = 0; k < 6; k++) { const a = S7[k], b = S7[k + 1]; seg(c, a, b, 'rgba(160,210,255,0.9)', 0.14); }
      seg(c, S7[3], S7[6], 'rgba(160,210,255,0.9)', 0.14);
      for (const [x, y] of [[-8, -3], [-12, -7], [5, 7], [12, 7.6], [-4, 8.4], [-1, -8], [12.6, -8.4], [-6, -7.6]]) { circle(c, x, y, 0.22); fill(c, '#c8dcff'); }
      return;
    }
    const [x, y] = S7[l];
    circle(c, x, y, 1.0); fill(c, radial(c, x, y, 0.1, 1.2, ['#ffffff', '#fff3c4', '#ffd166']));
    sparkle(c, x, y, 2.0, '#fff8d8');
  } },

  // A shooting star with its long tail (it flies down to the right)
  shootingstar: { layers: 2, dens: [1, 0.6], draw(c, l) {
    if (l === 1) { for (const [x, y, r] of [[-3, -4, 0.6], [4, 7, 0.5], [9, -6, 0.7], [-10, -2, 0.5], [12, 3, 0.45]]) sparkle(c, x, y, r, '#e6f0ff'); return; }
    c.beginPath(); c.moveTo(-12.8, 8.6); c.lineTo(3.4, 0.9); c.lineTo(4.6, 3.3); c.closePath();
    fill(c, grad(c, -12.8, 8.6, 4, 2, ['rgba(140,180,255,0.7)', '#b48cff', '#ffe8a0']));
    c.beginPath(); c.moveTo(-9.6, 4.2); c.lineTo(3.0, 1.4); line(c, 'rgba(255,200,240,0.9)', 0.14);
    c.beginPath(); c.moveTo(-7.0, 9.2); c.lineTo(3.8, 3.0); line(c, 'rgba(180,220,255,0.9)', 0.14);
    starPath(c, 4.6, 1.8, 2.8, 1.2); fill(c, radial(c, 4.6, 1.8, 0.2, 2.8, ['#ffffff', '#fff3a0', '#ffd166']));
  } },

  // Four-leaf clover with leaf veins
  clover: { layers: 1, draw(c) {
    c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(1.2, -4.6, 3.4, -9.4); line(c, '#3fd27a', 0.55);
    for (let k = 0; k < 4; k++) {
      const rot = Math.PI / 4 + (k * Math.PI) / 2;
      c.save(); c.translate(0, 0.6); c.rotate(rot - Math.PI / 2);
      heartPath(c, 0.27, 0, 4.4, 48); c.restore();
      fill(c, radial(c, 0, 0.6, 0.5, 9, ['#c8ffd8', '#6ff09a', '#2fbf68']));
      const a = rot + Math.PI / 2; seg(c, [0, 0.6], [Math.cos(a) * 6.4, 0.6 + Math.sin(a) * 6.4], '#d8ffe4', 0.16);
    }
    circle(c, 0, 0.6, 0.6); fill(c, '#d8ffe4');
  } },

  // Cherry blossoms on a branch (parts 1 to 5: each flower drifts down)
  blossom: { layers: 6, dens: [0.6, 1, 1, 1, 1, 1], draw(c, l) {
    if (l === 0) {
      c.beginPath(); c.moveTo(-14, 7.6); c.quadraticCurveTo(-4, 9.6, 6, 6.6); line(c, '#d89070', 0.5);
      c.beginPath(); c.moveTo(-6, 8.8); c.quadraticCurveTo(-4, 6, -1, 5.4); line(c, '#d89070', 0.3);
      for (const [x, y] of [[-10, 8.4], [-2.6, 8.4], [3.6, 7.2]]) { oval(c, x, y + 0.4, 1, 0.45, 0.4); fill(c, '#7fe09a'); }
      return;
    }
    const [x, y, r] = [[-9, 5.0, 2.4], [-2.4, 2.6, 2.8], [5.4, 4.0, 2.2], [-5.4, -3.6, 2.0], [3.6, -4.8, 2.5]][l - 1];
    for (let k = 0; k < 5; k++) {
      const a = Math.PI / 2 + (k * TAU) / 5 + l;
      oval(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.55, r * 0.42, a);
      fill(c, radial(c, x, y, 0.1, r * 1.1, ['#ff8cc0', '#ffc0dc', '#ffe6f0']));
    }
    circle(c, x, y, r * 0.22); fill(c, '#ff5a9a');
    for (let k = 0; k < 5; k++) { const a = (k * TAU) / 5 + l; circle(c, x + Math.cos(a) * r * 0.32, y + Math.sin(a) * r * 0.32, 0.12); fill(c, '#ffe066'); }
  } },

  // A rainbow between two clouds
  rainbow: { layers: 1, draw(c) {
    const cols = ['#ff5a5a', '#ffa040', '#ffe066', '#5fe08f', '#46b4ff', '#6a7cff', '#b48cff'];
    cols.forEach((col, k) => { c.beginPath(); c.arc(0, -7.4, 12.6 - k * 0.9, 0, Math.PI); line(c, col, 0.85); });
    for (const sx of [-1, 1]) for (const [dx, dy, r] of [[0, 0, 1.9], [1.7, 0.6, 1.6], [-1.7, 0.4, 1.5], [0.8, 1.6, 1.4], [-0.8, 1.4, 1.3]]) { circle(c, sx * 9.0 + dx, -7.6 + dy, r); fill(c, '#ffffff'); }
  } },

  // Drone fireworks: three bursts (parts 0 to 2: each blooms and fades)
  firework: { layers: 3, draw(c, l) {
    const [x, y, R] = [[-7.4, 3.0, 5.6], [5.8, 4.6, 4.6], [1.4, -4.2, 4.0]][l];
    const col = [['#ffe066', '#ff8cc0'], ['#7fd4ff', '#ffffff'], ['#7cf2c4', '#b48cff']][l];
    for (let k = 0; k < 18; k++) {
      const a = (k / 18) * TAU;
      seg(c, [x + Math.cos(a) * R * 0.25, y + Math.sin(a) * R * 0.25], [x + Math.cos(a) * R * 0.9, y + Math.sin(a) * R * 0.9], col[0], 0.16);
      circle(c, x + Math.cos(a) * R, y + Math.sin(a) * R, 0.32); fill(c, col[1]);
    }
    circle(c, x, y, R * 0.12); fill(c, '#ffffff');
  } },

  // ---- routine 2 (Yozi 2026-11-12) ----
  // The Taegeukgi: white field, the red-and-blue taegeuk, the four
  // trigrams (건 ☰ top left, 감 ☵ top right, 리 ☲ bottom left, 곤 ☷ bottom
  // right) cut out of the white so they read dark. It waves.
  taegukgi: { layers: 1, dens: [0.9], draw(c) {
    c.beginPath(); c.rect(-12, -8, 24, 16); fill(c, '#ffffff');
    const th = Math.atan2(16, 24);
    c.save(); c.rotate(-th); // the divide runs along the 건-곤 diagonal
    circle(c, 0, 0, 4); fill(c, '#2f5bd8');
    c.beginPath(); c.arc(0, 0, 4, 0, Math.PI); c.closePath(); fill(c, '#ff3048');
    circle(c, -2, 0, 2); fill(c, '#ff3048');
    circle(c, 2, 0, 2); fill(c, '#2f5bd8');
    c.restore();
    c.save(); c.globalCompositeOperation = 'destination-out';
    const tri = (sx, sy, bars) => { // bars from the inside out: 1 solid, 0 broken
      const ux = sx * Math.cos(th), uy = sy * Math.sin(th), d0 = 6.0;
      bars.forEach((b, i) => {
        const d = d0 + i * 1.0, cx = ux * d, cy = uy * d, a = Math.atan2(uy, ux) + Math.PI / 2;
        c.save(); c.translate(cx, cy); c.rotate(a);
        if (b) { c.beginPath(); c.rect(-2, -0.33, 4, 0.66); fill(c, '#000'); }
        else { c.beginPath(); c.rect(-2, -0.33, 1.75, 0.66); c.rect(0.25, -0.33, 1.75, 0.66); fill(c, '#000'); }
        c.restore();
      });
    };
    tri(-1, 1, [1, 1, 1]); tri(1, -1, [0, 0, 0]); tri(1, 1, [0, 1, 0]); tri(-1, -1, [1, 0, 1]);
    c.restore();
  } },

  // A Korean tiger's face: orange fur, white cheeks and brows, stripes cut
  // out, round ears, gold eyes, a pink nose.
  tiger: { layers: 1, draw(c) {
    for (const sx of [-1, 1]) { circle(c, sx * 6.2, 6.6, 2.6); fill(c, '#ff9a2e'); circle(c, sx * 6.2, 6.6, 1.4); fill(c, '#fff0dc'); }
    c.beginPath(); c.moveTo(0, 8.4); c.bezierCurveTo(7.6, 8.4, 9.6, 3, 9.0, -1.6); c.bezierCurveTo(8.4, -6.6, 4, -8.4, 0, -8.4);
    c.bezierCurveTo(-4, -8.4, -8.4, -6.6, -9.0, -1.6); c.bezierCurveTo(-9.6, 3, -7.6, 8.4, 0, 8.4); c.closePath();
    fill(c, radial(c, 0, 2, 1, 10, ['#ffc04a', '#ff9a2e', '#f07a18']));
    for (const sx of [-1, 1]) { oval(c, sx * 2.6, -3.6, 3.4, 2.8); fill(c, '#fff6ea'); } // the cheeks
    oval(c, 0, -6.2, 2.2, 1.4); fill(c, '#fff6ea'); // the chin
    for (const sx of [-1, 1]) { oval(c, sx * 3.2, 2.4, 1.9, 1.0, sx * 0.2); fill(c, '#fff6ea'); } // white brows
    c.save(); c.globalCompositeOperation = 'destination-out';
    const stripe = (pts, w) => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) c.lineTo(q[0], q[1]); c.lineWidth = w; c.strokeStyle = '#000'; c.stroke(); };
    stripe([[0, 8.2], [0, 6.0]], 0.7); stripe([[-1.6, 8.0], [-1.0, 6.2]], 0.55); stripe([[1.6, 8.0], [1.0, 6.2]], 0.55); // the 王 stripes on the brow
    stripe([[-1.2, 5.2], [1.2, 5.2]], 0.5);
    for (const sx of [-1, 1]) {
      for (let k = 0; k < 3; k++) stripe([[sx * 9.2, 2.6 - k * 2.2], [sx * (6.6 - k * 0.3), 1.8 - k * 2.2]], 0.6);
    }
    c.restore();
    for (const sx of [-1, 1]) { oval(c, sx * 3.2, 0.6, 1.25, 1.0); fill(c, '#ffe14a'); circle(c, sx * 3.2, 0.5, 0.55); fill(c, '#3a2410'); circle(c, sx * 3.0, 0.8, 0.22); fill(c, '#ffffff'); }
    path(c, [[-1.4, -1.6], [1.4, -1.6], [0, -3.0]]); fill(c, '#ff7a9a'); // the nose
    c.beginPath(); c.moveTo(0, -3.0); c.lineTo(0, -4.0); c.moveTo(-1.8, -4.6); c.quadraticCurveTo(-0.8, -3.6, 0, -4.0); c.quadraticCurveTo(0.8, -3.6, 1.8, -4.6); line(c, '#e86a3a', 0.3);
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) seg(c, [sx * 4.6, -3.2 - k * 0.6], [sx * 8.2, -2.6 - k * 1.0], '#ffffff', 0.14); // whiskers
  } },

  // A magpie (까치), the bird of good news, on a pine branch: blue-black
  // head and back, white belly and wing patch, a long tail (part 1: it bobs).
  magpie: { layers: 2, dens: [1, 1.1], draw(c, l) {
    if (l === 0) {
      c.beginPath(); c.moveTo(-13, -4.6); c.quadraticCurveTo(0, -3.0, 13, -6.4); line(c, '#b07a4a', 0.9);
      for (const [x, y] of [[-9, -4.0], [-2, -3.5], [8, -5.0]]) {
        for (let k = 0; k < 9; k++) { const a = -0.3 + (k / 8) * (Math.PI + 0.6); seg(c, [x, y], [x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.0], '#3fcf6a', 0.2); }
      }
      return;
    }
    // the tail
    path(c, [[1.6, -1.4], [11.6, -7.0], [12.4, -5.8], [2.6, 0.2]]); fill(c, grad(c, 2, 0, 12, -6, ['#3a5ad8', '#2fb8a8']));
    // body and belly
    c.beginPath(); c.moveTo(-6.4, 3.2); c.bezierCurveTo(-4.4, 4.8, 0.6, 3.6, 2.8, 0.2); c.bezierCurveTo(1.6, -2.2, -2.6, -3.4, -5.0, -2.2); c.bezierCurveTo(-6.6, -1.2, -7.2, 1.4, -6.4, 3.2); c.closePath();
    fill(c, '#2c3c8c');
    oval(c, -3.6, -0.6, 2.6, 1.9, 0.3); fill(c, '#ffffff');
    oval(c, 0.2, 1.4, 2.6, 0.9, -0.35); fill(c, '#ffffff'); // the wing patch
    oval(c, 0.8, 0.8, 2.4, 0.5, -0.4); fill(c, '#4a7cff');
    circle(c, -6.0, 4.4, 2.0); fill(c, '#2c3c8c'); // the head
    path(c, [[-7.8, 4.9], [-10.0, 4.3], [-7.8, 3.7]]); fill(c, '#5a6aa8');
    circle(c, -6.5, 4.9, 0.45); fill(c, '#ffffff'); circle(c, -6.55, 4.9, 0.22); fill(c, '#10183a');
    seg(c, [-3.6, -2.6], [-3.8, -3.8], '#ffd166', 0.3); seg(c, [-2.4, -2.6], [-2.2, -3.6], '#ffd166', 0.3);
  } },

  // A Jindo dog sitting, cream-white, pointed ears up (part 1: the curled
  // tail wags).
  jindo: { layers: 2, draw(c, l) {
    if (l === 1) {
      c.beginPath(); c.moveTo(3.6, -6.6); c.bezierCurveTo(8.6, -6.0, 9.4, -0.6, 6.6, 0.4); c.bezierCurveTo(5.0, 0.9, 4.6, -1.4, 6.0, -2.0); c.bezierCurveTo(6.8, -3.0, 5.6, -4.6, 3.4, -4.4); c.closePath();
      fill(c, grad(c, 4, -6, 8, 0, ['#f5d9a8', '#fff4e0'])); return;
    }
    c.beginPath(); c.moveTo(-2.6, 1.6); c.bezierCurveTo(-5.4, -1, -6.0, -6, -5.0, -9.0); c.lineTo(5.0, -9.0); c.bezierCurveTo(6.0, -6, 5.4, -1, 2.6, 1.6); c.closePath();
    fill(c, grad(c, 0, 1, 0, -9, ['#fff4e0', '#f5d9a8']));
    oval(c, 0, -2.6, 2.2, 3.6); fill(c, '#ffffff'); // the chest
    for (const sx of [-1, 1]) { path(c, [[sx * 1.0, -4.0], [sx * 2.6, -4.0], [sx * 2.6, -9.0], [sx * 0.8, -9.0]]); fill(c, '#fffaf0'); oval(c, sx * 1.8, -9.1, 1.3, 0.6); fill(c, '#ffffff'); }
    for (const sx of [-1, 1]) { path(c, [[sx * 1.4, 6.8], [sx * 4.4, 9.4], [sx * 4.6, 4.6]]); fill(c, '#f2cf94'); path(c, [[sx * 2.2, 6.4], [sx * 4.0, 8.4], [sx * 4.1, 5.2]]); fill(c, '#ffb3a0'); }
    oval(c, 0, 4.4, 4.6, 3.8); fill(c, radial(c, -1, 5, 0.5, 5, ['#fffaf0', '#f8e2bc']));
    oval(c, 0, 2.6, 2.2, 1.6); fill(c, '#ffffff'); // the muzzle
    oval(c, 0, 3.4, 0.8, 0.55); fill(c, '#5a4a8a'); // the nose
    c.beginPath(); c.moveTo(0, 2.8); c.lineTo(0, 2.2); c.moveTo(-1.0, 1.9); c.quadraticCurveTo(0, 1.6, 1.0, 1.9); line(c, '#c09070', 0.18);
    oval(c, 0.4, 1.4, 0.5, 0.7); fill(c, '#ff7a9a'); // the tongue
    for (const sx of [-1, 1]) { circle(c, sx * 1.9, 5.2, 0.5); fill(c, '#3a2a5a'); circle(c, sx * 1.75, 5.4, 0.18); fill(c, '#ffffff'); }
  } },

  // A cheese tabby cat sitting (part 1: the tail sways).
  cat: { layers: 2, draw(c, l) {
    if (l === 1) {
      c.beginPath(); c.moveTo(3.4, -8.4); c.bezierCurveTo(9.0, -8.6, 10.4, -3.0, 8.4, 1.0); c.lineTo(7.0, 0.6); c.bezierCurveTo(8.6, -2.6, 7.6, -6.8, 3.4, -6.6); c.closePath();
      fill(c, '#ffb04a'); return;
    }
    c.beginPath(); c.moveTo(-2.4, 1.6); c.bezierCurveTo(-5.6, -1, -6.0, -6.4, -4.6, -9.0); c.lineTo(4.6, -9.0); c.bezierCurveTo(6.0, -6.4, 5.6, -1, 2.4, 1.6); c.closePath();
    fill(c, grad(c, 0, 1, 0, -9, ['#ffc46a', '#ffa83a']));
    oval(c, 0, -3.2, 2.0, 3.6); fill(c, '#fff6e6');
    for (const sx of [-1, 1]) { path(c, [[sx * 0.9, -5.0], [sx * 2.4, -5.0], [sx * 2.4, -9.0], [sx * 0.7, -9.0]]); fill(c, '#ffd08a'); oval(c, sx * 1.6, -9.1, 1.2, 0.55); fill(c, '#fff6e6'); }
    for (const sx of [-1, 1]) { path(c, [[sx * 1.2, 6.6], [sx * 4.6, 9.6], [sx * 4.4, 4.6]]); fill(c, '#ffa83a'); path(c, [[sx * 2.0, 6.4], [sx * 4.1, 8.5], [sx * 4.0, 5.3]]); fill(c, '#ffb3c0'); }
    oval(c, 0, 4.2, 4.8, 3.7); fill(c, radial(c, -1, 5, 0.5, 5, ['#ffd08a', '#ffa83a']));
    c.save(); c.globalCompositeOperation = 'destination-out';
    for (const x of [-1.2, 0, 1.2]) { c.beginPath(); c.moveTo(x, 7.8); c.lineTo(x * 0.8, 6.4); c.lineWidth = 0.45; c.strokeStyle = '#000'; c.stroke(); }
    for (const sx of [-1, 1]) for (let k = 0; k < 2; k++) { c.beginPath(); c.moveTo(sx * 4.8, 4.6 - k * 1.2); c.lineTo(sx * 3.6, 4.4 - k * 1.2); c.lineWidth = 0.4; c.strokeStyle = '#000'; c.stroke(); }
    for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-5.4 + k * 0.2, -1.6 - k * 2); c.lineTo(-3.8, -1.2 - k * 2); c.lineWidth = 0.5; c.strokeStyle = '#000'; c.stroke(); }
    c.restore();
    oval(c, 0, 2.6, 2.0, 1.3); fill(c, '#fff6e6');
    path(c, [[-0.5, 3.4], [0.5, 3.4], [0, 2.9]]); fill(c, '#ff7a9a');
    c.beginPath(); c.moveTo(0, 2.9); c.lineTo(0, 2.4); c.moveTo(-0.9, 2.0); c.quadraticCurveTo(-0.4, 1.9, 0, 2.4); c.quadraticCurveTo(0.4, 1.9, 0.9, 2.0); line(c, '#d08040', 0.16);
    for (const sx of [-1, 1]) { oval(c, sx * 2.0, 4.8, 0.85, 1.0); fill(c, '#7cf27a'); oval(c, sx * 2.0, 4.8, 0.25, 0.8); fill(c, '#1a3a1a'); circle(c, sx * 1.8, 5.2, 0.2); fill(c, '#ffffff'); }
    for (const sx of [-1, 1]) for (let k = 0; k < 3; k++) seg(c, [sx * 2.0, 2.6 - k * 0.4], [sx * 6.4, 3.0 - k * 0.9], '#ffffff', 0.12);
  } },

  // Gimbap: a whole roll and three slices showing the fillings.
  gimbap: { layers: 1, draw(c) {
    c.save(); c.translate(-1, 5.2); c.rotate(-0.12);
    c.beginPath(); c.rect(-11, -2.2, 18, 4.4); fill(c, grad(c, 0, 2.2, 0, -2.2, ['#3a8a4a', '#1f5a2a', '#2f7a3a']));
    for (let x = -10; x < 7; x += 2.4) seg(c, [x, -2.2], [x, 2.2], '#4aa85a', 0.1);
    oval(c, 7, 0, 1.2, 2.2); fill(c, '#ffffff'); oval(c, 7, 0, 0.6, 1.2); fill(c, '#ffd23a');
    c.restore();
    const slice = (x, y) => {
      circle(c, x, y, 3.6); fill(c, '#2f7a3a');
      circle(c, x, y, 3.1); fill(c, '#ffffff');
      for (const [dx, dy, col] of [[-0.9, 0.6, '#ffd23a'], [0.9, 0.6, '#ff8a2a'], [0, -0.9, '#4ad86a'], [-1.0, -0.8, '#ff7aa0'], [1.0, -0.8, '#ffe9a0']]) { circle(c, x + dx, y + dy, 0.75); fill(c, col); }
      for (let k = 0; k < 10; k++) { const a = (k / 10) * TAU; circle(c, x + Math.cos(a) * 2.3, y + Math.sin(a) * 2.3, 0.18); fill(c, '#f0f0f0'); }
    };
    slice(-7.6, -4.4); slice(0, -4.8); slice(7.6, -4.4);
  } },

  // The moon rabbit sitting on a crescent moon, pounding rice cakes in a
  // mortar, little stars around (part 1: the arm and mallet go up and down).
  moonrabbit: { layers: 2, dens: [1, 1.2], draw(c, l) {
    if (l === 1) {
      seg(c, [-0.8, 0.4], [2.0, 1.6], '#ffffff', 0.9);
      seg(c, [2.0, 1.6], [3.2, -0.4], '#e8b878', 0.45);
      c.save(); c.translate(3.4, -0.8); c.rotate(0.5); c.beginPath(); c.rect(-1.6, -0.6, 3.2, 1.2); fill(c, '#d89a5a'); c.restore();
      return;
    }
    // the crescent, horns up
    circle(c, 0, 0.6, 8.6); fill(c, radial(c, 0, -5, 1, 10, ['#fff8d8', '#ffe68a', '#ffc94a']));
    c.save(); c.globalCompositeOperation = 'destination-out'; circle(c, 0, 3.4, 8.0); fill(c, '#000'); c.restore();
    for (const [x, y, r] of [[-4.4, -5.4, 0.6], [3.6, -5.6, 0.5], [7.2, -2.6, 0.45]]) { circle(c, x, y, r); fill(c, '#f0cf70'); }
    for (const [x, y, r] of [[-10.6, 7.6, 0.8], [9.4, 8.2, 0.7], [11.6, 2.6, 0.55], [-12.0, 1.0, 0.55], [6.0, 9.0, 0.5]]) sparkle(c, x, y, r, '#fff3c4');
    // the mortar on the moon
    path(c, [[1.6, -1.6], [6.0, -1.6], [5.2, -4.6], [2.4, -4.6]]); fill(c, '#b87a3a');
    oval(c, 3.8, -1.6, 2.2, 0.5); fill(c, '#ffffff');
    // the rabbit
    oval(c, -2.6, -2.0, 2.7, 2.9, 0.1); fill(c, '#ffffff');
    circle(c, -2.4, 2.4, 2.2); fill(c, '#ffffff');
    for (const [x, a] of [[-3.5, 0.25], [-1.6, -0.12]]) { oval(c, x, 6.0, 0.75, 2.5, a); fill(c, '#ffffff'); oval(c, x, 6.0, 0.36, 1.8, a); fill(c, '#ffb3c8'); }
    circle(c, -1.5, 2.8, 0.36); fill(c, '#ff6a8a'); circle(c, -0.5, 2.0, 0.28); fill(c, '#ff9ab0');
    oval(c, -4.0, -4.6, 1.5, 0.7); fill(c, '#ffffff'); circle(c, -5.3, -2.6, 0.9); fill(c, '#ffffff');
  } },
};

// The roller coaster's track height at u (the train follows it).
export function coasterY(x) { return -4.2 + 3.6 * Math.sin(0.3 * x + 0.9) + 1.4 * Math.sin(0.85 * x) + (x < -10 ? (x + 10) * 0.2 : 0); }

// ---- painting and sampling --------------------------------------------------
let canvas = null, ctx = null;

// Spots on one layer's pixels (grid cells of the given size, the pixel
// nearest each cell's middle; every other row shifted half a cell).
function grid(cells, pick, step) {
  const best = new Map();
  for (const g of cells) {
    const gx = g % GW, gy = (g / GW) | 0;
    const row = Math.floor(gy / step), off = row % 2 ? step / 2 : 0;
    const col = Math.floor((gx + off) / step);
    const key = row * 4096 + col;
    const cx = (col + 0.5) * step - off, cy = (row + 0.5) * step;
    const d = (gx - cx) ** 2 + (gy - cy) ** 2;
    const b = best.get(key);
    if (!b || d < b[1]) best.set(key, [g, d]);
  }
  for (const [g] of best.values()) pick.push(g);
}
// The spots of picture `name` for n drones: [[u, v, layer, 0, [r, g, b]]].
export function paintPicture(name, n) {
  const def = PICTURES[name];
  if (!def || typeof document === 'undefined') return [];
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.width = CW; canvas.height = CH;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }
  const layers = def.layers || 1;
  const part = new Int8Array(GW * GH).fill(-1), rgb = new Uint8Array(GW * GH * 3);
  for (let l = 0; l < layers; l++) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CW, CH);
    ctx.setTransform(PX, 0, 0, -PX, CW / 2, CH / 2);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    def.draw(ctx, l);
    const d = ctx.getImageData(0, 0, CW, CH).data;
    for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
      const i = (gy * S * CW + gx * S) * 4;
      if (d[i + 3] < 110) continue;
      const g = gy * GW + gx;
      part[g] = l; rgb[g * 3] = d[i]; rgb[g * 3 + 1] = d[i + 1]; rgb[g * 3 + 2] = d[i + 2];
    }
  }
  // Each layer's outline (ink next to empty, another layer or another colour)
  // and inside (ink away from the outline).
  const diff = (a, b) => Math.abs(rgb[a * 3] - rgb[b * 3]) + Math.abs(rgb[a * 3 + 1] - rgb[b * 3 + 1]) + Math.abs(rgb[a * 3 + 2] - rgb[b * 3 + 2]);
  const edge = new Uint8Array(GW * GH), distE = new Float32Array(GW * GH).fill(1e9);
  const queue = [];
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const g = gy * GW + gx, p = part[g];
    if (p < 0) continue;
    let e = gx === 0 || gy === 0 || gx === GW - 1 || gy === GH - 1;
    if (!e) for (const h of [g - 1, g + 1, g - GW, g + GW]) if (part[h] !== p) { e = true; break; }
    if (!e) for (const h of [g + 1, g + GW]) if (diff(g, h) > 90) { e = true; break; }
    if (e) { edge[g] = 1; distE[g] = 0; queue.push(g); }
  }
  for (let qi = 0; qi < queue.length; qi++) { // distance from the outlines (in cells)
    const g = queue[qi], gx = g % GW;
    for (const h of [gx > 0 ? g - 1 : -1, gx < GW - 1 ? g + 1 : -1, g - GW, g + GW]) {
      if (h < 0 || h >= GW * GH || part[h] < 0 || distE[h] <= distE[g] + 1) continue;
      distE[h] = distE[g] + 1; queue.push(h);
    }
  }
  // One spacing for the whole picture (thinner where a layer's dens is
  // lower), a little closer along the outlines; the spacing is tried until
  // the spots are about as many as the drones.
  const dens = def.dens || [], ef = def.edge ?? 0.8;
  const inkOf = Array.from({ length: layers }, () => ({ edge: [], all: [] }));
  for (let g = 0; g < GW * GH; g++) { const p = part[g]; if (p < 0) continue; inkOf[p].all.push(g); if (edge[g]) inkOf[p].edge.push(g); }
  const sample = (b) => {
    const picks = [];
    inkOf.forEach((o, l) => {
      const st = b / Math.sqrt(dens[l] ?? 1), out = [];
      grid(o.edge, out, st * ef);
      grid(o.all.filter((g) => distE[g] >= st * 0.6), out, st);
      for (const g of out) picks.push([g, l]);
    });
    return picks;
  };
  let lo = 1, hi = 80, picks = sample(lo);
  for (let k = 0; k < 14; k++) {
    const mid = (lo + hi) / 2, p = sample(mid);
    if (p.length > n) { lo = mid; picks = p; } else hi = mid;
    if (p.length <= n && p.length > n * 0.97) { picks = p; break; }
  }
  let out = picks.map(([g, l]) => {
    const gx = g % GW, gy = (g / GW) | 0;
    let r = rgb[g * 3] / 255, gg = rgb[g * 3 + 1] / 255, b = rgb[g * 3 + 2] / 255;
    const m = Math.max(r, gg, b); // drones are lights: lift dark colours a little
    if (m > 0 && m < 0.55) { const k = 0.55 / m; r *= k; gg *= k; b *= k; }
    r = LIN(r); gg = LIN(gg); b = LIN(b); // (the canvas is sRGB; the drones' colours are linear, as THREE.Color makes them)
    // (the lights glow into each other on a filled picture: a bit dimmer each, so the colour stays)
    return [((gx * S + S / 2) / CW - 0.5) * PIC_W, (0.5 - (gy * S + S / 2) / CH) * PIC_H, l, 0, [r * GLOW, gg * GLOW, b * GLOW]];
  });
  if (out.length > n) out = Array.from({ length: n }, (_, k) => out[Math.floor((k * out.length) / n)]);
  return out;
}

export const PICTURE_NAMES = Object.keys(PICTURES);
