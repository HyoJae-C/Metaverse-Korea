// --- The folk games yard in Namsangol Hanok Village (Jung-gu): yutnori,
// tuho, jegichagi and neolttwigi on the yard inside the hanok wall (the
// "folkyard" landmark; layout and locals in data/folk-yard.js, games in
// core/*-game.js and ui/*-ui.js, see docs/FOLK-GAMES.md).
//
// The locals are already there when you walk in: Grandma, Minjun and
// Seoyeon sit round the yut mat waiting for a fourth, Grandpa Kim keeps the
// tuho jar, a boy kicks a jegi by the stool and Suni waits on the seesaw.
//
// Yutnori with people: whoever opens the mat can invite the people standing
// round it (core/yut-net.js); the invited get a card here, and their panel
// waits for the host's start. Seats nobody takes stay with the locals.
import { FOLK_GAMES, makeJegi, setNeolTilt } from '../core/folk-props.js';
import { FOLK_YARD, FOLK_GAMES_ON, propToWorld } from '../data/folk-yard.js';
import { folkLabel as FL, lineText } from '../ui/folk-labels.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { TUHO_GAME } from '../core/tuho-game.js';
import { JEGI_GAME } from '../core/jegi-game.js';
import { NEOL_GAME } from '../core/neol-game.js';
import { makeNpc, say } from '../core/npcs.js';
import { t } from '../core/i18n.js';
import { parseYut, yutReply } from '../core/yut-net.js';

const NEAR = 60; // metres: closer than this, the locals are drawn
const YUT_PAID_KEY = 'mk.folk.yutPaid';
const YUT_NEAR = 9; // metres from the mat: close enough to be asked to a game, and to stay in one
const ASK_MS = 28000; // the invite card (a little under the host's 30 s wait, ui/yut-ui.js)
const ASK_CSS = 'position:fixed;left:50%;bottom:150px;transform:translateX(-50%);z-index:56;background:rgba(255,255,255,.96);border-radius:16px;padding:12px 14px;box-shadow:0 6px 24px rgba(0,0,0,.2);font:600 15px system-ui,sans-serif;color:#2b2230;display:flex;flex-direction:column;gap:8px;max-width:calc(100vw - 32px)';
const ASK_BTN = 'border:0;border-radius:12px;padding:10px 14px;font:600 15px system-ui,sans-serif;color:#2b2230;cursor:pointer';
const LOOKS = {
  elder: { model: 'basic', tee: null, hair: 'ash', dye: 'silver', pants: 'charcoal', shirt: 'cream', hairStyle: 'bun' },
  young: { model: 'basic', tee: null },
  teacher: { model: 'hanbok-durumagi-gray', skirt: null, tee: null, hair: 'ash', dye: 'silver', hairStyle: 'short' },
  kid: { model: 'hanbok-baji-jade', skirt: null, tee: null, hair: 'black', dye: 'black', hairStyle: 'short' },
  hanbok: { model: 'hanbok-pink', skirt: 'chima-red', tee: null, hair: 'black', dye: 'black', hairStyle: 'bun' },
};
const NAMES = {
  grandma: () => '👵 ' + FL('yut.grandma'),
  minjun: () => 'Minjun',
  seoyeon: () => 'Seoyeon',
  teacher: () => '👴 ' + FL('teacher'),
  kid: () => '',
  suni: () => FL('neol.partner'),
};

