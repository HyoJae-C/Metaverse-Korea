// The light switch by a home's door (Yozi 2026-11-28): the room's own lights
// on and off, and, with a mirror ball up (core/chandeliers.js), the party
// lights. Lamps keep glowing in the dark, so a switched-off room shows them.
// Party lights: the room goes dim, its light turns through pink, blue and
// purple, the mirror ball turns and spots of colour sweep the floor and
// walls (one InstancedMesh, no extra lights: a new light would make every
// material rebuild on a phone). The party is the mirror ball switched on
// (its `off` flag, which rides along in the layout), so visitors see it too;
// the room lights are mine only (mk.homeLight).
import * as THREE from 'three';
import { isPartyLight } from '../core/furniture.js';
import { t } from '../core/i18n.js';

const KEY = 'mk.homeLight';
const DARK = 0.05, PARTY = 0.07; // how much of the room's light is left
const SPOTS = 36;
const NIGHT = new THREE.Color('#14161f'), NIGHT_PARTY = new THREE.Color('#1a1030');
const PARTY_COLORS = [0xff3fa4, 0x2ad1ff, 0xb46bff, 0xffd34a, 0x3fff9a];

export function createHomeLights() {
  let room = null; // { scene, lights: [{ l, i, c }], dims, plate, spots, balls }
  let dark = false, party = false, spin = 0;
  try { dark = localStorage.getItem(KEY) === 'off'; } catch { /* storage blocked */ }

  // Where the switch is: on the wall beside the door, at hand height.
  const switchAt = () => room && { x: room.exit.x + 2.1, z: room.dims.d / 2 - 0.03 }; // (far enough from the door that its Exit button doesn't come first)

  function open(built, guest) {
    close();
    const lights = built.scene.children.filter((o) => o.isLight).map((l) => ({ l, i: l.intensity, c: l.color.clone() }));
    const bg = built.scene.background?.isColor ? built.scene.background.clone() : null, fog = built.scene.fog?.color?.clone() || null; // (no ceiling: the sky over the walls is the background)
    room = { bg, fog, scene: built.scene, lights, dims: built.room, exit: built.exit || { x: 0 }, guest, balls: [], spots: null };
    // The switch: a little cream plate with two rocker buttons.
    const plate = new THREE.Group();
    const m = new THREE.MeshLambertMaterial({ color: '#f6f1e6' });
    plate.add(new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.12, 0.02), m));
    for (const x of [-0.035, 0.035]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.08, 0.02), new THREE.MeshLambertMaterial({ color: x < 0 ? '#e8e0d0' : '#f2b8d8' })); b.position.set(x, 0, 0.012); plate.add(b); }
    const s = switchAt();
    plate.position.set(s.x, 1.15, s.z);
    plate.rotation.y = Math.PI; // (facing into the room)
    built.scene.add(plate);
    room.plate = plate;
    apply();
  }
  function close() {
    if (!room) return;
    stopSpots();
    room.plate?.removeFromParent();
    for (const { l, i, c } of room.lights) { l.intensity = i; l.color.copy(c); }
    if (room.bg) room.scene.background.copy(room.bg);
    if (room.fog) room.scene.fog.color.copy(room.fog);
    room = null;
    party = false;
  }
  // After the furniture is (re)built: is a mirror ball up and switched on?
  function refresh(items) {
    if (!room) return;
    room.balls = items.filter((it) => isPartyLight(it.id) && it.mesh).map((it) => ({ it, ball: it.mesh.getObjectByName('mirror-ball'), sphere: it.mesh.getObjectByName('mirror-sphere') }));
    party = room.balls.some((b) => !b.it.off);
    apply();
  }
  function apply() {
    if (!room) return;
    const k = party ? PARTY : dark && !room.guest ? DARK : 1;
    for (const { l, i, c } of room.lights) { l.intensity = i * k; l.color.copy(c); }
    const night = party ? NIGHT_PARTY : NIGHT;
    if (room.bg) room.scene.background.copy(room.bg).lerp(night, k < 1 ? 0.88 : 0);
    if (room.fog) room.scene.fog.color.copy(room.fog).lerp(night, k < 1 ? 0.88 : 0);
    if (party) startSpots(); else stopSpots();
  }
  function startSpots() {
    if (room.spots) return;
    const geo = new THREE.CircleGeometry(0.12, 12);
    const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.FrontSide }); // (facing into the room: seen from outside a wall, as the camera often is, they don't show)
    const spots = new THREE.InstancedMesh(geo, mat, SPOTS * Math.max(1, room.balls.filter((b) => !b.it.off).length));
    spots.frustumCulled = false;
    spots.userData.cap = spots.count;
    const c = new THREE.Color();
    for (let i = 0; i < spots.count; i++) spots.setColorAt(i, c.setHex(PARTY_COLORS[i % PARTY_COLORS.length]));
    // Each spot's direction from the ball: spread over the lower part of a sphere.
    spots.userData.dirs = Array.from({ length: SPOTS }, (_, i) => ({ a: i * 2.39996, e: -0.08 - (Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1) * 1.3 })); // (golden angle round, scattered down: no rows)
    room.scene.add(spots);
    room.spots = spots;
  }
  function stopSpots() {
    if (!room?.spots) return;
    room.spots.removeFromParent();
    room.spots.geometry.dispose(); room.spots.material.dispose();
    room.spots = null;
  }
  // Where a ray from p in direction d meets the room's floor or walls.
  const hit = (p, d, w, dd, h) => {
    let best = Infinity, n = null;
    const tries = [[d.y < 0 ? -p.y / d.y : Infinity, 'y'], [d.x ? ((d.x > 0 ? w / 2 : -w / 2) - p.x) / d.x : Infinity, d.x > 0 ? 'x+' : 'x-'], [d.z ? ((d.z > 0 ? dd / 2 : -dd / 2) - p.z) / d.z : Infinity, d.z > 0 ? 'z+' : 'z-'], [d.y > 0 ? (h - p.y) / d.y : Infinity, 'c']];
    for (const [tt, k] of tries) if (tt > 0 && tt < best) { best = tt; n = k; }
    return { t: best, n };
  };
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), pos = new THREE.Vector3(), dir = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
  // Each face of the room, turned to face inward ('x+': the wall at +x).
  const FACE = { y: new THREE.Euler(-Math.PI / 2, 0, 0), 'x+': new THREE.Euler(0, -Math.PI / 2, 0), 'x-': new THREE.Euler(0, Math.PI / 2, 0), 'z+': new THREE.Euler(0, Math.PI, 0), 'z-': new THREE.Euler(0, 0, 0), c: new THREE.Euler(Math.PI / 2, 0, 0) };
  function tick(dt) {
    if (!room || !party) return;
    spin += dt * 0.9;
    const k = (Math.sin(spin * 1.3) + 1) / 2, hue = (spin * 0.08) % 1;
    for (const { l, i, c } of room.lights) if (l.isHemisphereLight || l.isAmbientLight) { l.color.copy(c).lerp(new THREE.Color().setHSL(hue, 0.8, 0.6), 0.6); l.intensity = i * (PARTY + 0.05 * k); }
    const on = room.balls.filter((b) => !b.it.off && b.ball);
    for (const b of on) b.ball.rotation.y = spin;
    const s = room.spots;
    if (!s) return;
    const { w, d, h = 3.6 } = room.dims;
    let n = 0;
    for (const b of on) {
      (b.sphere || b.ball).getWorldPosition(pos); // (spots start at the ball's middle)
      const p0 = pos.clone();
      for (const { a, e } of s.userData.dirs) {
        if (n >= s.userData.cap) break;
        const aa = a + spin;
        dir.set(Math.cos(aa) * Math.cos(e), Math.sin(e), Math.sin(aa) * Math.cos(e));
        const r = hit(p0, dir, w, d, h);
        if (!Number.isFinite(r.t)) continue;
        pos.copy(p0).addScaledVector(dir, r.t - 0.02);
        q.setFromEuler(FACE[r.n]);
        s.setMatrixAt(n++, m4.compose(pos, q, one));
      }
    }
    s.count = Math.max(0, n);
    s.instanceMatrix.needsUpdate = true;
  }
  // The switch's choices, standing by it in my own home (not in someone else's).
  function acts(p, run) {
    const s = switchAt();
    if (!room || room.guest || Math.hypot(p.x - s.x, p.z - (s.z - 0.6)) > 1.2) return [];
    const out = [{ key: 'room-light:' + dark, label: (dark ? '💡 ' + t('home.roomLightOn') : '🌙 ' + t('home.roomLightOff')),
      run: () => { dark = !dark; try { localStorage.setItem(KEY, dark ? 'off' : 'on'); } catch { /* storage blocked */ } apply(); run(); } }];
    if (room.balls.length) out.push({ key: 'party:' + party, label: '🪩 ' + t(party ? 'home.partyOff' : 'home.partyOn'),
      run: () => { const on = !party; for (const b of room.balls) b.it.off = !on; run(true); } });
    return out;
  }
  return { open, close, refresh, tick, acts, get party() { return party; }, get dark() { return dark; } };
}
