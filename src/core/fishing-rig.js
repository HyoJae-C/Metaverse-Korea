// The fishing motion in 3D (Han River): the rod swings back and casts, the
// bobber flies out and splashes down, bobs and nibbles, dives on a bite
// (the rod bends and shakes), comes in as you reel, and the catch is lifted
// out of the water on the line. Driven by FishingUI's phases (see main.js).
//   phase(name, data): off | idle | cast | bite | reel | tap | land | trash
//                      | escape | retrieve
//   update(dt, ch): every frame, ch = the local character.
import * as THREE from 'three';
import { FISH_SHEET, FISH_SHEET_URL } from './fishing.js';

let sheet = null; // the picture sheet, loaded once

const REST = 0.95; // the rod's lean while waiting (held.js)
const RELEASE = 0.62; // s into the cast when the bobber leaves the tip
const FLIGHT = 0.85; // s in the air
const smooth = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
const lerp = (a, b, k) => a + (b - a) * k;
// Rod angle (rad, + is forward) through the cast: wind back over the
// shoulder, a short hold, a fast whip forward, then settle.
function castAngle(t) {
  if (t < 0.32) return lerp(REST, -0.75, smooth(t / 0.32));
  if (t < 0.46) return -0.75 - Math.sin((t - 0.32) / 0.14 * Math.PI) * 0.05;
  if (t < 0.64) return lerp(-0.75, 1.45, smooth((t - 0.46) / 0.18));
  return lerp(1.45, REST + 0.05, smooth((t - 0.64) / 0.5));
}

