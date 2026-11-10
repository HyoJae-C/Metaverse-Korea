// The zoo's camel ride (낙타 타기): two saddled camels take turns walking a
// loop round the herbivores (scripts/build-grand-park.mjs CAMEL_TREK), each
// kneeling at the stand by the camels' pen to let a rider on. They run on
// the shared clock (Date.now), like Another Land's rides, so everyone sees
// the same camel in the same place and a friend riding one sits on its back
// on your screen too. Built with the zoo's room (core/zoo-park.js); getting
// on and off is game/zoo-camels.js.
import * as THREE from 'three';
import { matCache, canvasTex } from './three-kit.js';
import { makeZooAnimal, ZOO_LOOKS, SIZE } from './zoo-animals.js';
import { mergeStatic } from './merge-static.js';

const mat = matCache({ flatShading: true });
export const RIDE_CAMELS = 2;
export const LOAD = 24; // s kneeling at the stand: time to get on
export const KNEEL = 2.5; // s to kneel down, or to get up again
export const PACE = 1.5; // m/s along the loop: a camel's easy walk
export const RAMP = 2; // s to get going, and to slow to a stop at the stand
export const SEAT = { y: 1.24, z: -0.02 }; // the saddle, between the humps (model space, before SIZE.camel)
export const RIDER_BACK = 0.07; // the rider sits a touch behind the saddle's middle (model space)
const DOWN = 0.72; // how far the body sinks kneeling (model space)
export const VIEW = 45; // m: a camel further off isn't drawn (unless you're on it)

// The loop as a track: cumulative distances, for placing a camel `s` metres in.
export function trekTrack(p) {
  const cum = [0];
  for (let i = 1; i < p.length; i++) cum.push(cum[i - 1] + Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]));
  return { p, cum, L: cum[cum.length - 1] };
}
// [x, z] `s` metres along the track.
export function pointAt(tr, s) {
  const { p, cum, L } = tr;
  s = ((s % L) + L) % L;
  let i = 1;
  while (i < p.length - 1 && cum[i] < s) i++;
  const k = (s - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1]);
  return [p[i - 1][0] + (p[i][0] - p[i - 1][0]) * k, p[i - 1][1] + (p[i][1] - p[i - 1][1]) * k];
}
// Facing along the track at `s` (looking a little ahead, so it turns smoothly).
export function headingAt(tr, s) {
  const [ax, az] = pointAt(tr, s - 0.8), [bx, bz] = pointAt(tr, s + 0.8);
  return Math.atan2(bx - ax, bz - az);
}
// One lap: kneeling at the stand, then the walk (with a gentle start and stop).
export const walkTime = (tr) => tr.L / PACE + RAMP;
export const cycle = (tr) => LOAD + walkTime(tr);

// Where camel `i` is at time T (seconds, the shared clock): { phase: 'load'
// or 'walk', s (metres along), kneel (0 standing … 1 down), speed (m/s),
// board (true while you can get on), left (s until it sets off), x, z, ry }.
export function camelAt(tr, T, i) {
  const C = cycle(tr), u = (((T + (i * C) / RIDE_CAMELS) % C) + C) % C;
  const [sx, sz] = tr.p[0];
  if (u < LOAD) {
    const kneel = Math.min(1, u / KNEEL, (LOAD - u) / KNEEL);
    return { phase: 'load', s: 0, kneel: Math.max(0, kneel), speed: 0, board: u > KNEEL && u < LOAD - KNEEL - 1, left: LOAD - u, x: sx, z: sz, ry: headingAt(tr, 0) };
  }
  const t = u - LOAD, W = walkTime(tr), V = PACE;
  let s, speed;
  if (t < RAMP) { s = (V * t * t) / (2 * RAMP); speed = (V * t) / RAMP; }
  else if (t > W - RAMP) { s = tr.L - (V * (W - t) ** 2) / (2 * RAMP); speed = (V * (W - t)) / RAMP; }
  else { s = V * (t - RAMP / 2); speed = V; }
  s = Math.min(tr.L, Math.max(0, s));
  const [x, z] = pointAt(tr, s);
  return { phase: 'walk', s, kneel: 0, speed, board: false, left: C - u + KNEEL, x, z, ry: headingAt(tr, s) };
}

// A camel saddled for riding: a red rug over its back between the humps,
// a little seat on it, and tassels.
function saddle(a) {
  const b = a.body;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.035, 0.3), mat('#c8382c'));
  rug.position.set(0, SEAT.y - 0.03, SEAT.z);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.2), mat('#7a4a2a'));
  seat.position.set(0, SEAT.y, SEAT.z);
  b.add(rug, seat);
  for (const s of [-1, 1]) {
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.3), mat('#c8382c'));
    flap.position.set(0.25 * s, SEAT.y - 0.13, SEAT.z);
    flap.rotation.z = 0.25 * s;
    const fringe = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.3), mat('#f2c94c'));
    fringe.position.set(0.28 * s, SEAT.y - 0.25, SEAT.z);
    fringe.rotation.z = 0.25 * s;
    b.add(flap, fringe);
  }
}

