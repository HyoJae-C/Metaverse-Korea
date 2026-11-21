// Builds src/data/concert-scores.js: the classical programme of the Arts
// Center's Concert Hall, as written notes for core/concert-player.js.
//
// The notes come from scores typeset in LilyPond by volunteers of the Mutopia
// Project (https://www.mutopiaproject.org, sources on GitHub), every one a
// work long out of copyright in an edition its typesetter placed in the
// public domain (or, for the Canon, under CC BY 4.0: credited in SOURCES and
// in docs/CREDITS-MUSIC.md). `lilypond` turned each source into a MIDI file,
// kept in scripts/data/scores/ so this build needs no LilyPond:
//
//   lilypond -dno-print-pages -dbackend=null -o out source.ly
//
// (Für Elise with \unfoldRepeats; three old sources needed a line or two
// brought up to today's syntax; nothing about the notes was changed.)
// Here each piece is cut to a famous minute, set in its original key where
// the source is an arrangement, and given to the orchestra's instruments.
//
//   node scripts/build-concert-scores.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { readMidi } from './midi-notes.mjs';

const DIR = new URL('./data/scores/', import.meta.url);
const TICKS = 48; // per crotchet in the output (semiquaver triplets and demisemiquavers fit)
const MUTOPIA = 'Mutopia Project';

