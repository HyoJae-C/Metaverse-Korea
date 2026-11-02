// Noraebang rhythm game (노래방) rules, no DOM so it can be unit-tested.
// The background-music songs (data/tracks.js) play; notes fall on the beat
// and you tap as each one reaches the line. Everyone in the room sees each
// other's scores (a "score battle").

export const KARAOKE_GAME = 'karaoke';
export const SONGS = ['lofi', 'gugak', 'jazz', 'citypop']; // easy → hard (by tempo)
export const LEAD_BEATS = 8; // two bars before the first note
export const NOTE_BEATS = 48; // beats with notes (12 bars)
export const WINDOWS = [[0.07, 'perfect', 3], [0.14, 'great', 2], [0.22, 'good', 1]];

// Small deterministic RNG, so a song's chart is the same every time and for
// everyone in the room.
function rng(seed) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

// Note times in seconds from the song's start: on-beats (they stay on the
// grid even in swing songs), most beats filled, a few double-time pairs.
export function chartFor(trackId, bpm) {
  const r = rng('karaoke-' + trackId);
  const beat = 60 / bpm;
  const notes = [];
  for (let b = LEAD_BEATS; b < LEAD_BEATS + NOTE_BEATS; b++) {
    if (b % 4 === 0 || r() < 0.72) notes.push(b * beat);
    if (b % 8 === 6 && bpm < 100 && r() < 0.5) notes.push((b + 0.5) * beat); // straight eighths only in slower songs
  }
  return notes.sort((a, b) => a - b);
}

// Judge a tap at time t against the nearest unhit note. Returns
// { index, label, points } or null when no note is close enough.
export function judge(notes, hit, t) {
  let best = -1, bd = Infinity;
  for (let i = 0; i < notes.length; i++) {
    if (hit[i]) continue;
    const d = Math.abs(notes[i] - t);
    if (d < bd) { bd = d; best = i; }
    if (notes[i] > t + 0.3) break;
  }
  if (best < 0) return null;
  const w = WINDOWS.find(([max]) => bd <= max);
  return w ? { index: best, label: w[1], points: w[2] } : null;
}

// 0..100 from the points earned out of the best possible.
export const karaokeScore = (points, notes) => (notes ? Math.round((points / (notes * 3)) * 100) : 0);

// Room messages: 'karaoke:<score>'.
export const karaokeMsg = (score) => `karaoke:${Math.max(0, Math.min(100, score | 0))}`;
export function parseKaraoke(e) {
  const m = /^karaoke:(\d{1,3})$/.exec(String(e));
  return m && +m[1] <= 100 ? +m[1] : null;
}