export function createFolkYard(game) {
  const { $, scene, shop, wallet, randomLook, dayKey } = game;
  const lm = FOLK_GAMES_ON ? game.map.landmarks.find((l) => l.type === 'folkyard') || null : null; // (hidden for now: see data/folk-yard.js)
  const uis = {};
  if (!lm) return { uis, act: () => null, tick() {}, hideLabels() {}, relabel() {}, closeAll() {}, onMsg: () => false, peerGone() {}, get open() { return false; } };

  // The props.
  const props = {};
  for (const g of FOLK_GAMES) {
    const o = g.build();
    const [x, z] = propToWorld(lm, g.id, [0, 0]);
    o.position.set(x, 0, z);
    o.rotation.y = FOLK_YARD.ry;
    o.traverse((m) => { if (m.isMesh) m.receiveShadow = true; });
    scene.add(o);
    props[g.id] = o;
  }
  setNeolTilt(props.neol, 1); // Suni's end down, waiting for someone on the other
  const stands = Object.fromEntries(FOLK_GAMES.map((g) => [g.id, { at: propToWorld(lm, g.id, g.stand), r: g.radius }]));

  // The locals.
  const layer = $('labels');
  const people = {};
  for (const w of FOLK_YARD.people) {
    const look = LOOKS[w.look];
    const o = makeNpc(layer, NAMES[w.id](), { ...randomLook(), ...look });
    if (!o.tag.textContent) o.tag.style.visibility = 'hidden';
    const [x, z] = propToWorld(lm, w.game, w.at);
    const [cx, cz] = propToWorld(lm, w.game, [0, 0]);
    // Face the game: the mat's centre, the jar, the jegi, along the board.
    const ry = w.on ? FOLK_YARD.ry - Math.PI / 2 : Math.atan2(cx - x, cz - z);
    o.ch.root.position.set(x, w.sit ? 0.08 : w.on ? 0.07 : 0, z);
    o.ch.root.rotation.y = ry;
    if (w.sit) o.ch.activity('matsit');
    if (w.look === 'kid') o.ch.root.scale.setScalar(0.8);
    o.home = { x, z, ry };
    o.id = w.id;
    o.sit = !!w.sit;
    scene.add(o.ch.root);
    people[w.id] = o;
  }
  // The boy's jegi, bouncing off his foot.
  const jegi = makeJegi();
  jegi.scale.setScalar(2.2);
  scene.add(jegi);
  const kid = people.kid;
  const jegiAt = kid ? [kid.home.x + Math.sin(kid.home.ry) * 0.35, kid.home.z + Math.cos(kid.home.ry) * 0.35] : [0, 0];

  const speak = (game) => (line) => { const o = people[FOLK_YARD.speaker[game]]; if (o) { o.talkT = 4; say(o, layer, line); } };
  const payMedal = (id) => (medal, coins) => {
    if (coins) {
      wallet.add(coins, undefined, { r: 'medal', once: 'medal:' + id + ':' + medal });
      game.refreshWallet?.();
      shop.toast(t('grill.medalToast', { coins }));
    }
    game.me.play(medal ? 'cheer' : 'wave');
  };
  // A yutnori win pays a few times a day; the rest are for fun.
  function yutWin() {
    const day = dayKey();
    let paid = { d: day, n: 0 };
    try { const s = JSON.parse(localStorage.getItem(YUT_PAID_KEY) || 'null'); if (s && s.d === day) paid = s; } catch { /* storage blocked */ }
    game.me.play('cheer');
    if (paid.n >= FOLK_YARD.yutWinsPerDay) return 0;
    paid.n += 1;
    try { localStorage.setItem(YUT_PAID_KEY, JSON.stringify(paid)); } catch { /* storage blocked */ }
    wallet.add(FOLK_YARD.yutWin, undefined, { r: 'medal', once: 'yut:' + day + ':' + paid.n });
    game.refreshWallet?.();
    return FOLK_YARD.yutWin;
  }
  const onClose = () => { game.action = game.STALE; };
  // The game panels (and their text, folk-text.js) are downloaded the first
  // time one is opened (core/lazy-panel.js).
  // People round the mat (to ask to a game of yutnori), not counting anyone I blocked.
  const matAt = () => propToWorld(lm, 'yut', [0, 0]);
  const nearMat = (x, z) => { const [mx, mz] = matAt(); return Math.hypot(x - mx, z - mz) < YUT_NEAR; };
  const yutNet = {
    myId: game.myId,
    nameOf: (id) => game.others?.nameOf(id),
    nearby: () => { const [mx, mz] = matAt(); return (game.others?.nearbyFree(mx, mz, YUT_NEAR, { seated: true }) || []).filter((p) => !game.safety?.isBlocked(p.id, p.name)); },
    send: (msg) => game.net?.sendEmote(msg),
  };
  uis.yut = lazyPanel(() => import('../ui/yut-ui.js').then(({ YutUI }) => new YutUI({ root: $('yut-panel'), onSay: speak('yut'), onWin: yutWin, onClose, net: yutNet })), { busy: false });
  uis.tuho = lazyPanel(() => import('../ui/tuho-ui.js').then(({ TuhoUI }) => new TuhoUI({ root: $('tuho-panel'), onSay: speak('tuho'), onMedal: payMedal(TUHO_GAME), onClose })));
  uis.jegi = lazyPanel(() => import('../ui/jegi-ui.js').then(({ JegiUI }) => new JegiUI({ root: $('jegi-panel'), onSay: speak('jegi'), onMedal: payMedal(JEGI_GAME), onClose })));
  uis.neol = lazyPanel(() => import('../ui/neol-ui.js').then(({ NeolUI }) => new NeolUI({ root: $('neol-panel'), onSay: speak('neol'), onMedal: payMedal(NEOL_GAME), onClose })));
  const openUi = () => Object.values(uis).find((u) => u.open) || null;
  function closeAll() { for (const u of Object.values(uis)) if (u.open) u.close(); }

  function nearGame(p) {
    for (const g of FOLK_GAMES) {
      const s = stands[g.id];
      if (Math.hypot(p.x - s.at[0], p.z - s.at[1]) < s.r) return g;
    }
    return null;
  }
  // The action button by a game.
  function act(p) {
    if (game.mode !== 'street' || openUi()) return null;
    const g = nearGame(p);
    if (!g) return null;
    return { key: 'folk:' + g.id, label: g.icon + ' ' + FL(g.id + '.open'), run: () => {
      closeAll();
      const o = people[FOLK_YARD.speaker[g.id]];
      if (o && !o.sit) o.ch.play('wave');
      uis[g.id].show();
    } };
  }

  const [bx0, bz0, bx1, bz1] = FOLK_YARD.box;
  let wasIn = null, sayT = 0;
  // Each frame on the street.
  function tick(dt, p, camera, w, h, placeLabels) {
    const dx = p.x - lm.x, dz = p.z - lm.z;
    const inside = dx > bx0 && dx < bx1 && dz > bz0 && dz < bz1;
    if (inside && wasIn === false && game.mode === 'street') shop.toast('🎎 ' + FL('courtyard'));
    wasIn = inside;
    // Walked away from the game you were playing.
    const u = openUi();
    if (u) {
      const id = Object.keys(uis).find((k) => uis[k] === u);
      const s = stands[id];
      // (a game of yutnori with people: anywhere round the mat will do)
      const away = id === 'yut' && u.busy ? !nearMat(p.x, p.z) : Math.hypot(p.x - s.at[0], p.z - s.at[1]) > s.r + 3;
      if (game.mode !== 'street' || away) u.close();
    }
    const near = Math.hypot(dx, dz) < NEAR;
    jegi.visible = near;
    if (!near) { hideLabels(); for (const o of Object.values(people)) o.ch.root.visible = false; return; }
    const tt = performance.now() / 1000;
    for (const o of Object.values(people)) {
      o.ch.root.visible = true;
      if (o.talkT > 0) o.talkT -= dt;
      o.ch.animate(dt, 0, o.sit);
      placeLabels?.(o, camera, w, h);
    }
    // The boy keeps the jegi up; Suni calls you over now and then.
    jegi.position.set(jegiAt[0], 0.45 + Math.abs(Math.sin(tt * 2.2)) * 0.9, jegiAt[1]);
    if ((sayT -= dt) <= 0) {
      sayT = 9 + Math.random() * 6;
      const s = people.suni;
      if (s && !openUi() && Math.hypot(p.x - s.home.x, p.z - s.home.z) < 8) say(s, layer, lineText('neolHello'));
    }
  }
  function hideLabels() {
    for (const o of Object.values(people)) for (const el of [o.tag, o.bubble]) if (el) el.style.display = 'none';
  }
  function relabel() {
    for (const o of Object.values(people)) { const n = NAMES[o.id](); o.tag.textContent = n; }
  }

  // An invite to yutnori: a card with Play / No thanks.
  let ask = null, askFrom = null, askTimer = 0;
  function closeAsk() { clearTimeout(askTimer); ask?.remove(); ask = null; askFrom = null; }
  function showAsk(from) {
    const name = game.others?.nameOf(from) || '?';
    closeAsk();
    ask = document.createElement('div');
    ask.id = 'yut-ask';
    ask.style.cssText = ASK_CSS;
    askFrom = from;
    const h = document.createElement('div');
    h.textContent = FL('yut.ask').replace('{name}', name);
    ask.append(h);
    const answer = (yes) => {
      closeAsk();
      const me = game.me?.root.position;
      if (yes && me && game.mode === 'street' && nearMat(me.x, me.z)) { closeAll(); uis.yut.join({ id: from, name }); } else yutNet.send(yutReply(from, false));
    };
    for (const [label, yes, bg] of [[FL('yut.yes'), true, '#ffd36b'], [FL('yut.no'), false, '#eee']]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      b.style.cssText = ASK_BTN + ';background:' + bg;
      b.onclick = () => answer(yes);
      ask.append(b);
    }
    document.body.append(ask);
    game.sfx?.tock?.(0.6, 900);
    askTimer = setTimeout(() => { if (askFrom === from) answer(false); }, ASK_MS);
  }
  // A room message: true when it was one of ours.
  function onMsg(from, e) {
    const m = parseYut(e);
    if (!m) return false;
    const name = game.others?.nameOf(from);
    if (name == null || game.safety?.isBlocked(from, name)) return true;
    if (m.k === 'i') {
      if (m.to !== game.myId) return true;
      const me = game.me?.root.position;
      // Not by the mat, or already playing: no.
      if (!me || game.mode !== 'street' || !nearMat(me.x, me.z) || uis.yut.busy || ask) yutNet.send(yutReply(from, false));
      else showAsk(from);
      return true;
    }
    if (m.k === 'n' && m.host === game.myId && askFrom === from) closeAsk(); // (the invite was taken back)
    if (uis.yut.loaded) uis.yut.onNet(from, m);
    return true;
  }
  function peerGone(id) {
    if (askFrom === id) closeAsk();
    if (uis.yut.loaded) uis.yut.peerGone(id);
  }

  const api = { uis, act, tick, hideLabels, relabel, closeAll, onMsg, peerGone, stands, props: Object.values(props), get open() { return !!openUi(); } };
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug')) window.__folkYard = api; // (for the e2e tests)
  return api;
}
