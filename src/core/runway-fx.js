// The Curve Runway's reactions (no DOM here except the word sprites' canvas,
// so the rules can be unit-tested): every step and pose is judged in three
// tiers. Spot on (perfect): a sparkle burst at your feet, a different one
// each time (stars, hearts, twinkles: perfume effects, core/scent-fx.js).
// Close (great, good): one small twinkle. Missed: you wobble as if about to
// trip and a little "!" pops up. A pose that lands well also shows a word
// over your head (one of Yozi's list at random, each its own colour). Others
// in the room see the same, sent as a short emote ('rw:p', 'rw:g', 'rw:m',
// with ':word:pose' for a photo).
import * as THREE from 'three';
import { poseKind } from './runway-poses.js';

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

// The words over your head when a photo is taken: one at random each time,
// each in its own colour (Yozi's list). Korean as written; the others say
// the same feel, without gendered endings where the language has them.
const W = (c, en, es, fr, ko, zh, id, vi, th, hi, ar, ja) => ({ c, en, es, fr, ko, zh, id, vi, th, hi, ar, ja });
export const WORDS = {
  sexy: W('#ff3b5c', 'Sexy!', '¡Sexy!', 'Sexy !', '섹시!', '性感！', 'Seksi!', 'Gợi cảm!', 'เซ็กซี่!', 'सेक्सी!', 'إثارة!', 'セクシー！'),
  cute: W('#ff8fc7', 'Cute!', '¡Cuqui!', 'Trop cute !', '큐트!', '可爱！', 'Imut!', 'Dễ thương!', 'น่ารัก!', 'क्यूट!', 'لطافة!', 'キュート！'),
  chic: W('#b8a4ff', 'Chic!', '¡Chic!', 'Chic !', '도도!', '高冷！', 'Chic!', 'Kiêu kỳ!', 'ชิค!', 'स्टाइलिश!', 'أناقة باردة!', 'ツンとクール！'),
  confident: W('#ffb703', 'Confident!', '¡Con confianza!', 'Confiance !', '자신감!', '自信！', 'Percaya diri!', 'Tự tin!', 'มั่นใจ!', 'आत्मविश्वास!', 'ثقة!', '自信満々！'),
  charming: W('#ff6f91', 'Charming!', '¡Qué encanto!', 'Du charme !', '매력적!', '有魅力！', 'Menawan!', 'Cuốn hút!', 'มีเสน่ห์!', 'आकर्षक!', 'جاذبية!', '魅力的！'),
  cool: W('#4cc9f0', 'Cool!', '¡Qué cool!', 'Cool !', '쿨!', '酷！', 'Keren!', 'Ngầu!', 'เท่!', 'कूल!', 'روعة!', 'クール！'),
  alluring: W('#c651ff', 'Alluring!', '¡Fascinante!', 'Irrésistible !', '매혹적!', '迷人！', 'Memikat!', 'Mê hoặc!', 'น่าหลงใหล!', 'मनमोहक!', 'فتنة!', '魅惑的！'),
  lovely: W('#ff85e4', 'Lovely!', '¡Adorable!', 'Adorable !', '러블리!', '惹人爱！', 'Cantik!', 'Đáng yêu!', 'เลิฟลี่!', 'लवली!', 'جمال!', 'ラブリー！'),
  sweet: W('#ffd6a5', 'Sweet!', '¡Dulce!', 'Tout doux !', '스위트!', '甜美！', 'Manis!', 'Ngọt ngào!', 'หวาน!', 'स्वीट!', 'حلاوة!', 'スイート！'),
  funky: W('#a3ff4f', 'Funky!', '¡Funky!', 'Funky !', '펑키!', '好潮！', 'Funky!', 'Funky!', 'ฟังกี้!', 'फंकी!', 'فانكي!', 'ファンキー！'),
  presence: W('#ffd700', 'Star power!', '¡Presencia!', 'Quelle présence !', '존재감!', '气场全开！', 'Berkharisma!', 'Thần thái!', 'ออร่าพุ่ง!', 'जलवा!', 'حضور!', '存在感！'),
  unique: W('#00f5d4', 'Unique!', '¡Original!', 'Unique !', '독특한!', '独特！', 'Unik!', 'Độc đáo!', 'ไม่เหมือนใคร!', 'यूनिक!', 'تميّز!', 'ユニーク！'),
  elegant: W('#f1e3ff', 'Elegant!', '¡Elegante!', 'Élégance !', '우아하게!', '优雅！', 'Anggun!', 'Thanh lịch!', 'สง่างาม!', 'शालीन!', 'أناقة!', 'エレガント！'),
  classy: W('#e9c46a', 'Classy!', '¡Con clase!', 'Quelle classe !', '기품있는!', '高贵！', 'Berkelas!', 'Quý phái!', 'มีระดับ!', 'शाही!', 'رُقيّ!', '気品！'),
  free: W('#7ae582', 'Free spirit!', '¡Espíritu libre!', 'Esprit libre !', '자유롭게!', '自由自在！', 'Bebas!', 'Tự do!', 'อิสระ!', 'आज़ाद!', 'حرية!', '自由に！'),
  mystic: W('#8b8cff', 'Mysterious!', '¡Misterio!', 'Quel mystère !', '신비롭게!', '神秘！', 'Misterius!', 'Bí ẩn!', 'ลึกลับ!', 'रहस्यमय!', 'غموض!', 'ミステリアス！'),
  bubbly: W('#ff9f1c', 'Bubbly!', '¡Con chispa!', 'Du peps !', '발랄!', '活泼！', 'Ceria!', 'Tươi tắn!', 'สดใส!', 'ज़िंदादिल!', 'حيوية!', 'ハツラツ！'),
  adorable: W('#ffe066', 'Adorable!', '¡Qué ternura!', 'Trop chou !', '깜찍!', '萌！', 'Gemas!', 'Xinh xắn!', 'น่าเอ็นดู!', 'क्यूटी!', 'ظرافة!', 'かわいい！'),
  bold: W('#ff5400', 'Fierce!', '¡Con actitud!', 'Quelle assurance !', '당당하게!', '霸气！', 'Berani!', 'Hiên ngang!', 'สง่าผ่าเผย!', 'बेबाक!', 'شموخ!', '堂々と！'),
};
const WORD_IDS = Object.keys(WORDS);
export const pickWord = (rnd = Math.random) => WORD_IDS[Math.floor(rnd() * WORD_IDS.length) % WORD_IDS.length];
export const wordColor = (id) => WORDS[id]?.c || '#ffffff';

// Labels (karaoke-game.js judge) to tiers.
export const tierOf = (label) => (label === 'perfect' ? 'p' : label === 'great' || label === 'good' ? 'g' : 'm');

// With the word and the pose of a photo: 'rw:p:chic:heart'.
export const runwayMsg = (tier, word, pose) => 'rw:' + tier + (word || pose ? ':' + (word || '') : '') + (pose ? ':' + pose : '');
export function parseRunwayMsg(e) {
  if (typeof e !== 'string' || !e.startsWith('rw:')) return null;
  const [, tier, word, pose] = e.split(':');
  if (!['p', 'g', 'm'].includes(tier)) return null;
  return { tier, word: WORDS[word] ? word : null, pose: poseKind(pose) ? pose : null };
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
