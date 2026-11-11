// Pictures painted on the outside of the zoo's Sea Animals hall (pen.murals,
// scripts/build-grand-park.mjs): simple, cheerful scenes of its animals and
// "MODU SEOUL" in big letters. Each is one canvas on a plane just off a
// wall: 'ice' (a polar bear and her cub on one floe, penguins on another, a
// seal in the sea, the name in the sky), 'deep' (under the water: a walrus,
// seals, diving penguins, fish), 'arctic' (the northern lights, a polar bear
// swimming, a walrus on the ice), and 'penguins' and 'friends' either side of
// the door.
import * as THREE from 'three';
import { canvasTex } from './three-kit.js';

const SKY = '#cdeffa', SEA = '#3d8ec6', DEEP = '#2b6e9f', ICE = '#ffffff', ICE_EDGE = '#a9d4ea', INK = '#1d3b52';

function ell(c, x, y, rx, ry, col, rot = 0) { c.fillStyle = col; c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); c.fill(); }
function dot(c, x, y, r, col) { ell(c, x, y, r, r, col); }
function poly(c, pts, col) { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) c.lineTo(x, y); c.closePath(); c.fill(); }
// An eye with a glint, so it reads from the path.
function eye(c, x, y, r) { dot(c, x, y, r, INK); dot(c, x + r * 0.35, y - r * 0.35, r * 0.35, '#ffffff'); }

