// Playing at a busking zone (region.json "busking", e.g. Hongdae Walking
// Street): step on the stage, sing for the crowd, take a bow. The zones
// themselves (stage, singer, dancers, crowd) are core/busking.js; this is
// the player's side: start/stop, the clapping tips and the busking song.
import { readTips, writeTips, takeTip } from '../core/busking.js';
import { SINGER, FACE_AUDIENCE } from '../core/busking-layout.js';
import { dayKey } from '../core/daily.js';
import { showBubble } from '../core/players.js';
import { L } from '../ui/pocha-ui.js';
import { BUSK_TEXT } from '../i18n/game-text.js';

export function createBuskingPlay(game) {
  const { busking, $, STALE } = game;
  let buskMusic = null; // { wasOn, track } while inside a busking zone

  function startBusking(s) {
    busking.start(s);
    // On the singer's spot (the stage), not the middle of the zone: the frame
    // loop stops busking as soon as you're off the stage.
    game.me.root.position.set(s.x + SINGER[0], 0, s.z + SINGER[1]);
    game.me.root.rotation.y = FACE_AUDIENCE; // face the crowd on the bank
    showBubble(game.myLabel, $('labels'), '🎤🎶', 3000);
    game.shop.toast(L(BUSK_TEXT.begin));
    game.action = STALE;
  }
  function stopBusking() {
    busking.stop();
    game.me.play('bow');
    game.action = STALE;
  }
  // Busking is for fun, not money: listeners clap along (a few times a day).
  function buskTip() {
    const next = takeTip(readTips(), dayKey());
    if (!next) return;
    writeTips(next);
    game.sfx.pop?.();
    game.shop.toast(L(BUSK_TEXT.tip));
  }
  // The busking song plays while you're in the zone (and the usual music after).
  function updateBuskMusic(p) {
    const { music } = game;
    const z = game.mode === 'street' ? busking.zoneAt(p.x, p.z) : null;
    if (z === busking.inside) return;
    busking.inside = z;
    if (z) {
      buskMusic = { wasOn: music.on, track: music.track.id === 'busking' ? 'lofi' : music.track.id };
      music.setTrack('busking');
      if (!music.on) music.setOn(true).then(game.applyMusicBtn);
    } else if (buskMusic) {
      const { wasOn, track } = buskMusic;
      buskMusic = null;
      if (music.track.id === 'busking') music.setTrack(track);
      const cafe = game.musicCafe;
      if (cafe.cafeMusic) cafe.cafeMusic.wasOn = wasOn; // walked straight into a music café or bar
      else if (!wasOn && music.on) music.setOn(false).then(game.applyMusicBtn);
    }
  }
  const buskerAct = (s) => ({ key: 'busker', label: '👋 ' + L(BUSK_TEXT.hi), run: () => busking.greet(s) });
  // The busk action for the action button, or null when nothing busking is near.
  function buskAction(p, riding) {
    if (busking.performing) return { key: 'busk-stop', label: '🛑 ' + L(BUSK_TEXT.stop), run: () => stopBusking() };
    const s = !riding && busking.stageAt(p.x, p.z);
    if (s) return { key: 'busk', label: '🎤 ' + L(BUSK_TEXT.start), run: () => startBusking(s) };
    const bk = busking.nearBusker(p.x, p.z);
    return bk ? buskerAct(bk) : null;
  }

  return { startBusking, stopBusking, buskTip, updateBuskMusic, buskerAct, buskAction };
}
