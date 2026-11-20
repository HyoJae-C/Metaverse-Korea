// What the orchestra plays in the Opera Theater (core/stage-show.js), as
// written notes that core/concert-player.js plays live: no recordings. Every
// piece here was written long ago and its score is out of copyright.
// Loaded with the room, not in the first download.
//
// A score: { id, title, by, year, bpm, beats, kind, voices }.
//   beats: how long it lasts; kind: what the dancers do (core/stage-show.js).
//   voices: [{ inst, vol, n }], inst one of core/concert-player.js VOICES,
//   n: notes as [beat, length in beats, MIDI note].
//
// To write a part by hand use seq(): 'F#5:2 B4:.5 r:1 [B3 D4]:4' is a note
// name and octave, a colon and its length in beats; r is a rest; notes in
// square brackets sound together. at(beat, part) moves a part later.
const STEP = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
export const midiOf = (name) => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(name); if (!m) throw new Error('note ' + name); return STEP[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + (Number(m[3]) + 1) * 12; };
export function seq(text) {
  const out = [];
  let beat = 0;
  for (const tok of text.replace(/\|/g, ' ').match(/\[[^\]]+\]:[\d.]+|\S+/g) || []) {
    const i = tok.lastIndexOf(':'), len = Number(tok.slice(i + 1)), what = tok.slice(0, i);
    if (!(len > 0)) throw new Error('length ' + tok);
    if (what !== 'r') for (const name of what.replace(/[[\]]/g, ' ').trim().split(/\s+/)) out.push([beat, len, midiOf(name)]);
    beat += len;
  }
  out.beats = beat;
  return out;
}
export const at = (beat, notes, up = 0) => notes.map(([b, d, m]) => [b + beat, d, m + up]);
const loud = (notes, k) => notes.map(([b, d, m]) => [b, d, m, k]);

// --- Swan Lake: the swan theme (Tchaikovsky, 1877; Act II, Scene) ---------------
// The oboe sings it over the harp and trembling strings; then the whole
// orchestra takes it up, the horns leading.
const swanTune = seq(`
  F#5:2 B4:.5 C#5:.5 D5:.5 E5:.5 | F#5:1.5 D5:.5 F#5:1.5 D5:.5 |
  F#5:1.5 B4:.5 D5:.5 B4:.5 G4:.5 D5:.5 | B4:3 r:1`);
const harpBar = (chord) => seq(chord === 'G'
  ? 'G2:.25 D3:.25 G3:.25 B3:.25 D4:.25 G4:.25 B4:.25 D5:.25'
  : 'B2:.25 F#3:.25 B3:.25 D4:.25 F#4:.25 B4:.25 D5:.25 F#5:.25');
const swanBars = ['Bm', 'Bm', 'BmG', 'Bm']; // the harmony of the tune's four bars
const swanHarp = (from) => swanBars.flatMap((c, i) => (c === 'BmG'
  ? [...at(from + i * 4, harpBar('Bm')), ...at(from + i * 4 + 2, harpBar('G'))]
  : [...at(from + i * 4, harpBar('Bm')), ...at(from + i * 4 + 2, harpBar('Bm'))]));
const swanPad = (from) => swanBars.flatMap((c, i) => (c === 'BmG'
  ? [...at(from + i * 4, seq('[B3 D4 F#4]:2 [B3 D4 G4]:2'))]
  : [...at(from + i * 4, seq('[B3 D4 F#4]:4'))]));
