// Board game sets for your home (Yozi 2026-11-23): bought at the board game
// café in Hongdae (stores.json "dice-and-tea"), put down with Decorate, and
// then the host can ask visitors to a game right there (game/board-games.js).
// A home set costs more than a plant: with one you need not go to the café,
// and friends gather at a home easily (Yozi). Each is a low play table with
// the game laid out on it; shapes and names are our own.
// [furniture id, game id (core/board-games.js), emoji, price (won), name, build(box)]
// Off for now (Yozi 2026-11-23): people should meet outside at the café for a
// while, so the café doesn't sell the sets. Set to true to sell them again.
export const BOARD_SETS_ON_SALE = false;
const WOOD = '#b98a58', LEG = '#7a5232';
const N = (en, ko, ja, zh) => ({ en, ko, ja, zh });
// box(sx, sy, sz, x, y, z, colour); the table top is at 0.42.
const T = 0.42;
export const BOARD_SETS = [
  ['bg-omok', 'omok', '⚫', 60000, N('Omok set', '오목 세트', '五目並べセット', '五子棋套装'), (b) => {
    b(0.5, 0.05, 0.5, 0, T + 0.025, 0, '#e8c27a');
    for (let i = 0; i < 6; i++) b(0.05, 0.02, 0.05, -0.15 + (i % 3) * 0.14, T + 0.06, -0.08 + Math.floor(i / 3) * 0.14, (i + Math.floor(i / 3)) % 2 ? '#fbfaf6' : '#1d1b22');
  }],
  ['bg-fruitbell', 'fruitbell', '🔔', 60000, N('Fruit Bell set', '과일 종치기 세트', 'フルーツベルセット', '水果铃套装'), (b) => {
    b(0.14, 0.04, 0.14, 0, T + 0.02, 0, '#c99412');
    b(0.1, 0.07, 0.1, 0, T + 0.075, 0, '#f2c230');
    for (const [x, z] of [[-0.2, 0], [0.2, 0], [0, -0.2], [0, 0.2]]) b(0.1, 0.012, 0.14, x, T + 0.006, z, '#fffdf6');
  }],
  ['bg-croc', 'croc', '🐊', 40000, N('Croc Teeth toy', '악어 이빨 장난감', 'ワニの歯のおもちゃ', '鳄鱼牙齿玩具'), (b) => {
    b(0.26, 0.07, 0.42, 0, T + 0.035, 0, '#58a765');
    b(0.2, 0.012, 0.34, 0, T + 0.076, 0.02, '#f39aa6');
    b(0.26, 0.09, 0.14, 0, T + 0.12, -0.16, '#3f8550');
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) b(0.03, 0.035, 0.03, s * 0.1, T + 0.095, -0.02 + i * 0.08, '#fffdf4');
  }],
  ['bg-pirate', 'pirate', '🏴‍☠️', 40000, N('Barrel Pirate toy', '통 속 해적 장난감', '樽の海賊のおもちゃ', '木桶海盗玩具'), (b) => {
    b(0.22, 0.26, 0.22, 0, T + 0.13, 0, '#8a5a33');
    for (const y of [0.06, 0.2]) b(0.24, 0.02, 0.24, 0, T + y, 0, '#3a3a3e');
    b(0.12, 0.1, 0.12, 0, T + 0.31, 0, '#e8b68c');
    b(0.13, 0.04, 0.13, 0, T + 0.37, 0, '#d43d3d');
    b(0.2, 0.012, 0.02, 0.18, T + 0.14, 0, '#c0c4ca');
  }],
  ['bg-bulldog', 'bulldog', '🐶', 40000, N('Sleepy Bulldog toy', '우리 개는 안 물어요 장난감', '眠りブルドッグのおもちゃ', '瞌睡斗牛犬玩具'), (b) => {
    b(0.24, 0.14, 0.3, 0, T + 0.07, -0.06, '#c9a27a');
    b(0.2, 0.14, 0.16, 0, T + 0.15, 0.06, '#d8b48c');
    for (const s of [-1, 1]) b(0.05, 0.07, 0.04, s * 0.09, T + 0.2, 0.02, '#8a6a4c');
    b(0.16, 0.03, 0.12, 0, T + 0.015, 0.22, '#d43d3d');
    b(0.08, 0.02, 0.03, 0, T + 0.04, 0.22, '#fffdf4');
  }],
  ['bg-thief', 'thief', '🕵️', 60000, N('Catch the Thief cards', '도둑잡기 카드', 'どろぼう探しカード', '抓小偷纸牌'), (b) => {
    b(0.14, 0.05, 0.2, -0.08, T + 0.025, 0, '#3f6fb5');
    for (let i = 0; i < 3; i++) b(0.1, 0.008, 0.15, 0.12 + i * 0.04, T + 0.004 + i * 0.008, -0.04 + i * 0.04, i === 2 ? '#fff3c4' : '#fffdf6');
  }],
  ['bg-ladders', 'ladders', '🐍', 60000, N('Snakes & Ladders set', '뱀사다리 세트', 'ヘビとはしごセット', '蛇梯棋套装'), (b) => {
    b(0.52, 0.03, 0.52, 0, T + 0.015, 0, '#f6ecd8');
    for (let i = 0; i < 8; i++) b(0.12, 0.004, 0.12, -0.195 + (i % 4) * 0.13, T + 0.032, (i < 4 ? -0.13 : 0.13) + (i % 2 ? 0.065 : -0.065), '#cfe6c0');
    b(0.03, 0.01, 0.34, -0.1, T + 0.04, 0, '#a8703a').rotation.y = 0.5;
    b(0.04, 0.012, 0.36, 0.12, T + 0.04, 0, '#4caf6a').rotation.y = -0.4;
    b(0.05, 0.05, 0.05, 0.2, T + 0.055, 0.2, '#fffdf6');
  }],
  ['bg-tower', 'tower', '🧱', 60000, N('Block Tower set', '탑 쌓기 세트', 'ブロックタワーセット', '积木塔套装'), (b) => {
    for (let l = 0; l < 7; l++) for (let i = -1; i <= 1; i++) {
      const m = b(0.05, 0.035, 0.16, l % 2 ? 0 : i * 0.054, T + 0.0175 + l * 0.036, l % 2 ? i * 0.054 : 0, i ? '#e2bd84' : '#d4a96a');
      if (l % 2) m.rotation.y = Math.PI / 2;
    }
  }],
].map(([id, game, emoji, price, name, make]) => ({
  id, game, emoji, price, name, size: [0.8, 0.8],
  build(box) {
    box(0.74, 0.04, 0.74, 0, T - 0.02, 0, WOOD);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.05, T - 0.04, 0.05, sx * 0.31, (T - 0.04) / 2, sz * 0.31, LEG);
    make(box);
  },
}));
export const BOARD_SET_IDS = BOARD_SETS.map((s) => [s.id, s.emoji, s.name]);
// Which game a furniture piece is a set of (null: not one).
export const boardGameOf = (id) => BOARD_SETS.find((s) => s.id === id)?.game ?? null;
