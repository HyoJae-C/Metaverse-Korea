// Holy water (성수) at Myeongdong Cathedral's door (Yozi 2026-11-16): at
// either font by the door you can dip your fingertips and make the sign of
// the cross, as Catholics do on coming in. Optional and quiet: a button when
// you stand by a font, a short line on what it means the first time, no
// reward. Others see the gesture (an activity pose, core/studio-moves.js):
// the hand in the water until the next sign starts, one sign of the cross,
// then back to standing. Walking off ends it.
//
// The game's live state comes in through `game` (getters), as in prayer.js:
//   { me, mode, interior, toast(text) }
import { L } from '../ui/pocha-ui.js';
import { HOLY_SIGN } from '../core/studio-moves.js';

export const HOLY_WATER_TEXT = {
  use: { en: 'Holy water', ko: '성수 찍기', ja: '聖水をつける', zh: '蘸圣水', es: 'Agua bendita', id: 'Air suci', vi: 'Nước thánh', fr: 'Eau bénite', pt: "Água benta", th: 'น้ำมนต์', ar: 'الماء المقدّس' },
  about: {
    en: '💧 Catholics dip their fingertips in holy water and make the sign of the cross as they come in.',
    ko: '💧 가톨릭 신자들은 성당에 들어올 때 성수를 손끝에 찍고 성호를 그어요.',
    ja: '💧 カトリックの人は聖堂に入るとき、指先に聖水をつけて十字を切ります。',
    zh: '💧 天主教徒进教堂时，会用指尖蘸圣水，画十字圣号。',
    es: '💧 Al entrar, los católicos mojan la punta de los dedos en agua bendita y se santiguan.',
    id: '💧 Umat Katolik mencelupkan ujung jari ke air suci dan membuat tanda salib saat masuk.',
    vi: '💧 Người Công giáo chấm đầu ngón tay vào nước thánh và làm dấu thánh giá khi bước vào.',
    fr: '💧 En entrant, les catholiques trempent le bout des doigts dans l\'eau bénite et font le signe de croix.', pt: "💧 Os católicos molham as pontas dos dedos na água benta e fazem o sinal da cruz ao entrar.",
    th: '💧 ชาวคาทอลิกจุ่มปลายนิ้วในน้ำมนต์แล้วทำเครื่องหมายกางเขนเมื่อเข้ามา',
    ar: '💧 يغمس الكاثوليك أطراف أصابعهم في الماء المقدّس ويرسمون إشارة الصليب عند الدخول.',
  },
};

// Seconds left until the next sign of the cross starts (the pose's clock is
// the page's, as in core/model-pack.js).
export const REACH = 0.55; // m from the font's middle where you stand (its stand blocks 0.25 m round)

export const untilSign = (nowS) => (HOLY_SIGN - (nowS % HOLY_SIGN)) % HOLY_SIGN;

export function createHolyWater(game, now = () => performance.now() / 1000) {
  let pose = null, signAt = 0, told = false;
  const near = (p) => (game.mode === 'store' ? game.interior?.stations?.font || [] : []).find((f) => Math.hypot(p.x - f.x, p.z - f.z) < f.r) || null;
  return {
    get pose() {
      if (!pose) return null;
      const t = now();
      if (t >= signAt + HOLY_SIGN) { pose = null; return null; } // (one sign, then done)
      return t >= signAt ? 'holywater' : 'holyreach';
    },
    // The action button by a font (none while you're at it).
    act(p) {
      if (this.pose) return null;
      const f = near(p);
      if (!f) return null;
      return {
        key: 'holy-water', label: '💧 ' + L(HOLY_WATER_TEXT.use), run: () => {
          // A step up to the font (your fingers reach the water), facing it.
          const dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz) || 1;
          game.me.root.position.x = f.x + (dx / d) * REACH;
          game.me.root.position.z = f.z + (dz / d) * REACH;
          game.me.root.rotation.y = Math.atan2(-dx, -dz);
          const t = now(), wait = untilSign(t);
          signAt = t + (wait < 0.9 ? wait + HOLY_SIGN : wait); // (the fingers in the water a moment first)
          pose = 'holy';
          if (!told) { told = true; game.toast(L(HOLY_WATER_TEXT.about)); }
        },
      };
    },
    // Each frame: walking (past `mag` 0.3) or leaving the font ends it.
    tick(p, mag) {
      if (pose && (mag > 0.3 || !near(p))) pose = null;
    },
  };
}
