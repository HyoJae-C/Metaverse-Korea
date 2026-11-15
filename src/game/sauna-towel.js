// The sheep towel you sneaked out of the jjimjilbang goes back after one game
// day outside (core/sauna-towel.js), with a note saying so. Checked now,
// then every 20 s, and as you go in or out of a jjimjilbang.
import { checkTowel, loadTowel, saveTowel, toggleTowel, TOWEL } from '../core/sauna-towel.js';
import { saveLook } from '../core/look-editor.js';
import { t } from '../core/i18n.js';

export function createSaunaTowel(game) {
  const { setLook, shop } = game;
  let rec = loadTowel();
  const inSauna = () => game.mode === 'store' && game.interior?.store?.workshop === 'sauna';
  function wear(look) {
    game.myLook = look;
    saveLook(look);
    setLook(look);
  }
  function tick() {
    const r = checkTowel(game.myLook, rec, inSauna());
    if (r.rec !== rec) { rec = r.rec; saveTowel(rec); }
    if (r.taken) {
      wear(r.look);
      shop.toast(t('sauna.towelBack'));
    }
  }
  setTimeout(tick, 0);
  setInterval(tick, 20000);
  return {
    on: () => game.myLook.head === TOWEL,
    toggle() {
      const r = toggleTowel(game.myLook, rec);
      rec = r.rec;
      saveTowel(rec);
      wear(r.look);
      tick();
    },
    tick, // (main.js: after entering or leaving a room)
  };
}