const swanBass = (from) => swanBars.flatMap((c, i) => at(from + i * 4, seq(c === 'BmG' ? 'B2:2 G2:2' : 'B2:4')));
const SWAN = {
  id: 'swan-lake', kind: 'swans', bpm: 76, beats: 68,
  title: { en: 'Swan Lake: Swan Theme', ko: '백조의 호수: 백조의 주제', ja: '白鳥の湖：白鳥の主題', zh: '天鹅湖：天鹅主题' },
  by: { en: 'Tchaikovsky', ko: '차이콥스키', ja: 'チャイコフスキー', zh: '柴可夫斯基' }, year: 1877,
  voices: [
    { inst: 'oboe', vol: 0.05, n: [...swanTune, ...at(16, swanTune)] },
    { inst: 'harp', vol: 0.03, n: [0, 16, 32, 48].flatMap(swanHarp) },
    { inst: 'strings', vol: 0.012, n: [0, 16].flatMap(swanPad) },
    { inst: 'bass', vol: 0.05, n: [0, 16, 32, 48].flatMap(swanBass) },
    // the whole orchestra
    { inst: 'horn', vol: 0.05, n: [...at(32, swanTune, -12), ...at(48, swanTune, -12)] },
    { inst: 'strings', vol: 0.034, n: [...at(32, swanTune), ...at(48, swanTune), ...at(32, swanTune, 12), ...at(48, swanTune, 12)] },
    { inst: 'cello', vol: 0.03, n: [32, 48].flatMap(swanPad).map(([b, d, m]) => [b, d, m - 12]) },
    { inst: 'timpani', vol: 0.09, n: loud([[32, 2, 47], [36, 1, 47], [40, 1, 47], [44, 2, 47], [48, 2, 47], [52, 1, 47], [56, 1, 47], [60, 4, 47]], 1) },
    { inst: 'strings', vol: 0.03, n: at(64, seq('[B3 F#4 B4 D5]:4')) }, // the last chord, held
    { inst: 'bass', vol: 0.05, n: at(64, seq('B1:4')) },
  ],
};

// Several times over, one after another: rep(part, times).
const rep = (notes, times, len = notes.beats) => Array.from({ length: times }, (_, i) => at(i * len, notes)).flat();
const up = (notes, semis) => at(0, notes, semis);
// Bars of accompaniment: bars(length of a bar, [text of each bar]).
const bars = (len, list) => list.flatMap((text, i) => at(i * len, seq(text)));

// --- Rigoletto: La donna è mobile (Verdi, 1851; Act III) -------------------------
// The Duke's song, in B major, three quavers to the bar (a beat here is a
// quaver; the conductor beats one to the bar). The orchestra plays the tune
// first, as in the opera; no one sings here, so the oboe and then the violins
// take the Duke's line.
const donnaTune = seq(`
  D#5:1 D#5:1 D#5:1 | F#5:1.5 E5:.5 C#5:1 | C#5:1 C#5:1 C#5:1 | E5:1.5 D#5:.5 B4:1 |
  D#5:1 C#5:1 B4:1 | B4:1.5 A#4:.5 C#5:1 | C#5:1 B4:1 A#4:1 | A#4:1.5 G#4:.5 B4:1`);
const donnaI = 'B2:1 [F#3 B3 D#4]:.5 r:.5 [F#3 B3 D#4]:.5 r:.5', donnaV = 'F#2:1 [F#3 A#3 E4]:.5 r:.5 [F#3 A#3 E4]:.5 r:.5';
const donnaBars = bars(3, [donnaI, donnaV, donnaV, donnaI, donnaI, donnaV, donnaV, 'F#2:1 [F#3 A#3 E4]:.5 r:.5 [F#3 B3 D#4]:.5 r:.5']);
const pick = (notes, low) => notes.filter(([, , m]) => (m < 52) === low); // the bass notes, or the chords above them
const DONNA = {
  id: 'la-donna-e-mobile', kind: 'ballet', bpm: 132, pulse: 3, beats: 80,
  title: { en: 'Rigoletto: La donna è mobile', ko: '리골레토: 여자의 마음', ja: 'リゴレット：女心の歌', zh: '弄臣：女人善变' },
  by: { en: 'Verdi', ko: '베르디', ja: 'ヴェルディ', zh: '威尔第' }, year: 1851,
  voices: [
    { inst: 'flute', vol: 0.05, n: [...up(donnaTune, 12), ...at(48, up(donnaTune, 12))] },
    { inst: 'oboe', vol: 0.05, n: at(24, donnaTune) },
    { inst: 'strings', vol: 0.03, n: [...donnaTune, ...at(48, donnaTune)] },
    { inst: 'brass', vol: 0.028, n: at(48, donnaTune, -12) },
    { inst: 'pizz', vol: 0.05, n: rep(pick(donnaBars, false), 3, 24) },
    { inst: 'bass', vol: 0.06, n: rep(pick(donnaBars, true), 3, 24) },
    { inst: 'timpani', vol: 0.08, n: [48, 54, 60, 66].flatMap((b) => [[b, 1, 47], [b + 3, 1, 42]]) },
    // the close: dominant, tonic
    { inst: 'strings', vol: 0.034, n: at(72, seq('[F#3 A#3 C#4 E4 F#5]:3 [B3 D#4 F#4 B4 B5]:5')) },
    { inst: 'brass', vol: 0.03, n: at(72, seq('[F#3 C#4]:3 [B2 F#3 B3]:5')) },
    { inst: 'bass', vol: 0.06, n: at(72, seq('F#2:3 B1:5')) },
    { inst: 'timpani', vol: 0.09, n: [[72, 1, 42], [75, 4, 47]] },
  ],
};

