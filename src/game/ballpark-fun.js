// Modu Ballpark: clapping along with the cheer leader, and foul balls into
// the stands (core/ballpark-cams.js has the beats and the balls; this file
// shows them). Made by game/ballpark-cams.js, which gives each a small `cams`
// handle: the room, poses, bubbles and the crowd.
//
// Clapping: every chant goes 짝짝 짝짝짝. Sitting in the stands, the button
// turns into 👏 for the length of the chant and five dots over it light up on
// the beats; a clap near a beat lights its dot green. Twenty in one game and
// the cheer leader calls your name. Nothing is sent: it is your own rhythm.
//
// Foul balls: a few a game fly back into the seats people can sit in (the
// same ball and seat on every screen). Anyone in the stands near where it
// comes down gets 🧤 and catches it by pressing just before it lands (one
// message, so the others see who got it). Caught balls are counted on this
// device for now; they become a signed ball in the bag with the team shop.
import * as THREE from 'three';
import { L, fmt } from '../ui/pocha-ui.js';
import { CLAP_BEATS, CHEER_MVP, clapAt, foulAt, FOUL_T, CATCH_WINDOW, CATCH_REACH, bpMsg } from '../core/ballpark-cams.js';
import { gameAt } from '../core/ballgame.js';
import { rowAt, FIELD_Y } from '../core/dome.js';
import { CAM_TEXT } from '../data/ballpark-cam-text.js';

const BALLS_KEY = 'mk.signedBalls';
const HOME = { x: 0, y: FIELD_Y + 1, z: 24 };

export function createCheerAlong(game, cams) {
  let chant = null; // { at (performance s), hit: [] }
  let claps = { k: -1, n: 0, mvp: false };
  let tipShown = false;
  let el = null;
  const now = () => performance.now() / 1000;
  const inStands = () => { const s = game.seated; return s?.dome && rowAt(s.x, s.z) >= 0; };

  function dots() {
    if (!el) {
      el = document.createElement('div');
      el.id = 'clap-dots';
      el.style.cssText = 'position:fixed;left:50%;bottom:calc(178px + env(safe-area-inset-bottom));transform:translateX(-50%);display:flex;gap:10px;padding:8px 14px;border-radius:20px;background:rgba(16,20,32,.72);z-index:40;pointer-events:none';
      for (let i = 0; i < CLAP_BEATS.length; i++) {
        const d = document.createElement('span');
        d.style.cssText = `width:${i === 1 || i === 4 ? 18 : 14}px;height:14px;border-radius:7px;background:#3a4256;transition:background .08s`;
        el.appendChild(d);
      }
      document.body.appendChild(el);
    }
    return el;
  }
  function hide() { if (el) el.style.display = 'none'; }

  return {
    // The cheer leader starts a chant (core/dome.js ev.onBeat).
    onBeat() {
      if (!inStands()) return;
      chant = { at: now(), hit: [] };
      if (!tipShown) { tipShown = true; game.toast(L(CAM_TEXT.clapTip)); }
      game.clearAction();
    },
    tick() {
      if (!chant) return;
      const t = now() - chant.at;
      if (t > CLAP_BEATS.at(-1) + 0.6 || !inStands()) { chant = null; hide(); game.clearAction(); return; }
      const box = dots();
      box.style.display = 'flex';
      [...box.children].forEach((d, i) => {
        const near = Math.abs(t - CLAP_BEATS[i]) < 0.12;
        d.style.background = chant.hit.includes(i) ? '#4fd27a' : near ? '#ffd23f' : t > CLAP_BEATS[i] + 0.2 ? '#5a3a44' : '#3a4256';
      });
    },
    action() {
      if (!chant || !inStands()) return null;
      return { key: 'bp-clap', label: '👏 ' + L(CAM_TEXT.clap), run: () => {
        cams.pose(game.myId, 'clap');
        game.sfx?.tock?.(1, 900);
        if (!chant) return;
        const i = clapAt(now() - chant.at, chant.hit);
        if (i < 0) return;
        chant.hit.push(i);
        const k = gameAt(Date.now() / 1000).k;
        if (claps.k !== k) claps = { k, n: 0, mvp: false };
        claps.n++;
        if (claps.n >= CHEER_MVP && !claps.mvp) {
          claps.mvp = true;
          game.toast(L(CAM_TEXT.mvp));
          cams.leaderShout(`${game.myName?.() || ''} 최고! 👍`);
          cams.cheer(0.9);
        }
      } };
    },
    dispose() { el?.remove(); el = null; chant = null; },
  };
}

