// Home appliances at work (core/appliances.js): walk up to one in my home.
// The fridge's doors swing open and a panel shows what's inside, to put
// drinks and food in from my hand or bag and take them back out (core/fridge.js);
// the doors close when the panel does or I walk away. The washer opens, shuts
// and spins its drum for a while; the microwave hums with its light on and
// says ding. Loaded with import() the first time a home has a fridge or one
// is used (game/decor.js).
import * as THREE from 'three';
import { t } from '../core/i18n.js';
import { furnitureById } from '../core/furniture.js';
import { fridgeSlots } from '../core/appliances.js';
import { FridgeStore, FRIDGE_MAX, fridgeable } from '../core/fridge.js';

const WASH_S = 8, HEAT_S = 4; // seconds the washer spins, the microwave runs
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// game: the decor game object ($, shop, bag, held, setHeld, describeEntry, sfx);
// decor: game/decor.js's api.
export function createAppliances(game, decor) {
  const { shop } = game;
  const store = new FridgeStore(globalThis.localStorage, game.bag?.opts);
  const state = new Map(); // piece id → { open (0-1 now), want (0-1), run (s since start, or -1), kind }
  const st = (id) => { if (!state.has(id)) state.set(id, { open: 0, want: 0, run: -1, kind: furnitureById(id)?.appliance }); return state.get(id); };
  const piece = (id) => decor.decor?.items.find((i) => i.id === id);
  const parts = new WeakMap(); // mesh → { doors, drum, window }
  function partsOf(mesh) {
    if (!parts.has(mesh)) {
      const p = { doors: [], drum: null, window: null };
      mesh.traverse((o) => { if (o.userData.door) p.doors.push(o); if (o.userData.drum) p.drum = o; if (o.userData.window) p.window = o; });
      parts.set(mesh, p);
    }
    return parts.get(mesh);
  }
  const lit = new THREE.MeshBasicMaterial({ color: '#ffd98a' });
  const busy = (id) => state.get(id)?.run >= 0;

  // What's in the fridge, standing on its shelves (seen when the doors open).
  const CUP = { coffee: '#8a5a3a', glass: '#ff9f6a', food: '#e8d6b0' };
  const cupGeo = new THREE.CylinderGeometry(0.035, 0.03, 0.12, 10), boxGeo = new THREE.BoxGeometry(0.09, 0.07, 0.09), plateGeo = new THREE.CylinderGeometry(0.05, 0.04, 0.05, 12);
  const mats = {};
  const m = (c) => (mats[c] ||= new THREE.MeshLambertMaterial({ color: c }));
  function refill() {
    const it = decor.decor?.items.find((i) => furnitureById(i.id)?.appliance === 'fridge');
    if (!it?.mesh || decor.decor.guest) return;
    it.mesh.getObjectByName('fridge-food')?.removeFromParent();
    const g = new THREE.Group();
    g.name = 'fridge-food';
    const slots = fridgeSlots();
    store.list().forEach((e, i) => {
      const [x, y, z] = slots[i];
      const dish = !CUP[e.kind], geo = dish ? plateGeo : e.kind === 'food' ? boxGeo : cupGeo;
      const o = new THREE.Mesh(geo, m(dish ? '#f4efe6' : CUP[e.kind]));
      o.position.set(x, y + (geo.parameters.height ?? 0.07) / 2, z);
      g.add(o);
    });
    it.mesh.add(g);
  }

  // The fridge panel: what's inside, and what can go in from the hand and bag.
  const box = el('div', 'sheet order-panel tank-panel fridge-panel');
  box.hidden = true;
  game.$('wallet-panel').parentElement.append(box);
  let fridgeId = null;
  const why = (k) => t({ full: 'fridge.full', bagFull: 'fridge.bagFull', kind: 'fridge.cant' }[k] || 'fridge.cant');
  function row(e, label, onClick) {
    const d = game.describeEntry?.(e) || { emoji: '🍱', name: e.name };
    const r = el('div', 'tank-row');
    const b = el('button', 'chip', label);
    b.onclick = onClick;
    const n = el('span', 'tank-name', `${d.emoji} ${d.name || ''} `);
    if (e.sips > 1 && !fridgeDish(e)) n.append(el('small', 'tank-size', t('fridge.sips', { n: e.sips })));
    r.append(n, b);
    return r;
  }
  const fridgeDish = (e) => !['coffee', 'glass', 'food'].includes(e.kind);
  function done(err) {
    if (err) { shop.toast(why(err)); return; }
    game.sfx?.pop?.();
    refill();
    render();
  }
  function render() {
    const x = el('button', 'sheet-x', '✕');
    x.setAttribute('aria-label', t('order.close'));
    x.onclick = closeFridge;
    const list = store.list();
    box.replaceChildren(x, el('h3', null, '🧊 ' + t('fridge.title')), el('p', 'tank-space', t('fridge.count', { n: list.length, max: FRIDGE_MAX })));
    box.append(el('h4', null, t('fridge.inside')));
    if (!list.length) box.append(el('p', 'tank-empty', t('fridge.empty')));
    list.forEach((e, i) => box.append(row(e, '↩ ' + t('fridge.take'), () => done(store.take(game.bag, i)))));
    box.append(el('h4', null, t('fridge.fromBag')));
    const hand = game.held && fridgeable(game.held) ? game.held : null;
    if (hand) box.append(row(hand, '✋➕ ' + t('fridge.put'), () => done(store.putFromHand(game))));
    const mine = (game.bag?.list() || []).map((e, i) => [e, i]).filter(([e]) => fridgeable(e));
    if (!mine.length && !hand) box.append(el('p', 'tank-empty', t('fridge.nothing')));
    for (const [e, i] of mine) box.append(row(e, '➕ ' + t('fridge.put'), () => done(store.putFromBag(game.bag, i))));
  }
  function openFridge(id) {
    fridgeId = id;
    st(id).want = 1;
    box.hidden = false;
    refill();
    render();
  }
  function closeFridge() {
    if (fridgeId) st(fridgeId).want = 0;
    fridgeId = null;
    box.hidden = true;
  }

  // Walk up to an appliance: the fridge opens, the others run.
  function use(id) {
    const s = st(id);
    if (s.kind === 'fridge') return openFridge(id);
    if (busy(id)) return shop.toast(t(s.kind + '.busy'));
    s.run = 0;
    if (s.kind === 'washer') shop.toast(t('washer.start'));
  }
  // Doors swing toward where they're wanted; a washer or microwave runs its course.
  const ease = (v) => v * v * (3 - 2 * v);
  function tick(dt) {
    for (const [id, s] of state) {
      const it = piece(id);
      if (!it?.mesh) { if (!it) state.delete(id); continue; }
      const p = partsOf(it.mesh);
      if (s.run >= 0) {
        s.run += dt;
        const r = s.run;
        if (s.kind === 'washer') { // open, put the laundry in, shut, spin
          s.want = r < 1.2 ? 1 : 0;
          const spin = r > 1.8 ? Math.min(1, (r - 1.8) / 1.5) * Math.min(1, (WASH_S + 1.8 - r) / 1) : 0;
          if (p.drum) p.drum.rotation.z -= dt * spin * 14;
          if (decor.decor.carry !== it) it.mesh.position.x = it.x + (spin > 0.6 ? Math.sin(r * 47) * 0.004 : 0); // (it rattles a little at full spin)
          if (r > WASH_S + 1.8) { s.run = -1; if (decor.decor.carry !== it) it.mesh.position.x = it.x; shop.toast(t('washer.done')); game.sfx?.pop?.(); }
        } else if (s.kind === 'microwave') { // open, food in, shut, hum with the light on, ding
          s.want = r < 0.7 ? 1 : 0;
          const on = r > 1.1 && r < HEAT_S + 1.1;
          if (p.window) { p.window.userData.off ||= p.window.material; p.window.material = on ? lit : p.window.userData.off; }
          if (r > HEAT_S + 1.1) { s.run = -1; shop.toast(t('microwave.done')); game.sfx?.pop?.(); }
        } else s.run = -1;
      }
      if (s.open !== s.want) s.open = s.want > s.open ? Math.min(s.want, s.open + dt * 2.5) : Math.max(s.want, s.open - dt * 2.5);
      for (const d of p.doors) d.rotation.y = d.userData.door * ease(s.open);
    }
  }
  // Walked away from the fridge: it closes.
  function away(p) {
    if (!fridgeId) return;
    const it = piece(fridgeId);
    if (!it || Math.hypot(p.x - it.x, p.z - it.z) > 2.2) closeFridge();
  }
  return { use, tick, away, refill, busy, close: closeFridge };
}
