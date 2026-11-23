// A tune of its own for each board game (Yozi 2026-11-23), as recipes for
// the game's music player (core/music.js: made live with Web Audio, no
// audio files, every tune original). Kept simple on purpose. Loaded with
// the board games panel; plays only if the player has music on, and the
// song that was playing comes back when the game is left.
//   omok: calm and old-style (a slow gayageum over a soft drone)
//   thief: silly (a bouncing, swung tune with a rim click)
//   croc / pirate / bulldog / tower: suspense (a quick minor pulse)
//   fruitbell / ladders: light and cheerful
const CALM = {
  id: 'bg-calm', bpm: 62, swing: 1,
  chords: [[50, 57, 62, 64], [48, 55, 60, 64], [45, 52, 57, 60], [50, 57, 62, 64]], pad: true,
  bass: [38, 36, 33, 38], bassHits: [[0, 0, 3.2]],
  kick: [], snare: [], rim: [6], hat: null,
  scale: [62, 64, 67, 69, 72, 74, 76], melodyFrom: 0, melody: 0.55, lead: 'gayageum',
};
const SILLY = {
  id: 'bg-silly', bpm: 118, swing: 1.34,
  chords: [[60, 64, 67, 69], [65, 69, 72, 74], [62, 65, 69, 72], [67, 71, 74, 77]],
  bass: [36, 41, 38, 43], bassHits: [[0, 0, 0.5], [3, 7, 0.4], [4, 12, 0.5], [6, 7, 0.4]],
  kick: [0, 4], snare: [], rim: [2, 5, 6], hat: 'odd',
  scale: [72, 75, 76, 79, 81, 82, 84], melodyFrom: 0, melody: 0.62, lead: 'pluck',
};
const SUSPENSE = {
  id: 'bg-suspense', bpm: 132, swing: 1,
  chords: [[57, 60, 64, 69], [57, 60, 65, 69], [56, 59, 64, 68], [55, 59, 62, 67]],
  bass: [33, 29, 28, 31], octaveBass: true,
  kick: [0, 3, 6], snare: [4], rim: [7], hat: 'all',
  scale: [69, 71, 72, 76, 77, 81], melodyFrom: 16, melody: 0.3, lead: 'pluck',
};
const CHEERFUL = {
  id: 'bg-cheerful', bpm: 108, swing: 1.1,
  chords: [[60, 64, 67, 72], [57, 60, 64, 69], [65, 69, 72, 76], [67, 71, 74, 79]],
  bass: [36, 33, 41, 43], bassHits: [[0, 0, 0.9], [4, 7, 0.9]],
  kick: [0, 4], snare: [2, 6], brush: true, hat: 'odd',
  scale: [72, 74, 76, 79, 81, 84], melodyFrom: 8, melody: 0.5, lead: 'bell',
};

export const BOARD_TRACKS = {
  omok: CALM, thief: SILLY,
  croc: SUSPENSE, pirate: SUSPENSE, bulldog: SUSPENSE, tower: SUSPENSE,
  fruitbell: CHEERFUL, ladders: CHEERFUL, onecard: CHEERFUL,
};
