// T-shirt prints: drawn on a canvas and put on the chest (see character.js).
// Prints are worn from the bag once you own the shirt item (core/inventory.js).

// 시무룩이 (Simurugi): an original fluffy pastel critter with a droopy,
// grumpy "ugly-cute" face.
function drawSimurugi(g, S) {
  const k = S / 256;
  g.save();
  g.scale(k, k);
  const cx = 128, cy = 140;
  // Fluffy body: lots of soft tufts around a round blob.
  g.fillStyle = '#fbf7f2';
  g.strokeStyle = '#e4dcd2';
  g.lineWidth = 3;
  const tuft = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); };
  // ears (small, round, a mint inner)
  for (const s of [-1, 1]) {
    g.fillStyle = '#fbf7f2';
    tuft(cx + 58 * s, cy - 78, 22);
    g.fillStyle = '#bfe6dc';
    tuft(cx + 58 * s, cy - 76, 11);
  }
  g.fillStyle = '#fbf7f2';
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    tuft(cx + Math.cos(a) * 88, cy + Math.sin(a) * 80, 16 + (i % 3) * 3);
  }
  g.beginPath(); g.ellipse(cx, cy, 92, 84, 0, 0, Math.PI * 2); g.fill();
  // a fuzzy outline hint at the bottom
  g.beginPath(); g.ellipse(cx, cy + 4, 96, 86, 0, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();

  // blush
  g.fillStyle = 'rgba(255, 150, 160, 0.55)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + 52 * s, cy + 18, 16, 10, 0, 0, Math.PI * 2); g.fill(); }

  g.lineCap = 'round';
  g.strokeStyle = '#2b2630';
  // brows: low and tilted up in the middle (a sulky, tired look)
  g.lineWidth = 5;
  for (const s of [-1, 1]) {
    g.beginPath(); g.moveTo(cx + 18 * s, cy - 30); g.quadraticCurveTo(cx + 34 * s, cy - 24, cx + 52 * s, cy - 20); g.stroke();
  }
  // frown wrinkles between the eyes
  g.lineWidth = 2.5;
  for (const dx of [-5, 0, 5]) { g.beginPath(); g.moveTo(cx + dx, cy - 30); g.lineTo(cx + dx * 0.6, cy - 16); g.stroke(); }
  // half-shut eyes: a heavy flat lid over a small pupil at the bottom
  for (const s of [-1, 1]) {
    const ex = cx + 34 * s, ey = cy - 6;
    g.fillStyle = '#fff';
    g.beginPath(); g.ellipse(ex, ey, 17, 10, 0, 0, Math.PI); g.fill();
    g.fillStyle = '#2b2630';
    g.beginPath(); g.ellipse(ex + 3 * s, ey + 5, 6, 5, 0, 0, Math.PI * 2); g.fill();
    g.lineWidth = 5;
    g.beginPath(); g.moveTo(ex - 19, ey); g.lineTo(ex + 19, ey); g.stroke(); // the lid
    g.lineWidth = 2;
    for (let i = 0; i < 2; i++) { // eye bags
      g.beginPath(); g.arc(ex, ey + 8 + i * 6, 14 - i * 2, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
    }
  }
  // small round nose and a pouting mouth
  g.fillStyle = '#9fd8cc';
  g.beginPath(); g.ellipse(cx, cy + 16, 7, 5, 0, 0, Math.PI * 2); g.fill();
  g.lineWidth = 3.5;
  g.beginPath(); g.moveTo(cx - 12, cy + 38); g.quadraticCurveTo(cx, cy + 28, cx + 12, cy + 38); g.stroke();
  g.restore();
}

// A small happy face (claw machine prizes share it).
function face(g, x, y, k = 1) {
  g.fillStyle = '#2b2630';
  for (const s of [-1, 1]) { g.beginPath(); g.arc(x + 12 * k * s, y, 4 * k, 0, Math.PI * 2); g.fill(); }
  g.strokeStyle = '#2b2630'; g.lineWidth = 3 * k; g.lineCap = 'round';
  g.beginPath(); g.arc(x, y + 5 * k, 6 * k, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255, 150, 160, 0.6)';
  for (const s of [-1, 1]) { g.beginPath(); g.ellipse(x + 22 * k * s, y + 8 * k, 7 * k, 4 * k, 0, 0, Math.PI * 2); g.fill(); }
}

// 몽글이: a cloud sheep on a blue circle.
function drawMongle(g, S) {
  g.save(); g.scale(S / 256, S / 256);
  g.fillStyle = '#9fd0f2'; g.beginPath(); g.arc(128, 128, 110, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#ffffff';
  for (const [x, y, r] of [[80, 130, 40], [120, 100, 48], [168, 120, 42], [100, 160, 40], [150, 165, 42], [185, 155, 30]]) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#2b2630';
  for (const x of [95, 165]) g.fillRect(x - 4, 190, 8, 26); // legs
  face(g, 128, 135, 1.3);
  g.restore();
}

// 만두: a dumpling with pleats.
function drawMandu(g, S) {
  g.save(); g.scale(S / 256, S / 256);
  g.fillStyle = '#fff6e6'; g.strokeStyle = '#e8cfa8'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(30, 170); g.quadraticCurveTo(128, 20, 226, 170); g.quadraticCurveTo(128, 215, 30, 170); g.fill(); g.stroke();
  g.lineWidth = 4;
  for (let i = 0; i < 6; i++) { const x = 70 + i * 23; g.beginPath(); g.moveTo(x, 92 + Math.abs(i - 2.5) * 10); g.quadraticCurveTo(x + 6, 110, x + 2, 125); g.stroke(); }
  face(g, 128, 160, 1.2);
  g.restore();
}

// 떡꼬치: three rice cakes on a skewer, each with a face.
function drawDdeok(g, S) {
  g.save(); g.scale(S / 256, S / 256);
  g.strokeStyle = '#c99a5b'; g.lineWidth = 8; g.lineCap = 'round';
  g.beginPath(); g.moveTo(128, 20); g.lineTo(128, 240); g.stroke();
  [['#ffb3c7', 62], ['#fffaf0', 128], ['#a6d97a', 194]].forEach(([c, y]) => {
    g.fillStyle = c; g.beginPath(); g.ellipse(128, y, 52, 30, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.08)'; g.lineWidth = 3; g.stroke();
    face(g, 128, y - 2, 0.9);
  });
  g.restore();
}

export const TEE_PRINTS = {
  simurugi: { draw: drawSimurugi },
  mongle: { draw: drawMongle },
  mandu: { draw: drawMandu },
  ddeok: { draw: drawDdeok },
};

export function drawTeePrint(id, size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  TEE_PRINTS[id]?.draw(c.getContext('2d'), size);
  return c;
}
