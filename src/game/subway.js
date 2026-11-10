// Subway: station halls, ticket gates and riding the train between stations.
//
// Moved out of main.js. The game's live state (the player, the shop you're
// in, the wallet…) comes in through `game`, whose getters are read only when
// needed.
import { localName, getLanguage, t } from '../core/i18n.js';
import {
  GATE_X, TRACKS as METRO_TRACKS, DOOR_Z, STOP_SECONDS, FARE, lineAhead, stopsBetween,
  streetStairs, hallStairsAt, outsideOf, ENTER_AT, HALL_EXIT_AT, stationAt, createReentry,
} from '../core/subway.js';
import { L, fmt } from '../ui/pocha-ui.js';

const $ = (id) => document.getElementById(id);

/**
 * stations: the region's subway stations that have exits.
 * game: { interior, scene, cam, me, mode, riding, seated, wallet, shop, sfx }
 * (optional) game.streetY(p, px0, pz0): the ground height on the street
 * as getters, plus enterStore, leaveStore, moveMeTo, findFreeSpot, goSolo and
 * clearAction(). (optional) game.onArrive(k): after riding to station k.
 */
export function createSubway(stations, game) {
  // Walk down an exit's stairs to arrive in the station hall (a room like a
  // shop); walk up any exit's stairs there to come out at that exit.
  const STATION_SUFFIX = { ko: '역', en: ' Station', ja: '駅', zh: '站' };
  const stationStores = stations.map((sub) => ({
    id: 'subway-' + (sub.id || sub.name?.en || 'station'), category: 'station', size: 'station', subway: sub, products: [],
    name: Object.fromEntries(Object.entries(sub.name || {}).map(([k, v]) => [k, v + (STATION_SUFFIX[k] ?? '')])),
    tagline: sub.line?.name || {},
    colors: { sign: sub.line?.color || '#f5a200', accent: '#e6e8ec', awning: sub.line?.color || '#f5a200' },
  }));
  // The trains run round all the stations in list order: up = forward, down = back.
  for (const [i, st] of stationStores.entries()) {
    const n = stationStores.length, nm = (k) => ({ ko: stations[k].name?.ko || '', en: stations[k].name?.en || '' });
    st.towards = n > 1 ? { up: nm((i + 1) % n), down: nm((i - 1 + n) % n) } : null;
    // The route map on the pillar inside the gates: every station on the loop.
    st.loop = { stops: stations.map((x) => ({ name: x.name || {}, at: stationAt(x) })), index: i };
  }
  const TRAIN_STORE = {
    id: 'subway-train', category: 'train', size: 'train', products: [], line: '#5d6470',
    name: { en: 'Subway train', ko: '지하철', ja: '地下鉄', zh: '地铁' },
    tagline: { en: 'Choose where to get off', ko: '내릴 역을 고르세요', ja: '降りる駅を選んでください', zh: '请选择下车站' },
    colors: { sign: '#5d6470', accent: '#d6dae0', awning: '#5d6470' },
  };
  // A shop-like "front" for each exit: leaving the hall puts you just outside its mouth.
  function exitFront(s, i) {
    const out = outsideOf(stations[s].exits[i], 0.4); // leaveStore steps another 1.2 m out
    return { store: stationStores[s], door: { x: out.x, z: out.z }, group: { rotation: { y: out.ry } }, subwayExit: [s, i] };
  }
  let subwayCool = 0; // a moment after arriving, so you don't bounce straight back
  function enterStation(s, i) {
    game.enterStore(exitFront(s, i));
    const st = game.interior.subway.stairs[i];
    game.moveMeTo(game.interior.scene, st.arrive.x, st.arrive.z, st.arrive.ry);
    flashFade();
    subwayCool = 0.6;
  }
  function leaveStation(i) {
    const s = stationStores.indexOf(game.interior.store);
    game.interior.front = exitFront(s, i);
    game.leaveStore();
    // Face away from the stairs (the camera keeps its angle to you).
    const out = outsideOf(stations[s].exits[i]);
    const [x, z] = game.findFreeSpot(out.x, out.z);
    game.moveMeTo(game.scene, x, z, out.ry);
    flashFade();
    subwayCool = 0.6;
  }
  function flashFade() {
    const el = $('fade');
    if (!el) return;
    el.classList.remove('go');
    void el.offsetWidth; // restart the animation
    el.classList.add('go');
  }
  // Ticket gates: pay the fare to go through to the platform; going out is free.
  const GATE_TEXT = {
    in: { en: 'Pay and go in', ko: '내고 들어가기', ja: '払って入る', zh: '付费进站' },
    out: { en: 'Go out', ko: '나가기', ja: '出る', zh: '出站' },
    poor: { en: 'Not enough money for the fare (🪙 {n})', ko: '요금 🪙 {n}이 부족해요', ja: '運賃 🪙 {n} が足りません', zh: '车费 🪙 {n} 不够' },
    paid: { en: 'Fare paid', ko: '요금을 냈어요', ja: '運賃を払いました', zh: '已付车费' },
  };
  // Out by mistake? Back in at the same station within 5 minutes is free (once per fare).
  const reentry = createReentry();
  /** Seconds left to come back in here for free (0: pay the fare). */
  const gateFree = () => Math.ceil(reentry.left(stationIndex(), Date.now()) / 1000);
  function passGate(g, paying) {
    const here = stationIndex(), now = Date.now();
    if (paying && reentry.in(here, now, true)) {
      game.shop.toast('🎫 ' + t('gate.freeIn'));
    } else if (paying) {
      if (!game.wallet.spend(FARE, { name: { en: 'Subway fare', ko: '지하철 요금', ja: '地下鉄運賃', zh: '地铁车费' }, at: game.interior.store.name })) { game.shop.toast(fmt(L(GATE_TEXT.poor), { n: FARE })); return; }
      reentry.in(here, now);
      game.shop.toast(`🎫 ${L(GATE_TEXT.paid)} · -🪙 ${FARE}`);
    } else if (reentry.out(here, now)) {
      game.shop.toast('🎫 ' + t('gate.outPass'));
    }
    game.sfx.pop?.();
    game.moveMeTo(game.interior.scene, GATE_X + (paying ? 1.3 : -1.3), g.lane, paying ? Math.PI / 2 : -Math.PI / 2, game.cam.yaw);
    game.clearAction();
  }

  // Riding the train
  // A train comes every 10 s on each platform side and keeps its doors open for
  // 5 s: walk in (or tap Board) while they're open. Inside, pick a station; the
  // train runs one stop per STOP_SECONDS and you step out on that station's platform.
  const METRO_TEXT = {
    board: { en: 'Board', ko: '타기', ja: '乗る', zh: '上车' },
    up: { en: 'Up', ko: '상행', ja: '上り', zh: '上行' },
    down: { en: 'Down', ko: '하행', ja: '下り', zh: '下行' },
    pick: { en: 'Where do you get off?', ko: '어디서 내릴까요?', ja: 'どこで降りますか？', zh: '在哪里下车？' },
    stops: { en: '{n} stop(s)', ko: '{n}정거장', ja: '{n}駅', zh: '{n}站' },
    leaving: { en: 'Doors close in {n}s', ko: '{n}초 뒤 문이 닫혀요', ja: 'あと{n}秒でドアが閉まります', zh: '{n}秒后关门' },
    moving: { en: 'Next: {name}', ko: '다음 역: {name}', ja: '次は {name}', zh: '下一站：{name}' },
    getOff: { en: 'Get off here', ko: '여기서 내리기', ja: 'ここで降りる', zh: '在这里下车' },
    arriving: { en: 'Arriving at {name}', ko: '곧 {name}에 도착해요', ja: 'まもなく {name}', zh: '即将到达 {name}' },
    choose: { en: 'Pick a station first', ko: '먼저 내릴 역을 골라 주세요', ja: '先に降りる駅を選んでください', zh: '请先选择下车站' },
  };
  let metro = null; // { from, t, dir, leaveAt, dest, arriveAt, chimed }
  const CHIME_LEAD = 2; // seconds before arrival
  const stationIndex = () => stationStores.indexOf(game.interior?.store);
  const stationName = (k) => localName(stationStores[k].name, getLanguage());
  function boardTrain(t, left) {
    const from = stationIndex();
    if (from < 0 || stationStores.length < 2) return;
    const dir = METRO_TRACKS[t].dir;
    metro = { from, t, dir, leaveAt: Date.now() + left * 1000, dest: null, arriveAt: 0 };
    const front = exitFront(from, 0);
    game.enterStore({ ...front, store: TRAIN_STORE });
    game.interior.front = front; // the map shows you at the station you left
    game.goSolo(game.interior.scene); // a short ride: just you in the car
    game.moveMeTo(game.interior.scene, 0, 0, dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    flashFade();
    game.sfx.pop?.();
    renderMetro();
    $('train-panel').hidden = false;
  }
  function renderMetro() {
    if (!metro) return;
    const n = stationStores.length;
    $('train-title').textContent = `🚇 ${L(metro.dir > 0 ? METRO_TEXT.up : METRO_TEXT.down)} · ${L(METRO_TEXT.pick)}`;
    $('train-options').replaceChildren(...lineAhead(metro.from, metro.dir, n).map((k) => {
      const b = document.createElement('button');
      b.className = metro.dest === k ? 'primary' : 'chip';
      b.textContent = `${stationName(k)} · ${fmt(L(METRO_TEXT.stops), { n: stopsBetween(metro.from, k, metro.dir, n) })}`;
      b.onclick = () => pickStop(k);
      return b;
    }));
    $('train-off').hidden = Date.now() >= metro.leaveAt;
    $('train-off').textContent = '🚪 ' + L(METRO_TEXT.getOff);
  }
  $('train-off').onclick = () => metroGetOff();
  function pickStop(k) {
    if (!metro || metro.arriveAt && Date.now() > metro.arriveAt - 500) return;
    metro.dest = k;
    metro.chimed = false;
    const stops = stopsBetween(metro.from, k, metro.dir, stationStores.length);
    metro.arriveAt = Math.max(Date.now(), metro.leaveAt) + stops * STOP_SECONDS * 1000;
    renderMetro();
  }
  // Off before the doors close: back onto the platform you boarded from.
  function metroGetOff() {
    if (!metro) return;
    if (Date.now() >= metro.leaveAt) { game.shop.toast(L(METRO_TEXT.choose)); return; }
    const { from, t } = metro;
    endMetro();
    arriveOnPlatform(from, t);
  }
  function endMetro() {
    metro = null;
    $('train-panel').hidden = true;
  }
  function arriveOnPlatform(k, t) {
    game.enterStore(exitFront(k, 0));
    const tr = METRO_TRACKS[t], s = Math.sign(tr.doorZ);
    game.moveMeTo(game.interior.scene, 8.5 + (Math.random() - 0.5) * 6, tr.doorZ - s * 1.4, s > 0 ? Math.PI : 0);
    flashFade();
    game.sfx.doorOpen();
    subwayCool = 0.8;
  }
  // Platform sounds: the arrival chime anywhere in the hall; doors and the
  // departure signal only on the platform side of the gates.
  function onPlatformSound(kind) {
    if (kind !== 'arrive' && game.me.root.position.x < GATE_X) return;
    ({ arrive: () => game.sfx.arrivalChime(), open: () => game.sfx.doorOpen(), closing: () => game.sfx.doorClose(), depart: () => game.sfx.depart() })[kind]?.();
  }
  function updateMetro(p) {
    if (!metro || !game.interior?.train) return;
    const now = Date.now();
    const moving = now >= metro.leaveAt;
    game.interior.train.setMoving(moving);
    if (!metro.warned && now >= metro.leaveAt - 1600) { metro.warned = true; game.sfx.doorClose(); }
    if (!metro.departed && moving) { metro.departed = true; game.sfx.depart(); }
    let led;
    if (!moving) led = `${L(metro.dir > 0 ? METRO_TEXT.up : METRO_TEXT.down)} · ${fmt(L(METRO_TEXT.leaving), { n: Math.ceil((metro.leaveAt - now) / 1000) })}`;
    else if (metro.dest != null) {
      // Chime and "arriving" a couple of seconds before the doors open there.
      const soon = now >= metro.arriveAt - CHIME_LEAD * 1000;
      if (soon && !metro.chimed) { metro.chimed = true; game.sfx.arrivalChime(); }
      led = fmt(L(soon ? METRO_TEXT.arriving : METRO_TEXT.moving), { name: stationName(metro.dest) });
    }
    else led = L(METRO_TEXT.pick);
    if (led !== metro.led) {
      metro.led = led;
      game.interior.train.setLed(led);
      $('train-status').textContent = led;
      renderMetro();
    }
    if (metro.dest != null && now >= metro.arriveAt) {
      const { dest, t } = metro;
      endMetro();
      arriveOnPlatform(dest, t);
      game.onArrive?.(dest); // rode to another station
    }
    void p;
  }

  // Called every frame after moving: follow the steps up or down.
  function updateSubway(dt, p, px0, pz0) {
    // On the street the ground can be lower than 0 (down by a stream).
    const baseY = game.mode === 'street' ? (game.streetY?.(p, px0, pz0) ?? 0) : 0;
    if (!stations.length) { if (game.mode === 'street') p.y = baseY; return; }
    subwayCool = Math.max(0, subwayCool - dt);
    if (game.mode === 'street') {
      let s = null, si = -1;
      for (let k = 0; k < stations.length && !s; k++) { s = streetStairs(stations[k], p.x, p.z); si = k; }
      if (s && game.riding) { p.x = px0; p.z = pz0; p.y = 0; return; } // no bikes or cars down the stairs
      p.y = s ? s.y : baseY;
      if (s && s.frac >= ENTER_AT && !subwayCool && !game.seated) enterStation(si, s.i);
    } else if (game.interior?.subway) {
      game.interior.subway.onSound = onPlatformSound;
      const s = hallStairsAt(game.interior.subway.stairs, p.x, p.z);
      p.y = s ? s.y : 0;
      if (s && s.frac >= HALL_EXIT_AT && !subwayCool) leaveStation(s.i);
      // Walk into an open train door to board.
      if (p.x > GATE_X + 0.5 && Math.abs(p.z) >= DOOR_Z - 0.6 && !subwayCool) {
        const t = p.z >= 0 ? 0 : 1, left = game.interior.subway.doorsOpen(t);
        if (left) boardTrain(t, left);
      }
    } else if (game.interior?.train) updateMetro(p);
  }

  return {
    stationStores, GATE_TEXT, METRO_TEXT,
    get metro() { return metro; },
    stationIndex, boardTrain, pickStop, metroGetOff, endMetro, passGate, gateFree, updateSubway,
  };
}
