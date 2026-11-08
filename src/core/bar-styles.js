// Bar styles (stores.json "barStyle"): every bar shares the long counter,
// the stools and the pendant lamps (core/interior.js); the style adds what
// makes each one its own place.
//   hush       a quiet mocktail bar: candle-lit tables (the default)
//   speakeasy  a hidden bar behind a coin laundry: washing machines by the
//              door, velvet booths, a bookcase
//   taproom    craft sodas on tap: a wall of tap handles, a chalkboard menu,
//              one long shared table
//   sports     a sports pub: a big screen showing a match, high tables and a
//              crowd that cheers when someone scores
// Every style has people already there (stations.patrons; main.js stands or
// sits them), so a bar never looks empty when you walk in.
import * as THREE from 'three';

export const BAR_STYLES = ['hush', 'speakeasy', 'taproom', 'sports'];
export const barStyleOf = (store) => (BAR_STYLES.includes(store?.barStyle) ? store.barStyle : 'hush');

// ---- The match on the sports pub's screen ---------------------------------
// One game loops every MATCH_LEN seconds of real time (90 minutes of play,
// 2 s a minute). The goals are fixed, so everyone in the pub sees the same
// score and cheers at the same moment.
export const MATCH_LEN = 190; // (the last 10 s: full time, then kick-off again)
export const MATCH_TEAMS = [
  { name: 'SEOUL', color: '#d9473c' },
  { name: 'BUSAN', color: '#2f6fb5' },
];
// [minute, team index]
export const MATCH_GOALS = [[17, 0], [38, 1], [61, 0], [84, 0]];
export const GOAL_SHOW = 4; // s the big GOAL! stays on the screen

export function matchState(t) {
  const loop = ((t % MATCH_LEN) + MATCH_LEN) % MATCH_LEN;
  const minute = Math.min(90, Math.floor(loop / 2));
  const score = [0, 0];
  let goal = null;
  for (const [m, side] of MATCH_GOALS) {
    if (m > minute) break;
    score[side]++;
    const since = loop - m * 2;
    if (since < GOAL_SHOW) goal = { side, since };
  }
  return { minute, score, goal, loop };
}

// The goal moments between two times (in order), for the crowd's cheers.
export function goalsBetween(t0, t1) {
  const out = [];
  if (!(t1 > t0)) return out;
  const first = Math.floor(t0 / MATCH_LEN);
  for (let k = first; k * MATCH_LEN <= t1; k++) {
    for (const [m, side] of MATCH_GOALS) {
      const at = k * MATCH_LEN + m * 2;
      if (at > t0 && at <= t1) out.push({ at, side });
    }
  }
  return out;
}

