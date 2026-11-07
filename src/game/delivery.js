// Delivery run from the tteokbokki stall: ride to another shop in time.
import { JOB_TEXT, SHIFTS_PER_DAY } from '../core/jobs.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { MAX_ROAD, deliveryPay, pickDelivery, timeFor } from '../core/delivery.js';
import { getLanguage, localName, t } from '../core/i18n.js';

export function createDelivery(game) {
  const { $, leaveStore, missionEvent, roadGraph, setGuide, shifts, shop, storefronts, wallet } = game;
  let delivery = null; // { id, name, until }
  function startDelivery() {
    if (delivery) { shop.toast(t('delivery.cancelHint')); return; }
    const from = game.interior?.front?.door || game.me.root.position;
    // Only shops reachable within a minute along the streets.
    const stores = storefronts.items.filter((i) => i.store.category !== 'home' && i.store.category !== 'park' && i.store.category !== 'station' && i.store.id !== game.interior?.store.id)
      .map((i) => ({ id: i.store.id, x: i.door.x, z: i.door.z, item: i }))
      .filter((s) => { const d = Math.hypot(s.x - from.x, s.z - from.z); return d > 30 && d <= MAX_ROAD; })
      .map((s) => {
        const poly = roadGraph.route(from.x, from.z, s.x, s.z);
        let road = 0;
        for (let k = 1; k < poly.length; k++) road += Math.hypot(poly[k][0] - poly[k - 1][0], poly[k][1] - poly[k - 1][1]);
        return { ...s, road };
      });
    const target = pickDelivery(stores, from);
    if (!target) return;
    if (!shifts.take()) { shop.toast(fmt(L(JOB_TEXT.noShifts), { all: SHIFTS_PER_DAY })); return; }
    const secs = timeFor(target.road);
    const name = localName(target.item.store.name, getLanguage());
    delivery = { id: target.id, name, until: performance.now() + secs * 1000, emoji: game.interior?.store?.jobEmoji || '🛵' };
    shop.toast(t('delivery.start', { name, s: secs }) + ' · ' + fmt(L(JOB_TEXT.shiftsLeft), { n: shifts.left(), all: SHIFTS_PER_DAY }));
    if (game.mode === 'store') leaveStore();
    setGuide({ kind: 'store', id: target.id, x: target.x, z: target.z, label: name });
  }
  function deliveryArrived(storeId) {
    if (!delivery || delivery.id !== storeId) return;
    const left = (delivery.until - performance.now()) / 1000;
    const coins = deliveryPay(left);
    delivery = null;
    $('delivery-chip').hidden = true;
    if (!coins) return;
    wallet.add(coins, { k: 'ledger.delivery' });
    game.me.play('cheer');
    shop.toast(t('delivery.done', { n: coins }));
    missionEvent('delivery');
  }
  function updateDelivery() {
    if (!delivery) return;
    const left = (delivery.until - performance.now()) / 1000;
    if (left <= 0) {
      delivery = null;
      $('delivery-chip').hidden = true;
      shop.toast(t('delivery.late'));
      return;
    }
    $('delivery-chip').hidden = false;
    $('delivery-chip').textContent = `🛵${delivery.emoji === '🛵' ? '' : delivery.emoji} ${delivery.name} · ${Math.ceil(left)}s`;
  }
  $('delivery-chip').onclick = () => { if (delivery) shop.toast(t('delivery.cancelHint')); };
  return { deliveryArrived, startDelivery, updateDelivery, get delivery() { return delivery; } };
}
