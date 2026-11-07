// Runway show (DDP's Curve Runway) rules, no DOM so it can be unit-tested.
// The city-pop track plays; you walk the runway one step a beat (tap as each
// step reaches the line), then hold three poses for the cameras at the end
// (the bigger notes, worth double), and walk back on your own. Scored 0-100;
// medals as at the grill.

import { judge } from './karaoke-game.js';

export const RUNWAY_GAME = 'runway'; // medal id (core/grill-game.js Medals)
export const RUNWAY_TRACK = 'citypop';
export const LEAD_BEATS = 4; // one bar of count-in, standing backstage
export const STEP_BEATS = 16; // steps down the runway, one a beat
export const POSE_GAP = 2; // beats between the poses at the end
export const POSES = ['wave', 'turn', 'cheer']; // what each pose does (main.js plays it)
export const BACK_BEATS = 8; // the walk back, no taps
export const POINTS = { perfect: 3, great: 2, good: 1 };

// When the poses fall, in beats from the start.
const poseBeat = (i) => LEAD_BEATS + STEP_BEATS + 1 + i * POSE_GAP;
const backFrom = () => poseBeat(POSES.length - 1) + POSE_GAP;
export const SHOW_BEATS = backFrom() + BACK_BEATS;

// The notes: { t (seconds), kind: 'step' | 'pose', i (pose index) }.
export function runwayChart(bpm) {
  const beat = 60 / bpm, notes = [];
  for (let b = 0; b < STEP_BEATS; b++) notes.push({ t: (LEAD_BEATS + b) * beat, kind: 'step' });
  POSES.forEach((_, i) => notes.push({ t: poseBeat(i) * beat, kind: 'pose', i }));
  return notes;
}
export const bestPoints = (notes) => notes.reduce((a, n) => a + POINTS.perfect * (n.kind === 'pose' ? 2 : 1), 0);

// A tap at time t: the nearest note not yet hit, within the karaoke windows.
// Returns { index, label, points } (poses count double) or null.
export function judgeTap(notes, hit, t) {
  const j = judge(notes.map((n) => n.t), hit, t);
  if (!j) return null;
  return { ...j, points: j.points * (notes[j.index].kind === 'pose' ? 2 : 1) };
}

export const runwayScore = (points, notes) => {
  const best = bestPoints(notes);
  return best ? Math.round((points / best) * 100) : 0;
};

// Where you are at time t: along 0 (backstage) … 1 (the end of the runway),
// and what you are doing. Walking takes the step beats; the poses happen at
// the end; then back.
export function walkAt(t, bpm) {
  const b = t / (60 / bpm);
  if (b < LEAD_BEATS) return { phase: 'wait', along: 0 };
  if (b < LEAD_BEATS + STEP_BEATS) return { phase: 'walk', along: (b - LEAD_BEATS) / STEP_BEATS };
  if (b < backFrom()) {
    const k = Math.max(0, Math.min(POSES.length - 1, Math.round((b - poseBeat(0)) / POSE_GAP)));
    return { phase: 'pose', along: 1, pose: k };
  }
  if (b < SHOW_BEATS) return { phase: 'back', along: 1 - (b - backFrom()) / BACK_BEATS };
  return { phase: 'done', along: 0 };
}
