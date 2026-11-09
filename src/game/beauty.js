// Beauty shops: the mirror close-up, the salon haircut and the clinic's
// surgery scene.
//
// Moved out of main.js. The game's live state (the camera, your seat, your
// look…) comes in through `game`, whose getters (and setters for seated and
// myLook) are read only when needed.
import * as THREE from 'three';
import { t } from '../core/i18n.js';
import { createCharacter } from '../core/character.js';
import { saveLook } from '../core/look-editor.js';
import { PALETTES } from '../data/appearance.js';
import { say, placeLabels } from '../core/npcs.js';

const $ = (id) => document.getElementById(id);
// The surgery team and the hairdresser are plain characters with no name tag;
// this gives one a speech bubble that follows them and goes away with them.
const speaker = (ch) => ({ ch, tag: null, bubble: null });
const placeSpeaker = (o, camera) => o.bubble && placeLabels(o, camera, innerWidth, innerHeight);
const dropSpeaker = (o) => { o.bubble?.remove(); o.bubble = null; };

/**
 * game: { me, cam, camera, interior, clerk, shop, sfx, beautyUi } as getters,
 * seated and myLook as getters and setters, plus setLook and resendState().
 */
export function createBeauty(game) {
  function keepLook(look) {
    game.myLook = { ...look };
    saveLook(game.myLook);
    game.setLook(game.myLook);
    game.shop.toast(t('beauty.saved'));
    game.clerk && say(game.clerk, $('labels'), ['정말 잘 어울려요!', 'jeongmal jal eoullyeoyo!', t('beauty.suits')]);
  }
  let beautyCam = null;
  const MIRROR_LOOK_Y = 0.74; // well below the face, so the whole head sits above the panel
  function openBeauty(kind) {
    game.clerk?.ch.wave();
    beautyCam = { ...game.cam };
    document.body.classList.add('beauty-mode'); // hides the shop banner so your face shows
    if (game.seated?.lie) { // lying on the bed: look down at the face from the foot end
      Object.assign(game.cam, { yaw: game.seated.ry, dist: 2.0, pitch: 0.85 });
      beautyCam.look = [game.seated.x, 0.7, game.seated.z - 0.75];
    } else if (game.seated?.mirrorZ != null) { // in the chair: what the mirror sees, your face up close
      // The mirror is only a metre away, so a wider lens fits your head in.
      Object.assign(game.cam, { yaw: game.seated.ry + 0.12, dist: 1.05, pitch: 0.12 });
      beautyCam.look = [game.seated.x, MIRROR_LOOK_Y, game.seated.z];
      game.camera.fov = 84; game.camera.updateProjectionMatrix();
    } else {
      Object.assign(game.cam, { dist: 2.6, pitch: 0.12 }); // close-up
      game.me.root.rotation.y = game.cam.yaw; // turn to face the camera
    }
    game.resendState();
    game.beautyUi.show(kind, game.myLook, game.interior?.store);
    if (kind === 'salon') game.setLook({ ...game.myLook, head: null }); // hat off in the salon chair
  }
  function endBeautyCam() {
    if (beautyCam) { const { look, ...c } = beautyCam; Object.assign(game.cam, c); }
    beautyCam = null;
    document.body.classList.remove('beauty-mode');
    if (game.camera.fov !== 62) { game.camera.fov = 62; game.camera.updateProjectionMatrix(); }
  }

  // Surgery (clinics): the gurney rolls you into the operating room with the
  // doctor and three nurses, they operate, the lights go out for a moment, and
  // you walk out with the new look.
  const SURGERY = { roll: 4, operate: 4.2, dark: 1.2, after: 2.6 };
  let surgery = null;
  const STAFF_LOOKS = [
    { model: 'basic', shirt: 'cream', pants: 'navy', hair: 'black', skin: 'fair', face: 'glasses' }, // the doctor
    { model: 'basic', shirt: 'mint', pants: 'navy', hair: 'espresso', skin: 'light', head: 'cap' },
    { model: 'basic', shirt: 'mint', pants: 'navy', hair: 'chestnut', skin: 'warm', head: 'cap' },
    { model: 'basic', shirt: 'mint', pants: 'navy', hair: 'black', skin: 'tan', head: 'cap' },
  ];
  function makeGurney() {
    const g = new THREE.Group();
    const m = (c) => new THREE.MeshLambertMaterial({ color: c });
    const top = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.08, 2), m('#e8f1f4'));
    top.position.y = 0.55;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.05, 1.8), m('#9ca9af'));
    frame.position.y = 0.2;
    g.add(top, frame);
    for (const [x, z] of [[-0.3, -0.8], [0.3, -0.8], [-0.3, 0.8], [0.3, 0.8]]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), m('#9ca9af'));
      leg.position.set(x, 0.3, z);
      const wheel = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), m('#2b2b2e'));
      wheel.position.set(x, 0.06, z);
      g.add(leg, wheel);
    }
    return g;
  }
  function startSurgery(look) {
    if (surgery) return; // already on the way in
    const st = game.interior.stations.surgery;
    const p = game.me.root.position;
    const path = [[p.x, p.z], [p.x, st.door[1] + 1.2], [st.door[0], st.door[1] + 1.2], [st.door[0], st.door[1] - 1.2], [st.table[0], st.door[1] - 1.2], [st.table[0], st.table[1]]];
    const gurney = makeGurney();
    gurney.position.set(p.x, 0, p.z);
    game.interior.scene.add(gurney);
    const staff = STAFF_LOOKS.map((l) => { const c = createCharacter(l); game.interior.scene.add(c.root); return c; });
    const lens = [];
    for (let i = 1; i < path.length; i++) lens.push(Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
    surgery = { t: 0, look, st, gurney, staff, doctor: speaker(staff[0]), path, lens, total: lens.reduce((a, b) => a + b, 0), swapped: false, ry: 0 };
    game.seated = { surgery: true, lie: true, x: p.x, z: p.z, ry: 0, stand: st.door };
    Object.assign(game.cam, { dist: 7.5, pitch: 0.75 });
    game.shop.toast(t('surgery.go'));
    say(surgery.doctor, $('labels'), ['걱정 마세요!', 'geokjeong maseyo!', t('surgery.doctor')]);
  }
  function surgeryAt(s, d) { // a point along the path, and the heading there
    let k = 0;
    while (k < s.lens.length - 1 && d > s.lens[k]) { d -= s.lens[k]; k++; }
    const [ax, az] = s.path[k], [bx, bz] = s.path[k + 1];
    const u = s.lens[k] ? Math.min(1, d / s.lens[k]) : 1;
    return [ax + (bx - ax) * u, az + (bz - az) * u, Math.atan2(bx - ax, bz - az)];
  }
  const blackout = (() => { const el = document.createElement('div'); el.className = 'blackout'; document.body.append(el); return el; })();
  function updateSurgery(dt) {
    const s = surgery;
    if (!s) return;
    s.t += dt;
    const p = game.me.root.position;
    const { roll, operate, dark, after } = SURGERY;
    if (s.t < roll) { // rolling along, the staff walking beside the gurney
      const e = s.t / roll;
      const [x, z, ry] = surgeryAt(s, s.total * (e < 0.5 ? 2 * e * e : 1 - 2 * (1 - e) * (1 - e)));
      s.ry += Math.atan2(Math.sin(ry - s.ry), Math.cos(ry - s.ry)) * Math.min(1, dt * 6);
      s.gurney.position.set(x, 0, z);
      s.gurney.rotation.y = s.ry;
      p.set(x, 0, z);
      game.me.root.rotation.y = s.ry + Math.PI; // head first
      const c = Math.cos(s.ry), sn = Math.sin(s.ry);
      [[0, 1.3], [0.75, 0.3], [-0.75, 0.3], [0, -1.35]].forEach(([ox, oz], i) => {
        const r = s.staff[i].root;
        r.position.set(x + ox * c + oz * sn, 0, z - ox * sn + oz * c);
        r.rotation.y = s.ry;
        s.staff[i].animate(dt, 0.35, false);
      });
    } else if (s.t < roll + operate + dark) { // on the table, the team around it
      const [tx, tz] = s.st.table;
      s.gurney.visible = false;
      p.set(tx, s.st.tableTop - s.st.bedTop, tz);
      game.me.root.rotation.y = 0;
      s.st.staff.forEach(([x, z, ry], i) => {
        const r = s.staff[i].root;
        r.position.set(x, 0, z);
        r.rotation.y = ry;
        s.staff[i].animate(dt, 0, false);
      });
      s.beat = (s.beat || 0) - dt;
      if (s.beat <= 0) { s.beat = 0.9; s.staff.forEach((c, i) => c.play(i === 0 ? 'clap' : ['shrug', 'clap', 'bow'][(Math.random() * 3) | 0])); }
      const tDark = s.t - roll - operate; // the lights go out
      blackout.style.opacity = tDark > 0 ? String(Math.min(1, tDark / 0.35)) : '0';
      if (tDark > dark * 0.5 && !s.swapped) { s.swapped = true; game.myLook = { ...s.look }; saveLook(game.myLook); game.setLook(game.myLook); }
    } else if (!s.done) { // lights back on: surgery complete, walk out of the OR
      s.done = true;
      blackout.style.opacity = '0';
      game.seated = null;
      p.set(s.st.door[0], 0, s.st.door[1] + 0.6);
      game.me.root.rotation.y = game.cam.yaw; // turn round to the camera to show the new face
      game.me.play('cheer');
      $('photo-count').hidden = false;
      $('photo-count').textContent = '✨ ' + t('surgery.done');
      say(s.doctor, $('labels'), ['수술 완료!', 'susul wallyo!', t('surgery.done')]);
      game.sfx.pop?.();
    } else if (s.t > roll + operate + dark + after) {
      $('photo-count').hidden = true;
      game.interior?.scene.remove(s.gurney);
      for (const c of s.staff) c.root.removeFromParent();
      dropSpeaker(s.doctor);
      surgery = null;
      game.shop.toast(t('beauty.saved'));
    } else s.staff.forEach((c) => c.animate(dt, 0, false));
    if (surgery) placeSpeaker(s.doctor, game.camera);
  }
  // Salon: after you pay, the hairdresser steps up behind your chair, snips
  // away while bits of hair fall, and then the new style appears.
  const HAIRCUT = { snip: 2.6, after: 1.4 };
  let haircut = null;
  function startHaircut(look) {
    if (haircut) return; // already cutting
    const st = createCharacter({ model: 'basic', shirt: 'charcoal', pants: 'charcoal', hair: 'black', skin: 'light', neck: 'scarf' });
    const side = game.seated.x <= 0 ? 1 : -1; // the camera looks from this side (towards the middle of the room)
    const sx = game.seated.x - side * 0.35, sz = game.seated.z + 0.55; // behind the chair, on the far side
    st.root.position.set(sx, 0, sz);
    st.root.rotation.y = Math.atan2(game.seated.x - sx, game.seated.z - 0.1 - sz);
    game.interior.scene.add(st.root);
    st.activity('snip');
    // From the side, towards the middle of the room: you, and the hairdresser behind you.
    Object.assign(game.cam, { yaw: Math.atan2(side, -0.35), dist: 2.9, pitch: 0.15 });
    if (beautyCam) beautyCam.look = [game.seated.x, 0.85, game.seated.z + 0.25];
    const hairHex = '#' + (PALETTES.dye[game.myLook.dye] ?? PALETTES.hair[game.myLook.hair] ?? 0x3a2a20).toString(16).padStart(6, '0');
    haircut = { t: 0, look, st, who: speaker(st), bits: [], spawn: 0, mat: new THREE.MeshLambertMaterial({ color: hairHex }), swapped: false };
    say(haircut.who, $('labels'), ['예쁘게 잘라 드릴게요!', 'yeppeuge jalla deurilgeyo!', t('haircut.start')]);
  }
  const _headPos = new THREE.Vector3();
  function updateHaircut(dt) {
    const h = haircut;
    if (!h) return;
    h.t += dt;
    h.st.animate(dt, 0, false);
    if (h.t < HAIRCUT.snip) { // bits of hair drift down from around the head
      h.spawn -= dt;
      const head = game.me.root.getObjectByName('head');
      if (h.spawn <= 0 && head) {
        h.spawn = 0.05;
        head.getWorldPosition(_headPos);
        for (let i = 0; i < 2; i++) {
          const b = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.006, 0.012), h.mat);
          b.position.set(_headPos.x + (Math.random() - 0.5) * 0.4, _headPos.y + 0.1 + Math.random() * 0.15, _headPos.z + (Math.random() - 0.5) * 0.4);
          b.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
          b.userData.v = [(Math.random() - 0.5) * 0.3, -0.2, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 8];
          game.interior.scene.add(b);
          h.bits.push(b);
        }
      }
    }
    for (const b of h.bits) { // flutter down to the floor and stay there
      if (b.position.y <= 0.01) continue;
      const v = b.userData.v;
      v[1] = Math.max(-0.9, v[1] - 1.2 * dt);
      b.position.x += v[0] * dt; b.position.y = Math.max(0.01, b.position.y + v[1] * dt); b.position.z += v[2] * dt;
      b.rotation.x += v[3] * dt; b.rotation.z += v[3] * 0.7 * dt;
    }
    if (h.t >= HAIRCUT.snip && !h.swapped) { // done: the new style
      h.swapped = true;
      h.st.activity(null);
      keepLook(h.look);
      game.me.play('cheer');
      game.sfx.pop?.();
    }
    if (h.t >= HAIRCUT.snip + HAIRCUT.after) finishHaircut();
    else placeSpeaker(h.who, game.camera);
  }
  function finishHaircut() {
    const h = haircut;
    if (!h) return;
    haircut = null;
    if (!h.swapped) keepLook(h.look);
    h.st.root.removeFromParent();
    dropSpeaker(h.who);
    for (const b of h.bits) b.removeFromParent();
    h.mat.dispose();
    endBeautyCam();
  }

  return {
    get beautyCam() { return beautyCam; },
    get surgery() { return surgery; },
    get haircut() { return haircut; },
    keepLook, openBeauty, endBeautyCam, startSurgery, updateSurgery, startHaircut, updateHaircut, finishHaircut,
  };
}
