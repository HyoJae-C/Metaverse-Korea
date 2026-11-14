// Modu Ballpark's big-screen moments, as seen in the stadium: the wave going
// round the stands, the Dance Cam and the Kiss Cam on the scoreboard. When
// each comes and who is on the screen is core/ballpark-cams.js; this file
// films them (a second camera drawn into the scoreboard, like the arcade's
// wall screens, game/brawl-tv.js), poses the people and offers the buttons.
// Downloaded with the stadium (main.js enterStore), not with the street.
//
// The Kiss Cam: the screen finds two people side by side in a row. Only they
// get the 💋 button, and only while it is on. A cheek kiss needs both to
// press it (one asks, the other kisses back). Either can say no thanks; then,
// or when an ask is left unanswered, the one who asked scratches their head
// with a sheepish 😅, the one who said no puts their hands together 🙏, and the
// crowd goes "aww" (Yozi 2026-11-15).
import * as THREE from 'three';
import { L, fmt } from '../ui/pocha-ui.js';
import { waveAt, waveGap, pickPair, pickOne, seatPairs, npcKisses, bpMsg, parseBp, KissCam } from '../core/ballpark-cams.js';
import { rowAt } from '../core/dome.js';
import { CAM_TEXT } from '../data/ballpark-cam-text.js';
import { createCheerAlong, createFoulBalls } from './ballpark-fun.js';

const PX = [512, 256]; // the picture (the scoreboard is 2:1)
const FOV = 30;
const POSE_S = { kiss: 2.8, shy: 3, sorry: 2.4, dance: 6, wave: 1.6, clap: 0.5 };

const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
const env = (t, dur) => smooth(t / 0.3) * (1 - smooth((t - (dur - 0.4)) / 0.4));
// Seated poses (core/model-pack.js setMoves; bone offsets as in
// core/runway-poses.js). side: +1 the partner is on our right, -1 left.
const POSES = {
  // Leaning in for a cheek kiss: the body tips over, the head turns and
  // tilts towards them, the near hand comes up.
  kiss: (t, side) => {
    const k = env(t, POSE_S.kiss);
    const arm = side > 0 ? 'armR' : 'armL', fore = side > 0 ? 'foreR' : 'foreL';
    return { spine: [0.02 * k, 0.2 * side * k, -0.42 * side * k], head: [-0.05 * k, -0.6 * side * k, -0.25 * side * k], [arm]: [-1.0 * k, 0.4 * side * k, 0], [fore]: [-1.2 * k, 0, 0] };
  },
  // Turned down: a hand scratching the back of the head, head down, a
  // sheepish little sway.
  shy: (t) => {
    const k = env(t, POSE_S.shy), s = Math.sin(t * 9) * 0.12;
    return { spine: [0.1 * k, 0, 0.06 * k], head: [0.3 * k, 0, 0.18 * k], armR: [-2.6 * k, 0.7 * k, 0], foreR: [(-1.9 + s) * k, 0, 0] };
  },
  // Saying no nicely: hands together in front, a small bow of the head.
  sorry: (t) => {
    const k = env(t, POSE_S.sorry);
    return { spine: [0.15 * k, 0, 0], head: [0.25 * k, 0, 0], armL: [-1.3 * k, 0.35 * k, 0], armR: [-1.3 * k, -0.35 * k, 0], foreL: [-1.2 * k, 0, 0], foreR: [-1.2 * k, 0, 0] };
  },
  // Dancing in the seat: arm pumps, a sway, then hands up.
  dance: (t) => {
    const k = env(t, POSE_S.dance), b = t * 4, ph = b % 1, bar = Math.floor(b / 4) % 3, pump = Math.sin(ph * Math.PI * 2), sway = Math.sin(t * Math.PI * 2);
    if (bar === 0) return { spine: [0.1 * Math.abs(pump) * k, 0, 0.12 * sway * k], head: [0.15 * Math.abs(pump) * k, 0, -0.1 * sway * k], armL: [(-1.2 - 0.5 * pump) * k, 0, 0], armR: [(-1.2 + 0.5 * pump) * k, 0, 0], foreL: [-1.2 * k, 0, 0], foreR: [-1.2 * k, 0, 0] };
    if (bar === 1) return { spine: [0, 0, 0.2 * sway * k], head: [0, 0, -0.14 * sway * k], armL: [-0.5 * k, (-1.0 + 0.4 * sway) * k, 0], armR: [-0.5 * k, (1.0 + 0.4 * sway) * k, 0], foreL: [-0.6 * k, 0, 0], foreR: [-0.6 * k, 0, 0] };
    return { spine: [-0.08 * k, 0, 0.12 * sway * k], head: [-0.15 * k, 0, 0], armL: [(-2.8 + 0.2 * pump) * k, -0.3 * k, 0], armR: [(-2.8 - 0.2 * pump) * k, 0.3 * k, 0] };
  },
  // One clap, hands in front of the chest.
  clap: (t) => {
    const k = Math.sin(Math.min(1, t / POSE_S.clap) * Math.PI), c = 0.15 + (1 - Math.abs(Math.sin(t * 12))) * 0.3;
    return { armL: [-1.3 * k, c * k, 0], armR: [-1.3 * k, -c * k, 0], foreL: [-0.4 * k, 0, 0], foreR: [-0.4 * k, 0, 0] };
  },
  // Up for the wave: both arms shoot up.
  wave: (t) => {
    const k = env(t, POSE_S.wave);
    return { spine: [-0.12 * k, 0, 0], head: [-0.2 * k, 0, 0], armL: [-2.9 * k, -0.25 * k, 0], armR: [-2.9 * k, 0.25 * k, 0] };
  },
};

