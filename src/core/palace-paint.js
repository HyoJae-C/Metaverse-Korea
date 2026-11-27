// The palace's surfaces, each drawn once on a small canvas and repeated
// (core/palace-model.js lays them on its boxes and roofs). px: the canvas;
// m: the metres one repeat covers [across, up], 0 for "once over the face";
// tint: drawn in greys and coloured by the piece it is on.
const rnd = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

export const PALACE_PAINT = {
  // Roof tiles (기와): round tiles as light ridges running down the slope,
  // the flat tiles between them as dark channels, a line where one tile
  // ends and the next begins.
  tile: {
    px: [64, 64], m: [0.5, 0.7], tint: true,
    draw(x, w, h) {
      x.fillStyle = '#8f8f8f'; x.fillRect(0, 0, w, h); // the channel
      const g = x.createLinearGradient(w * 0.14, 0, w * 0.66, 0);
      g.addColorStop(0, '#a8a8a8'); g.addColorStop(0.35, '#ffffff'); g.addColorStop(0.7, '#e2e2e2'); g.addColorStop(1, '#9c9c9c');
      x.fillStyle = g; x.fillRect(w * 0.14, 0, w * 0.52, h); // the round tile
      x.fillStyle = 'rgba(40,40,40,0.35)'; x.fillRect(w * 0.66, 0, w * 0.06, h); // its shadow in the channel
      x.fillStyle = 'rgba(40,40,40,0.5)'; x.fillRect(w * 0.14, h - 4, w * 0.52, 3); // where the next tile laps over
      x.fillStyle = 'rgba(40,40,40,0.25)'; x.fillRect(0, h / 2 - 2, w * 0.14, 2); x.fillRect(w * 0.72, h / 2 - 2, w * 0.28, 2);
    },
  },
  // The painted beam under the eaves (단청): green ground, gold lines, and
  // at each end of a unit a lotus between bands of colour (머리초, 휘).
  dancheong: {
    px: [256, 64], m: [2.2, 0],
    draw(x, w, h) {
      x.fillStyle = '#2f8a68'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#1f6a52'; x.fillRect(0, 0, w, 7); x.fillRect(0, h - 7, w, 7);
      x.fillStyle = '#d4a73a'; x.fillRect(0, 7, w, 3); x.fillRect(0, h - 10, w, 3);
      const bands = (x0, dir) => ['#b2402f', '#f2e6c4', '#3f6f9a', '#f2e6c4', '#e08a2e', '#f2e6c4', '#1f6a52'].forEach((c, i) => {
        x.strokeStyle = c; x.lineWidth = 7; x.beginPath();
        const cx = x0 + dir * i * 7;
        x.moveTo(cx, 10); x.quadraticCurveTo(cx + dir * 12, h / 2, cx, h - 10); x.stroke();
      });
      const lotus = (cx) => {
        for (const [r, c] of [[21, '#f2e6c4'], [18, '#b2402f'], [13, '#f0a59a'], [8, '#f2e6c4'], [5, '#d4a73a']]) { x.fillStyle = c; x.beginPath(); x.arc(cx, h / 2, r, 0, Math.PI * 2); x.fill(); }
        x.fillStyle = '#3f6f9a';
        for (const a of [0, 1, 2, 3, 4, 5]) { x.beginPath(); x.arc(cx + Math.cos(a * 1.047 + 0.5) * 15.5, h / 2 + Math.sin(a * 1.047 + 0.5) * 15.5, 2.6, 0, Math.PI * 2); x.fill(); }
      };
      lotus(32); bands(60, 1);
      lotus(w - 32); bands(w - 60, -1);
      // the plain stretch between: a small diamond in the middle
      x.fillStyle = '#d4a73a'; x.beginPath(); x.moveTo(w / 2, h / 2 - 9); x.lineTo(w / 2 + 12, h / 2); x.lineTo(w / 2, h / 2 + 9); x.lineTo(w / 2 - 12, h / 2); x.fill();
      x.fillStyle = '#b2402f'; x.beginPath(); x.moveTo(w / 2, h / 2 - 5); x.lineTo(w / 2 + 7, h / 2); x.lineTo(w / 2, h / 2 + 5); x.lineTo(w / 2 - 7, h / 2); x.fill();
    },
  },
  // A door leaf (창호): a red frame, a solid panel at the foot (궁창), and
  // above it the lattice over paper (띠살: close uprights, three bands across).
  lattice: {
    px: [128, 256], m: [0.9, 0],
    draw(x, w, h) {
      x.fillStyle = '#8f3024'; x.fillRect(0, 0, w, h); // the frame
      const top = 14, foot = h * 0.72, l = 10, r = w - 10;
      x.fillStyle = '#eadfc6'; x.fillRect(l, top, r - l, foot - top); // paper
      x.fillStyle = '#8f3024';
      for (let u = l + 9; u < r - 4; u += 12) x.fillRect(u, top, 3, foot - top);
      for (const band of [0.1, 0.5, 0.9]) for (let k = -1; k <= 1; k++) x.fillRect(l, top + (foot - top) * band + k * 7 - 1, r - l, 3);
      x.fillStyle = '#7a2a20'; x.fillRect(l, foot + 8, r - l, h - foot - 20); // the foot panel
      x.strokeStyle = '#b05a48'; x.lineWidth = 3; x.strokeRect(l + 9, foot + 17, r - l - 18, h - foot - 38);
    },
  },
  // Dressed stone (장대석): long blocks in courses, their joints broken
  // from course to course, each block a shade of its own.
  stone: {
    px: [256, 128], m: [2.6, 0.9], tint: true,
    draw(x, w, h) {
      const r = rnd(11);
      x.fillStyle = '#b4ad9f'; x.fillRect(0, 0, w, h); // the joints
      const rows = 2, rh = h / rows;
      for (let j = 0; j < rows; j++) {
        let u = j % 2 ? -40 : 0;
        while (u < w) {
          const bw = 70 + r() * 50, t = 232 + Math.round(r() * 23);
          x.fillStyle = `rgb(${t},${t},${t - 3})`;
          x.fillRect(u + 1.5, j * rh + 1.5, bw - 3, rh - 3);
          if (u < 0) x.fillRect(u + w + 1.5, j * rh + 1.5, bw - 3, rh - 3); // (wraps round)
          u += bw;
        }
      }
      for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(90,85,75,${0.05 + r() * 0.07})`; x.fillRect(r() * w, r() * h, 2, 2); } // the grain
    },
  },
  // Plaster: nearly even, a little mottled, so a long wall is not one flat colour.
  plaster: {
    px: [128, 128], m: [3.2, 3.2], tint: true,
    draw(x, w, h) {
      const r = rnd(5);
      x.fillStyle = '#ffffff'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 46; i++) {
        const cx = r() * w, cy = r() * h, rad = 10 + r() * 22;
        for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          const g = x.createRadialGradient(cx + dx, cy + dy, 0, cx + dx, cy + dy, rad);
          g.addColorStop(0, `rgba(150,130,95,${0.05 + r() * 0.05})`); g.addColorStop(1, 'rgba(150,130,95,0)');
          x.fillStyle = g; x.fillRect(cx + dx - rad, cy + dy - rad, rad * 2, rad * 2);
        }
      }
      for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(120,100,70,${0.04 + r() * 0.06})`; x.fillRect(r() * w, r() * h, 1.5, 1.5); }
    },
  },
};