// --- Orpheus in the Underworld: the Can-can (Offenbach, 1858; Galop infernal) ----
// D major, two in a bar and fast. Flutes and plucked strings first, then
// everyone, louder each time round.
const canTune = seq(`
  D5:1 D5:1 | E5:.5 G5:.5 F#5:.5 E5:.5 | A5:1 A5:1 | B5:.5 F#5:.5 G5:.5 E5:.5 |
  E5:1 E5:1 | G5:.5 F#5:.5 E5:.5 D5:.5 | D6:.5 C#6:.5 B5:.5 A5:.5 | G5:.5 F#5:.5 E5:.5 r:.5`);
const canD = 'D3:.5 [F#3 A3 D4]:.5 A2:.5 [F#3 A3 D4]:.5', canA = 'A2:.5 [G3 A3 C#4]:.5 E3:.5 [G3 A3 C#4]:.5', canE = 'E3:.5 [G3 B3 E4]:.5 A2:.5 [G3 A3 C#4]:.5';
const canBars = bars(2, [canD, canA, canD, canE, canA, canA, canD, canA]);
const canPick = (low) => canBars.filter(([, , m]) => (m <= 52) === low);
const CANCAN = {
  id: 'can-can', kind: 'cancan', bpm: 152, pulse: 2, beats: 73,
  title: { en: 'Orpheus in the Underworld: Can-can', ko: '천국과 지옥: 캉캉', ja: '天国と地獄：カンカン', zh: '地狱中的奥菲欧：康康舞曲' },
  by: { en: 'Offenbach', ko: '오펜바흐', ja: 'オッフェンバック', zh: '奥芬巴赫' }, year: 1858,
  voices: [
    { inst: 'pizz', vol: 0.05, n: [...at(0, seq(canD)), ...at(2, seq(canD)), ...rep(canPick(false), 4, 16).map(([b, d, m]) => [b + 4, d, m])] },
    { inst: 'bass', vol: 0.06, n: [...at(0, seq('D2:.5 r:.5 A1:.5 r:.5 D2:.5 r:.5 A1:.5 r:.5')), ...rep(canPick(true), 4, 16).map(([b, d, m]) => [b + 4, d, m - 12])] },
    { inst: 'flute', vol: 0.055, n: [4, 20, 36, 52].flatMap((b) => at(b, canTune, 12)) },
    { inst: 'strings', vol: 0.032, n: [20, 36, 52].flatMap((b) => at(b, canTune)) },
    { inst: 'brass', vol: 0.03, n: [36, 52].flatMap((b) => at(b, canTune, -12)) },
    { inst: 'timpani', vol: 0.08, n: [...Array.from({ length: 16 }, (_, i) => [36 + i * 2, 0.5, i % 2 ? 45 : 50]), [68, 1, 50], [70, 3, 50]] },
    // the close: three chords
    { inst: 'strings', vol: 0.036, n: at(68, seq('[D4 F#4 A4 D5 D6]:.5 r:.5 [A3 C#4 E4 A4 A5]:.5 r:.5 [D4 F#4 A4 D5 D6]:3')) },
    { inst: 'brass', vol: 0.032, n: at(68, seq('[D3 A3 D4]:.5 r:.5 [A2 E3 A3]:.5 r:.5 [D3 A3 D4 F#4]:3')) },
    { inst: 'bass', vol: 0.06, n: at(68, seq('D2:.5 r:.5 A1:.5 r:.5 D2:3')) },
  ],
};

