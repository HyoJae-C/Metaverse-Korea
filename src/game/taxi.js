// Taxi: pick a place on the map (taxi mode) and ride there. A short scene
// from the back seat, the driver speaks Korean, then you're dropped off on
// the nearest street. The fare grows with the distance.
//
// Sharing (core/taxi-share.js): with people standing close by, you can ask
// them to come along. Up to four ride together to your pick and split the
// fare; someone short of money is treated by you, or left behind.
import { getLanguage, t } from '../core/i18n.js';
import { showBubble } from '../core/players.js';
import { noTaxiAt, noTaxiZones, taxiFare } from '../core/taxi.js';
import { ASK_MS, GO_WAIT_MS, SHARE_RADIUS, TaxiHost, newTrip, taxiMsg, worstShare } from '../core/taxi-share.js';
import { L, fmt } from '../ui/pocha-ui.js';
import { nextTip } from './tips.js';

export const SHARE_TEXT = {
  title: { en: '🚕 Share the taxi?', ko: '🚕 택시 같이 탈까요?', ja: '🚕 タクシーに相乗りする？', zh: '🚕 一起拼车吗？' },
  near: { en: 'Close by: {names}. Ask them to come along and split the fare (dutch pay, up to 4).', ko: '근처에 {names} 님이 있어요. 같이 타자고 하고 요금을 나눠 낼 수 있어요 (더치페이, 최대 4명).', ja: '近くに{names}さんがいます。誘って料金を割り勘にできます（最大4人）。', zh: '附近有{names}。可以邀请一起坐，平摊车费（AA，最多4人）。' },
  alone: { en: 'Go alone · 🪙 {n}', ko: '혼자 가기 · 🪙 {n}', ja: '一人で行く · 🪙 {n}', zh: '一个人去 · 🪙 {n}' },
  ask: { en: '👥 Ask them', ko: '👥 같이 타자고 하기', ja: '👥 誘う', zh: '👥 邀请他们' },
  waiting: { en: 'Asking… {s}s', ko: '물어보는 중… {s}초', ja: '返事待ち… {s}秒', zh: '等待回复… {s}秒' },
  rider: { en: '{name} is coming · 🪙 {n}', ko: '{name} 님 탑승 · 🪙 {n}', ja: '{name}さん乗車 · 🪙 {n}', zh: '{name}上车 · 🪙 {n}' },
  short: { en: '💸 {name} is short of money: you treat them', ko: '💸 {name} 님은 돈이 모자라요: 내가 내 줘요', ja: '💸 {name}さんはお金が足りません：おごります', zh: '💸 {name}钱不够：你请客' },
  leave: { en: 'Leave behind', ko: '두고 가기', ja: '置いていく', zh: '不带' },
  you: { en: 'You pay 🪙 {n} (total 🪙 {fare})', ko: '내가 낼 돈 🪙 {n} (전체 🪙 {fare})', ja: 'あなたの支払い 🪙 {n}（合計 🪙 {fare}）', zh: '你付 🪙 {n}（共 🪙 {fare}）' },
  go: { en: '🚕 Let\'s go', ko: '🚕 출발', ja: '🚕 出発', zh: '🚕 出发' },
  cancel: { en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消' },
  offer: { en: '{name} is taking a taxi to {place}. Come along? Dutch pay, about 🪙 {n} each.', ko: '{name} 님이 {place}(으)로 택시를 타요. 같이 갈래요? 더치페이로 한 사람당 약 🪙 {n}이에요.', ja: '{name}さんがタクシーで{place}へ。一緒に行く？割り勘で1人約 🪙 {n}。', zh: '{name}要打车去{place}。一起去吗？AA，每人约 🪙 {n}。' },
  offerShort: { en: 'You don\'t have enough for your share; {name} can treat you.', ko: '내 몫을 낼 돈이 모자라요. {name} 님이 내 줄 수도 있어요.', ja: '自分の分が足りません。{name}さんがおごってくれるかも。', zh: '你的钱不够付自己那份，{name}可能会请你。' },
  join: { en: 'Come along', ko: '같이 가기', ja: '一緒に行く', zh: '一起去' },
  no: { en: 'No thanks', ko: '괜찮아요', ja: '遠慮する', zh: '不了' },
  joined: { en: 'Waiting for {name} to leave…', ko: '{name} 님이 출발하기를 기다리는 중…', ja: '{name}さんの出発を待っています…', zh: '等{name}出发…' },
  dropped: { en: 'The taxi left without you.', ko: '택시가 먼저 떠났어요.', ja: 'タクシーは先に出ました。', zh: '出租车先走了。' },
  treated: { en: '{name} treated you to the taxi!', ko: '{name} 님이 택시비를 내 줬어요!', ja: '{name}さんがタクシー代をおごってくれました！', zh: '{name}请你坐了出租车！' },
  covered: { en: '{name} couldn\'t pay: you covered 🪙 {n}.', ko: '{name} 님이 돈이 모자라서 🪙 {n}을 대신 냈어요.', ja: '{name}さんが払えなかったので 🪙 {n} を立て替えました。', zh: '{name}付不起，你代付了 🪙 {n}。' },
  theirPick: { en: 'a place they picked', ko: '골라 둔 곳', ja: '選んだ場所', zh: '选好的地方' },
  paid: { en: 'you paid 🪙 {n}', ko: '내가 낸 돈 🪙 {n}', ja: 'あなたの支払い 🪙 {n}', zh: '你付了 🪙 {n}' },
  free: { en: '🎁 Free ride', ko: '🎁 무료 탑승', ja: '🎁 無料乗車', zh: '🎁 免费乘车', es: '🎁 Viaje gratis', id: '🎁 Gratis', ar: '🎁 رحلة مجانية', vi: '🎁 Đi miễn phí', hi: '🎁 मुफ़्त सवारी', fr: '🎁 Course gratuite', th: '🎁 นั่งฟรี' },
  closed: { en: '🚧 The zoo is opening soon: taxis can\'t go there yet.', ko: '🚧 동물원은 개장 준비 중이라 아직 택시로 갈 수 없어요.', ja: '🚧 動物園はオープン準備中なので、まだタクシーで行けません。', zh: '🚧 动物园即将开放，暂时不能打车过去。' },
  together: { en: '🚕 With {names}', ko: '🚕 {names} 님과 함께', ja: '🚕 {names}さんと一緒', zh: '🚕 和{names}一起' },
};
const st = (k, v) => fmt(L(SHARE_TEXT[k]), v);
const el = (tag, cls, text) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
};
const button = (cls, text, onclick) => { const b = el('button', cls, text); b.onclick = onclick; return b; };
const won = (n) => n.toLocaleString();