// A piece: file, the crotchets to take ([from, to] spans, played one after
// another), the tempo in crotchets a minute, `pulse` crotchets to one of the
// conductor's beats, `shift` semitones (arrangements back to the original
// key), `fade` crotchets of dying away at the end, and its parts:
//   { track, inst, vol, shift, low/high (only notes below/from this MIDI
//     note), min (only notes at least this long), pick, from/to (only between these output crotchets), len (a factor on
//     each note's length) }
export const PIECES = [
  {
    id: 'moonlight', file: 'moonlight.midi', kind: 'piano', bpm: 54, year: 1801, take: [[0, 60]], fade: 5, shift: -1,
    title: { en: 'Moonlight Sonata, 1st movement', ko: '월광 소나타 1악장', ja: '月光ソナタ 第1楽章', zh: '月光奏鸣曲 第一乐章' },
    by: { en: 'Beethoven', ko: '베토벤', ja: 'ベートーヴェン', zh: '贝多芬' },
    source: { by: 'Jeffrey Olson (after the setting for two guitars by Tárrega; put back in C sharp minor here)', id: 'Mutopia-2016/01/21-2101', licence: 'Public Domain' },
    parts: [
      { track: 0, inst: 'piano', vol: 0.05 },
      { track: 1, inst: 'piano', vol: 0.06 },
      { track: 1, inst: 'piano', vol: 0.05, shift: -12, high: 0, low: 50, min: 2 }, // the left hand's octaves, as on the piano
    ],
  },
  {
    id: 'symphony-5', file: 'sym5.midi', kind: 'orchestra', bpm: 184, pulse: 2, year: 1808, take: [[0, 111]], shift: -2,
    title: { en: 'Symphony No. 5, 1st movement', ko: '교향곡 5번 "운명" 1악장', ja: '交響曲第5番「運命」第1楽章', zh: '第五交响曲“命运” 第一乐章' },
    by: { en: 'Beethoven', ko: '베토벤', ja: 'ベートーヴェン', zh: '贝多芬' },
    source: { by: 'Jeffrey Olson (after the piano setting by Liszt; put back in C minor here)', id: 'Mutopia-2017/10/31-2202', licence: 'Public Domain' },
    parts: [
      { track: 0, inst: 'strings', vol: 0.034, shift: 12 },
      { track: 0, inst: 'clarinet', vol: 0.03, shift: 12, to: 22 }, // the opening: strings and clarinets
      { track: 0, inst: 'brass', vol: 0.026, from: 64 },
      { track: 1, inst: 'cello', vol: 0.034 },
      { track: 1, inst: 'bass', vol: 0.05, shift: -12, low: 55 },
      { track: 1, inst: 'horn', vol: 0.04, from: 64, min: 0.9 },
    ],
  },
  {
    id: 'ode-to-joy', file: 'ode.midi', kind: 'orchestra', bpm: 112, year: 1824, take: [[0, 64], [0, 64]],
    title: { en: 'Symphony No. 9: Ode to Joy', ko: '교향곡 9번 "합창": 환희의 송가', ja: '交響曲第9番：歓喜の歌', zh: '第九交响曲：欢乐颂' },
    by: { en: 'Beethoven', ko: '베토벤', ja: 'ベートーヴェン', zh: '贝多芬' },
    source: { by: 'Peter Chubb (the hymn setting in four parts)', id: 'Mutopia-2009/08/05-528', licence: 'Public Domain' },
    parts: [
      // the first time quietly on the low strings, as in the symphony; then everyone
      { track: 0, inst: 'cello', vol: 0.04, shift: -12, to: 64 },
      { track: 1, inst: 'cello', vol: 0.03, to: 64 },
      { track: 1, inst: 'bass', vol: 0.05, shift: -12, low: 53, to: 64 },
      { track: 0, inst: 'strings', vol: 0.034, shift: 12, from: 64 },
      { track: 0, inst: 'brass', vol: 0.03, from: 64 },
      { track: 0, inst: 'flute', vol: 0.03, shift: 12, low: 200, high: 66, from: 64 },
      { track: 1, inst: 'horn', vol: 0.04, from: 64 },
      { track: 1, inst: 'cello', vol: 0.034, from: 64 },
      { track: 1, inst: 'bass', vol: 0.055, shift: -12, low: 53, from: 64 },
    ],
    drums: { from: 64, every: 4, note: 43, vol: 0.08 },
  },
  {
    id: 'fur-elise', file: 'elise.midi', kind: 'piano', bpm: 66, pulse: 1.5, year: 1810, take: [[0, 45]],
    title: { en: 'Für Elise', ko: '엘리제를 위하여', ja: 'エリーゼのために', zh: '致爱丽丝' },
    by: { en: 'Beethoven', ko: '베토벤', ja: 'ベートーヴェン', zh: '贝多芬' },
    source: { by: 'Stelios Samelis', id: 'Mutopia-2015/08/18-931', licence: 'Public Domain' },
    parts: [{ track: 0, inst: 'piano', vol: 0.06 }, { track: 1, inst: 'piano', vol: 0.05 }],
  },
  {
    id: 'eine-kleine-nachtmusik', file: 'kleine.midi', kind: 'orchestra', bpm: 138, pulse: 2, year: 1787, take: [[0, 116]],
    title: { en: 'Eine kleine Nachtmusik, 1st movement', ko: '아이네 클라이네 나흐트무지크 1악장', ja: 'アイネ・クライネ・ナハトムジーク 第1楽章', zh: '小夜曲 第一乐章' },
    by: { en: 'Mozart', ko: '모차르트', ja: 'モーツァルト', zh: '莫扎特' },
    source: { by: 'an anonymous typesetter', id: 'Mutopia-2007/01/01-900', licence: 'Public Domain' },
    parts: [
      { track: 0, inst: 'strings', vol: 0.036 },
      { track: 1, inst: 'strings', vol: 0.028 },
      { track: 2, inst: 'cello', vol: 0.03 },
      { track: 3, inst: 'cello', vol: 0.034 },
      { track: 3, inst: 'bass', vol: 0.045, shift: -12 },
    ],
  },
  {
    id: 'air-on-the-g-string', file: 'air.midi', kind: 'orchestra', bpm: 36, pulse: 0.5, year: 1731, take: [[0, 24]], legato: 1,
    title: { en: 'Air on the G String', ko: 'G선상의 아리아', ja: 'G線上のアリア', zh: 'G弦上的咏叹调' },
    by: { en: 'J. S. Bach', ko: '바흐', ja: 'バッハ', zh: '巴赫' },
    source: { by: 'Mike Blackstock (a setting for flute and guitar after the Bach-Gesellschaft edition)', id: 'Mutopia-2008/10/28-1534', licence: 'Public Domain' },
    parts: [
      { track: 0, inst: 'strings', vol: 0.04 },
      { track: 1, inst: 'strings', vol: 0.018, pick: 'rest' }, // the inner parts
      { track: 1, inst: 'cello', vol: 0.036, pick: 'lowest', shift: -12 }, // the walking bass
      { track: 1, inst: 'bass', vol: 0.04, pick: 'lowest', shift: -24 },
    ],
  },
  {
    id: 'canon-in-d', file: 'canon.midi', kind: 'orchestra', bpm: 58, year: 1694, take: [[0, 64], [216, 225]],
    title: { en: 'Canon in D', ko: '캐논 D장조', ja: 'カノン ニ長調', zh: 'D大调卡农' },
    by: { en: 'Pachelbel', ko: '파헬벨', ja: 'パッヘルベル', zh: '帕赫贝尔' },
    source: { by: 'Michael Fischer v. Mollard', id: 'Mutopia-2015/09/02-2047', licence: 'Creative Commons Attribution 4.0' },
    parts: [
      { track: 0, inst: 'strings', vol: 0.034 },
      { track: 1, inst: 'strings', vol: 0.03 },
      { track: 2, inst: 'strings', vol: 0.028 },
      { track: 3, inst: 'cello', vol: 0.04 },
      { track: 3, inst: 'pizz', vol: 0.03, shift: 12 },
      { track: 3, inst: 'bass', vol: 0.045, shift: -12 },
    ],
  },
  {
    id: 'ave-maria', file: 'avemaria.midi', kind: 'orchestra', bpm: 34, pulse: 0.5, year: 1825, take: [[0, 32], [48, 56]], fade: 3, legato: 1,
    title: { en: 'Ave Maria', ko: '아베 마리아', ja: 'アヴェ・マリア', zh: '圣母颂' },
    by: { en: 'Schubert', ko: '슈베르트', ja: 'シューベルト', zh: '舒伯特' },
    source: { by: 'Ph. Raynaud (after the C. F. Peters edition)', id: 'Mutopia-2007/10/13-1054', licence: 'Public Domain' },
    parts: [
      { track: 0, inst: 'oboe', vol: 0.05 }, // the singer's line
      { track: 0, inst: 'strings', vol: 0.02, shift: 12 },
      { track: 1, inst: 'harp', vol: 0.03 },
      { track: 2, inst: 'cello', vol: 0.03 },
      { track: 2, inst: 'bass', vol: 0.04, low: 48 },
    ],
  },
  {
    id: 'clair-de-lune', file: 'clair.midi', kind: 'piano', bpm: 69, pulse: 1.5, year: 1905, take: [[0, 63]], fade: 4,
    title: { en: 'Clair de lune', ko: '달빛', ja: '月の光', zh: '月光' },
    by: { en: 'Debussy', ko: '드뷔시', ja: 'ドビュッシー', zh: '德彪西' },
    source: { by: 'Keith OHara (after the Fromont edition of 1905)', id: 'Mutopia-2010/12/21-1778', licence: 'Public Domain' },
    parts: [{ track: 0, inst: 'piano', vol: 0.06 }, { track: 1, inst: 'piano', vol: 0.055 }],
  },
];