export function createBallparkCams(game) {
  const cam3 = new THREE.PerspectiveCamera(FOV, PX[0] / PX[1], 0.1, 120);
  const camAt3 = new THREE.Vector3(), look = new THREE.Vector3(), v = new THREE.Vector3();
  let room = null; // the stadium we are set up in (its built room)
  let screens = null; // [{ mesh, idle (its own map), over (the frame on top) }]
  let rt = null;
  let frame = null; // { canvas, tex, drawn }
  let show = null; // the moment on screen: { kind, k, ids, npc, settled, note, camSet }
  let kc = null; // KissCam for the game on now
  let told = ''; // the last moment we told the player about
  let waved = -1, danced = -1; // the game in which we last stood for the wave / danced
  let npcDone = '';
  let odd = 0;
  const posed = new Map(); // character → { name, t, side }
  const npcWaved = new Set();

  const dome = () => room?.dome || null;
  const myId = () => String(game.myId);
  const blocked = (id) => game.blocked?.(id);
  const nameOf = (id) => game.others.nameOf(id) || '?';

  // ---- Who is sitting where ----
  // Players in the stands (me too): [{ id, x, z, row }].
  function players() {
    const out = [];
    const s = game.seated;
    if (s?.dome) { const row = rowAt(s.x, s.z); if (row >= 0) out.push({ id: myId(), x: s.x, z: s.z, row }); }
    for (const [id, p] of game.others.players) {
      if (p.hidden || !p.target?.sit) continue;
      const row = rowAt(p.target.x, p.target.z);
      if (row >= 0) out.push({ id: String(id), x: p.target.x, z: p.target.z, row });
    }
    return out;
  }
  // The seated NPCs (couples: only the three couples, for the Kiss Cam).
  function npcs(couples) {
    const out = [];
    (room?.patronNpcs || []).forEach((o, i) => {
      const s = room.stations?.patrons?.[i];
      if (!s?.sit || (couples && !s.couple)) return;
      const p = o.ch.root.position, row = rowAt(p.x, p.z);
      if (row >= 0) out.push({ id: 'npc' + i, x: p.x, z: p.z, row, npc: o });
    });
    return out;
  }
  function charOf(id) {
    if (id === myId()) return game.me;
    if (id.startsWith('npc')) return room?.patronNpcs?.[+id.slice(3)]?.ch || null;
    return game.others.charOf(id);
  }
  // Are a and b two people sitting side by side right now?
  function sideBySide(a, b) {
    const ps = players();
    const pa = ps.find((p) => p.id === a), pb = ps.find((p) => p.id === b);
    return !!(pa && pb && seatPairs([pa, pb]).length);
  }

  // ---- Poses ----
  function pose(id, name, other) {
    const ch = charOf(id);
    if (!ch) return;
    let side = 1;
    if (other) {
      const a = ch.root.position, b = charOf(other)?.root.position;
      if (b) {
        const ry = ch.root.rotation.y, fx = Math.sin(ry), fz = Math.cos(ry);
        side = fz * (b.x - a.x) - fx * (b.z - a.z) > 0 ? 1 : -1; // (which hand they are on)
      }
    }
    const p = { name, t: 0, side };
    posed.set(ch, p);
    ch.setMoves(() => POSES[name](p.t, p.side));
  }
  function bubble(id, text) {
    if (id === myId()) game.bubble(text);
    else if (id.startsWith('npc')) { const o = room?.patronNpcs?.[+id.slice(3)]; if (o) game.npcBubble(o, text); }
    else game.others.emote(id, null, text);
  }
  function cheer(amount) {
    dome()?.jump('all', amount);
    game.sfx?.crowd?.(Math.min(1, amount * 0.7));
  }

  // ---- The screen ----
  function setUp(r) {
    tearDown();
    room = r;
    const d = r.dome;
    d.ev.onBeat = () => { if (game.interior === r) clapAlong.onBeat(); };
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = PX;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    frame = { canvas, tex, drawn: '' };
    screens = d.screens.map((mesh) => {
      const over = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }));
      over.position.copy(mesh.position); over.quaternion.copy(mesh.quaternion); over.translateZ(0.06);
      over.visible = false;
      mesh.parent.add(over);
      return { mesh, idle: mesh.material.map, over };
    });
  }
  // ---- The big view: the scoreboard's picture up on our own screen during
  // the Dance and Kiss Cams (the real scoreboard is far away). The picture
  // is read back from the scoreboard's render target a dozen times a second
  // into a page canvas, so it sits above the game's other panels.
  let big = null, bigT = 0;
  function bigView(on) {
    if (!on) { big?.remove(); big = null; return; }
    if (big || !frame) return;
    big = document.createElement('div');
    big.id = 'ballpark-bigview';
    big.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);width:min(96vw,720px,calc((100vh - 210px) * 2));aspect-ratio:2/1;pointer-events:none;z-index:45;border-radius:10px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.35);background:#0d1118';
    const pic = document.createElement('canvas');
    [pic.width, pic.height] = PX;
    pic.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    frame.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
    big.append(pic, frame.canvas);
    big.pic = pic;
    big.px = new Uint8Array(PX[0] * PX[1] * 4);
    big.img = pic.getContext('2d').createImageData(...PX);
    document.body.appendChild(big);
  }
  function copyBig() {
    if (!big || !rt || !game.renderer) return;
    const [W, H] = PX;
    game.renderer.readRenderTargetPixels(rt, 0, 0, W, H, big.px);
    for (let y = 0; y < H; y++) big.img.data.set(big.px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); // (bottom row first)
    big.pic.getContext('2d').putImageData(big.img, 0, 0);
  }

  // ---- 📊 Scoreboard: the scoreboard's picture up close, in a panel (the
  // real one is far across the field). It is the same canvas, so it stays live.
  let scorePanel = null;
  function toggleScore(on = !scorePanel) {
    if (!on || !room) { scorePanel?.remove(); scorePanel = null; game.clearAction(); return; }
    scorePanel = document.createElement('div');
    scorePanel.id = 'ballpark-score';
    scorePanel.style.cssText = 'position:fixed;left:50%;top:70px;transform:translateX(-50%);width:min(94vw,720px);z-index:31;border-radius:12px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,.4);background:#0d1118';
    const c = room.dome.board;
    const img = document.createElement('canvas');
    img.width = c.width; img.height = c.height;
    img.style.cssText = 'width:100%;display:block';
    const close = document.createElement('button');
    close.textContent = '✕';
    close.setAttribute('aria-label', 'Close');
    close.style.cssText = 'position:absolute;bottom:6px;right:6px;width:34px;height:34px;border:0;border-radius:17px;background:rgba(255,255,255,.18);color:#fff;font-size:18px;cursor:pointer';
    close.onclick = () => toggleScore(false);
    scorePanel.append(img, close);
    document.body.appendChild(scorePanel);
    scorePanel.copy = () => img.getContext('2d').drawImage(c, 0, 0);
    scorePanel.copy();
    game.clearAction();
  }
  const scoreAct = () => ({ key: 'bp-score:' + !!scorePanel, label: '📊 ' + L(CAM_TEXT.score), run: () => toggleScore() });

  function tearDown() {
    toggleScore(false);
    endShow();
    for (const s of screens || []) { s.over.removeFromParent(); s.over.material.dispose(); }
    screens = null;
    frame?.tex.dispose(); frame = null;
    rt?.dispose(); rt = null;
    for (const ch of posed.keys()) ch.setMoves(null);
    posed.clear();
    clapAlong.dispose();
    room = null;
  }
  function drawFrame(kind, note) {
    const key = kind + '|' + note;
    if (!frame || frame.drawn === key) return;
    frame.drawn = key;
    const g = frame.canvas.getContext('2d'), [W, H] = PX;
    g.clearRect(0, 0, W, H);
    const kiss = kind === 'kiss', col = kiss ? '#ff4f8b' : '#ffd23f';
    g.lineWidth = 14; g.strokeStyle = col; g.strokeRect(7, 7, W - 14, H - 14);
    g.fillStyle = 'rgba(10,12,20,.72)'; g.fillRect(14, 14, W - 28, 40);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = col; g.font = '900 30px system-ui, sans-serif';
    g.fillText(kiss ? '💋 KISS CAM · 키스타임 💋' : '💃 DANCE CAM · 댄스캠 🕺', W / 2, 35);
    if (kiss) { // hearts round the edge
      g.font = '26px system-ui, sans-serif';
      for (const y of [90, 150]) { g.fillText('💗', 30, y); g.fillText('💗', W - 30, y); }
    }
    if (note && false) { // (no words over the faces: Yozi 2026-11-15)
      g.fillStyle = 'rgba(10,12,20,.72)'; g.fillRect(W / 2 - 150, H - 96, 300, 52);
      g.fillStyle = '#ffffff'; g.font = '900 38px system-ui, sans-serif';
      g.fillText(note, W / 2, H - 70);
    }
    frame.tex.needsUpdate = true;
  }
  function startShow(c) {
    endShow();
    show = { kind: c.kind, k: c.k, ids: null, settled: false, note: '', camSet: false };
    if (c.kind === 'kiss') {
      kc = new KissCam(c.k);
      const pair = pickPair(players().filter((p) => !blocked(p.id)), c.k) || pickPair(npcs(true), c.k);
      if (pair) show.ids = [pair[0].id, pair[1].id];
    } else {
      const one = pickOne(players().filter((p) => !blocked(p.id)), c.k) || pickOne(npcs(false), c.k);
      if (one) show.ids = [one.id];
    }
    if (!rt) { rt = new THREE.WebGLRenderTarget(PX[0], PX[1]); rt.texture.colorSpace = THREE.SRGBColorSpace; }
    bigView(true);
    for (const s of screens) { s.mesh.material.map = rt.texture; s.mesh.material.needsUpdate = true; s.over.visible = true; }
    drawFrame(c.kind, '');
    game.clearAction();
  }
  function endShow() {
    bigView(false);
    if (show?.kind === 'kiss' && kc) for (const o of kc.end()) settle(o, o.shy, o.other);
    show = null;
    for (const s of screens || []) { if (s.mesh.material.map !== s.idle) { s.mesh.material.map = s.idle; s.mesh.material.needsUpdate = true; } s.over.visible = false; }
    game.clearAction?.();
  }
  // Point the screen at someone who is clearly on it on their own screen
  // (they pressed a button): the screens agree even if ours picked others.
  function retarget(ids) {
    if (!show || (show.ids && show.ids.join() === ids.join())) return;
    show.ids = ids;
    show.camSet = false;
  }
  let filming = false; // the camera has someone to film this frame
  function film(dt, toScreen) {
    filming = false;
    const ids = show?.ids;
    if (!ids || !game.renderer) return;
    const chs = ids.map(charOf).filter(Boolean);
    if (!chs.length) return;
    filming = true;
    look.set(0, 0, 0);
    for (const ch of chs) look.add(ch.root.position);
    look.multiplyScalar(1 / chs.length);
    const r = Math.hypot(look.x, look.z) || 1;
    const back = chs.length > 1 ? 2.2 : 1.9; // out over the field side, facing them, close on the faces
    v.set(look.x - (look.x / r) * back, look.y + 1.55, look.z - (look.z / r) * back); // (high enough to see over the row in front)
    look.y += 0.95;
    if (!show.camSet) { camAt3.copy(v); show.camSet = true; } else camAt3.lerp(v, 1 - Math.exp(-dt * 5));
    cam3.position.copy(camAt3);
    cam3.lookAt(look);
    cam3.updateMatrixWorld();
    if (!toScreen) return;
    const ren = game.renderer, was = ren.getRenderTarget();
    ren.setRenderTarget(rt);
    ren.render(room.scene, cam3);
    ren.setRenderTarget(was);
  }

  // How the Kiss Cam ended for a and b (core/ballpark-cams.js KissCam), once.
  function settle(o, a, b) {
    if (o.what === 'kiss') {
      pose(a, 'kiss', b); pose(b, 'kiss', a);
      bubble(a, '😘'); bubble(b, '💋');
      setTimeout(() => { if (room) { bubble(a, '💕'); bubble(b, '💕'); } }, 900);
      cheer(1.4);
    } else { // turned down (or no answer): the one who asked is left sheepish
      const shy = o.shy, by = shy === a ? b : a;
      pose(shy, 'shy');
      bubble(shy, '😅');
      if (o.by) { pose(by, 'sorry'); bubble(by, '🙏'); } else bubble(by, '😶');
      cheer(0.5);
      game.sfx?.crowd?.(0.3);
    }
    if (show?.kind === 'kiss' && show.ids?.includes(a) && show.ids?.includes(b)) { show.settled = true; show.note = o.what === 'kiss' ? '💕 KISS! 💕' : '😅 AWW~'; drawFrame('kiss', show.note); }
    game.sfx?.pop?.();
    game.clearAction();
  }

  // ---- Buttons ----
  const partner = () => (show?.kind === 'kiss' && show.ids?.length === 2 && show.ids.includes(myId()) ? show.ids.find((id) => id !== myId()) : null);
  function press(kind, to) {
    game.send(bpMsg(kind, to));
    const r = kc?.add(myId(), to, kind);
    if (r) settle(r, myId(), to);
    else if (kind === 'n') return;
    else game.toast(fmt(L(CAM_TEXT.waiting), { name: nameOf(to) }));
    game.clearAction();
  }
  function kissActs() {
    const to = partner();
    if (!to || !kc || kc.outcome(myId(), to) || kc.asked(myId(), to) || !game.seated?.dome) return [];
    const back = kc.asked(to, myId());
    return [
      { key: 'bp-kiss:' + to + back, label: '💋 ' + fmt(L(back ? CAM_TEXT.kissBack : CAM_TEXT.kiss), { name: nameOf(to) }), run: () => press('k', to) },
      { key: 'bp-no:' + to, label: '🙏 ' + L(CAM_TEXT.no), run: () => press('n', to) },
    ];
  }
  function danceAct() {
    if (show?.kind !== 'dance' || show.ids?.[0] !== myId() || danced === show.k || !game.seated?.dome) return null;
    return { key: 'bp-dance', label: '💃 ' + L(CAM_TEXT.dance), run: () => {
      danced = show.k;
      game.send(bpMsg('d'));
      pose(myId(), 'dance');
      bubble(myId(), '💃');
      cheer(1.1);
      game.clearAction();
    } };
  }
  function waveAct() {
    const c = dome()?.cam();
    if (c?.kind !== 'wave' || waved === c.k || !game.seated?.dome) return null;
    const s = game.seated, w = waveAt(c);
    if (rowAt(s.x, s.z) < 0 || waveGap(w.angle, Math.atan2(s.x, s.z)) > 0.7) return null;
    return { key: 'bp-wave', label: '🌊 ' + L(CAM_TEXT.wave), run: () => {
      waved = c.k;
      game.send(bpMsg('w'));
      pose(myId(), 'wave');
      bubble(myId(), '🙌');
      game.clearAction();
    } };
  }

  // Clapping along and foul balls (game/ballpark-fun.js).
  const handle = {
    pose: (id, name) => pose(String(id), name),
    bubble: (id, text) => bubble(String(id), text),
    cheer: (a) => cheer(a),
    leaderShout: (text) => { const o = (room?.patronNpcs || []).find((q) => q.squad?.role === 'leader' && q.squad.side === 'home'); if (o) game.npcBubble(o, text); },
    npcNear: (x, z, r) => { let best = null, bd = r; for (const p of npcs(false)) { const d = Math.hypot(p.x - x, p.z - z); if (d < bd) { bd = d; best = p.id; } } return best; },
  };
  const clapAlong = createCheerAlong(game, handle);
  const fouls = createFoulBalls(game, handle);

  // ---- Each frame ----
  let actKey = '';
  let scoreT = 0;
  function tick(dt) {
    const r = game.interior?.dome ? game.interior : null;
    if (r !== room) { if (room) tearDown(); if (r) setUp(r); }
    if (scorePanel && (scoreT = (scoreT || 0) - dt) <= 0) { scoreT = 0.25; scorePanel.copy(); }
    fouls.tick(room);
    if (!room) return;
    clapAlong.tick();
    for (const [ch, p] of posed) { p.t += dt; if (p.t >= POSE_S[p.name]) { ch.setMoves(null); posed.delete(ch); } }
    const c = dome().cam();
    const kind = c && c.kind !== 'wave' ? c.kind : null;
    if (kind && (show?.kind !== kind || show.k !== c.k)) startShow(c);
    else if (!kind && show) endShow();
    // Tell everyone once what is on.
    const tellKey = c ? c.kind + ':' + c.k : '';
    if (c && told !== tellKey) {
      told = tellKey;
      const mine = show?.ids?.includes(myId());
      if (c.kind === 'kiss') game.toast(mine ? fmt(L(CAM_TEXT.kissYou), { name: nameOf(partner()) }) : L(CAM_TEXT.kissOn));
      else if (c.kind === 'dance') game.toast(mine ? L(CAM_TEXT.danceYou) : L(CAM_TEXT.danceOn));
      else if (c.kind === 'wave' && game.seated?.dome) game.toast(L(CAM_TEXT.waveOn));
    }
    // The wave: the seated NPCs stand up as it passes them.
    if (c?.kind === 'wave') {
      const w = waveAt(c);
      if (npcWaved.size && ![...npcWaved][0].startsWith(c.k + ':')) npcWaved.clear();
      for (const p of npcs(false)) {
        const key = c.k + ':' + p.id;
        if (!npcWaved.has(key) && w.strength > 0.5 && waveGap(w.angle, Math.atan2(p.x, p.z)) < 0.12) { npcWaved.add(key); pose(p.id, 'wave'); }
      }
    }
    // The NPCs on the screen do their bit a few seconds in.
    if (show?.ids?.[0]?.startsWith('npc') && c && c.u > 0.3 && npcDone !== show.kind + c.k) {
      npcDone = show.kind + c.k;
      if (show.kind === 'kiss') settle(npcKisses(c.k) ? { what: 'kiss' } : { what: 'no', shy: show.ids[0], by: show.ids[1] }, show.ids[0], show.ids[1]);
      else { pose(show.ids[0], 'dance'); bubble(show.ids[0], '💃'); cheer(1.0); }
    }
    if (show) {
      odd ^= 1;
      film(dt, odd); // (every other frame)
      if (odd && filming && (bigT -= dt * 2) <= 0) { bigT = 0.08; copyBig(); }
    }
    // The button changes as the moment goes on.
    const key = [kissActs().map((a) => a.key).join(), danceAct()?.key, waveAct()?.key, fouls.action()?.key, clapAlong.action()?.key].join('|');
    if (key !== actKey) { actKey = key; game.clearAction(); }
  }

  // ---- Messages from the room ----
  function onMsg(from, text) {
    const m = parseBp(text);
    if (!m || !room || blocked(from)) return;
    from = String(from);
    const c = dome().cam();
    if (m.kind === 'c') { fouls.heard(from); return; }
    if (m.kind === 'w') { if (c?.kind === 'wave' && players().some((p) => p.id === from)) pose(from, 'wave'); return; }
    if (m.kind === 'd') {
      if (show?.kind !== 'dance' || !players().some((p) => p.id === from)) return;
      retarget([from]);
      pose(from, 'dance'); bubble(from, '💃'); cheer(1.1);
      return;
    }
    // A kiss or a heart: only between two people side by side, on the Kiss Cam.
    const to = String(m.to);
    if (show?.kind !== 'kiss' || !kc || !sideBySide(from, to) || blocked(to)) return;
    retarget([from, to].sort());
    const r = kc.add(from, to, m.kind);
    if (r) settle(r, from, to);
    else if (to === myId() && m.kind === 'k') { game.toast(fmt(L(CAM_TEXT.asked), { name: nameOf(from) })); game.clearAction(); }
  }

  return {
    tick,
    onMsg,
    // The seated button: kiss / kiss back, dance or stand for the wave.
    action: () => kissActs()[0] || danceAct() || waveAct() || fouls.action() || clapAlong.action(),
    // Standing in the stands too: a foul ball coming down near you.
    standingAction: () => (game.seated ? null : fouls.action()),
    // The rest for the chooser ("no thanks" next to the kiss).
    more: () => [...kissActs().slice(1), scoreAct()],
    // 📊 Scoreboard, for the list of things to do anywhere in the stadium.
    scoreAct: () => (room ? scoreAct() : null),
    // The picture on the big screen as a PNG data URL (tests, screenshots).
    snap: () => {
      if (!rt || !game.renderer) return null;
      const [W, H] = PX, px = new Uint8Array(W * H * 4);
      game.renderer.readRenderTargetPixels(rt, 0, 0, W, H, px);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const g = c.getContext('2d'), img = g.createImageData(W, H);
      for (let y = 0; y < H; y++) img.data.set(px.subarray((H - 1 - y) * W * 4, (H - y) * W * 4), y * W * 4); // (bottom row first)
      g.putImageData(img, 0, 0);
      if (frame && show) g.drawImage(frame.canvas, 0, 0);
      return c.toDataURL('image/png');
    },
    // For tests and ?debug.
    state: () => ({ show: show && { kind: show.kind, k: show.k, ids: show.ids, settled: show.settled, note: show.note }, posed: posed.size }),
  };
}
