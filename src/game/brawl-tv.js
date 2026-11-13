// The arcade's two wall screens (core/activity-rooms.js builds them): a
// Rooftop Rumble match somebody in the room is playing is shown on one, for
// everyone else. The player sends the fighters' inputs to the room
// (core/brawl-tv.js) and this plays the same match here: the ring and the
// two fighters stand far under the room, like the player's own (game/
// brawl.js), and a second camera draws them into the screen's picture.
// Loaded when the first match is heard in the arcade.
import * as THREE from 'three';
import { L } from '../ui/pocha-ui.js';
import { TICK, ROUNDS_TO_WIN } from '../core/brawl.js';
import { createScreens } from '../core/brawl-tv.js';
import { buildStage, makeFighter, placeFighter, RIVAL, STYLE, VS_SKY } from './brawl.js';

const STAGE_Y = [-150, -220]; // each screen's ring, under the room (and under the player's own ring)
const PX = [512, 288], STRIP = [512, 48];
const FOV = 38, TAN_H = Math.tan(THREE.MathUtils.degToRad(FOV / 2)) * (16 / 9);

export function createBrawlTv(game) {
  const tv = createScreens(STAGE_Y.length);
  const shows = STAGE_Y.map(() => null);
  const cam = new THREE.PerspectiveCamera(FOV, 16 / 9, 0.1, 110);
  const v = new THREE.Vector3(), to = new THREE.Vector3();
  let room = null, acc = 0, odd = 0;

  function close(i) {
    const s = shows[i];
    if (!s) return;
    shows[i] = null;
    for (const f of [s.a, s.b]) { f.ch.setMoves(null); f.ch.root.removeFromParent(); }
    s.stage.dispose();
    s.rt.dispose(); s.tex.dispose();
    if (s.screen.material.map === s.rt.texture) { s.screen.material.map = s.idle; s.screen.material.needsUpdate = true; }
    s.strip.visible = false;
    if (s.strip.material.map === s.tex) s.strip.material.map = null;
  }
  // Who is fighting on screen i: the sender (left) and another player or one of the game's rivals.
  function open(i) {
    close(i);
    const view = tv.views[i], info = view.info, slot = room.stations.fightTv[i];
    const rival = /^r\d$/.test(info.b) ? RIVAL[+info.b[1]] : null;
    const look = (id) => (id === game.myId ? game.look : game.others.lookOf?.(id)) || {};
    const stage = buildStage(rival ? rival.sky : VS_SKY, STAGE_Y[i]);
    room.scene.add(stage.g);
    const canvas = document.createElement('canvas');
    [canvas.width, canvas.height] = STRIP;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const rt = new THREE.WebGLRenderTarget(PX[0], PX[1]);
    shows[i] = {
      key: view.from + '|' + info.b, stage, rt, canvas, tex, shown: '', time: 0, camSet: false, at: new THREE.Vector3(),
      a: makeFighter(look(view.from), 0, stage.g), b: makeFighter(rival ? rival.look : look(info.b), 1, stage.g),
      names: [String(info.n?.[0] || game.others.nameOf(view.from) || '?').slice(0, 16), rival ? L(rival.name) : String(info.n?.[1] || game.others.nameOf(info.b) || '?').slice(0, 16)],
      screen: slot.screen, strip: slot.strip, idle: slot.idle,
    };
    slot.strip.material.map = tex; slot.strip.material.needsUpdate = true;
  }
  // The names, health bars, rounds won and the clock, along the top of the picture.
  function strip(s, m) {
    const secs = Math.ceil(m.left / 60), key = [m.a.hp, m.b.hp, secs, m.wins.join(), m.a.style, m.b.style].join('|');
    if (key === s.shown) return;
    s.shown = key;
    const g = s.canvas.getContext('2d'), [W, H] = STRIP;
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(10,8,20,.72)'; g.fillRect(0, 0, W, H);
    g.textBaseline = 'middle'; g.font = '800 15px system-ui, sans-serif';
    for (const [f, name, right] of [[m.a, s.names[0], 0], [m.b, s.names[1], 1]]) {
      const x0 = right ? W / 2 + 30 : 8, bw = W / 2 - 38, k = Math.max(0, f.hp / f.maxHp);
      g.fillStyle = '#2a2540'; g.fillRect(x0, 6, bw, 14);
      g.fillStyle = f.hp <= 25 ? '#ff5a6e' : '#ffd23c';
      g.fillRect(right ? x0 : x0 + bw * (1 - k), 6, bw * k, 14); // (each bar empties toward the middle)
      g.fillStyle = '#fff'; g.textAlign = right ? 'right' : 'left';
      g.fillText(STYLE[f.style].icon + ' ' + name, right ? W - 8 : 8, 34, bw - 40);
      for (let p = 0; p < ROUNDS_TO_WIN; p++) {
        g.beginPath(); g.arc(right ? W / 2 + 36 + p * 14 : W / 2 - 36 - p * 14, 34, 5, 0, Math.PI * 2);
        g.fillStyle = p < m.wins[right] ? '#ffd23c' : '#3a3260'; g.fill();
      }
    }
    g.fillStyle = '#fff'; g.textAlign = 'center'; g.font = '900 22px system-ui, sans-serif';
    g.fillText(String(secs), W / 2, 16);
    s.tex.needsUpdate = true;
  }
  function spark(s, e, color, size) {
    const sp = s.stage.sparks.reduce((p, q) => (q.t > p.t ? q : p));
    sp.t = 0; sp.size = size;
    sp.sp.position.set(e.x, e.y, e.z);
    sp.sp.material.color.set(color);
    sp.sp.visible = true;
  }
  function draw(i, s, m, dt, render) {
    s.time += dt;
    placeFighter(s.a, m.a, dt, s.time, 0); placeFighter(s.b, m.b, dt, s.time, 1);
    for (const [k, f] of [m.a, m.b].entries()) {
      const sp = s.stage.shots[k];
      sp.visible = !!f.shot;
      if (f.shot) sp.position.set(f.shot.x, 0.78, f.shot.z);
    }
    for (const sp of s.stage.sparks) {
      if (!sp.sp.visible) continue;
      sp.t += dt / 0.22;
      if (sp.t >= 1) { sp.sp.visible = false; continue; }
      sp.sp.scale.setScalar(sp.size * (0.3 + sp.t * 0.6));
      sp.sp.material.opacity = 1 - sp.t * sp.t;
    }
    strip(s, m);
    if (!render) return;
    // The same side-on view as the player's, both fighters in the picture.
    const dx = m.b.x - m.a.x, dz = m.b.z - m.a.z, dist = Math.hypot(dx, dz) || 1, back = Math.max(3.1, (dist / 2 + 0.95) / TAN_H);
    const mx = (m.a.x + m.b.x) / 2, mz = (m.a.z + m.b.z) / 2, y = STAGE_Y[i];
    to.set(mx, y + 0.72 + Math.max(m.a.y, m.b.y) * 0.3, mz);
    v.set(mx - (dz / dist) * back, y + 1.0 + back * 0.09, mz + (dx / dist) * back);
    if (!s.camSet) { s.at.copy(v); s.camSet = true; } else s.at.lerp(v, 1 - Math.exp(-dt * 7));
    cam.position.copy(s.at);
    cam.lookAt(to);
    cam.updateMatrixWorld();
    const r = game.renderer, was = r.getRenderTarget();
    r.setRenderTarget(s.rt);
    r.render(room.scene, cam);
    r.setRenderTarget(was);
    if (s.screen.material.map !== s.rt.texture) { s.screen.material.map = s.rt.texture; s.screen.material.needsUpdate = true; s.strip.visible = true; }
  }

  return {
    // A match message from someone in the room (game/arcade.js).
    heard(from, text) { if (game.interior?.stations?.fightTv) tv.heard(from, text); },
    // Each frame. playing: we are in a match ourselves (the game's camera is at our own ring).
    update(dt, playing) {
      const here = game.interior?.stations?.fightTv ? game.interior : null;
      if (here !== room) { for (let i = 0; i < shows.length; i++) close(i); room = here; }
      acc = Math.min(acc + dt, 0.25);
      const ev = tv.views.map(() => []);
      while (acc >= TICK) { acc -= TICK; tv.views.forEach((view, i) => ev[i].push(...view.tick())); }
      if (!room) return;
      odd ^= 1;
      tv.views.forEach((view, i) => {
        const m = view.match;
        if (!m) { close(i); return; }
        if (view.renewed() || !shows[i]) { if (shows[i]?.key !== view.from + '|' + view.info.b) open(i); }
        const s = shows[i];
        for (const e of ev[i]) {
          if (e.k === 'hit') spark(s, e, e.counter ? '#ff6a5a' : '#ffe9a0', e.dmg >= 14 || e.ko ? 1.5 : 1);
          else if (e.k === 'block') spark(s, e, '#7df0ff', 0.7);
        }
        // Two pictures a frame is a lot for a small phone: there, each every other frame.
        draw(i, s, m, dt, !playing && (!game.lowSpec || (i & 1) === odd));
      });
    },
    // For tests: what each screen shows.
    get state() { return tv.views.map((view, i) => (view.match ? { from: view.from, b: view.info.b, names: shows[i]?.names, phase: view.match.phase, hp: [view.match.a.hp, view.match.b.hp], live: shows[i]?.screen.material.map === shows[i]?.rt.texture } : null)); },
  };
}
