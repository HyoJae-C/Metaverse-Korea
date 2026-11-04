// Busking zones (region.json "busking"): a street stage, e.g. on Hongdae
// Walking Street. A busker NPC plays there with a small crowd around; walking
// into the zone plays the busking song. Step onto the stage and tap Busk to
// perform yourself: the busker steps aside, the crowd claps and now and then
// someone drops a tip (a few a day). Others see you dancing on the stage.
import { makeNpc, say } from './npcs.js';

export const STAGE_R = 3.2; // stand within this of the stage centre to busk
export const TIP = 5; // coins per tip
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

export class BuskingZones {
  // spots: region.json "busking" [{ id, at: [x, z], radius, name }].
  constructor(scene, layer, spots = [], { findFreeSpot = (x, z) => [x, z], showBubble } = {}) {
    this.layer = layer;
    this.showBubble = showBubble;
    this.items = spots.filter((s) => Array.isArray(s.at)).map((s) => {
      const [x, z] = s.at;
      const busker = makeNpc(layer, NAMES[0]);
      busker.ch.root.position.set(x, 0, z - 0.4);
      busker.ch.root.rotation.y = 0; // faces the crowd (+z)
      busker.ch.activity('dance');
      scene.add(busker.ch.root);
      // A half ring of listeners in front of the stage, facing it.
      const crowd = [];
      for (let k = 0; k < 5; k++) {
        const a = -1.0 + k * 0.5;
        const [cx, cz] = findFreeSpot(x + Math.sin(a) * 6.5, z + Math.cos(a) * 6.5);
        const o = makeNpc(layer, '');
        o.tag.remove(); // listeners have no name tag
        o.ch.root.position.set(cx, 0, cz);
        o.ch.root.rotation.y = Math.atan2(x - cx, z - cz);
        o.clapIn = 2 + k * 1.3;
        scene.add(o.ch.root);
        crowd.push(o);
      }
      return { ...s, x, z, r: s.radius || 16, busker, crowd };
    });
    this.inside = null; // the zone I'm in (for its music)
    this.performing = null; // the zone I'm busking in
    this.playedFor = 0;
  }

  zoneAt(x, z) { return this.items.find((s) => Math.hypot(x - s.x, z - s.z) < s.r) || null; }
  stageAt(x, z) { return this.items.find((s) => Math.hypot(x - s.x, z - s.z) < STAGE_R) || null; }
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
    s.busker.ch.root.position.set(s.x + 4.2, 0, s.z + 1.5);
    s.busker.ch.root.rotation.y = -Math.PI / 2;
  }
  stop() {
    const s = this.performing;
    if (!s) return;
    this.performing = null;
    s.busker.ch.root.position.set(s.x, 0, s.z - 0.4);
    s.busker.ch.root.rotation.y = 0;
    s.busker.ch.activity('dance');
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
      for (const o of [s.busker, ...s.crowd]) {
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
    for (const s of this.items) for (const o of [s.busker, ...s.crowd]) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
  }
}

export function readTips() { try { return JSON.parse(localStorage.getItem(TIP_KEY) || 'null'); } catch { return null; } }
export function writeTips(v) { try { localStorage.setItem(TIP_KEY, JSON.stringify(v)); } catch { /* storage blocked */ } }