// The notes of one piece: voices of [tick, length, midi, loudness in hundredths].
export function build(piece) {
  const m = readMidi(readFileSync(new URL(piece.file, DIR)));
  const tracks = m.tracks.filter((t) => t.notes.length);
  const q = (ticks) => ticks / m.ppq;
  let total = 0;
  const spans = piece.take.map(([a, b]) => { const s = { a, b, at: total }; total += b - a; return s; });
  const voices = piece.parts.map((part) => {
    const src = tracks[part.track];
    if (!src) throw new Error(`${piece.id}: no track ${part.track}`);
    const out = [];
    // pick: 'lowest' = the lowest note of each moment (the bass line of a
    // part written on one staff), 'rest' = everything above it.
    const lowest = new Map();
    if (part.pick) for (const [t0, , pitch] of src.notes) if (!lowest.has(t0) || pitch < lowest.get(t0)) lowest.set(t0, pitch);
    for (const s of spans) {
      for (const [t0, d0, pitch] of src.notes) {
        if (part.pick && (part.pick === 'lowest') !== (lowest.get(t0) === pitch)) continue;
        const start = q(t0);
        if (start < s.a - 1e-6 || start >= s.b - 1e-6) continue;
        if (part.low != null && pitch >= part.low) continue;
        if (part.high != null && pitch < part.high) continue;
        if (part.min != null && q(d0) < part.min) continue;
        const at = s.at + start - s.a;
        if (part.from != null && at < part.from) continue;
        if (part.to != null && at >= part.to) continue;
        const len = Math.min(q(d0), s.b - start) * (part.len || 1); // (a note held over the cut ends at it)
        const fade = piece.fade ? Math.min(1, Math.max(0.15, (total - at) / piece.fade)) : 1;
        out.push([Math.round(at * TICKS), Math.max(1, Math.round(len * TICKS)), pitch + (piece.shift || 0) + (part.shift || 0), Math.round(fade * 100)]);
      }
    }
    out.sort((x, y) => x[0] - y[0] || x[2] - y[2]);
    return { inst: part.inst, vol: part.vol, n: out };
  }).filter((v) => v.n.length);
  if (piece.drums) { // kettledrums on the bar lines of the full orchestra's turn
    const d = piece.drums, n = [];
    for (let b = d.from; b < total; b += d.every) n.push([b * TICKS, TICKS, d.note, 100]);
    voices.push({ inst: 'timpani', vol: d.vol, n });
  }
  return { beats: Math.ceil(total), voices };
}

