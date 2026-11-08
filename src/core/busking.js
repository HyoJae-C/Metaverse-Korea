// Busking zones (region.json "busking"), e.g. on Hongdae Walking Street: a
// singer with a guitar, a K-pop girl group and a boy group dancing, and an
// audience on a grassy bank (layout: core/busking-layout.js). Walking into
// the zone plays the busking song. Stand at the singer's mic and tap Busk to
// perform yourself: the singer steps aside, the crowd claps and now and then
// someone drops a tip (a few a day). Others see you dancing there.
import * as THREE from 'three';
import { makeNpc, say } from './npcs.js';
import { randomLook } from '../data/appearance.js';
import { bankHeight, CROWD, SINGER, GIRLS, BOYS, FACE_AUDIENCE } from './busking-layout.js';

export const STAGE_R = 2.2; // stand within this of the singer's spot to busk
export const TIP_EVERY = 20; // seconds of performing per tip
export const TIPS_PER_DAY = 6;
const TIP_KEY = 'mk.buskTips';

// Tips today: { day: 'YYYY-MM-DD', n }. Pure helpers, so they can be tested.
export function tipsLeft(saved, day) {
  return saved?.day === day ? Math.max(0, TIPS_PER_DAY - (saved.n || 0)) : TIPS_PER_DAY;
}
export function takeTip(saved, day) {
  const n = saved?.day === day ? (saved.n || 0) : 0;
  return n >= TIPS_PER_DAY ? null : { day, n: n + 1 };
}

const BUSKER_LINES = [
  ['노래 들어 주셔서 감사해요!', 'norae deureo jusyeoseo gamsahaeyo!', 'Thanks for listening!'],
  ['신청곡 있으세요?', 'sincheonggok isseuseyo?', 'Any song requests?'],
  ['같이 노래해요!', 'gachi noraehaeyo!', 'Sing along with me!'],
];
const CHEERS = ['👏', '🎶', '😍', '🙌', '✨'];
const NAMES = ['🎸 Busker', '🎸 버스커'];

// Show looks: matching stage outfits, a different hair colour each.
const GIRL_LOOKS = [
  { skirt: 'pleats-mini-white', shirt: 'peach', hairStyle: 'long', dye: 'black' },
  { skirt: 'pleats-mini-pink', shirt: 'cream', hairStyle: 'pony', dye: 'pink' },
  { skirt: 'pleats-mini-white', shirt: 'peach', hairStyle: 'hime', dye: 'blonde' },
  { skirt: 'pleats-mini-pink', shirt: 'cream', hairStyle: 'twin', dye: 'brown' },
  { skirt: 'pleats-mini-white', shirt: 'peach', hairStyle: 'bob', dye: 'purple' },
].map((l) => ({ model: 'basic', pants: 'cream', shoes: 'white', tee: null, ...l }));
const BOY_LOOKS = [
  { model: 'jacket-black', hairStyle: 'comma', dye: 'silver' },
  { model: 'jacket-black', hairStyle: 'dandy', dye: 'black' },
  { model: 'jacket-black', hairStyle: 'side', dye: 'blue' },
  { model: 'jacket-black', hairStyle: 'wolf', dye: 'brown' },
].map((l) => ({ pants: 'black', shoes: 'black', tee: null, ...l }));

// An acoustic guitar held across the body, in the chibi's body units
// (0 at the feet, shoulders at ~0.66; see character.addProp).
function guitar() {
  const g = new THREE.Group();
  const wood = new THREE.MeshLambertMaterial({ color: '#c98b4f' });
  const dark = new THREE.MeshLambertMaterial({ color: '#4a2f22' });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.08, 18).rotateX(Math.PI / 2), wood);
  const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 16).rotateX(Math.PI / 2), wood);
  upper.position.x = 0.17;
  const hole = new THREE.Mesh(new THREE.CircleGeometry(0.05, 12), dark);
  hole.position.set(0.1, 0, 0.041);
  const neck = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 0.03), dark);
  neck.position.set(0.48, 0, 0.02);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.07, 0.03), dark);
  head.position.set(0.73, 0, 0.02);
  g.add(body, upper, hole, neck, head);
  g.rotation.z = 0.45; // neck up towards the left hand
  g.position.set(-0.08, 0.36, 0.24);
  return g;
}

function performer(scene, layer, x, z, look, activity, name = '') {
  const o = makeNpc(layer, name, { ...randomLook(), ...look });
  if (!name) o.tag.remove();
  o.ch.root.position.set(x, 0, z);
  o.ch.root.rotation.y = FACE_AUDIENCE;
  o.ch.activity(activity);
  scene.add(o.ch.root);
  return o;
}

