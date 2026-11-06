// Shop-only ride patterns, each drawn over a whole 128 px tile that repeats
// (rides.js tiles it along the frame). Pedal Lab's first five patterns are in
// rides.js; these are the ones from the other ride shops:
//   Bike Research Lab (Hongdae): graffiti, checker, drip, splat
//   RIDE WITH ME (Itaewon): flame, stripe, dots, wave
//   Hangeul Mihak (Gyeongbokgung, limited): the Hunminjeongeum line
// Hangul is set in a Korean font when there is one; the "heaven, earth,
// person" (ㆍㅡㅣ) and seal patterns are plain shapes so they look the same
// everywhere.
const KO_FONT = '"Nanum Myeongjo", "Noto Serif KR", "AppleMyungjo", "Batang", "Apple SD Gothic Neo", "Noto Sans KR", serif';
const S = 128;

function text(g, str, x, y, size, weight = 700) {
  g.font = `${weight} ${size}px ${KO_FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(str, x, y);
}
// Draw a shape at (x, y) and at its copies across the edges, so a tile
// repeats without seams.
function wrap(x, y, r, draw) {
  for (const dx of [0, -S, S]) for (const dy of [0, -S, S]) {
    const px = x + dx, py = y + dy;
    if (px + r < 0 || px - r > S || py + r < 0 || py - r > S) continue;
    draw(px, py);
  }
}
function vertical(g, str, x, y0, size) {
  [...str].forEach((ch, i) => text(g, ch, x, y0 + i * size * 1.05, size));
}

const TILES = {
  // --- Bike Research Lab: Hongdae street art ---
  graffiti(g, ink) {
    g.lineWidth = 7; g.lineCap = 'round'; g.lineJoin = 'round';
    for (const [x, y, k] of [[10, 30, 1], [60, 86, -1]]) {
      g.beginPath(); g.moveTo(x, y);
      g.bezierCurveTo(x + 20, y - 26 * k, x + 34, y + 30 * k, x + 50, y);
      g.bezierCurveTo(x + 60, y - 18 * k, x + 70, y + 14 * k, x + 58, y + 14);
      g.stroke();
    }
    g.lineWidth = 3;
    g.beginPath(); g.arc(100, 26, 9, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.arc(24, 104, 6, 0, Math.PI * 2); g.fill();
  },
  checker(g, ink) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) g.fillRect(i * 32, j * 32, 32, 32);
  },
  drip(g) {
    g.fillRect(0, 0, S, 18);
    for (const [x, len, w] of [[8, 60, 10], [34, 34, 8], [58, 88, 12], [86, 46, 9], [110, 70, 10]]) {
      g.fillRect(x - w / 2, 10, w, len);
      g.beginPath(); g.arc(x, 10 + len, w / 2 + 1, 0, Math.PI * 2); g.fill();
    }
  },
  splat(g) {
    for (const [x, y, r] of [[34, 36, 20], [96, 92, 16], [100, 20, 9], [22, 100, 8]]) wrap(x, y, r * 2, (px, py) => {
      g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill();
      for (let k = 0; k < 7; k++) {
        const a = k * 0.9 + r, d = r * (1.2 + (k % 3) * 0.25);
        g.beginPath(); g.arc(px + Math.cos(a) * d, py + Math.sin(a) * d, r * 0.22, 0, Math.PI * 2); g.fill();
      }
    });
  },
  // --- RIDE WITH ME: Itaewon nights ---
  flame(g, ink, color) {
    const tongue = (x, w, h, fill) => {
      g.fillStyle = fill;
      g.beginPath(); g.moveTo(x - w, S);
      g.bezierCurveTo(x - w, S - h * 0.5, x - w * 0.2, S - h * 0.6, x, S - h);
      g.bezierCurveTo(x + w * 0.3, S - h * 0.6, x + w, S - h * 0.5, x + w, S);
      g.fill();
    };
    for (const [x, w, h] of [[16, 18, 90], [52, 20, 120], [88, 18, 80], [120, 16, 104]]) tongue(x, w, h, '#ff6b2c');
    for (const [x, w, h] of [[16, 10, 50], [52, 11, 72], [88, 10, 44], [120, 9, 60]]) tongue(x, w, h, '#ffd23f');
    g.fillStyle = ink;
  },
  stripe(g) {
    g.fillRect(0, 34, S, 18);
    g.fillRect(0, 76, S, 18);
  },
  dots(g) {
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      g.beginPath(); g.arc(i * 32 + (j % 2 ? 16 : 0) + 8, j * 32 + 16, 7, 0, Math.PI * 2); g.fill();
    }
  },
  wave(g) {
    g.lineWidth = 6;
    for (const y0 of [24, 64, 104]) {
      g.beginPath();
      for (let x = 0; x <= S; x += 4) g.lineTo(x, y0 + Math.sin((x / S) * Math.PI * 4) * 9);
      g.stroke();
    }
  },
  // --- Hangeul Mihak: the Hunminjeongeum line (limited) ---
  // 訓民正音 in Hangul, set in columns like the 1446 book.
  hunmin(g) {
    vertical(g, '훈민', 88, 20, 26);
    vertical(g, '정음', 40, 72, 26);
    g.fillRect(64, 0, 2, S);
  },
  // The book's first line, top to bottom and right to left.
  naratmal(g) {
    vertical(g, '나랏말', 104, 14, 18);
    vertical(g, '싸미듕', 64, 14, 18);
    vertical(g, '귁에달', 24, 14, 18);
    for (const x of [84, 44]) g.fillRect(x, 0, 1.5, S);
  },
  // Heaven, earth and person: the three strokes every vowel is built from.
  cheonjiin(g) {
    g.beginPath(); g.arc(28, 30, 11, 0, Math.PI * 2); g.fill();
    g.fillRect(52, 24, 64, 11);
    g.fillRect(28, 60, 11, 58);
    g.beginPath(); g.arc(92, 86, 11, 0, Math.PI * 2); g.fill();
    g.fillRect(56, 112, 44, 7);
  },
  // The five basic consonants, shaped after the mouth: ㄱ ㄴ ㅁ ㅅ ㅇ.
  jaeum(g) {
    for (const [ch, x, y] of [['ㄱ', 24, 26], ['ㄴ', 70, 30], ['ㅁ', 110, 64], ['ㅅ', 30, 90], ['ㅇ', 78, 104]]) text(g, ch, x, y, 34, 900);
  },
  moeum(g) {
    for (const [ch, x, y] of [['ㅏ', 22, 24], ['ㅓ', 64, 20], ['ㅗ', 106, 30], ['ㅜ', 40, 66], ['ㅡ', 92, 72], ['ㅣ', 18, 108], ['ㅑ', 64, 110], ['ㅠ', 108, 108]]) text(g, ch, x, y, 28, 900);
  },
  gana(g) {
    const row = ['가', '나', '다', '라', '마', '바', '사', '아', '자'];
    row.forEach((ch, i) => text(g, ch, 22 + (i % 3) * 42, 22 + Math.floor(i / 3) * 42, 26));
  },
  // A red name seal (dojang) with the four syllables in a square.
  dojang(g) {
    for (const [x, y] of [[36, 36], [100, 100]]) {
      g.fillStyle = '#b3261e';
      g.fillRect(x - 24, y - 24, 48, 48);
      g.fillStyle = '#fff3e6';
      g.fillRect(x - 20, y - 20, 40, 40);
      g.fillStyle = '#b3261e';
      text(g, '훈', x + 9, y - 9, 17, 900); text(g, '민', x + 9, y + 10, 17, 900);
      text(g, '정', x - 9, y - 9, 17, 900); text(g, '음', x - 9, y + 10, 17, 900);
    }
  },
  // A woodblock page: ruled columns and a border, jamo in the columns.
  panbon(g) {
    g.lineWidth = 3;
    g.strokeRect(6, 6, S - 12, S - 12);
    g.lineWidth = 1.5;
    for (let x = 6 + 23; x < S - 6; x += 23) { g.beginPath(); g.moveTo(x, 6); g.lineTo(x, S - 6); g.stroke(); }
    ['ㄱ', 'ㅋ', 'ㅇ', 'ㄷ', 'ㅌ'].forEach((ch, i) => vertical(g, ch + ch, 17 + i * 23, 34, 16));
  },
  // Every consonant from ㄱ to ㅎ in little round badges.
  'jamo-ring'(g, ink, color) {
    const all = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ', 'ㄲ', 'ㅆ'];
    all.forEach((ch, i) => {
      const x = 16 + (i % 4) * 32, y = 16 + Math.floor(i / 4) * 32;
      g.fillStyle = ink;
      g.beginPath(); g.arc(x, y, 13, 0, Math.PI * 2); g.fill();
      g.fillStyle = color;
      text(g, ch, x, y + 1, 16, 900);
    });
    g.fillStyle = ink;
  },
  // Brush calligraphy: 한글 in big strokes.
  brush(g) {
    text(g, '한', 36, 36, 46, 900);
    text(g, '글', 92, 90, 46, 900);
    g.beginPath(); g.arc(104, 26, 4, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(22, 104, 3, 0, Math.PI * 2); g.fill();
  },
};

export const TILE_PATTERNS = Object.keys(TILES);

// Draw a shop pattern over the whole tile. Returns false for patterns that
// are drawn as scattered motifs instead (rides.js).
export function drawPatternTile(g, pattern, ink, color) {
  const draw = TILES[pattern];
  if (!draw) return false;
  g.fillStyle = ink;
  g.strokeStyle = ink;
  draw(g, ink, color);
  return true;
}
