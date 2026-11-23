// Sounds for the board games (ui/board-games-ui.js), made live with the
// game's sound effects helper (core/music.js Sfx: tones and filtered noise,
// no audio files). Each game gets its own: a stone on wood, a card turning,
// the bell, a tooth clicking down, blocks sliding and crashing... Loaded
// with the panel.
//
// playBoardSound(sfx, kind, game, info): kind is what happened ('move',
// 'pair', 'ring', 'wrong', 'dice', 'bang', 'win', 'lose'); info.placing: the
// tower fell as the block went on top (the crash comes later).
export function playBoardSound(sfx, kind, game, info = {}) {
  if (!sfx?.on || !sfx._ctx()) return;
  const tone = (...a) => sfx._tone(...a), hiss = (...a) => sfx._hiss(...a);
  const card = (at = 0) => hiss(at, 0.09, 0.09, 5200, 1800);
  const stone = (at = 0) => { tone(430, at, 0.07, 0.22, 'triangle', 170); hiss(at, 0.03, 0.05, 2600, 900); };
  if (kind === 'win') { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, i === 3 ? 0.5 : 0.16, 0.14, 'triangle')); return; }
  if (kind === 'lose') { [392, 330, 262].forEach((f, i) => tone(f, i * 0.16, 0.28, 0.12, 'sine')); return; }
  if (kind === 'dice') { for (let i = 0; i < 7; i++) { const at = i * 0.095 + (i % 2) * 0.025; tone(520 + ((i * 197) % 520), at, 0.05, 0.1 + (i % 3) * 0.03, 'triangle', 300); hiss(at, 0.025, 0.04, 3200, 1500); } return; }
  if (kind === 'ring') { tone(1760, 0, 0.9, 0.16); tone(2637, 0, 0.7, 0.09); tone(3520, 0.01, 0.4, 0.05); return; }
  if (kind === 'wrong') { tone(1760, 0, 0.25, 0.1); tone(300, 0.12, 0.3, 0.12, 'sawtooth', 190); return; }
  if (kind === 'pair') { card(); card(0.09); tone(880, 0.12, 0.12, 0.1, 'triangle'); tone(1320, 0.22, 0.2, 0.1, 'triangle'); return; }
  if (kind === 'bang') {
    if (game === 'croc') { tone(170, 0.14, 0.25, 0.3, 'sawtooth', 55); hiss(0.14, 0.12, 0.22, 2400, 500); }
    else if (game === 'bulldog') { for (const at of [0.38, 0.62, 0.95]) { tone(390, at, 0.16, 0.26, 'sawtooth', 230); hiss(at, 0.1, 0.1, 1800, 700); } }
    else if (game === 'pirate') { tone(220, 0, 0.35, 0.22, 'sine', 900); hiss(0, 0.2, 0.12, 1500, 4500); }
    else if (game === 'tower') { const t0 = info.placing ? 0.76 : 0.3; for (let i = 0; i < 12; i++) { const at = t0 + i * 0.07 + (i % 3) * 0.02; tone(150 + ((i * 83) % 260), at, 0.09, 0.2 - i * 0.012, 'triangle', 90); hiss(at, 0.05, 0.1 - i * 0.006, 2200, 600); } }
    else { tone(220, 0, 0.3, 0.2, 'sawtooth', 110); }
    return;
  }
  // An ordinary move.
  if (game === 'omok' || game === 'ladders') stone();
  else if (game === 'fruitbell' || game === 'thief' || game === 'onecard') card();
  else if (game === 'croc') { tone(760, 0, 0.05, 0.14, 'square', 360); }
  else if (game === 'bulldog') { tone(520, 0.3, 0.06, 0.14, 'triangle', 300); hiss(0, 0.25, 0.04, 1200, 2600); } // (a whoosh, then the bone lands)
  else if (game === 'pirate') { hiss(0, 0.07, 0.1, 6000, 3000); tone(1250, 0.04, 0.1, 0.08, 'triangle', 900); }
  else if (game === 'tower') { hiss(0, 0.3, 0.07, 900, 1700); tone(360, 0.74, 0.06, 0.16, 'triangle', 200); } // (sliding out, then set down on top)
  else sfx.tock(0.5, 900);
}
