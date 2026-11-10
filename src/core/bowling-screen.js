// The score screen on the wall above each bowling lane (core/activity-rooms.js),
// like the monitors over the pins in a real alley: one row per bowler with
// the ten frames, the marks and the running total. Everyone in the room
// sees it: your own game (ui/activity-ui.js) and the games of the others
// (game/bowling-lanes.js) are drawn on the lane they bowl on.
import * as THREE from 'three';
import { FRAMES, frameRolls, bowlingScores, bowlingTurn, frameMarks } from './activities.js';

const CW = 512, CH = 256, HEAD = 34;
const NAME_W = 92, TOTAL_W = 46;

// rows: [{ name, rolls }] (up to 4); turn: the row bowling now, or -1.
export function drawLaneScreen(c, lane, rows = [], turn = -1) {
  c.fillStyle = '#0d1626'; c.fillRect(0, 0, CW, CH);
  c.fillStyle = '#1d3a66'; c.fillRect(0, 0, CW, HEAD);
  c.fillStyle = '#9fe7ff'; c.textBaseline = 'middle';
  c.font = '900 22px system-ui, sans-serif'; c.textAlign = 'left';
  c.fillText(`LANE ${lane + 1}`, 12, HEAD / 2 + 1);
  c.font = '700 15px system-ui, sans-serif'; c.textAlign = 'right';
  c.fillText('STRIKE LANE', CW - 12, HEAD / 2 + 1);
  if (!rows.length) {
    c.fillStyle = '#ffd36e'; c.textAlign = 'center';
    c.font = '900 64px system-ui, sans-serif'; c.fillText('OPEN', CW / 2, 122);
    c.fillStyle = '#9fe7ff'; c.font = '700 22px system-ui, sans-serif'; c.fillText('빈 레인 · Walk up to bowl', CW / 2, 190);
    return;
  }
  const n = Math.max(1.6, rows.length), rh = (CH - HEAD - 6) / n;
  const fw = (CW - NAME_W - TOTAL_W - 8) / (FRAMES + 0.5);
  rows.slice(0, 4).forEach((r, k) => {
    const y = HEAD + 4 + k * rh, now = k === turn;
    const frames = frameRolls(r.rolls), totals = bowlingScores(r.rolls), t = bowlingTurn(r.rolls);
    c.fillStyle = now ? '#2b4f86' : '#16243a'; c.fillRect(2, y, CW - 4, rh - 3);
    c.fillStyle = now ? '#ffd36e' : '#e8f4ff'; c.textAlign = 'left';
    c.font = `800 ${Math.round(Math.min(26, rh * 0.34))}px system-ui, sans-serif`;
    c.fillText(String(r.name || '').slice(0, 9), 8, y + rh / 2, NAME_W - 10);
    for (let f = 0; f < FRAMES; f++) {
      const x = NAME_W + f * fw, w = f === FRAMES - 1 ? fw * 1.5 : fw;
      const cur = now && !t.over && f === t.frame;
      c.fillStyle = cur ? '#3d6bb0' : '#0d1626'; c.fillRect(x + 1, y + 2, w - 2, rh - 7);
      c.fillStyle = '#ffffff'; c.textAlign = 'right';
      c.font = `700 ${Math.round(Math.min(24, rh * 0.26))}px system-ui, sans-serif`;
      c.fillText(frames[f] ? frameMarks(frames[f]).join(' ') : '', x + w - 4, y + rh * 0.28);
      c.textAlign = 'center'; c.font = `800 ${Math.round(Math.min(30, rh * 0.32))}px system-ui, sans-serif`;
      c.fillText(totals[f] != null ? String(totals[f]) : '', x + w / 2, y + rh * 0.66);
    }
    c.fillStyle = '#ffd36e'; c.textAlign = 'center'; c.font = `900 ${Math.round(Math.min(32, rh * 0.38))}px system-ui, sans-serif`;
    c.fillText(String(totals.at(-1) ?? 0), CW - TOTAL_W / 2 - 4, y + rh / 2);
  });
}
// A screen: a canvas texture to put on a plane, and set(rows, turn) to
// redraw it (only when something changed).
export function laneScreen(lane) {
  const cv = document.createElement('canvas');
  cv.width = CW; cv.height = CH;
  const c = cv.getContext('2d');
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  let last = '', shown = [];
  const set = (rows = [], turn = -1) => {
    const key = JSON.stringify([rows.map((r) => [r.name, r.rolls]), turn]);
    if (key === last) return;
    last = key;
    shown = rows.map((r) => ({ name: r.name, rolls: [...r.rolls] }));
    drawLaneScreen(c, lane, rows, turn);
    tex.needsUpdate = true;
  };
  set();
  return { tex, set, get rows() { return shown; } };
}