// The stand: a sign on two posts and a low wooden step to climb on from.
function stand(scene, d) {
  const g = new THREE.Group();
  g.position.set(d.x, 0, d.z);
  const tex = canvasTex(512, 220, (c, w, h) => {
    c.fillStyle = '#b5652e'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fff6e4'; c.fillRect(10, 10, w - 20, h - 20);
    c.fillStyle = '#7a3e16'; c.textAlign = 'center';
    c.font = 'bold 70px sans-serif'; c.fillText('🐪 낙타 타기', w / 2, 96, w - 40);
    c.font = '40px sans-serif'; c.fillText('Camel Ride · 🪙 3,000', w / 2, 166, w - 40);
  });
  const [sx, sz] = d.sign;
  const board = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.95), new THREE.MeshLambertMaterial({ map: tex }));
  board.position.set(sx, 1.9, sz + 0.04);
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.05, 0.06), mat('#b5652e'));
  back.position.set(sx, 1.9, sz);
  g.add(board, back);
  for (const o of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.9, 0.1), mat('#8a5a3b'));
    post.position.set(sx + o * 1.05, 0.95, sz);
    g.add(post);
  }
  for (const [y, w] of [[0.12, 1.1], [0.32, 0.75]]) { // two steps, by the camel's near side
    const step = new THREE.Mesh(new THREE.BoxGeometry(w, 0.2, 0.55), mat('#a0703f'));
    step.position.set(0, y, -1.15 - (1.1 - w) / 2);
    g.add(step);
  }
  scene.add(g);
  mergeStatic(g);
  return g;
}

// Pose a camel from its state: placed on the loop, kneeling or walking
// (legs swinging, pacing: both legs on a side together), a slight bob.
function pose(c, st, dt) {
  const a = c.a, r = a.root;
  r.position.set(st.x, 0, st.z);
  let d = st.ry - r.rotation.y;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  r.rotation.y += d * Math.min(1, dt * 5);
  c.kneel += (st.kneel - c.kneel) * Math.min(1, dt * 8);
  c.phase += st.speed * dt * 3.2;
  const k = c.kneel, swing = st.speed > 0.05 ? Math.sin(c.phase) * 0.42 * Math.min(1, st.speed / PACE) : 0;
  a.legs.forEach((l, j) => {
    const front = j < 2, side = j % 2 ? 1 : -1;
    l.rotation.x = (front ? 1.45 : -1.45) * k + swing * side * (1 - k);
  });
  a.body.position.y = -DOWN * k + Math.abs(Math.sin(c.phase)) * 0.025 * (1 - k);
  a.body.rotation.x = (st.kneel > c.kneel ? 0.12 : st.kneel < c.kneel ? -0.12 : 0) * Math.sin(Math.PI * k); // (front end first, going down and getting up)
  a.head.rotation.x = Math.sin(c.phase * 0.5) * 0.08 + (st.phase === 'load' ? 0.1 : 0);
  if (a.tail) a.tail.rotation.z = Math.sin(c.phase * 0.7) * 0.2;
}

export function buildCamelRide(scene, data) {
  const tr = trekTrack(data.p);
  const camels = [];
  for (let i = 0; i < RIDE_CAMELS; i++) {
    const a = makeZooAnimal('camel', ZOO_LOOKS.camel[i % ZOO_LOOKS.camel.length]);
    saddle(a);
    scene.add(a.root);
    camels.push({ i, a, kneel: 1, phase: i * 2, st: null });
  }
  stand(scene, data);
  const S = SIZE.camel;
  const ride = {
    track: tr, camels, stand: { x: data.x, z: data.z },
    at: (i, T) => camelAt(tr, T, i),
    // The saddle of camel i, where its rider sits: { x, y, z, ry }.
    seat(i) {
      const r = camels[i].a.root, b = camels[i].a.body;
      const y = (SEAT.y + b.position.y) * S, back = (SEAT.z - RIDER_BACK) * S;
      return { x: r.position.x + Math.sin(r.rotation.y) * back, y, z: r.position.z + Math.cos(r.rotation.y) * back, ry: r.rotation.y };
    },
    // Each frame: every camel to its place; far ones not drawn (the one you
    // ride always is).
    tick(T, dt, at, mine = -1) {
      for (const c of camels) {
        c.st = camelAt(tr, T, c.i);
        const near = c.i === mine || !at || Math.hypot(at.x - c.st.x, at.z - c.st.z) < VIEW;
        c.a.root.visible = near;
        if (near) pose(c, c.st, dt);
      }
    },
  };
  ride.tick(Date.now() / 1000, 10, null);
  return ride;
}