function drawMatch(g, W, H, t) {
  const { minute, score, goal } = matchState(t);
  g.fillStyle = '#2f7d3a';
  g.fillRect(0, 0, W, H);
  for (let i = 0; i < 8; i++) { // mowing stripes
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)';
    g.fillRect((i * W) / 8, 0, W / 8, H);
  }
  const top = 40;
  g.strokeStyle = 'rgba(255,255,255,0.85)';
  g.lineWidth = 3;
  g.strokeRect(16, top + 10, W - 32, H - top - 26);
  g.beginPath(); g.moveTo(W / 2, top + 10); g.lineTo(W / 2, H - 16); g.stroke();
  g.beginPath(); g.arc(W / 2, (H + top - 6) / 2, 34, 0, Math.PI * 2); g.stroke();
  g.strokeRect(16, (H + top) / 2 - 50, 50, 92);
  g.strokeRect(W - 66, (H + top) / 2 - 50, 50, 92);
  // Players drift about; the ball goes back and forth between them.
  const midY = (H + top) / 2;
  for (let side = 0; side < 2; side++) {
    g.fillStyle = MATCH_TEAMS[side].color;
    for (let i = 0; i < 6; i++) {
      const bx = W * (side ? 0.62 : 0.38) + Math.sin(t * 0.7 + i * 1.7 + side) * W * 0.22;
      const by = midY + Math.sin(t * 0.9 + i * 2.3 + side * 4) * (H - top) * 0.33;
      g.beginPath(); g.arc(bx, by, 7, 0, Math.PI * 2); g.fill();
    }
  }
  g.fillStyle = '#ffffff';
  const ballX = W / 2 + Math.sin(t * 0.55) * W * 0.36, ballY = midY + Math.sin(t * 1.3) * (H - top) * 0.3;
  g.beginPath(); g.arc(ballX, ballY, 5, 0, Math.PI * 2); g.fill();
  // Score bar.
  g.fillStyle = 'rgba(10,12,20,0.88)';
  g.fillRect(0, 0, W, top);
  g.font = '800 24px system-ui, sans-serif';
  g.textBaseline = 'middle';
  g.textAlign = 'right';
  g.fillStyle = MATCH_TEAMS[0].color; g.fillRect(W / 2 - 172, 10, 8, 20);
  g.fillStyle = '#ffffff';
  g.fillText(MATCH_TEAMS[0].name, W / 2 - 48, 21);
  g.textAlign = 'center';
  g.fillText(`${score[0]} - ${score[1]}`, W / 2, 21);
  g.textAlign = 'left';
  g.fillText(MATCH_TEAMS[1].name, W / 2 + 48, 21);
  g.fillStyle = MATCH_TEAMS[1].color; g.fillRect(W / 2 + 164, 10, 8, 20);
  g.fillStyle = '#ffd23f';
  g.textAlign = 'right';
  g.fillText(minute >= 90 ? 'FT' : `${minute}'`, W - 14, 21);
  if (goal) {
    const pop = 1 + Math.max(0, 0.4 - goal.since) * 1.5;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.fillRect(0, top, W, H - top);
    g.save();
    g.translate(W / 2, midY);
    g.scale(pop, pop);
    g.textAlign = 'center';
    g.font = '900 86px system-ui, sans-serif';
    g.fillStyle = MATCH_TEAMS[goal.side].color;
    g.fillText('GOAL!', 3, 4);
    g.fillStyle = '#ffffff';
    g.fillText('GOAL!', 0, 0);
    g.font = '800 26px system-ui, sans-serif';
    g.fillText(MATCH_TEAMS[goal.side].name, 0, 56);
    g.restore();
  }
}

function chalkboardTexture(lines, title) {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 384;
  const g = c.getContext('2d');
  g.fillStyle = '#23302a'; g.fillRect(0, 0, 512, 384);
  g.strokeStyle = '#a07a4a'; g.lineWidth = 18; g.strokeRect(9, 9, 494, 366);
  g.fillStyle = '#f3eee4';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = '800 40px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  g.fillText(title, 256, 62);
  g.font = '600 28px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  lines.forEach((l, i) => g.fillText(l, 256, 128 + i * 52));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ctx: { scene, box, block, mat, seats, stations, w, d, h, cz, store, BAR_H, SEAT_H }
// Returns a per-frame function (or null).
export function decorateBar(style, ctx) {
  if (style === 'speakeasy') return speakeasy(ctx);
  if (style === 'taproom') return taproom(ctx);
  if (style === 'sports') return sports(ctx);
  return null;
}

// Takes the seat closest to (x, z) away from the players' seats and seats a
// patron there instead.
function seatPatron(ctx, x, z) {
  let best = -1, bd = Infinity;
  ctx.seats.forEach((s, i) => { const dd = Math.hypot(s.x - x, s.z - z); if (dd < bd) { bd = dd; best = i; } });
  if (best < 0) return;
  const [s] = ctx.seats.splice(best, 1);
  (ctx.stations.patrons ||= []).push({ x: s.x, z: s.z, ry: s.ry, sit: true });
}
export { seatPatron };

function speakeasy(ctx) {
  const { scene, box, block, w, d, h, stations } = ctx;
  // The front: a coin laundry. Washing machines either side of the door,
  // their round windows turning, as if you'd walked into the wrong place.
  const drums = [];
  const glass = new THREE.MeshLambertMaterial({ color: '#9fc3d6', emissive: '#2a4a5a', emissiveIntensity: 0.5 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = side * (2.0 + i * 0.95);
      const z = d / 2 - 0.5;
      box(0.86, 1.0, 0.8, x, 0.5, z, '#eef0f2');
      box(0.86, 0.12, 0.8, x, 1.06, z, '#c9ced6'); // control panel
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.04, 8, 24), new THREE.MeshLambertMaterial({ color: '#8a9099' }));
      ring.rotation.y = Math.PI; // facing into the room
      ring.position.set(x, 0.5, z - 0.41);
      scene.add(ring);
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.25, 20), glass);
      win.rotation.y = Math.PI;
      win.position.set(x, 0.5, z - 0.405);
      scene.add(win);
      // The washing inside: a coloured blob that tumbles round.
      const sock = new THREE.Mesh(new THREE.CircleGeometry(0.08, 10), new THREE.MeshBasicMaterial({ color: ['#f05a6a', '#ffd23f', '#6fb7ff'][(i + (side > 0 ? 1 : 0)) % 3] }));
      sock.rotation.y = Math.PI;
      const hub = new THREE.Group();
      hub.position.set(x, 0.5, z - 0.415);
      sock.position.set(0.12, 0, 0);
      hub.add(sock);
      scene.add(hub);
      drums.push(hub);
    }
    block(side * 2.95, d / 2 - 0.5, 2.9, 0.85);
  }
  // A heavy velvet curtain hanging either side, where the laundry ends and
  // the bar begins.
  for (const side of [-1, 1]) box(1.6, h - 0.3, 0.08, side * (w / 2 - 0.85), (h - 0.3) / 2, d / 2 - 1.6, '#6b1f2a');
  // A bookcase on the right wall.
  const bx = w / 2 - 0.25;
  box(0.4, 2.6, 2.4, bx, 1.3, -0.6, '#3a2418');
  for (const y of [0.5, 1.1, 1.7, 2.3]) {
    for (let i = 0; i < 9; i++) {
      const bh = 0.32 + ((i * 7) % 4) * 0.04;
      box(0.26, bh, 0.16, bx - 0.04, y + bh / 2 - 0.12, -1.6 + i * 0.24, ['#7a2b2b', '#2f4d3a', '#c9a227', '#3a3f6b', '#5a3a28'][(i + Math.round(y * 3)) % 5]);
    }
  }
  block(bx, -0.6, 0.45, 2.45);
  // Someone at the bar and someone at a candle table already.
  seatPatron(ctx, -2.4, ctx.cz + 0.95);
  seatPatron(ctx, w / 2 - 1.4, d / 2 - 3.6);
  stations.speakeasy = true;
  return (dt) => { for (const [i, hub] of drums.entries()) hub.rotation.z -= dt * (2.4 + i * 0.3); };
}

