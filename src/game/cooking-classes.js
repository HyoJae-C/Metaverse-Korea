// Panels for the cooking classes (kimchi, japchae, kimbap, tteok, bibimbap), the market's kimchi
// stall and the museums, built once at startup.
//
// Kimjang class at the Kimchi Making Class (김치만들기체험) (Gyeongbokgung): ten steps from the
// cabbage to the jar; the finished kimchi goes in the bag.
//
// The classes are downloaded the first time one is opened
// (core/lazy-panel.js): their texts alone are ~200 KB in twelve languages.
import { BOSS_LINES } from '../ui/market-text.js';
import { KimchiSellUI, ML as MARKET_L } from '../ui/kimchi-sell-ui.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { kimchiJar } from '../core/kimchi-market.js';
import { localName, t } from '../core/i18n.js';
import { say } from '../core/npcs.js';

export function createCookingClasses(game) {
  const { $, bag, missionEvent, setHeld, shop, togetherBonus, wallet } = game;
  const kimchiUi = lazyPanel(async () => {
    const [{ KimchiUI }, { KT: KIMCHI_TEXT }] = await Promise.all([import('../ui/kimchi-ui.js'), import('../ui/kimchi-text.js')]);
    return new KimchiUI({
      root: $('kimchi-panel'),
      wallet,
      onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
      onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
      onJar: (score) => bag.add(kimchiJar(score, localName(KIMCHI_TEXT.item, 'en'))),
    });
  });
  // Yongmaru Market (Itaewon): the side-dish stall buys homemade kimchi, a few
  // jars a day (core/kimchi-market.js).
  // The museums' painting / lift panel: downloaded with the first look (or lift).
  const museumUi = lazyPanel(() => import('../ui/museum-ui.js').then(({ MuseumUI }) => new MuseumUI({ root: $('museum-panel') })));
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
  // Royal Japchae Class (궁중잡채체험), along the row from the kimchi class.
  const japchaeUi = lazyPanel(async () => {
    const [{ JapchaeUI }, { JT: JAPCHAE_TEXT }] = await Promise.all([import('../ui/japchae-ui.js'), import('../ui/japchae-text.js')]);
    return new JapchaeUI({
      root: $('japchae-panel'),
      wallet,
      onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
      onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
      onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(JAPCHAE_TEXT.item, 'en'), icon: '🍝', g: 'japchae', q: score }),
    });
  });
  // Free-style kimbap at the Kimbap Making Class (김밥만들기체험), next door.
  const kimbapUi = lazyPanel(async () => {
    const [{ KimbapUI }, { BT: KIMBAP_TEXT }] = await Promise.all([import('../ui/kimbap-ui.js'), import('../ui/kimbap-text.js')]);
    return new KimbapUI({
      root: $('kimbap-panel'),
      wallet,
      onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
      onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
      onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(KIMBAP_TEXT.item, 'en'), icon: '🍙', g: 'kimbap', q: score }),
    });
  });
  // Tteok Making Class (떡만들기체험, songpyeon) and Bibimbap Making Class
  // (비빔밥만들기체험): steps of the shared kinds (core/cook-class.js), one panel
  // (ui/cook-class-ui.js), each with its own steps and text.
  const cookClass = (root, load) => lazyPanel(async () => {
    const [{ CookClassUI }, c] = await Promise.all([import('../ui/cook-class-ui.js'), load()]);
    return new CookClassUI({
      root: $(root),
      game: c.game,
      text: c.text,
      lines: c.lines,
      wallet,
      onSay: (line) => game.clerk && say(game.clerk, $('labels'), line),
      onMedal: (medal, coins) => { if (coins) shop.toast(t('grill.medalToast', { coins })); missionEvent('cook'); togetherBonus('cook'); game.me.play(medal ? 'cheer' : 'wave'); },
      onBox: (score) => bag.add({ kind: 'gift', sips: 1, name: localName(c.text.item, 'en'), icon: c.game.icon, g: c.game.id, q: score }),
    });
  });
  const tteokUi = cookClass('tteok-panel', async () => {
    const [{ TTEOK_GAME, STEPS, WORDS }, { TK, TTEOK_LINES }] = await Promise.all([import('../core/tteok-game.js'), import('../ui/tteok-text.js')]);
    return {
      game: { id: TTEOK_GAME, icon: '🍡', steps: STEPS, words: WORDS, stepIcon: { dough: '🥣', knead: '👐', fill: '🍯', shape: '🌙', steam: '♨️', finish: '✨' } },
      text: TK, lines: TTEOK_LINES,
    };
  });
  const bibimbapUi = cookClass('bibimbap-panel', async () => {
    const [{ BIBIMBAP_GAME, STEPS, WORDS }, { BK, BIBIMBAP_LINES }] = await Promise.all([import('../core/bibimbap-game.js'), import('../ui/bibimbap-text.js')]);
    return {
      game: { id: BIBIMBAP_GAME, icon: '🥗', steps: STEPS, words: WORDS, stepIcon: { namul: '🥬', top: '🥕', arrange: '🌈', egg: '🍳', sauce: '🌶️', mix: '🥄' } },
      text: BK, lines: BIBIMBAP_LINES,
    };
  });
  return { museumUi, kimchiUi, japchaeUi, kimbapUi, tteokUi, bibimbapUi, kimchiSellUi };
}