export function createFoulBalls(game, cams) {
  let room = null, ball = null;
  let current = null; // { key, seat, from, to, tried, caught, by, told }
  const v = new THREE.Vector3();

  function setUp(r) {
    dispose();
    room = r;
    ball = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 10), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
    ball.visible = false;
    r.scene.add(ball);
  }
  function dispose() {
    if (ball) { ball.removeFromParent(); ball.geometry.dispose(); ball.material.dispose(); }
    ball = null; room = null; current = null;
  }
  // Where I am, if I'm in the stands (sitting or standing in a row).
  function myStandSpot() {
    const p = game.me.root.position;
    return rowAt(p.x, p.z) >= 0 ? p : null;
  }
  const near = (c) => { const p = myStandSpot(); return !!(p && c && Math.hypot(p.x - c.to.x, p.z - c.to.z) < CATCH_REACH); };

  function caught(byMe, who) {
    if (!current || current.caught) return;
    current.caught = true;
    current.by = who;
    ball.visible = false;
    cams.bubble(who, '🧤⚾');
    cams.cheer(0.7);
    if (!byMe) return;
    let n = 1;
    try { n = (+localStorage.getItem(BALLS_KEY) || 0) + 1; localStorage.setItem(BALLS_KEY, String(n)); } catch { /* storage blocked */ }
    game.toast(fmt(L(CAM_TEXT.caught), { n }));
    game.sfx?.pop?.();
  }

  return {
    tick(r) {
      if (r !== room) { if (room) dispose(); if (r) setUp(r); }
      if (!room) return;
      const seats = room.seats || [];
      const st = gameAt(Date.now() / 1000);
      const f = st.phase === 'break' || st.phase === 'intro' ? null : foulAt(st.game, seats.length, st.at);
      const key = f ? st.game.k + ':' + f.i : null;
      if (key !== current?.key) {
        current = f ? { key, seat: f.seat, from: HOME, to: { x: seats[f.seat].x, y: seats[f.seat].y + 1.0, z: seats[f.seat].z }, tried: false, caught: false, told: false } : null;
        game.clearAction();
      }
      if (!current) { ball.visible = false; return; }
      if (!current.told && near(current)) { current.told = true; game.toast(L(CAM_TEXT.foulComing)); game.clearAction(); }
      if (current.caught) return;
      const u = f.u, { from, to } = current;
      v.set(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u + Math.sin(u * Math.PI) * 14, from.z + (to.z - from.z) * u);
      ball.position.copy(v);
      ball.visible = true;
      // Nobody caught it: one of the people sitting there might.
      if (f.left < 0.08 && !current.npcTried) {
        current.npcTried = true;
        const o = cams.npcNear(to.x, to.z, 1.6);
        if (o && current.seat % 3 === 0) caught(false, o); // (now and then)
      }
    },
    action() {
      if (!current || current.caught || current.tried || !near(current)) return null;
      return { key: 'bp-catch:' + current.key, label: '🧤 ' + L(CAM_TEXT.catch), run: () => {
        if (!current || current.caught || current.tried) return;
        current.tried = true;
        const st = gameAt(Date.now() / 1000), f = foulAt(st.game, (room?.seats || []).length, st.at);
        cams.pose(game.myId, 'wave');
        if (f && f.left <= CATCH_WINDOW) { game.send(bpMsg('c')); caught(true, game.myId); } else game.toast(L(CAM_TEXT.missed));
        game.clearAction();
      } };
    },
    // Someone else caught it (bp:c).
    heard(from) {
      if (!current || current.caught) return;
      const p = game.others.positionOf(from);
      if (p && Math.hypot(p.x - current.to.x, p.z - current.to.z) < CATCH_REACH + 1) caught(false, from);
    },
    flightS: FOUL_T,
    dispose,
  };
}