function taproom(ctx) {
  const { scene, box, block, mat, w, d, cz, BAR_H, SEAT_H, store, seats } = ctx;
  // Tap wall behind the counter: a board of tap handles, one per drink and
  // a few more, under a chalkboard menu.
  const tz = -d / 2 + 0.12;
  box(7.4, 0.9, 0.12, 0, 1.55, tz, '#5a3a28');
  box(7.4, 0.06, 0.3, 0, 1.08, tz + 0.12, '#b8bcc4'); // drip tray
  const colors = ['#c9a227', '#7a3b1f', '#e8c76a', '#f2913a', '#9b6a3a', '#d8e4ea', '#6b3f8c', '#3f8f5f', '#c94a4a', '#e0b46a'];
  colors.forEach((c, i) => {
    const x = -3.15 + i * 0.7;
    box(0.05, 0.12, 0.1, x, 1.3, tz + 0.12, '#b8bcc4');
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, 0.36, 8), mat(c));
    handle.position.set(x, 1.56, tz + 0.18);
    scene.add(handle);
  });
  const menu = (store.products || []).slice(0, 4).map((p) => p.name?.en || '');
  const board = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshBasicMaterial({ map: chalkboardTexture(menu, 'ON TAP · 탭') }));
  board.rotation.y = -Math.PI / 2; // on the right wall by the counter (the bar's name is on the back wall)
  board.position.set(w / 2 - 0.05, 2.0, -d / 2 + 2.4);
  board.scale.setScalar(0.7);
  scene.add(board);
  // One long shared table with benches, on the right (the door path to the
  // counter stays open; the darts are on the left wall).
  const x0 = 1.6, x1 = w / 2 - 1.2, mz = 1.3, len = x1 - x0, mx = (x0 + x1) / 2;
  box(len, 0.06, 1.0, mx, BAR_H - 0.1, mz, '#8a5a3a');
  for (const ex of [x0 + 0.3, x1 - 0.3]) box(0.08, BAR_H - 0.13, 0.8, ex, (BAR_H - 0.13) / 2, mz, '#2b2b2e');
  block(mx, mz, len, 1.0);
  for (const side of [-1, 1]) {
    const bz = mz + side * 0.85;
    box(len, 0.06, 0.36, mx, SEAT_H + 0.05, bz, '#6b4630');
    for (const ex of [x0 + 0.3, x1 - 0.3]) box(0.06, SEAT_H + 0.05, 0.3, ex, (SEAT_H + 0.05) / 2, bz, '#2b2b2e');
    block(mx, bz, len, 0.4);
    const n = Math.max(2, Math.floor(len / 1.2));
    for (let i = 0; i < n; i++) {
      const sx = x0 + 0.6 + (i * (len - 1.2)) / Math.max(1, n - 1);
      seats.push({ x: sx, z: bz, ry: side > 0 ? Math.PI : 0, stand: [sx, bz + side * 0.8] });
    }
  }
  // A few people already sharing the table, one more at the bar.
  seatPatron(ctx, x0 + 0.6, mz - 0.85);
  seatPatron(ctx, x0 + 1.8, mz + 0.85);
  seatPatron(ctx, x1 - 0.6, mz - 0.85);
  seatPatron(ctx, 2.4, cz + 0.95);
  return null;
}