function floe(c, x0, x1, y, h) {
  poly(c, [[x0, y + h * 0.3], [x0 + 18, y], [x1 - 22, y + 2], [x1, y + h * 0.35], [x1 - 12, y + h], [x0 + 10, y + h]], ICE_EDGE);
  poly(c, [[x0 + 4, y + h * 0.25], [x0 + 20, y - 4], [x1 - 22, y - 2], [x1 - 4, y + h * 0.3], [x1 - 16, y + h * 0.6], [x0 + 12, y + h * 0.6]], ICE);
}
function waves(c, w, y0, y1, n, col = 'rgba(255,255,255,0.55)') {
  c.strokeStyle = col; c.lineWidth = 3;
  for (let i = 0; i < n; i++) {
    const y = y0 + ((y1 - y0) * (i + 0.5)) / n, off = (i * 57) % 80;
    for (let x = -off; x < w; x += 80) { c.beginPath(); c.arc(x + 20, y, 12, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
  }
}
function bubbles(c, spots) { c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; for (const [x, y, r] of spots) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke(); } }
function fish(c, x, y, s, col, f = 1) {
  ell(c, x, y, 16 * s, 8 * s, col);
  poly(c, [[x - 14 * s * f, y], [x - 26 * s * f, y - 9 * s], [x - 26 * s * f, y + 9 * s]], col);
  dot(c, x + 8 * s * f, y - 2 * s, 2 * s, INK);
}

// A polar bear standing, side on, facing f (1 right, -1 left).
function polarBear(c, x, y, s, f = 1, edge = true) {
  if (edge) polarBear(c, x, y + 1.5, s * 1.07, f, false); // a soft outline first, so white on white still reads
  const W = edge ? '#fbfaf3' : '#8fb3c7', SH = edge ? '#dfe7ea' : '#8fb3c7';
  for (const [dx, k] of [[-38, 0.9], [-20, 1], [22, 0.9], [40, 1]]) { // legs (far ones shaded)
    c.fillStyle = k < 1 ? SH : W; c.fillRect(x + dx * s * f - 9 * s, y + 10 * s, 18 * s, 34 * s);
  }
  ell(c, x, y, 60 * s, 34 * s, W); // body
  ell(c, x - 4 * s * f, y + 14 * s, 48 * s, 14 * s, SH); // belly shade
  ell(c, x, y, 58 * s, 30 * s, W);
  const hx = x + 62 * s * f, hy = y - 16 * s;
  ell(c, x + 44 * s * f, y - 8 * s, 22 * s, 20 * s, W); // neck
  dot(c, hx - 6 * s * f, hy - 18 * s, 7 * s, W); dot(c, hx - 6 * s * f, hy - 18 * s, 3.5 * s, SH); // ear
  ell(c, hx, hy, 22 * s, 18 * s, W); // head
  ell(c, hx + 16 * s * f, hy + 5 * s, 13 * s, 9 * s, W); // snout
  if (!edge) return;
  dot(c, hx + 27 * s * f, hy + 3 * s, 4.5 * s, INK); // nose
  eye(c, hx + 6 * s * f, hy - 5 * s, 3.5 * s);
  c.strokeStyle = INK; c.lineWidth = 2 * s; c.beginPath(); c.arc(hx + 20 * s * f, hy + 10 * s, 5 * s, 0.2, Math.PI - 0.2); c.stroke(); // a smile
}
// A penguin facing you: black back, white front, orange beak and feet,
// a yellow patch at the neck.
function penguin(c, x, y, s, tilt = 0) {
  c.save(); c.translate(x, y); c.rotate(tilt);
  ell(c, -8 * s, 26 * s, 8 * s, 4 * s, '#f39a2b'); ell(c, 8 * s, 26 * s, 8 * s, 4 * s, '#f39a2b'); // feet
  ell(c, -17 * s, 2 * s, 6 * s, 18 * s, '#1e2228', 0.35); ell(c, 17 * s, 2 * s, 6 * s, 18 * s, '#1e2228', -0.35); // flippers
  ell(c, 0, 0, 18 * s, 28 * s, '#1e2228'); // body
  ell(c, 0, 5 * s, 12 * s, 21 * s, '#fbfbf8'); // belly
  dot(c, 0, -26 * s, 13 * s, '#1e2228'); // head
  ell(c, -9 * s, -18 * s, 4 * s, 6 * s, '#ffd24a'); ell(c, 9 * s, -18 * s, 4 * s, 6 * s, '#ffd24a'); // yellow cheeks
  dot(c, -5 * s, -29 * s, 3.4 * s, '#ffffff'); dot(c, 5 * s, -29 * s, 3.4 * s, '#ffffff');
  dot(c, -5 * s, -29 * s, 1.8 * s, INK); dot(c, 5 * s, -29 * s, 1.8 * s, INK);
  poly(c, [[-4 * s, -23 * s], [4 * s, -23 * s], [0, -16 * s]], '#f39a2b'); // beak
  c.restore();
}
// A seal: a grey body and its head up, whiskers out.
function seal(c, x, y, s, f = 1, swim = false) {
  const G = '#8e9aa3', L = '#b9c3c9';
  ell(c, x, y, 42 * s, 16 * s, G, swim ? 0 : -0.25 * f);
  poly(c, [[x - 38 * s * f, y], [x - 60 * s * f, y - 10 * s], [x - 58 * s * f, y + 12 * s]], G); // tail flippers
  ell(c, x + 4 * s * f, y + 6 * s, 26 * s, 7 * s, L, swim ? 0 : -0.25 * f);
  const hx = x + 40 * s * f, hy = y - (swim ? 2 : 14) * s;
  ell(c, hx, hy, 16 * s, 14 * s, G);
  ell(c, hx + 10 * s * f, hy + 4 * s, 8 * s, 6 * s, L);
  dot(c, hx + 16 * s * f, hy + 2 * s, 2.8 * s, INK);
  eye(c, hx + 2 * s * f, hy - 4 * s, 3.4 * s);
  c.strokeStyle = INK; c.lineWidth = 1.2 * s;
  for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(hx + 12 * s * f, hy + 5 * s); c.lineTo(hx + 26 * s * f, hy + 5 * s + k * 4 * s); c.stroke(); }
}
// A walrus on its rock: big, brown, tusks and a bristly moustache.
function walrus(c, x, y, s, f = 1) {
  const B = '#a77a5f', L = '#c99d80';
  ell(c, x, y, 52 * s, 30 * s, B);
  ell(c, x - 44 * s * f, y + 22 * s, 18 * s, 7 * s, B, 0.3 * f); // rear flippers
  ell(c, x + 26 * s * f, y + 26 * s, 14 * s, 6 * s, B); // fore flipper
  const hx = x + 44 * s * f, hy = y - 18 * s;
  ell(c, hx, hy, 22 * s, 20 * s, B);
  c.fillStyle = '#fbf6ea'; c.fillRect(hx + 4 * s * f - 3 * s, hy + 10 * s, 5 * s, 22 * s); c.fillRect(hx + 14 * s * f - 3 * s, hy + 10 * s, 5 * s, 22 * s); // tusks
  ell(c, hx + 9 * s * f, hy + 8 * s, 14 * s, 9 * s, L); // moustache
  eye(c, hx + 2 * s * f, hy - 8 * s, 3 * s);
}
function title(c, text, x, y, px, fill = '#ffffff', stroke = '#1f5f8f') {
  c.font = `900 ${px}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = Math.max(4, px / 9); c.strokeStyle = stroke; c.strokeText(text, x, y);
  c.fillStyle = fill; c.fillText(text, x, y);
}
function skyAndSea(c, w, h, horizon) {
  c.fillStyle = SKY; c.fillRect(0, 0, w, horizon);
  c.fillStyle = SEA; c.fillRect(0, horizon, w, h - horizon);
  c.fillStyle = DEEP; c.fillRect(0, h - (h - horizon) * 0.35, w, (h - horizon) * 0.35);
  waves(c, w, horizon + 6, h - 6, 3);
}

// The pictures, by name: draw(c, w, h) on a canvas of [w, h] pixels.
export const ART = {
  ice: [1024, 256, (c, w, h) => {
    skyAndSea(c, w, h, 140);
    dot(c, 960, 40, 26, '#ffe58a'); // the sun
    ell(c, 300, 30, 40, 12, '#ffffff'); ell(c, 330, 22, 28, 12, '#ffffff'); ell(c, 730, 34, 36, 11, '#ffffff'); // clouds
    floe(c, 14, 290, 132, 44);
    polarBear(c, 100, 98, 0.75, 1);
    polarBear(c, 236, 114, 0.4, -1); // her cub
    floe(c, 744, 1010, 134, 42);
    penguin(c, 790, 108, 0.9); penguin(c, 842, 116, 0.65, 0.1); penguin(c, 900, 104, 1); penguin(c, 962, 112, 0.75, -0.08);
    seal(c, 590, 196, 0.8, 1, true);
    fish(c, 420, 222, 1, '#ffb347'); fish(c, 470, 204, 0.8, '#ffe066'); fish(c, 960, 224, 0.9, '#ff8fa3', -1);
    bubbles(c, [[640, 172, 5], [652, 158, 3], [500, 190, 4]]);
    title(c, 'MODU SEOUL', 515, 84, 64);
    c.font = '700 30px sans-serif'; c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.fillText('바다동물관 · SEA ANIMALS', 512, 168);
  }],
  deep: [1024, 208, (c, w, h) => {
    c.fillStyle = SEA; c.fillRect(0, 0, w, h);
    c.fillStyle = DEEP; c.fillRect(0, h * 0.6, w, h * 0.4);
    c.fillStyle = 'rgba(255,255,255,0.18)'; for (let x = 40; x < w; x += 130) poly(c, [[x, 0], [x + 40, 0], [x + 90, h], [x + 50, h]], 'rgba(255,255,255,0.12)'); // light from above
    poly(c, [[30, h], [70, 140], [170, 128], [250, 150], [280, h]], '#6f7f8a'); // a rock
    walrus(c, 150, 112, 0.95, 1);
    seal(c, 430, 90, 0.9, 1, true); seal(c, 560, 140, 0.7, -1, true);
    penguin(c, 760, 70, 0.7, 1.9); penguin(c, 830, 120, 0.6, 1.6); penguin(c, 700, 150, 0.55, 2.2); // diving
    for (const [x, y, s, col, f] of [[330, 40, 0.9, '#ffb347', 1], [360, 60, 0.7, '#ffb347', 1], [640, 40, 0.8, '#ffe066', -1], [920, 70, 1, '#ff8fa3', -1], [960, 160, 0.8, '#7fe0c4', -1], [300, 180, 0.7, '#ffe066', 1]]) fish(c, x, y, s, col, f);
    bubbles(c, [[480, 60, 5], [490, 44, 3], [790, 40, 4], [800, 24, 3], [250, 90, 4]]);
    title(c, 'MODU SEOUL', 600, 186, 34, '#ffffff', '#163f5e');
  }],
  penguins: [512, 360, (c, w, h) => {
    skyAndSea(c, w, h, 210);
    floe(c, 30, 482, 236, 90);
    title(c, 'MODU', w / 2, 62, 76);
    title(c, 'SEOUL', w / 2, 138, 76);
    penguin(c, 150, 238, 1.6); penguin(c, 250, 256, 1.0, 0.08); penguin(c, 350, 232, 1.75);
    dot(c, 420, 70, 20, '#ffe58a');
  }],
  arctic: [1024, 208, (c, w, h) => { // a polar night: the northern lights, a bear swimming, a walrus on the ice
    c.fillStyle = '#1d3557'; c.fillRect(0, 0, w, 110);
    for (const [y, col] of [[40, 'rgba(120,255,190,0.45)'], [62, 'rgba(140,200,255,0.4)'], [84, 'rgba(200,140,255,0.3)']]) { // the aurora
      c.strokeStyle = col; c.lineWidth = 14; c.beginPath(); c.moveTo(0, y);
      for (let x = 0; x <= w; x += 64) c.lineTo(x, y + Math.sin(x / 90) * 14);
      c.stroke();
    }
    c.fillStyle = '#ffffff'; for (let i = 0; i < 40; i++) c.fillRect((i * 131) % w, (i * 37) % 70, 3, 3); // stars
    c.fillStyle = SEA; c.fillRect(0, 110, w, h - 110);
    c.fillStyle = DEEP; c.fillRect(0, 165, w, h - 165);
    waves(c, w, 116, h - 6, 3);
    floe(c, 620, 960, 100, 40);
    walrus(c, 760, 74, 0.7, -1);
    seal(c, 890, 92, 0.55, -1);
    polarBear(c, 300, 128, 0.6, 1); // swimming: only the top shows above the water
    c.fillStyle = SEA; c.fillRect(200, 140, 240, 30);
    waves(c, w, 140, 150, 1);
    fish(c, 120, 180, 0.9, '#ffb347'); fish(c, 520, 186, 0.8, '#7fe0c4', -1);
    title(c, 'MODU SEOUL', 470, 46, 40, '#ffffff', '#0f2238');
  }],
  friends: [512, 360, (c, w, h) => { // the hall's animals in a row, waving hello
    c.fillStyle = SKY; c.fillRect(0, 0, w, h);
    c.fillStyle = SEA; c.fillRect(0, 230, w, h - 230);
    waves(c, w, 236, h - 6, 2);
    floe(c, 20, 492, 214, 70);
    seal(c, 110, 196, 0.85, 1);
    penguin(c, 250, 186, 1.2);
    polarBear(c, 380, 170, 0.62, -1);
    title(c, 'SEA ANIMALS', w / 2, 60, 56);
    c.font = '700 34px sans-serif'; c.fillStyle = '#1f5f8f'; c.textAlign = 'center'; c.fillText('바다동물관', w / 2, 116);
  }],
};

// The murals for a hall (pen.murals: [{ side, art, at?, w? }]), as meshes in
// the pen's own frame, a hair off each wall's outside face. H: wall height.
export function hallMurals(pen, H) {
  const out = [];
  for (const m of pen.murals || []) {
    const [tw, th, draw] = ART[m.art];
    const along = m.side === 'n' || m.side === 's' ? pen.w : pen.d;
    const w = m.w || along - 1.4, h = Math.min(H - 1.9, (w * th) / tw);
    const tex = canvasTex(tw, th, draw);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: tex }));
    const at = m.at || 0, y = 0.55 + h / 2, off = 0.17;
    const [x, z, ry] = {
      s: [at, pen.d / 2 + off, 0], n: [at, -pen.d / 2 - off, Math.PI], // (at: along the wall, in the pen's x or z)
      e: [pen.w / 2 + off, at, Math.PI / 2], w: [-pen.w / 2 - off, at, -Math.PI / 2],
    }[m.side];
    mesh.position.set(x, y, z);
    mesh.rotation.y = ry;
    mesh.name = 'mural:' + m.art;
    out.push(mesh);
  }
  return out;
}
