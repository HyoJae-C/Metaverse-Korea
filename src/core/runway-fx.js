// The Curve Runway's reactions (no DOM here except the word sprites' canvas,
// so the rules can be unit-tested): every step and pose is judged in three
// tiers. Spot on (perfect): a sparkle burst at your feet, a different one
// each time (stars, hearts, twinkles: perfume effects, core/scent-fx.js).
// Close (great, good): one small twinkle. Missed: you wobble as if about to
// trip and a little "!" pops up. A pose that lands well also shows a word
// over your head (Chic! Cute! Confident!). Others in the room see the same,
// sent as a short emote ('rw:p', 'rw:g', 'rw:m', with ':word' for a pose).
import * as THREE from 'three';

// Perfect: one of these at random (the scent-fx effect format).
export const PERFECT_FX = [
  { e: ['✨', '💖'], m: 'pop' },
  { e: ['⭐', '🌟'], m: 'twinkle' },
  { e: ['@spark', '💫'], m: 'rise' },
  { e: ['💕', '💗'], m: 'float' },
  { e: ['🌟', '✨'], m: 'orbit' },
  { e: ['🦋', '✨'], m: 'rise' },
  { e: ['@spark', '⭐'], m: 'pop', c: '#ffe6a8' },
];
export const GOOD_FX = { e: ['@spark'], m: 'rise' };
export const pickPerfect = (rnd = Math.random) => PERFECT_FX[Math.floor(rnd() * PERFECT_FX.length) % PERFECT_FX.length];

// The words, by pose (POSES in runway-game.js): the turn is chic or sexy.
export const WORDS = {
  cute: { en: 'Cute!', ko: '큐트!', ja: 'キュート！', zh: '可爱！' },
  chic: { en: 'Chic!', ko: '도도!', ja: 'クール！', zh: '高冷！' },
  sexy: { en: 'Sexy!', ko: '섹시!', ja: 'セクシー！', zh: '性感！' },
  confident: { en: 'Confident!', ko: '자신감!', ja: '自信満々！', zh: '自信！' },
};
const POSE_WORDS = { wave: ['cute'], turn: ['chic', 'sexy'], cheer: ['confident'] };
export function poseWord(pose, rnd = Math.random) {
  const list = POSE_WORDS[pose] || ['confident'];
  return list[Math.floor(rnd() * list.length) % list.length];
}

// Labels (karaoke-game.js judge) to tiers.
export const tierOf = (label) => (label === 'perfect' ? 'p' : label === 'great' || label === 'good' ? 'g' : 'm');

export const runwayMsg = (tier, word) => 'rw:' + tier + (word ? ':' + word : '');
export function parseRunwayMsg(e) {
  if (typeof e !== 'string' || !e.startsWith('rw:')) return null;
  const [, tier, word] = e.split(':');
  if (!['p', 'g', 'm'].includes(tier)) return null;
  return { tier, word: WORDS[word] ? word : null };
}

// The wobble of a missed step: a lean to one side and back, about half a
// second, in radians (rotation.z of the character's root).
export const WOBBLE_S = 0.55;
export function wobbleAt(t) {
  if (t < 0 || t >= WOBBLE_S) return 0;
  const k = t / WOBBLE_S;
  return Math.sin(k * Math.PI * 3) * 0.32 * (1 - k);
}

// Words over heads: text sprites that rise a little and fade (a small pool).
const wordTex = new Map();
function wordTexture(text, color) {
  const key = text + color;
  if (wordTex.has(key)) return wordTex.get(key);
  const c = document.createElement('canvas');
  const font = '900 84px "Apple SD Gothic Neo", "Noto Sans KR", system-ui, sans-serif';
  let g = c.getContext('2d');
  g.font = font;
  c.width = Math.ceil(g.measureText(text).width) + 40; c.height = 128; // (resizing resets the context)
  g = c.getContext('2d');
  g.font = font;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 14; g.strokeStyle = 'rgba(36,33,43,0.9)'; g.lineJoin = 'round';
  g.strokeText(text, c.width / 2, 68);
  g.fillStyle = color;
  g.fillText(text, c.width / 2, 68);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.aspect = c.width / c.height;
  wordTex.set(key, tex);
  return tex;
}

export class WordFx {
  constructor(n = 8) {
    this.group = new THREE.Group();
    this.free = []; this.live = [];
    for (let i = 0; i < n; i++) {
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
      sp.visible = false; sp.renderOrder = 6; sp.raycast = () => {};
      this.group.add(sp);
      this.free.push({ sp });
    }
  }
  attach(scene) {
    if (this.group.parent === scene) return;
    for (const p of this.live) { p.sp.visible = false; this.free.push(p); }
    this.live.length = 0;
    this.group.parent?.remove(this.group);
    scene.add(this.group);
  }
  // A word over (x, z), head height y. small: the "!" of a miss.
  pop(x, y, z, text, color = '#ffd166', small = false) {
    const p = this.free.pop();
    if (!p) return;
    const tex = wordTexture(text, color);
    const hgt = small ? 0.8 : 0.55;
    Object.assign(p, { t: 0, life: small ? 0.9 : 1.2, x, y, z, w: hgt * tex.userData.aspect, hgt });
    p.sp.material.map = tex;
    p.sp.material.needsUpdate = true;
    p.sp.visible = true;
    this.live.push(p);
  }
  update(dt) {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const p = this.live[i];
      p.t += dt;
      const k = p.t / p.life;
      if (k >= 1) { p.sp.visible = false; this.live.splice(i, 1); this.free.push(p); continue; }
      const grow = Math.min(1, p.t / 0.12);
      p.sp.position.set(p.x, p.y + k * 0.6, p.z);
      p.sp.scale.set(p.w * grow, p.hgt * grow, 1);
      p.sp.material.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }
  }
}
