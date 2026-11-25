// Praying (기도하기, Yozi 2026-11-15): in front of Bongeunsa's Maitreya
// Buddha (on the red mat), in front of Jogyesa's Daeungjeon, before the
// golden Buddhas inside both temples' silent halls (core/dharma-hall.js),
// and at the altar rail in Myeongdong Cathedral. At a temple you put your palms
// together and bow (pose 'pray'); in the cathedral you fold your hands and
// bow your head ('prayc'). The pose is an activity (core/studio-moves.js),
// so everyone nearby sees it; walking off ends it. Before the Memorial Tower
// in Seoul National Cemetery you lay a flower and bow your head in silence
// (묵념): the same pose as in the cathedral, its own words, and white
// chrysanthemums on the altar (game.onTribute).
//
// The game's live state comes in through `game` (getters), as in picnic.js:
//   { me, mode, interior, landmarks, bubble(text) }
import { L } from '../ui/pocha-ui.js';

export const PRAYER_TEXT = {
  pray: { en: 'Pray', ko: '기도하기', ja: 'お祈りする', zh: '祈祷', es: 'Rezar', id: 'Berdoa', vi: 'Cầu nguyện', fr: 'Prier', th: 'สวดมนต์', ar: 'صلِّ' },
  tribute: { en: 'Burn incense and bow in silence', ko: '분향하고 묵념하기', ja: '焼香して黙祷する', zh: '上香并默哀', es: 'Ofrecer incienso y guardar silencio', id: 'Membakar dupa dan mengheningkan cipta', vi: 'Thắp hương và mặc niệm', fr: "Offrir de l'encens et se recueillir", th: 'จุดธูปและยืนไว้อาลัย', ar: 'أشعل البخور وقف دقيقة صمت' },
  tributeStop: { en: 'Finish', ko: '묵념 마치기', ja: '黙祷を終える', zh: '结束默哀', es: 'Terminar', id: 'Selesai', vi: 'Kết thúc', fr: 'Terminer', th: 'เสร็จสิ้น', ar: 'إنهاء' },
  stop: { en: 'Stop praying', ko: '기도 마치기', ja: 'お祈りを終える', zh: '结束祈祷', es: 'Terminar de rezar', id: 'Selesai berdoa', vi: 'Kết thúc cầu nguyện', fr: 'Finir de prier', th: 'สวดมนต์เสร็จ', ar: 'أنهِ الصلاة' },
};

// The street's prayer spots, from the map's landmarks (world metres):
// { x, z, r: how near you must be, face: the way you turn, pose }.
export function prayerSpots(landmarks = []) {
  const out = [];
  for (const l of landmarks) {
    if (l.type === 'maitreya' && l.plaza) { // the red mat, 3.6 m in front of the statue (core/bongeunsa-model.js)
      out.push({ x: l.x + Math.sin(l.ry) * 3.6, z: l.z + Math.cos(l.ry) * 3.6, r: 1.7, face: l.ry + Math.PI, pose: 'pray', y: l.lift || 0 });
    } else if (l.type === 'jogyesa' && l.jg) { // the yard in front of Daeungjeon (its front faces +z, data/jogyesa.js), beside its door
      out.push({ x: l.x + 4.5, z: l.z + 8.6, r: 2, face: Math.PI, pose: 'pray', y: 0 });
    } else if (l.type === 'hyeonchung' && l.tribute) { // before the Memorial Tower's altar (scripts/build-hyeonchungwon.mjs)
      out.push({ x: l.x + l.tribute.at[0], z: l.z + l.tribute.at[1], r: l.tribute.r, face: l.tribute.face, pose: 'prayc', y: l.tribute.y, tribute: true });
    }
  }
  return out;
}

export function createPrayer(game) {
  let spots = null, pose = null, quiet = false;
  const street = () => (spots ||= prayerSpots(game.landmarks));
  // The spot you are at, or null.
  function near(p) {
    const list = game.mode === 'store' ? (game.interior?.stations?.pray || []) : game.mode === 'street' ? street() : [];
    return list.find((s) => Math.hypot(p.x - s.x, p.z - s.z) < (s.r || 1.6)) || null;
  }
  function stop() { pose = null; }
  return {
    get pose() { return pose; },
    stop,
    // The action button here: start praying, or stop.
    act(p) {
      if (pose) return quiet ? { key: 'tribute-stop', label: L(PRAYER_TEXT.tributeStop), run: stop } : { key: 'pray-stop', label: '🙏 ' + L(PRAYER_TEXT.stop), run: stop };
      const s = near(p);
      if (!s) return null;
      if (s.tribute) { // (the Memorial Tower: incense and a silent bow; no bubble)
        return {
          key: 'tribute', label: '🙏 ' + L(PRAYER_TEXT.tribute), run: () => {
            game.me.root.rotation.y = s.face ?? game.me.root.rotation.y;
            pose = s.pose;
            quiet = true;
            game.onTribute?.();
          },
        };
      }
      return {
        key: 'pray', label: '🙏 ' + L(PRAYER_TEXT.pray), run: () => {
          game.me.root.rotation.y = s.face ?? game.me.root.rotation.y;
          pose = s.pose || 'pray';
          quiet = false;
          game.bubble('🙏');
        },
      };
    },
    // Each frame: walking (stick or keys past `mag` 0.3) or leaving ends it.
    tick(p, mag) {
      if (pose && (mag > 0.3 || !near(p))) pose = null;
    },
  };
}