function sports(ctx) {
  const { scene, box, block, mat, w, d, h, stations, BAR_H } = ctx;
  // The big screen on the right wall.
  const W = 640, H = 360;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sw = Math.min(6.4, d - 4), sh = sw * (H / W);
  const sx = w / 2 - 0.08, sz = 0.2, sy = Math.min(h - 0.4 - sh / 2, 2.4);
  box(0.1, sh + 0.24, sw + 0.24, sx + 0.02, sy, sz, '#111216');
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: tex }));
  screen.rotation.y = -Math.PI / 2;
  screen.position.set(sx - 0.04, sy, sz);
  scene.add(screen);
  const glow = new THREE.PointLight(0x9fe0a8, 3, 8);
  glow.position.set(sx - 2, sy, sz);
  scene.add(glow);
  // Team scarves along the back wall, above the bottles.
  for (let i = 0; i < 6; i++) {
    const team = MATCH_TEAMS[i % 2];
    const scarf = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.22), mat(team.color));
    scarf.position.set(-w / 2 + 1.6 + i * ((w - 3.2) / 5), h - 0.5, -d / 2 + 0.04);
    scarf.rotation.z = i % 2 ? 0.06 : -0.06;
    scene.add(scarf);
  }
  // High tables between the counter and the screen, people standing at
  // them watching; more standing in front of the screen.
  const tables = [[w / 2 - 7.4, -1.2], [w / 2 - 7.4, 2.4], [w / 2 - 4.6, 0.6]].filter(([x]) => x > 2.2); // (clear of the door path)
  for (const [tx, tz] of tables) {
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.05, 20), mat('#3b2418'));
    top.position.set(tx, BAR_H + 0.25, tz);
    scene.add(top);
    box(0.08, BAR_H + 0.25, 0.08, tx, (BAR_H + 0.25) / 2, tz, '#2b2b2e');
    block(tx, tz, 0.9, 0.9);
  }
  const face = Math.PI / 2; // towards the screen (+x)
  const standing = [];
  for (const [tx, tz] of tables) standing.push({ x: tx - 0.7, z: tz, ry: face }, { x: tx, z: tz - 0.75, ry: face - 0.5 });
  standing.push({ x: sx - 3.2, z: sz + 1.6, ry: face - 0.3 }, { x: sx - 3.0, z: sz - 1.7, ry: face + 0.3 });
  stations.patrons = [...(stations.patrons || []), ...standing];
  for (const p of standing) block(p.x, p.z, 0.5, 0.5);
  seatPatron(ctx, -2.4, ctx.cz + 0.95);
  // main.js sets onGoal: the crowd cheers.
  const match = { onGoal: null, state: () => matchState(clock()) };
  stations.match = match;
  let last = clock(), draw = 0;
  drawMatch(g, W, H, last);
  tex.needsUpdate = true;
  return (dt) => {
    const now = clock();
    // (Only goals since the last frame: coming back later, the crowd doesn't
    // cheer for every goal scored while you were away.)
    if (now - last < 2) for (const goal of goalsBetween(last, now)) match.onGoal?.(goal.side);
    last = now;
    if ((draw += dt) > 0.1) { // 10 frames a second is plenty for a pub telly
      draw = 0;
      drawMatch(g, W, H, now);
      tex.needsUpdate = true;
    }
  };
}

// Wall-clock seconds, so everyone in the pub watches the same minute.
const clock = () => Date.now() / 1000;
