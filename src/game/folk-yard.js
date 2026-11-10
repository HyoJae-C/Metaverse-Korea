// --- The folk games yard in Namsangol Hanok Village (Jung-gu): yutnori,
// tuho, jegichagi and neolttwigi on the yard inside the hanok wall (the
// "folkyard" landmark; layout and locals in data/folk-yard.js, games in
// core/*-game.js and ui/*-ui.js, see docs/FOLK-GAMES.md).
//
// The locals are already there when you walk in: Grandma, Minjun and
// Seoyeon sit round the yut mat waiting for a fourth, Grandpa Kim keeps the
// tuho jar, a boy kicks a jegi by the stool and Suni waits on the seesaw.
import { FOLK_GAMES, makeJegi, setNeolTilt } from '../core/folk-props.js';
import { FOLK_YARD, propToWorld } from '../data/folk-yard.js';
import { folkLabel as FL, lineText } from '../ui/folk-labels.js';
import { lazyPanel } from '../core/lazy-panel.js';
import { TUHO_GAME } from '../core/tuho-game.js';
import { JEGI_GAME } from '../core/jegi-game.js';
import { NEOL_GAME } from '../core/neol-game.js';
import { makeNpc, say } from '../core/npcs.js';
import { t } from '../core/i18n.js';

const NEAR = 60; // metres: closer than this, the locals are drawn
const YUT_PAID_KEY = 'mk.folk.yutPaid';
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
  const lm = game.map.landmarks.find((l) => l.type === 'folkyard') || null;
  const uis = {};
  if (!lm) return { uis, act: () => null, tick() {}, hideLabels() {}, relabel() {}, closeAll() {}, get open() { return false; } };

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
  uis.yut = lazyPanel(() => import('../ui/yut-ui.js').then(({ YutUI }) => new YutUI({ root: $('yut-panel'), onSay: speak('yut'), onWin: yutWin, onClose })));
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
      if (game.mode !== 'street' || Math.hypot(p.x - s.at[0], p.z - s.at[1]) > s.r + 3) u.close();
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

  return { uis, act, tick, hideLabels, relabel, closeAll, stands, get open() { return !!openUi(); } };
}