// --- Die Walküre: Ride of the Valkyries (Wagner, 1856; Act III) ------------------
// B minor, three to the bar, each a dotted crotchet (a beat here). The horns
// call first over shaking strings, then the trumpets and trombones with the
// whole orchestra.
const call = (x, y, z, w) => `${x}:.5 ${y}:.1667 ${x}:.3333 ${z}:1 ${w}:1`;
const rideTune = seq(`${call('B3', 'F#3', 'D4', 'B3')} ${call('D4', 'B3', 'F#4', 'D4')} ${call('F#4', 'D4', 'A4', 'A3')} D4:.5 A3:.1667 D4:.3333 F#4:2`);
const shake = (chord, beats) => seq(Array.from({ length: beats * 3 }, () => `[${chord}]:.3333`).join(' ')); // the strings, three to a beat
const rideShake = [...shake('B4 D5 F#5', 6), ...at(6, shake('A4 D5 F#5', 6))];
const rideBass = seq('B2:3 B2:3 D3:3 D3:3');
const RIDE = {
  id: 'ride-of-the-valkyries', kind: 'ballet', bpm: 84, beats: 34,
  title: { en: 'Die Walküre: Ride of the Valkyries', ko: '발퀴레: 발퀴레의 기행', ja: 'ワルキューレ：ワルキューレの騎行', zh: '女武神：女武神的骑行' },
  by: { en: 'Wagner', ko: '바그너', ja: 'ワーグナー', zh: '瓦格纳' }, year: 1856,
  voices: [
    { inst: 'strings', vol: 0.014, n: [...shake('B4 D5 F#5', 3), ...at(3, rideShake), ...at(15, rideShake)] },
    { inst: 'flute', vol: 0.03, n: seq('F#5:.3333 G5:.3333 F#5:.3333 G5:.3333 F#5:.3333 G5:.3333 F#5:1') },
    { inst: 'horn', vol: 0.07, n: [...at(3, rideTune), ...at(15, rideTune)] },
    { inst: 'brass', vol: 0.045, n: at(15, rideTune, 12) },
    { inst: 'cello', vol: 0.03, n: [...at(3, rideBass, 12), ...at(15, rideBass, 12)] },
    { inst: 'bass', vol: 0.06, n: [...seq('B2:3'), ...at(3, rideBass), ...at(15, rideBass)] },
    { inst: 'timpani', vol: 0.09, n: [15, 18, 21, 24].flatMap((b) => [[b, 1, 47], [b + 2, 0.5, 42]]) },
    // the close: F sharp, then B minor held
    { inst: 'brass', vol: 0.045, n: at(27, seq('[F#3 A#3 C#4 F#4]:2 [B2 F#3 B3 D4 F#4]:5')) },
    { inst: 'strings', vol: 0.034, n: at(27, seq('[F#4 A#4 C#5 F#5]:2 [B3 D4 F#4 B4 B5]:5')) },
    { inst: 'bass', vol: 0.06, n: at(27, seq('F#2:2 B1:5')) },
    { inst: 'timpani', vol: 0.1, n: [[27, 1, 42], [28, 1, 42], [29, 4, 47]] },
  ],
};

// The evening's order: ballet, an aria, the Valkyries, and the can-can to finish.
export const OPERA_PROGRAM = [SWAN, DONNA, RIDE, CANCAN];
for (const s of OPERA_PROGRAM) for (const v of s.voices) v.n.sort((a, b) => a[0] - b[0]); // (the player reads each part in order)
