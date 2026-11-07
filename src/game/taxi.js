// Taxi: pick a place on the map (taxi mode) and ride there. A short scene
// from the back seat, the driver speaks Korean, then you're dropped off on
// the nearest street. The fare grows with the distance.
import { getLanguage, t } from '../core/i18n.js';
import { showBubble } from '../core/players.js';
import { taxiFare } from '../core/taxi.js';

export function createTaxi(game) {
  const { $, clearGuide, findFreeSpot, input, leaveStore, mapView, missionEvent, moveMeTo, myLabel, refreshWallet, scene, setGuide, setRiding, shop } = game;
  const TAXI_LINES = [
    ['안녕하세요! 어디로 가세요?', 'annyeonghaseyo! eodiro gaseyo?', 'taxi.t1'],
    ['네, 출발할게요!', 'ne, chulbalhalgeyo!', 'taxi.t2'],
    ['도착했습니다. 안녕히 가세요!', 'dochakhaetseumnida. annyeonghi gaseyo!', 'taxi.t3'],
  ];
  let taxiTimers = [];
  const CAR_FREE = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'corridor']);
  function taxiDropOff(x, z) {
    let best = [x, z], bd = Infinity;
    for (const r of game.map.roads) {
      if (CAR_FREE.has(r.k)) continue;
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        const px = ax + u * dx, pz = az + u * dz, d = (px - x) ** 2 + (pz - z) ** 2;
        if (d < bd) { bd = d; best = [px, pz]; }
      }
    }
    return best;
  }
  function rideTaxi(dest) {
    // Drop-off: the nearest point on a road a car can use, on free ground.
    const [rx, rz] = taxiDropOff(dest.x, dest.z);
    const [fx, fz] = findFreeSpot(rx, rz);
    // The fare grows with the distance (core/taxi.js).
    const from = game.mode === 'street' ? game.me.root.position : game.interior.front.door;
    const fare = taxiFare(from.x, from.z, fx, fz);
    if (!game.wallet.spend(fare, { k: 'ledger.taxi' })) { shop.toast(t('taxi.noCoins', { n: fare.toLocaleString() })); return; }
    refreshWallet();
    if (game.mode === 'store') leaveStore();
    if (game.riding) setRiding(false);
    clearGuide();
    const ry = Math.atan2(dest.x - fx, dest.z - fz); // face the destination
    const sayLine = ([ko, rom, key]) => {
      $('taxi-ko').textContent = ko;
      $('taxi-rom').textContent = rom;
      $('taxi-tr').textContent = getLanguage() === 'ko' ? '' : t(key);
    };
    $('taxi-dest').textContent = '📍 ' + t('taxi.to', { label: dest.label }) + ' · 🪙 ' + t('taxi.fare', { n: fare.toLocaleString() });
    $('taxi-skip').textContent = t('taxi.skip');
    $('taxi-ride').hidden = false;
    input.keys.clear();
    sayLine(TAXI_LINES[0]);
    let done = false;
    const arrive = () => {
      if (done) return;
      done = true;
      taxiTimers.forEach(clearTimeout);
      taxiTimers = [];
      $('taxi-ride').hidden = true;
      moveMeTo(scene, fx, fz, ry);
      if (dest.guide && Math.hypot(dest.x - fx, dest.z - fz) > 4) setGuide(dest.guide);
      showBubble(myLabel, $('labels'), '🚕');
      missionEvent('taxi');
    };
    taxiTimers = [
      setTimeout(() => sayLine(TAXI_LINES[1]), 1800),
      setTimeout(() => sayLine(TAXI_LINES[2]), 4200),
      setTimeout(arrive, 5600),
    ];
    $('taxi-skip').onclick = arrive;
  }
  $('map-btn').onclick = () => {
    const pos = game.mode === 'street' ? game.me.root.position : game.interior.front.door;
    mapView.show(pos.x, pos.z);
  };

  return { rideTaxi };
}