export class BuskingZones {
  // spots: region.json "busking" [{ id, at: [x, z], radius, name }]; the
  // zone's centre matches its "busking" landmark (core/busking-layout.js).
  constructor(scene, layer, spots = [], { showBubble } = {}) {
    this.layer = layer;
    this.showBubble = showBubble;
    this.items = spots.filter((s) => Array.isArray(s.at)).map((s) => {
      const [x, z] = s.at;
      const busker = performer(scene, layer, x + SINGER[0], z + SINGER[1], { model: 'shirt-denim', hairStyle: 'wave', dye: 'brown' }, 'strum', NAMES[0]);
      busker.ch.addProp('body', guitar());
      const dancers = [
        ...GIRLS.map(([dx, dz], i) => performer(scene, layer, x + dx, z + dz, GIRL_LOOKS[i], 'kpop')),
        ...BOYS.map(([dx, dz], i) => performer(scene, layer, x + dx, z + dz, BOY_LOOKS[i], 'kpopb')),
      ];
      // The audience up on the bank, each turned towards the nearest act.
      const acts = [SINGER, GIRLS[0], BOYS[0]];
      const crowd = CROWD.map(([dx, dz], k) => {
        const o = makeNpc(layer, '');
        o.tag.remove(); // listeners have no name tag
        const [ax, az] = acts.reduce((best, a) => (Math.abs(a[1] - dz) < Math.abs(best[1] - dz) ? a : best));
        o.ch.root.position.set(x + dx, bankHeight(dx, dz), z + dz);
        o.ch.root.rotation.y = Math.atan2(ax - dx, az - dz);
        o.clapIn = 2 + k * 0.9;
        scene.add(o.ch.root);
        return o;
      });
      return { ...s, x, z, r: s.radius || 22, busker, dancers, crowd };
    });
    this.inside = null; // the zone I'm in (for its music)
    this.performing = null; // the zone I'm busking in
    this.playedFor = 0;
  }

  zoneAt(x, z) { return this.items.find((s) => Math.hypot(x - s.x, z - s.z) < s.r) || null; }
  stageAt(x, z) { return this.items.find((s) => Math.hypot(x - s.x - SINGER[0], z - s.z - SINGER[1]) < STAGE_R) || null; }
  nearBusker(x, z) { return this.items.find((s) => Math.hypot(x - s.busker.ch.root.position.x, z - s.busker.ch.root.position.z) < 2.4) || null; }

  greet(s) {
    s.busker.ch.wave();
    say(s.busker, this.layer, BUSKER_LINES[Math.floor(Math.random() * BUSKER_LINES.length)]);
  }

  // I start busking on a stage: the busker steps to the side and listens.
  start(s) {
    this.performing = s;
    this.playedFor = 0;
    s.busker.ch.activity(null);
    s.busker.ch.root.position.set(s.x + SINGER[0] + 2.2, 0, s.z + SINGER[1] - 1.6);
    s.busker.ch.root.rotation.y = Math.PI; // turned to watch you
  }
  stop() {
    const s = this.performing;
    if (!s) return;
    this.performing = null;
    s.busker.ch.root.position.set(s.x + SINGER[0], 0, s.z + SINGER[1]);
    s.busker.ch.root.rotation.y = FACE_AUDIENCE;
    s.busker.ch.activity('strum');
  }

  // Per frame (street only). me: { x, z }. Returns 'tip' when a tip is due.
  update(dt, me, camera, w, h, placeLabels) {
    let tip = null;
    if (this.performing) {
      this.playedFor += dt;
      if (this.playedFor >= TIP_EVERY) { this.playedFor = 0; tip = 'tip'; }
    }
    for (const s of this.items) {
      const near = Math.hypot(me.x - s.x, me.z - s.z) < 90;
      for (const o of [s.busker, ...s.dancers, ...s.crowd]) {
        o.ch.root.visible = near;
        if (!near) { o.tag.style.display = 'none'; continue; }
        o.ch.animate(dt, 0);
        placeLabels(o, camera, w, h);
      }
      if (!near) continue;
      for (const o of s.crowd) {
        o.clapIn -= dt;
        if (o.clapIn <= 0) {
          o.clapIn = 4 + Math.random() * 5;
          o.ch.play(Math.random() < 0.7 ? 'clap' : 'cheer');
          if (this.showBubble && Math.random() < 0.35) this.showBubble(o, this.layer, CHEERS[Math.floor(Math.random() * CHEERS.length)], 1600);
        }
      }
    }
    return tip;
  }

  hideLabels() {
    for (const s of this.items) for (const o of [s.busker, ...s.dancers, ...s.crowd]) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
  }
}

export function readTips() { try { return JSON.parse(localStorage.getItem(TIP_KEY) || 'null'); } catch { return null; } }
export function writeTips(v) { try { localStorage.setItem(TIP_KEY, JSON.stringify(v)); } catch { /* storage blocked */ } }