const js = (o) => JSON.stringify(o).replace(/"([a-z]+)":/g, '$1:').replace(/"/g, '\'');
function main() {
  let out = `// GENERATED by scripts/build-concert-scores.mjs: do not edit by hand.
// The Concert Hall's programme (core/stage-show.js), as notes for
// core/concert-player.js: famous minutes of works long out of copyright,
// from scores typeset by volunteers of the Mutopia Project (SOURCES below,
// docs/CREDITS-MUSIC.md). Loaded with the room, not in the first download.
//
// Each voice's notes are packed as numbers, four to a note: when it starts
// and how long it lasts in 1/${TICKS} of a beat, its MIDI note, its loudness in
// hundredths. unpack() gives the [beat, length, note, loudness] the player reads.
const unpack = (a) => { const n = []; for (let i = 0; i < a.length; i += 4) n.push([a[i] / ${TICKS}, a[i + 1] / ${TICKS}, a[i + 2], a[i + 3] / 100]); return n; };
const piece = (p) => ({ ...p, voices: p.voices.map((v) => ({ ...v, n: unpack(v.n) })) });

`;
  const names = [], report = [];
  for (const p of PIECES) {
    const { beats, voices } = build(p);
    const name = p.id.replace(/-(\w)/g, (_, c) => c.toUpperCase()).replace(/^\w/, (c) => c.toUpperCase());
    names.push(name);
    const head = { id: p.id, kind: p.kind, bpm: p.bpm, ...(p.pulse ? { pulse: p.pulse } : {}), beats, year: p.year, title: p.title, by: p.by };
    out += `const ${name} = piece({\n  ...${js(head)},\n  voices: [\n${voices.map((v) => `    { inst: '${v.inst}', vol: ${v.vol},${p.legato ? ` legato: ${p.legato},` : ''} n: [${v.n.flat().join(',')}] },`).join('\n')}\n  ],\n});\n`;
    const notes = voices.reduce((s, v) => s + v.n.length, 0);
    report.push(`${p.id}: ${beats} beats, ${Math.round((beats * 60) / p.bpm)} s, ${notes} notes in ${voices.length} parts`);
  }
  out += `\nexport const CONCERT_PROGRAM = [${names.join(', ')}];\n\n// Where the notes came from (the typesetters' editions at the ${MUTOPIA}).\nexport const SOURCES = ${JSON.stringify(Object.fromEntries(PIECES.map((p) => [p.id, { ...p.source, from: MUTOPIA }])), null, 2).replace(/"([a-z]+)":/g, '$1:').replace(/"/g, '\'')};\n`;
  writeFileSync(new URL('../src/data/concert-scores.js', import.meta.url), out);
  console.log(report.join('\n'));
  console.log(`wrote src/data/concert-scores.js ${Math.round(out.length / 1024)} KB`);
}
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].split('/').pop())) main();