export function createTaxi(game) {
  const { $, clearGuide, findFreeSpot, input, leaveStore, mapView, missionEvent, moveMeTo, myLabel,
    refreshWallet, scene, setGuide, setRiding, shop } = game;
  const TAXI_LINES = [
    ['안녕하세요! 어디로 가세요?', 'annyeonghaseyo! eodiro gaseyo?', 'taxi.t1'],
    ['네, 출발할게요!', 'ne, chulbalhalgeyo!', 'taxi.t2'],
    ['도착했습니다. 안녕히 가세요!', 'dochakhaetseumnida. annyeonghi gaseyo!', 'taxi.t3'],
  ];
  let taxiTimers = [];
  let inCab = false; // on the back seat (the scene showing): you aren't standing anywhere
  // While the back-seat scene covers the screen the 3D street behind it is
  // drawn only 4 times a second (enough to get the drop-off ready), so the
  // scene's animation stays smooth on a phone.
  let cabDrawn = 0;
  const skipFrame = (now) => {
    if (!inCab) return false;
    if (now - cabDrawn < 250) return true;
    cabDrawn = now;
    return false;
  };
  const CAR_FREE = new Set(['footway', 'path', 'pedestrian', 'steps', 'cycleway', 'track', 'corridor']);
  // Closed-off places (the zoo before it opens) and a margin round them.
  let zones = null, zonesOf = null;
  const closedZones = () => {
    if (zonesOf !== game.map) { zonesOf = game.map; zones = noTaxiZones(game.map?.landmarks); }
    return zones;
  };
  const closedAt = (x, z) => noTaxiAt(closedZones(), x, z);
  function taxiDropOff(x, z) {
    let best = [x, z], bd = Infinity;
    const zs = closedZones();
    const consider = (px, pz) => {
      if (zs.length && noTaxiAt(zs, px, pz)) return;
      const d = (px - x) ** 2 + (pz - z) ** 2;
      if (d < bd) { bd = d; best = [px, pz]; }
    };
    for (const r of game.map.roads) {
      if (CAR_FREE.has(r.k)) continue;
      for (let i = 1; i < r.p.length; i++) {
        const [ax, az] = r.p[i - 1], [bx, bz] = r.p[i];
        const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz || 1;
        const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
        const px = ax + u * dx, pz = az + u * dz;
        // (in a closed area: try the road's ends instead)
        if (zs.length && noTaxiAt(zs, px, pz)) { consider(ax, az); consider(bx, bz); } else consider(px, pz);
      }
    }
    return best;
  }
  const panel = () => $('taxi-share-panel');
  const closePanel = () => { const p = panel(); if (p) { p.hidden = true; p.replaceChildren(); } };
  const send = (verb, to, trip, ...nums) => game.net?.sendEmote(taxiMsg(verb, to, trip, ...nums));

  // The ride itself: the back-seat scene, then out at (fx, fz) facing (tx, tz).
  function ride({ fx, fz, tx, tz, label, guide, fare, paid = fare, mates, free = false, onArrive }) {
    if (game.mode === 'store') leaveStore();
    if (game.riding) setRiding(false);
    clearGuide();
    closePanel();
    const ry = Math.atan2(tx - fx, tz - fz); // face the destination
    const sayLine = ([ko, rom, key]) => {
      $('taxi-ko').textContent = ko;
      $('taxi-rom').textContent = rom;
      $('taxi-tr').textContent = getLanguage() === 'ko' ? '' : t(key);
    };
    $('taxi-dest').textContent = '📍 ' + t('taxi.to', { label }) + ' · ' + (free ? st('free') : t('taxi.fare', { n: won(fare) })) + (paid !== fare ? ' (' + st('paid', { n: won(paid) }) + ')' : '') + (mates?.length ? ' · ' + st('together', { names: mates.join(', ') }) : '');
    $('taxi-tip').textContent = nextTip(); // (no skip: the ride is when the drop-off gets ready)
    $('taxi-ride').hidden = false;
    input.keys.clear();
    sayLine(TAXI_LINES[0]);
    let done = false;
    inCab = true;
    // Out at the drop-off already, behind the back-seat scene (it covers the
    // whole screen): what is far from the old spot goes, the new place's
    // buildings, signs and shaders get ready while the driver talks, instead
    // of one long freeze when the doors open.
    moveMeTo(scene, fx, fz, ry);
    cabDrawn = 0;
    const arrive = () => {
      if (done) return;
      done = true;
      inCab = false;
      taxiTimers.forEach(clearTimeout);
      taxiTimers = [];
      $('taxi-ride').hidden = true;
      if (guide && Math.hypot(tx - fx, tz - fz) > 4) setGuide(guide);
      showBubble(myLabel, $('labels'), '🚕');
      missionEvent('taxi');
      onArrive?.();
    };
    taxiTimers = [
      setTimeout(() => sayLine(TAXI_LINES[1]), 1800),
      setTimeout(() => sayLine(TAXI_LINES[2]), 4200),
      setTimeout(arrive, 5600),
    ];
  }

  // ---- The host: pick a place, maybe ask the people close by.
  let host = null; // { h: TaxiHost, dest, fx, fz, timer, until }
  function rideTaxi(dest) {
    if (closedAt(dest.x, dest.z)) { shop.toast(st('closed')); return; }
    // Drop-off: the nearest point on a road a car can use, on free ground.
    const [rx, rz] = taxiDropOff(dest.x, dest.z);
    const [fx, fz] = findFreeSpot(rx, rz);
    // The fare grows with the distance (core/taxi.js).
    const from = game.place ? game.place() : game.mode === 'street' ? game.me.root.position : game.interior.front.door; // (place: a Han River park's lawn is outdoors, where you stand)
    const fare = taxiFare(from.x, from.z, fx, fz);
    const near = (game.outdoors ? game.outdoors() : game.mode === 'street') && !guest ? (game.others?.nearbyFree(from.x, from.z, SHARE_RADIUS) || []).filter((p) => !game.safety?.isBlocked(p.id, p.name)) : [];
    if (!near.length) { goAlone(dest, fx, fz, fare); return; }
    const p = panel();
    p.replaceChildren(button('sheet-x', '✕', closePanel), el('h3', null, st('title')),
      el('p', 'order-hint', st('near', { names: near.slice(0, 3).map((x) => x.name).join(', ') })));
    const actions = el('div', 'order-actions');
    actions.append(button('chip', st('alone', { n: won(fare) }), () => { closePanel(); goAlone(dest, fx, fz, fare); }),
      button('primary', st('ask'), () => askNear(dest, fx, fz, fare, near)));
    p.append(actions);
    p.hidden = false;
  }
  function goAlone(dest, fx, fz, fare) {
    if (!game.wallet.spend(fare, { k: 'ledger.taxi' })) { shop.toast(t('taxi.noCoins', { n: won(fare) })); return; }
    refreshWallet();
    ride({ fx, fz, tx: dest.x, tz: dest.z, label: dest.label, guide: dest.guide, fare });
  }
  function askNear(dest, fx, fz, fare, near) {
    const h = new TaxiHost(newTrip(), fare, near);
    for (const id of h.asked.keys()) send('ask', id, h.trip, fare, fx, fz);
    host = { h, dest, fx, fz, until: Date.now() + ASK_MS };
    // Everyone answered, or time is up: off we go, unless someone is short of
    // money (then the host decides: treat them or leave them behind).
    host.timer = setInterval(() => {
      if (!host) return;
      if (Date.now() < host.until) { drawHost(); return; }
      if (host.h.plan().guests.some((g) => !g.pays)) { clearInterval(host.timer); host.until = 0; drawHost(); } else leaveNow();
    }, 500);
    drawHost();
  }
  function drawHost() {
    if (!host) return;
    const { h } = host;
    const plan = h.plan();
    const p = panel();
    p.replaceChildren(el('h3', null, st('title')));
    if (!h.settled && host.until) p.append(el('p', 'order-hint', st('waiting', { s: Math.max(0, Math.ceil((host.until - Date.now()) / 1000)) })));
    for (const g of plan.guests) {
      const row = el('p', 'order-hint', g.pays ? st('rider', { name: g.name, n: won(g.pays) }) : st('short', { name: g.name }));
      row.append(' ', button('chip', st('leave'), () => { h.leaveBehind(g.id); send('drop', g.id, h.trip); drawHost(); }));
      p.append(row);
    }
    p.append(el('p', 'order-hint', st('you', { n: won(plan.host), fare: won(h.fare) })));
    const actions = el('div', 'order-actions');
    actions.append(button('chip', st('cancel'), cancelHost), button('primary', st('go'), leaveNow));
    p.append(actions);
    p.hidden = false;
  }
  function stopHost() { if (host) clearInterval(host.timer); const h = host; host = null; return h; }
  function cancelHost() {
    const was = stopHost();
    if (was) for (const id of was.h.riders.keys()) send('drop', id, was.h.trip);
    closePanel();
  }
  function leaveNow() {
    const was = host;
    if (!was) return;
    const { h, dest, fx, fz } = was;
    const plan = h.plan();
    if (!game.wallet.spend(plan.host, { k: 'ledger.taxi' })) { shop.toast(t('taxi.noCoins', { n: won(plan.host) })); return; }
    stopHost();
    refreshWallet();
    for (const id of h.asked.keys()) if (!h.riders.has(id)) send('drop', id, h.trip);
    for (const g of plan.guests) send('go', g.id, h.trip, g.pays);
    was.paidFor = new Map(plan.guests.map((g) => [g.id, g])); // a 'short' answer later is covered
    lastRide = was;
    ride({ fx, fz, tx: dest.x, tz: dest.z, label: dest.label, guide: dest.guide, fare: h.fare, paid: plan.host, mates: plan.guests.map((g) => g.name) });
  }
  let lastRide = null; // the host's last shared ride, for late 'short' answers

  // ---- A guest: asked by someone close by.
  let guest = null; // { from, name, trip, fare, x, z, joined, timer }
  function drawOffer() {
    if (!guest) return;
    const p = panel();
    const each = worstShare(guest.fare);
    const place = guestPlace(guest.x, guest.z, guest.name);
    p.replaceChildren(el('h3', null, st('title')), el('p', 'order-hint', st('offer', { name: guest.name, place, n: won(each) })));
    if (game.wallet.coins < each) p.append(el('p', 'order-hint', st('offerShort', { name: guest.name })));
    if (guest.joined) {
      p.append(el('p', 'order-hint', st('joined', { name: guest.name })));
      const actions = el('div', 'order-actions');
      actions.append(button('chip', st('cancel'), () => { send('bye', guest.from, guest.trip); endGuest(); }));
      p.append(actions);
    } else {
      const actions = el('div', 'order-actions');
      actions.append(button('chip', st('no'), () => { send('no', guest.from, guest.trip); endGuest(); }),
        button('primary', st('join'), () => {
          if (!guest || game.mode !== 'street') return;
          guest.joined = true;
          send('join', guest.from, guest.trip, game.wallet.coins >= worstShare(guest.fare) ? 1 : 0);
          clearTimeout(guest.timer);
          guest.timer = setTimeout(() => { if (guest) { shop.toast(st('dropped')); endGuest(); } }, GO_WAIT_MS);
          drawOffer();
        }));
      p.append(actions);
    }
    p.hidden = false;
  }
  // The name of a place on the map near (x, z), else "the spot they picked".
  function guestPlace(x, z, name) {
    let place = null;
    try { place = game.placeName?.(x, z); } catch { /* no map yet */ }
    return place || st('theirPick', { name });
  }
  function endGuest() { if (guest) clearTimeout(guest.timer); guest = null; closePanel(); }

  // A taxi message for me (main.js checks it is addressed to me and not
  // from someone blocked). Returns true when something should be shown.
  function onMsg(from, name, m) {
    if (m.verb === 'ask') {
      if (host || guest || game.mode !== 'street' || game.riding || $('taxi-ride').hidden === false) { send('no', from, m.trip); return false; }
      guest = { from, name, trip: m.trip, fare: m.a, x: m.b, z: m.c, joined: false };
      guest.timer = setTimeout(() => { if (guest && !guest.joined) { send('no', from, m.trip); endGuest(); } }, ASK_MS);
      drawOffer();
      return true;
    }
    if (guest && guest.from === from && guest.trip === m.trip) {
      if (m.verb === 'drop') { shop.toast(st('dropped')); endGuest(); return true; }
      if (m.verb === 'go' && guest.joined) {
        const g = guest;
        endGuest();
        let pays = Math.max(0, m.a | 0);
        if (pays && !game.wallet.spend(pays, { k: 'ledger.taxi' })) { send('short', from, g.trip, pays); pays = 0; }
        if (!pays) shop.toast(st('treated', { name }));
        refreshWallet();
        const [rx, rz] = taxiDropOff(g.x, g.z);
        const [fx, fz] = findFreeSpot(rx, rz);
        ride({ fx, fz, tx: g.x, tz: g.z, label: guestPlace(g.x, g.z, name), fare: g.fare, paid: pays, mates: [name] });
        return true;
      }
      return false;
    }
    if (host && host.h.trip === m.trip) {
      if (host.h.heard(from, m)) { if (host.h.settled) host.until = Math.min(host.until, Date.now() + 1500); drawHost(); }
      return false;
    }
    if (m.verb === 'short' && lastRide?.h.trip === m.trip && lastRide.paidFor?.get(from)?.pays === m.a) {
      lastRide.paidFor.delete(from);
      const n = game.wallet.take(m.a, { k: 'ledger.taxi' });
      refreshWallet();
      if (n) shop.toast(st('covered', { name, n: won(n) }));
      return true;
    }
    return false;
  }
  // Someone left the room: forget them.
  function onLeave(id) {
    if (guest?.from === id) { if (!guest.joined) shop.toast(st('dropped')); endGuest(); }
    if (host && host.h.heard(id, { verb: 'bye', trip: host.h.trip })) drawHost();
  }

  $('map-btn').onclick = () => {
    const pos = game.place ? game.place() : game.mode === 'street' ? game.me.root.position : game.interior.front.door;
    mapView.show(pos.x, pos.z);
  };

  // A ride someone else pays for (the new player's first taxi): no fare, no sharing.
  function rideFree(dest, onArrive) {
    const [rx, rz] = taxiDropOff(dest.x, dest.z);
    const [fx, fz] = findFreeSpot(rx, rz);
    ride({ fx, fz, tx: dest.x, tz: dest.z, label: dest.label, fare: 0, free: true, onArrive });
  }
  return { rideTaxi, rideFree, onMsg, onLeave, closedAt, inCab: () => inCab, skipFrame };
}
