// Snowballs and snowmen in the street, once the snow has settled
// (core/snow-cover.js). Gather snow into a ball, roll it bigger, push it
// with friends, put a smaller ball on a bigger one for a snowman. The rules
// are in core/snowballs.js; this file is the game and the models.
//
// Each ball belongs to the player who started it and travels in their state
// ("sb"); a friend's push or a head put on top goes to the owner as a
// message, and the owner's state tells everyone where the ball is now.
// When the snow has melted, snowballs and snowmen slowly melt too.
import * as THREE from 'three';
import {
  STEPS, MAX_N, MAX_BALLS, MIN_SNOW, ROLL_FROM, CREW_STAGE,
  stageOf, stepOf, diameterOf, rollable, pushResult, crewSize, canTop, liftable,
  encodeBalls, parseBalls, pushMsg, headMsg, snowPose,
} from '../core/snowballs.js';
import { L } from '../ui/pocha-ui.js';

export const SNOW_TEXT = {
  make: { en: 'Make a snowball', ko: '눈덩이 만들기', ja: '雪玉を作る', zh: '做雪球' },
  gather: { en: 'Gather snow', ko: '눈 모으기', ja: '雪を集める', zh: '堆雪' },
  roll: { en: 'Roll the snowball', ko: '눈덩이 굴리기', ja: '雪玉を転がす', zh: '滚雪球' },
  help: { en: 'Push with {name}', ko: '{name}와 같이 밀기', ja: '{name}と一緒に押す', zh: '和{name}一起推' },
  top: { en: 'Put it on top (snowman)', ko: '위에 올리기 (눈사람)', ja: '上にのせる（雪だるま）', zh: '放到上面（雪人）' },
  stage: { en: 'Stage {s}: {name} snowball!', ko: '{s}단계: {name} 눈덩이!', ja: '{s}段階：{name}雪玉！', zh: '第{s}阶段：{name}雪球！' },
  nowRoll: { en: 'Too big to pat by hand now. Roll it! Friends can push with you.', ko: '이제 손으로 모으기엔 커요. 굴려 보세요! 친구도 같이 밀 수 있어요.', ja: 'もう手では大きすぎます。転がそう！友だちも一緒に押せます。', zh: '已经大到不能用手堆了，滚起来吧！朋友也可以一起推。' },
  friend: { en: 'Too heavy to grow alone. Get a friend to push with you!', ko: '혼자서는 너무 무거워 더 커지지 않아요. 친구와 같이 밀어 보세요!', ja: '一人では重すぎてもう大きくなりません。友だちと一緒に押そう！', zh: '一个人推太重了，长不大了。叫朋友一起推吧！' },
  heavy: { en: 'A giant snowball! It takes two or more people to roll it.', ko: '거대 눈덩이예요! 2명 이상 같이 밀어야 굴러가요.', ja: '巨大雪玉！2人以上で押さないと転がりません。', zh: '巨型雪球！需要两人以上一起推才能滚动。' },
  full: { en: 'It can\'t get any bigger. Make a snowman with it!', ko: '더는 커지지 않아요. 이걸로 눈사람을 만들어 보세요!', ja: 'これ以上大きくなりません。雪だるまにしよう！', zh: '已经不能再大了，用它做个雪人吧！' },
  snowman: { en: 'A snowman! ⛄', ko: '눈사람 완성! ⛄', ja: '雪だるまの完成！⛄', zh: '雪人做好了！⛄' },
  tooBig: { en: 'Too heavy to lift. A head can be up to chest-high (stage 5).', ko: '너무 무거워서 못 들어요. 머리는 5단계(가슴 높이)까지 올릴 수 있어요.', ja: '重くて持ち上げられません。頭は5段階（胸の高さ）までです。', zh: '太重了举不起来。头最多到第5阶段（胸口高）。' },
  oldMelted: { en: 'Your oldest snowball melted to make room for a new one.', ko: '새 눈덩이를 만들려고 가장 오래된 눈덩이가 녹았어요.', ja: '新しい雪玉のために、一番古い雪玉が溶けました。', zh: '为了做新雪球，最早的雪球融化了。' },
  names: [
    { en: 'Fist-sized', ko: '주먹만 한', ja: 'こぶし大の', zh: '拳头大的' },
    { en: 'Palm-sized', ko: '손바닥만 한', ja: '手のひら大の', zh: '巴掌大的' },
    { en: 'Knee-high', ko: '무릎 높이', ja: 'ひざの高さの', zh: '齐膝高的' },
    { en: 'Waist-high', ko: '허리 높이', ja: '腰の高さの', zh: '齐腰高的' },
    { en: 'Chest-high', ko: '가슴 높이', ja: '胸の高さの', zh: '齐胸高的' },
    { en: 'Person-tall', ko: '사람 키만 한', ja: '人の背丈の', zh: '一人高的' },
    { en: 'Giant', ko: '거대', ja: '巨大', zh: '巨型' },
  ],
};
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

