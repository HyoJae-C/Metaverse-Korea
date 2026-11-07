// Panels for the cooking classes (kimchi, japchae, kimbap), the market's kimchi
// stall and the museums, built once at startup.
//
// Kimjang class at Sonmat Kimchi School (Gyeongbokgung): ten steps from the
// cabbage to the jar; the finished kimchi goes in the bag.
import { BOSS_LINES } from '../ui/market-text.js';
import { JT as JAPCHAE_TEXT } from '../ui/japchae-text.js';
import { JapchaeUI } from '../ui/japchae-ui.js';
import { BT as KIMBAP_TEXT } from '../ui/kimbap-text.js';
import { KT as KIMCHI_TEXT } from '../ui/kimchi-text.js';
import { KimbapUI } from '../ui/kimbap-ui.js';
import { KimchiSellUI, ML as MARKET_L } from '../ui/kimchi-sell-ui.js';
import { KimchiUI } from '../ui/kimchi-ui.js';
import { MuseumUI } from '../ui/museum-ui.js';
import { kimchiJar } from '../core/kimchi-market.js';
import { localName, t } from '../core/i18n.js';
import { say } from '../core/npcs.js';

export function createCookingClasses(game) {
  const { $, bag, missionEvent, setHeld, shop, togetherBonus, wallet } = game;
  const kimchiUi = new KimchiUI({
    root: $('kimchi-panel'),
    wallet,
    onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
    onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
    onJar: (score) => bag.add(kimchiJar(score, localName(KIMCHI_TEXT.item, 'en'))),
  });
  // Yongmaru Market (Itaewon): the side-dish stall buys homemade kimchi, a few
  // jars a day (core/kimchi-market.js).
  const museumUi = new MuseumUI({ root: $('museum-panel') });
  const kimchiSellUi = new KimchiSellUI({
    root: $('kimchi-sell-panel'),
    bag,
    wallet,
    getHeld: () => game.held,
    clearHeld: () => setHeld(null),
    onSold: (coins, score) => {
      shop.toast(MARKET_L('sold', { coins }));
      game.clerk && say(game.clerk, $('labels'), score >= 75 ? BOSS_LINES.great : BOSS_LINES.ok);
    },
    onLimit: () => game.clerk && say(game.clerk, $('labels'), BOSS_LINES.enough),
  });
  // Japchae class at Suragan Cooking Class, next to the kimchi school.
  const japchaeUi = new JapchaeUI({
    root: $('japchae-panel'),
    wallet,
    onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
    onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
    onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(JAPCHAE_TEXT.item, 'en'), icon: '🍝', g: 'japchae', q: score }),
  });
  // Free-style kimbap at the same class, at the bamboo mats on the near side.
  const kimbapUi = new KimbapUI({
    root: $('kimbap-panel'),
    wallet,
    onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
    onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
    onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(KIMBAP_TEXT.item, 'en'), icon: '🍙', g: 'kimbap', q: score }),
  });
  return { museumUi, kimchiUi, japchaeUi, kimbapUi, kimchiSellUi };
}