// remote: another player's rig, driven by their phases over the network (no
// reel taps arrive, so the fish comes in at a steady pace instead).
export function createFishingRig({ sfx, waterY = () => -0.25, remote = false } = {}) {
  // The line: a chain of thin rods (a 1-pixel GL line is too faint to see).
  const N = 16;
  const line = new THREE.Group();
  const lineMat = new THREE.MeshBasicMaterial({ color: 0x3a3f47 });
  const lineGeo = new THREE.CylinderGeometry(1, 1, 1, 4, 1, true).translate(0, 0.5, 0);
  const pieces = [];
  for (let i = 0; i < N - 1; i++) { const m = new THREE.Mesh(lineGeo, lineMat); m.frustumCulled = false; pieces.push(m); line.add(m); }
  const pts = Array.from({ length: N }, () => new THREE.Vector3());
  const UP = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3();

  // Bobber: red top, white bottom.
  const bobber = new THREE.Group();
  const top = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#ff3b30' }));
  const bottom = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshLambertMaterial({ color: '#ffffff' }));
  const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 6), new THREE.MeshLambertMaterial({ color: '#ffd166' }));
  stick.position.y = 0.09;
  bobber.add(top, bottom, stick);

  // Splash effects: expanding rings on the water and droplets.
  const ringGeo = new THREE.RingGeometry(0.8, 1, 28).rotateX(-Math.PI / 2);
  const dropGeo = new THREE.SphereGeometry(0.035, 6, 4);
  const fx = new THREE.Group();
  const rings = [], drops = [];

  const root = new THREE.Group();
  root.name = 'fishing-rig';
  root.add(line, bobber, fx);
  root.visible = false;

  let phase = 'off', t = 0, scene = null;
  let rod = null; // userData.rod of the held rod
  let angle = REST, vel = 0, bend = 0, bendVel = 0, kick = 0, shake = 0;
  let progress = 0, heavy = 0, big = 0;
  const from = new THREE.Vector3(), to = new THREE.Vector3(), target = new THREE.Vector3(), near = new THREE.Vector3();
  const tipW = new THREE.Vector3(), bob = new THREE.Vector3(), tmp = new THREE.Vector3();
  let catchObj = null; // the fish (or boot) on the line
  let nextNibble = 0, nibble = 0, splashT = 0, landed = false;

  function ring(at, size = 1, life = 0.9) {
    const m = rings.find((r) => !r.visible) || (() => {
      const r = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, depthWrite: false }));
      rings.push(r); fx.add(r); return r;
    })();
    m.visible = true;
    m.position.set(at.x, waterY() + 0.02, at.z);
    m.userData = { t: 0, life, size };
  }
  function burst(at, n = 10, power = 1) {
    ring(at, 0.5 + power * 0.6);
    ring(at, 0.25 + power * 0.3, 0.6);
    for (let i = 0; i < n; i++) {
      const d = drops.find((x) => !x.visible) || (() => {
        const x = new THREE.Mesh(dropGeo, new THREE.MeshBasicMaterial({ color: 0xe8f6ff }));
        drops.push(x); fx.add(x); return x;
      })();
      const a = Math.random() * Math.PI * 2, s = (0.6 + Math.random() * 1.2) * power;
      d.visible = true;
      d.position.set(at.x, waterY() + 0.05, at.z);
      d.userData = { v: new THREE.Vector3(Math.cos(a) * s, (2 + Math.random() * 2.2) * power, Math.sin(a) * s) };
      d.scale.setScalar(0.6 + Math.random() * 0.8);
    }
  }
  function tickFx(dt) {
    for (const r of rings) {
      if (!r.visible) continue;
      const u = r.userData; u.t += dt;
      const k = u.t / u.life;
      if (k >= 1) { r.visible = false; continue; }
      r.scale.setScalar(0.1 + u.size * k);
      r.material.opacity = 0.75 * (1 - k);
    }
    for (const d of drops) {
      if (!d.visible) continue;
      d.userData.v.y -= 9.8 * dt;
      d.position.addScaledVector(d.userData.v, dt);
      if (d.position.y < waterY()) d.visible = false;
    }
  }

  // The catch dangling from the line: a little fish (coloured by rarity),
  // with its emoji on a card beside it so you can tell what it is; or a boot.
  function makeCatch(f) {
    const g = new THREE.Group();
    if (f?.trash) {
      const m = new THREE.MeshLambertMaterial({ color: '#5a4636' });
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.26, 0.14), m);
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.1, 0.26), m);
      leg.position.y = -0.13; foot.position.set(0, -0.3, 0.06);
      g.add(leg, foot);
      return g;
    }
    const s = [0, 0.8, 1, 1.25, 1.6, 2.2][f?.rarity || 1];
    const color = ['#9aa7b4', '#9aa7b4', '#6fb4d8', '#ff9f43', '#c56cf0', '#ffd32a'][f?.rarity || 1];
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshLambertMaterial({ color }));
    body.scale.set(0.55, 1.5, 0.9);
    body.position.y = -0.2;
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.14, 4), new THREE.MeshLambertMaterial({ color }));
    tail.position.y = -0.42; tail.scale.z = 0.3;
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), new THREE.MeshBasicMaterial({ color: 0x111111 }));
    eye.position.set(0, -0.1, 0.09);
    g.add(body, tail, eye);
    g.scale.setScalar(s);
    const cell = FISH_SHEET.indexOf(f?.id);
    if (cell >= 0 && typeof document !== 'undefined') {
      // Its picture from the fish book's sheet, on a card beside it.
      sheet ||= new THREE.TextureLoader().load(FISH_SHEET_URL, (tx) => { tx.colorSpace = THREE.SRGBColorSpace; });
      const map = sheet.clone();
      map.colorSpace = THREE.SRGBColorSpace;
      map.repeat.set(1 / 7, 1 / 7);
      map.offset.set((cell % 7) / 7, 1 - (Math.floor(cell / 7) + 1) / 7);
      map.needsUpdate = true;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map, depthTest: false }));
      sp.scale.setScalar(0.45 / s);
      sp.position.set(0.32 / s, -0.1, 0);
      sp.renderOrder = 5;
      g.add(sp);
    }
    return g;
  }
  function dropCatch() { catchObj?.removeFromParent(); catchObj = null; }

  function drawLine(slack) {
    const dist = tipW.distanceTo(bob);
    for (let i = 0; i < N; i++) {
      const k = i / (N - 1), p = pts[i];
      p.lerpVectors(tipW, bob, k);
      p.y -= Math.sin(Math.PI * k) * slack * Math.min(1, dist / 4);
      if (p.y < waterY() && k > 0.5) p.y = waterY() + 0.005;
    }
    for (let i = 0; i < N - 1; i++) {
      const m = pieces[i];
      dir.subVectors(pts[i + 1], pts[i]);
      const len = dir.length();
      m.position.copy(pts[i]);
      m.scale.set(0.007, Math.max(len, 1e-4), 0.007);
      if (len > 1e-5) m.quaternion.setFromUnitVectors(UP, dir.multiplyScalar(1 / len));
    }
  }

  const api = {
    get phase() { return phase; },
    phase(name, data) {
      if (name === 'progress') { progress = data; return; } // a rare fish pulling the gauge back
      if (name === 'tap') { // one tap on the reel button: data = progress 0..1
        progress = data;
        kick = 1;
        shake = Math.min(1, shake + 0.4);
        sfx?.reelClick?.(3);
        if (rod) rod.reel.rotation.x -= 2.4;
        return;
      }
      if (name !== 'land' && name !== 'trash') dropCatch();
      phase = name; t = 0;
      if (name === 'cast') { landed = false; progress = 0; nextNibble = 1.5 + Math.random() * 1.5; }
      if (name === 'bite') {
        heavy = Math.min(1, ((data?.rarity || 1) - 1) / 4);
        sfx?.bite?.();
        burst(bob, 6, 0.6);
      }
      if (name === 'reel') { progress = 0; big = data?.big ? 1 : 0; from.copy(bob); }
      if (name === 'land' || name === 'trash') {
        from.copy(bob);
        sfx?.landed?.();
        burst(bob, 16, 1.2);
        catchObj = makeCatch(name === 'trash' ? { trash: true } : data);
        root.add(catchObj);
        catchObj.position.copy(bob);
      }
      if (name === 'escape') { sfx?.snap?.(); from.copy(bob); burst(bob, 8, 0.8); }
      if (name === 'retrieve') { sfx?.reelIn?.(0.6); from.copy(bob); }
    },
    update(dt, ch) {
      tickFx(dt);
      const held = ch?.heldObject;
      rod = held?.userData?.rod || null;
      const want = rod && phase !== 'off' ? ch.root.parent : null;
      if (want !== scene) { root.removeFromParent(); scene = want; scene?.add(root); }
      if (!rod || phase === 'off') {
        root.visible = false;
        if (rod) { rod.line.visible = true; rod.pivot.rotation.x = REST; for (const s of rod.segs) s.rotation.x = 0; }
        angle = REST; vel = 0; bend = 0;
        return;
      }
      root.visible = true;
      t += dt;
      const ry = ch.root.rotation.y, fx0 = Math.sin(ry), fz0 = Math.cos(ry);
      const W = waterY();
      // Where the bobber goes: ~5.5 m out, a little to one side.
      if (phase === 'cast' && t === dt) {
        const side = (Math.random() - 0.5) * 1.6;
        target.set(ch.root.position.x + fx0 * 5.5 + fz0 * side, W, ch.root.position.z + fz0 * 5.5 - fx0 * side);
      }
      near.set(ch.root.position.x + fx0 * 1.3, W, ch.root.position.z + fz0 * 1.3);

      // 1) The rod's angle and bend for this phase.
      let goal = REST, load = 0, sway = Math.sin(performance.now() / 900) * 0.03;
      shake = Math.max(0, shake - dt * 1.5);
      kick = Math.max(0, kick - dt * 6);
      if (phase === 'cast') goal = castAngle(t);
      else if (phase === 'bite') { goal = REST + 0.12; load = 0.22 + heavy * 0.12; shake = Math.max(shake, 0.8); }
      else if (phase === 'reel') {
        goal = 0.35 - kick * 0.25 + Math.sin(t * 7) * 0.05; // held up, pumped on each tap
        load = 0.2 + heavy * 0.18 + big * 0.06;
        shake = Math.max(shake, 0.35 + heavy * 0.3);
      } else if (phase === 'land' || phase === 'trash') goal = lerp(0.3, -0.25, smooth(t / 0.35));
      else if (phase === 'escape') goal = -0.1;
      else if (phase === 'retrieve') goal = lerp(REST, 0.5, smooth(t / 0.3));
      if (phase === 'wait' || phase === 'idle') goal += sway;
      if (phase === 'wait' && nibble > 0) load = 0.08 * Math.sin(nibble * Math.PI);
      const prev = angle;
      if (phase === 'cast') angle = goal; // keyframed exactly
      else angle += (goal - angle) * Math.min(1, dt * (phase === 'escape' ? 14 : 7));
      vel = (angle - prev) / Math.max(dt, 1e-3);
      rod.pivot.rotation.x = angle;
      // The pole lags when swung (bends against the motion) and bends
      // towards the water under load; a spring makes it wobble back.
      const bendGoal = THREE.MathUtils.clamp(-vel * 0.035, -0.35, 0.35) + load + (shake ? Math.sin(performance.now() / 28) * 0.05 * shake : 0);
      bendVel += ((bendGoal - bend) * 180 - bendVel * 14) * dt;
      bend += bendVel * dt;
      rod.segs[0].rotation.x = bend * 0.3;
      rod.segs[1].rotation.x = bend * 0.7;
      rod.segs[2].rotation.x = bend * 1.1;
      rod.line.visible = false;
      if (phase === 'reel' || phase === 'retrieve') rod.reel.rotation.x -= dt * (phase === 'retrieve' ? 30 : 6);

      ch.root.updateWorldMatrix(true, true);
      rod.tip.getWorldPosition(tipW);

      // 2) The bobber.
      let slack = 0.05;
      bobber.visible = true;
      if (phase === 'idle') { bobber.visible = false; bob.copy(tipW); bob.y -= 0.55; slack = 0; }
      else if (phase === 'cast') {
        if (t < RELEASE) { bob.copy(tipW); bob.y -= 0.12; slack = 0; }
        else {
          if (!landed && t - dt < RELEASE) { from.copy(tipW); sfx?.castWhoosh?.(); }
          const k = Math.min(1, (t - RELEASE) / FLIGHT);
          bob.lerpVectors(from, target, k);
          bob.y = lerp(from.y, W, k) + Math.sin(Math.PI * k) * 2.3;
          slack = 0.15 + k * 0.4;
          if (k >= 1 && !landed) { landed = true; sfx?.splash?.(0.45); burst(target, 8, 0.7); }
          if (landed) { phase = 'wait'; t = 0; }
        }
      }
      if (phase === 'wait') {
        slack = 0.55;
        // Now and then a fish nibbles: the bobber dips with a little ring.
        nextNibble -= dt;
        if (nextNibble <= 0) { nibble = 1; nextNibble = 1.3 + Math.random() * 2.2; sfx?.plip?.(); ring(target, 0.6, 0.7); }
        const dip = nibble > 0 ? Math.sin((1 - nibble) * Math.PI) * 0.06 : 0;
        nibble = Math.max(0, nibble - dt * 3.5);
        bob.set(target.x, W + 0.01 + Math.sin(t * 2.4) * 0.015 - dip, target.z);
      } else if (phase === 'bite') {
        slack = 0;
        const j = Math.sin(t * 37) * 0.06;
        bob.set(target.x + j * fz0, W - 0.1 - Math.abs(Math.sin(t * 9)) * 0.05, target.z - j * fx0);
        splashT -= dt;
        if (splashT <= 0) { splashT = 0.35; ring(bob, 0.8, 0.6); }
      } else if (phase === 'reel') {
        slack = 0;
        if (remote) progress = Math.min(0.9, t / 3.5);
        const k = smooth(Math.min(1, progress));
        bob.lerpVectors(from, near, k * 0.85);
        const zig = Math.sin(t * 6 + k * 4) * (0.5 + heavy * 0.6) * (1 - k * 0.6);
        bob.x += zig * fz0; bob.z -= zig * fx0;
        bob.y = W - 0.06;
        splashT -= dt;
        if (splashT <= 0) { splashT = 0.28 + Math.random() * 0.3; burst(bob, 3 + Math.round(heavy * 4), 0.45 + heavy * 0.4); sfx?.splash?.(0.15 + heavy * 0.2); }
      } else if (phase === 'land' || phase === 'trash') {
        // Out of the water, up to dangle under the tip, swinging.
        const k = smooth(Math.min(1, t / 0.55));
        tmp.copy(tipW); tmp.y -= 0.45;
        bob.lerpVectors(from, tmp, k);
        bob.y += Math.sin(Math.PI * k) * 0.8;
        slack = 0;
        if (catchObj) {
          catchObj.position.copy(bob);
          catchObj.rotation.set(0, ry + Math.sin(t * 5) * 0.6, phase === 'land' ? Math.sin(t * 13) * 0.35 * Math.max(0.2, 1 - t / 2) : Math.sin(t * 3) * 0.2);
        }
        bobber.visible = false;
        if (t > 2.6) { dropCatch(); phase = 'idle'; t = 0; }
      } else if (phase === 'escape') {
        // The line snaps: the bobber pops up loose and drifts away.
        const k = Math.min(1, t / 0.9);
        bob.lerpVectors(from, target, k * 0.3);
        bob.y = W + Math.sin(Math.PI * Math.min(1, t / 0.4)) * 0.3;
        slack = 0.8;
        if (t > 1.2) { phase = 'idle'; t = 0; }
      } else if (phase === 'retrieve') {
        const k = smooth(Math.min(1, t / 0.7));
        tmp.copy(tipW); tmp.y -= 0.12;
        bob.lerpVectors(from, tmp, k);
        bob.y = Math.max(bob.y, lerp(from.y, tmp.y, k * k)) + Math.sin(Math.PI * k) * 0.25;
        slack = 0.1;
        if (t > 0.8) { phase = 'idle'; t = 0; }
      }
      bobber.position.copy(bob);
      bobber.rotation.z = phase === 'bite' ? Math.sin(t * 30) * 0.4 : 0;
      line.visible = phase !== 'idle';
      drawLine(slack);
    },
  };
  api.dispose = () => { dropCatch(); root.removeFromParent(); scene = null; };
  return api;
}