const REACH = 1.1; // how far from a ball's surface you can work on it
const MELT_EVERY_MS = 2500; // once the snow on the ground is gone: one step off each ball
const WORK_POSE_MS = 2200; // the pose stays this long after a press
const PUSH_MS = 420; // a push rolls the ball (and you behind it) over this long

// ---------- models ----------
const ballGeo = new THREE.SphereGeometry(0.5, 22, 16);
let snowMat = null;
function snowMaterial() {
  if (snowMat) return snowMat;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = '#f4f8ff';
  g.fillRect(0, 0, 64, 64);
  for (let i = 0; i < 260; i++) { // packed-snow speckle, so you can see it roll
    const v = 214 + Math.floor(Math.random() * 30);
    g.fillStyle = `rgb(${v},${v + 6},${Math.min(255, v + 16)})`;
    g.fillRect(Math.random() * 64, Math.random() * 64, 2 + Math.random() * 3, 2 + Math.random() * 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 2);
  snowMat = new THREE.MeshLambertMaterial({ map: tex, color: 0xffffff, emissive: 0x1a2030 });
  return snowMat;
}
const coal = new THREE.MeshLambertMaterial({ color: 0x23201f });
const carrot = new THREE.MeshLambertMaterial({ color: 0xf07a1e });
const twig = new THREE.MeshLambertMaterial({ color: 0x6b4a2e });
const dotGeo = new THREE.SphereGeometry(0.5, 8, 6);
const noseGeo = new THREE.ConeGeometry(0.5, 1, 8).rotateX(Math.PI / 2).translate(0, 0, 0.5);
const armGeo = new THREE.CylinderGeometry(0.5, 0.7, 1, 5).translate(0, 0.5, 0);

function makeBallModel() {
  const g = new THREE.Group();
  g.userData.noSnow = true; // (already snow: core/snow-cover.js leaves it be)
  const spin = new THREE.Group(); // the rolling part
  const body = new THREE.Mesh(ballGeo, snowMaterial());
  body.castShadow = true;
  spin.add(body);
  g.add(spin);
  return { group: g, spin, body, face: null };
}

// The snowman's head, face, buttons and twig arms for a body of diameter
// D and a head of diameter d, facing +z.
function makeFace(D, d) {
  const f = new THREE.Group();
  const head = new THREE.Mesh(ballGeo, snowMaterial());
  head.scale.setScalar(d);
  const headY = D * 0.9 + d / 2;
  head.position.y = headY;
  head.castShadow = true;
  f.add(head);
  const dot = (s, x, y, z) => { const m = new THREE.Mesh(dotGeo, coal); m.scale.setScalar(s); m.position.set(x, y, z); f.add(m); };
  const er = d / 2;
  for (const sx of [-1, 1]) dot(d * 0.09, sx * er * 0.36, headY + er * 0.25, er * 0.9); // eyes
  for (let i = 0; i < 5; i++) { // a coal smile
    const a = -0.6 + (i / 4) * 1.2;
    dot(d * 0.05, Math.sin(a) * er * 0.45, headY - er * 0.3 - Math.cos(a) * er * 0.08 + er * 0.08, er * 0.93);
  }
  const nose = new THREE.Mesh(noseGeo, carrot);
  nose.scale.set(d * 0.12, d * 0.12, d * 0.45);
  nose.position.set(0, headY, er * 0.92);
  f.add(nose);
  const R = D / 2;
  for (let i = 0; i < 3; i++) { // buttons down the front
    const a = 0.25 - i * 0.32;
    dot(D * 0.06, 0, R + Math.sin(a) * R, Math.cos(a) * R * 0.98);
  }
  for (const sx of [-1, 1]) { // twig arms out of the sides
    const arm = new THREE.Mesh(armGeo, twig);
    arm.scale.set(D * 0.035, D * 0.75, D * 0.035);
    arm.position.set(sx * R * 0.85, R * 1.25, 0);
    arm.rotation.z = -sx * 1.0;
    f.add(arm);
  }
  return f;
}

/**
 * game: getters { mode, me, others, myId, shop, scene, depth (0-1 snow on
 * the ground), snowing }, plus send(msg), blocked(x, z, r), bubble(text),
 * resendState(), clearAction(), sfx().
 */
export function createSnowman(game) {
  const mine = []; // { k, x, z, n, h?, ry?, pushes: [{ who, at }] }
  let nextK = 1;
  const drawn = new Map(); // "owner:k" -> { m, x, z, n, h, key }
  let lastWork = 0, workBall = null, workHelper = false;
  let anim = null; // a push under way: { t, me0, me1 }
  let meltAt = 0;
  let hintAt = 0;

  const say = (text) => game.shop.toast(text);
  const hint = (text) => { const now = Date.now(); if (now - hintAt > 2500) { hintAt = now; say(text); } };

  // Every ball in the street now: mine and everyone else's.
  function balls() {
    const out = mine.map((b) => ({ owner: game.myId, b }));
    for (const [id, p] of game.others.players) {
      if (p.hidden) continue;
      for (const b of parseBalls(p.target?.sb)) out.push({ owner: id, b });
    }
    return out;
  }

  function nearest(p, filter = () => true) {
    let best = null, bestD = Infinity;
    for (const o of balls()) {
      if (!filter(o)) continue;
      const d = Math.hypot(o.b.x - p.x, o.b.z - p.z) - diameterOf(o.b.n) / 2;
      if (d < REACH && d < bestD) { best = o; bestD = d; }
    }
    return best;
  }

  function stageUp(b, before) {
    const s = stageOf(b.n);
    if (s === stageOf(before)) return;
    game.bubble(`⛄ ${s}`);
    game.sfx()?.cheer?.();
    say(fill(L(SNOW_TEXT.stage), { s, name: L(SNOW_TEXT.names[s - 1]) }) + (s === ROLL_FROM ? ' ' + L(SNOW_TEXT.nowRoll) : ''));
  }

  function face(x, z, back = false) {
    const p = game.me.root.position;
    const yaw = Math.atan2(x - p.x, z - p.z);
    game.me.root.rotation.y = back ? yaw + Math.PI : yaw;
    return yaw;
  }

  function work(o, helper) {
    lastWork = Date.now();
    workBall = o;
    workHelper = helper;
  }

  // ---------- gathering (stages 1-3) ----------
  function make() {
    const p = game.me.root.position, ry = game.me.root.rotation.y;
    if (mine.length >= MAX_BALLS) { mine.shift(); say(L(SNOW_TEXT.oldMelted)); }
    const b = { k: nextK, x: p.x + Math.sin(ry) * 0.55, z: p.z + Math.cos(ry) * 0.55, n: 1, pushes: [] };
    nextK = (nextK % 99) + 1;
    mine.push(b);
    work({ owner: game.myId, b }, false);
    game.sfx()?.pop?.();
    game.resendState();
    game.clearAction();
  }

  function gather(b) {
    face(b.x, b.z);
    const before = b.n;
    b.n = Math.min(ROLL_FROM * STEPS - STEPS, b.n + 1); // up to the first step of stage 4
    // keep the growing ball just in front of you
    const p = game.me.root.position, r = diameterOf(b.n) / 2;
    const dx = b.x - p.x, dz = b.z - p.z, d = Math.hypot(dx, dz) || 1;
    const want = r + 0.35;
    if (d < want && !game.blocked(p.x + (dx / d) * want, p.z + (dz / d) * want, r * 0.8)) { b.x = p.x + (dx / d) * want; b.z = p.z + (dz / d) * want; }
    work({ owner: game.myId, b }, false);
    stageUp(b, before);
    game.sfx()?.pop?.();
    game.resendState();
    game.clearAction();
  }

  // ---------- rolling (stage 4+) ----------
  // A push on one of my balls, by me or a friend (`who`), towards yaw.
  function applyPush(b, who, yaw) {
    const now = Date.now();
    b.pushes = (b.pushes || []).filter((q) => now - q.at < 3000);
    b.pushes.push({ who, at: now });
    const crew = crewSize(b.pushes, now);
    const res = pushResult(b.n, crew);
    if (res.why && who === game.myId) hint(L(SNOW_TEXT[res.why]));
    const before = b.n;
    if (res.move) {
      const r = diameterOf(b.n + res.grow) / 2;
      const x = b.x + Math.sin(yaw) * res.move, z = b.z + Math.cos(yaw) * res.move;
      if (!game.blocked(x, z, r * 0.8)) { b.x = x; b.z = z; }
    }
    b.n = Math.min(MAX_N, b.n + res.grow);
    stageUp(b, before);
    game.resendState();
    game.clearAction();
    return res;
  }

  function push(o) {
    const p = game.me.root.position;
    const helper = o.owner !== game.myId;
    const toward = Math.atan2(o.b.x - p.x, o.b.z - p.z);
    face(o.b.x, o.b.z, snowPose(o.b.n, helper) === 'snowback'); // (a giant: your back to it)
    work(o, helper);
    if (helper) game.send(pushMsg(o.owner, o.b.k, toward));
    else applyPush(o.b, game.myId, toward);
    // Step in behind the ball where it is now (a friend's ball moves when
    // its owner hears the push; the next press closes any gap).
    const r = diameterOf(o.b.n) / 2 + 0.38;
    const tx = o.b.x - Math.sin(toward) * r, tz = o.b.z - Math.cos(toward) * r;
    if (!game.blocked(tx, tz, 0.3)) anim = { at: performance.now(), from: [p.x, p.z], to: [tx, tz] };
    game.sfx()?.pop?.();
    game.clearAction();
  }

  // ---------- snowman ----------
  function topOn(head, body) {
    const p = game.me.root.position;
    if (!liftable(head.b.n)) { say(L(SNOW_TEXT.tooBig)); return; }
    const ry = Math.atan2(p.x - body.b.x, p.z - body.b.z); // the face looks at you
    const i = mine.indexOf(head.b);
    if (i >= 0) mine.splice(i, 1);
    if (body.owner === game.myId) { body.b.h = head.b.n; body.b.ry = ry; }
    else game.send(headMsg(body.owner, body.b.k, head.b.n, ry));
    face(body.b.x, body.b.z);
    game.me.play?.('cheer');
    say(L(SNOW_TEXT.snowman));
    game.resendState();
    game.clearAction();
  }

  // A friend's push or head for one of my balls.
  function onMsg(from, m) {
    if (m.owner !== game.myId) return;
    const b = mine.find((q) => q.k === m.k);
    if (!b) return;
    const at = game.others.positionOf(from);
    if (!at || Math.hypot(at.x - b.x, at.z - b.z) > diameterOf(b.n) / 2 + 6) return; // (only from someone near the ball; their last state can lag a step behind)
    if (m.kind === 'push') applyPush(b, from, m.yaw);
    else if (canTop(m.n, b.n) && !b.h) { b.h = m.n; b.ry = m.ry; game.resendState(); game.clearAction(); }
  }

  // ---------- the action button ----------
  // The main choice: work on the ball in reach, or start one when the snow
  // is deep enough. More: "put it on top" when a bigger ball is next to it.
  function action(p) {
    if (game.mode !== 'street') return null;
    const o = nearest(p, (q) => !q.b.h);
    if (o) {
      const step = `${stepOf(o.b.n)}/${STEPS}`;
      if (!rollable(o.b.n)) {
        if (o.owner !== game.myId) return null; // (a friend's small ball: theirs to pat)
        return { key: `sb-g:${o.b.k}:${o.b.n}`, label: `❄️ ${L(SNOW_TEXT.gather)} ${step}`, run: () => gather(o.b) };
      }
      const label = o.owner === game.myId ? L(SNOW_TEXT.roll) : fill(L(SNOW_TEXT.help), { name: game.others.nameOf(o.owner) || '?' });
      const icon = stageOf(o.b.n) >= CREW_STAGE ? '🤝' : '☃️';
      return { key: `sb-r:${o.owner}:${o.b.k}:${o.b.n}`, label: `${icon} ${label} ${o.b.n >= MAX_N ? '' : step}`.trim(), run: () => push(o) };
    }
    if (game.depth >= MIN_SNOW && !balls().some(({ b }) => Math.hypot(b.x - p.x, b.z - p.z) - diameterOf(b.n) / 2 < REACH + 1.5)) return { key: 'sb-make', label: '❄️ ' + L(SNOW_TEXT.make), run: () => make() };
    return null;
  }

  function more(p) {
    if (game.mode !== 'street') return [];
    const head = nearest(p, (q) => q.owner === game.myId && !q.b.h);
    if (!head) return [];
    const out = [];
    for (const body of balls()) {
      if (body.b === head.b || body.b.h || body.b.n <= head.b.n) continue;
      const gap = Math.hypot(body.b.x - head.b.x, body.b.z - head.b.z) - (diameterOf(body.b.n) + diameterOf(head.b.n)) / 2;
      if (gap > 2.2 || Math.hypot(body.b.x - p.x, body.b.z - p.z) - diameterOf(body.b.n) / 2 > 2.4) continue;
      out.push({ key: `sb-top:${body.owner}:${body.b.k}`, label: '⛄ ' + L(SNOW_TEXT.top), run: () => topOn(head, body) });
      break;
    }
    return out;
  }

  // ---------- every frame ----------
  function tick(dt) {
    if (game.mode !== 'street') { anim = null; return; }
    const now = Date.now();
    // Melting once the snow on the ground is gone.
    if (game.depth <= 0 && !game.snowing && mine.length) {
      if (now - meltAt > MELT_EVERY_MS) {
        meltAt = now;
        for (const b of mine) { b.n -= 1; if (b.h) b.h = b.h - 1 > 0 ? b.h - 1 : undefined; }
        for (let i = mine.length - 1; i >= 0; i--) if (mine[i].n <= 0) mine.splice(i, 1);
        game.resendState();
        game.clearAction();
      }
    } else meltAt = now;
    // Pushing: slide in behind the ball.
    if (anim) {
      const k = Math.min(1, (performance.now() - anim.at) / PUSH_MS), e = k * (2 - k); // (by the clock: a slow phone still ends on time)
      const p = game.me.root.position;
      const x = anim.from[0] + (anim.to[0] - anim.from[0]) * e, z = anim.from[1] + (anim.to[1] - anim.from[1]) * e;
      if (!game.blocked(x, z, 0.3)) { p.x = x; p.z = z; }
      if (k >= 1) anim = null;
    }
    // Draw them.
    const seen = new Set();
    for (const { owner, b } of balls()) {
      const id = owner + ':' + b.k;
      seen.add(id);
      let d = drawn.get(id);
      if (!d) {
        d = { m: makeBallModel(), x: b.x, z: b.z, n: 0, h: 0, ry: 0 };
        d.m.group.position.set(b.x, 0, b.z);
        game.scene.add(d.m.group);
        drawn.set(id, d);
      }
      const D = diameterOf(b.n);
      // Glide to where it is now, turning over as it rolls.
      const k = Math.min(1, dt * 8);
      const dx = (b.x - d.x) * k, dz = (b.z - d.z) * k;
      d.x += dx; d.z += dz;
      const step = Math.hypot(dx, dz);
      if (step > 1e-4 && !b.h) {
        _axis.set(dz / step, 0, -dx / step);
        _q.setFromAxisAngle(_axis, step / (D / 2));
        d.m.spin.quaternion.premultiply(_q);
      }
      d.m.group.position.set(d.x, 0, d.z);
      d.m.spin.position.y = D / 2;
      d.m.body.scale.setScalar(D);
      if (d.n !== b.n || d.h !== (b.h || 0) || d.ry !== (b.ry || 0)) {
        d.n = b.n; d.h = b.h || 0; d.ry = b.ry || 0;
        if (d.m.face) { d.m.face.removeFromParent(); d.m.face = null; }
        if (d.h) {
          d.m.spin.quaternion.identity(); // a snowman stands up straight
          d.m.face = makeFace(D, diameterOf(d.h));
          d.m.face.rotation.y = d.ry;
          d.m.group.add(d.m.face);
        }
      }
    }
    for (const [id, d] of drawn) if (!seen.has(id)) { d.m.group.removeFromParent(); drawn.delete(id); }
  }

  return {
    tick, action, more, onMsg,
    // For our state, in the street.
    get sync() { return mine.length ? encodeBalls(mine) : null; },
    // The pose while working on a ball (others see it too).
    get pose() {
      if (!workBall || Date.now() - lastWork > WORK_POSE_MS) return null;
      const b = workBall.b;
      const p = game.me.root.position;
      if (Math.hypot(b.x - p.x, b.z - p.z) - diameterOf(b.n) / 2 > REACH + 0.6) return null;
      return snowPose(b.n, workHelper);
    },
    get count() { return mine.length; },
    get busy() { return anim ? JSON.stringify(anim) : null; },
    // (tests: set the newest ball's size)
    debugSet(n, x, z) { const b = mine[mine.length - 1]; if (b) { b.n = n; if (Number.isFinite(x)) { b.x = x; b.z = z; } game.resendState(); game.clearAction(); } },
  };
}
const _axis = new THREE.Vector3();
const _q = new THREE.Quaternion();
