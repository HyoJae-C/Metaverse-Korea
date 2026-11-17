// A bigger home (집 넓히기): save up game money and buy the next level
// (core/home-stages.js). Loaded with import() the first time you go into
// your home (game/decor.js).
//
// The 🏗️ chip in the decorating bar opens a sheet: this home's size, the
// next level's size and price, and a button to buy it. The till is the
// server's when signed in (core/home-level-till.js, 053_home_levels.sql:
// the receipt is written with the payment). After buying, the furniture
// moves with the walls (core/home-grow.js) and you walk back in to the
// bigger room.
import { growLayout } from '../core/home-grow.js';
import { HOME_LEVELS, homeLevelOf, homeRoom, nextHomeLevel, readHomeLevel, writeHomeLevel } from '../core/home-stages.js';
import { LocalHomeTill, SupabaseHomeTill, newRequestId } from '../core/home-level-till.js';
import { won } from '../core/money.js';
import { t } from '../core/i18n.js';

const ASK_MS = 2500; // walking in waits at most this long for the server's level

export function createHomeGrow(game, decor) {
  const { $, shop } = game;
  let till = null, synced = null, sheet = null, buying = false, prices = null, pending = null;
  const store = () => {
    const live = game.cloud?.status === 'cloud' && game.cloud.client && game.cloud.user;
    if (live && !(till instanceof SupabaseHomeTill)) till = new SupabaseHomeTill(game.cloud, game.wallet);
    if (!live && !till) till = new LocalHomeTill(game.wallet);
    return till;
  };
  // The server's level, once a session (it wins over this browser's).
  function syncLevel() {
    synced ||= Promise.race([
      store().info().then((r) => {
        if (r.prices) prices = r.prices;
        if (r.level) writeHomeLevel(r.level);
        else if (r.error === 'network') synced = null; // ask again next time
        return readHomeLevel();
      }),
      new Promise((ok) => setTimeout(() => ok(readHomeLevel()), ASK_MS)),
    ]).catch(() => { synced = null; });
    return synced.then(() => readHomeLevel()); // (asked once; bought since: this browser knows)
  }
  const size = (l) => t('home.size', { w: l.w, d: l.d });

  function close() { if (sheet) sheet.hidden = true; }
  function draw(note = '') {
    const cur = homeLevelOf(readHomeLevel()), next = nextHomeLevel(cur.level);
    sheet.querySelector('strong').textContent = '🏗️ ' + t('home.grow');
    sheet.querySelector('.grow-now').textContent = t('home.levelNow', { n: cur.level, size: size(cur) });
    const info = sheet.querySelector('.grow-next'), buy = sheet.querySelector('.grow-buy');
    if (next) {
      const price = prices?.[next.level] ?? next.price;
      info.textContent = t('home.levelNext', { n: next.level, size: size(next), price: won(price) }) + ' ' + t('home.growHow');
      buy.hidden = false;
      buy.disabled = buying;
      buy.textContent = t('home.growBuy', { price: won(price) });
      buy.onclick = () => buyNext(next.level, price);
    } else {
      info.textContent = t('home.levelMax');
      buy.hidden = true;
    }
    sheet.querySelector('.grow-note').textContent = note;
  }
  function open() {
    if (!decor.decor || decor.decor.guest) return;
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'sheet grow-panel';
      sheet.id = 'grow-panel';
      sheet.innerHTML = '<button class="sheet-x" aria-label="Close">✕</button><strong></strong><p class="grow-now"></p><p class="fine grow-next"></p><button class="primary grow-buy"></button><p class="fine grow-note"></p>';
      sheet.querySelector('.sheet-x').onclick = close;
      $('hud').append(sheet);
    }
    sheet.hidden = false;
    draw();
    syncLevel().then(() => !sheet.hidden && draw());
  }

  async function buyNext(level, price) {
    if (buying) return;
    buying = true;
    draw('…');
    // The same request id until it goes through: a retry never pays twice.
    if (pending?.level !== level || pending.price !== price) pending = { level, price, id: newRequestId() };
    const was = homeRoom(readHomeLevel());
    let r;
    try { r = await store().buy({ requestId: pending.id, level, price }, { k: 'home.receipt', v: { n: level } }); } catch { r = { error: 'network' }; }
    buying = false;
    if (r.error) {
      if (r.level) writeHomeLevel(r.level);
      if (r.price) prices = { ...(prices || {}), [level]: r.price };
      if (r.error !== 'network') pending = null;
      draw(t({ coins: 'home.growPoor', price: 'home.growPrice', missing: 'home.growSoon', level: 'home.growLevel' }[r.error] || 'home.growNetwork', { price: won(r.price ?? price) }));
      return;
    }
    pending = null;
    writeHomeLevel(r.level);
    game.refreshWallet?.();
    close();
    // The furniture moves with the walls; then walk in again.
    const d = decor.decor;
    if (d && !d.guest) {
      d.items = growLayout(decor.cleanLayout(d.items), was, homeRoom(r.level));
      d.carry = null;
      decor.saveDecor();
    }
    decor.labelDecor();
    shop.toast(t('home.grown', { n: r.level, size: size(HOME_LEVELS[r.level - 1]) }), 5000);
    game.reenterHome?.();
  }

  return { open, syncLevel };
}
