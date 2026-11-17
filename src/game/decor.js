// Home decorating: place furniture from a catalogue, then tap it again in the
// catalogue (or walk up to it) to rotate, carry or put it away. One of each
// piece for now, so rooms stay light. Saved in mk.home.<id>, which rides
// along in the cloud save. A first home starts with a few basics.
import { CollisionMap } from '../core/collision.js';
import { foldHomes } from '../core/home-fold.js';
import { FURNITURE, buildFurniture, furnitureById, furnitureCollider, furnitureSeats, isLamp, outsideRoom, pieceBlocked, placeRiders, ridersOf, starterLayout, topUnder } from '../core/furniture.js';
import * as THREE from 'three';
import { getLanguage, localName, onLanguageChange, t } from '../core/i18n.js';
import { OLD_HOME_LEVEL, fitsHome, homeRoom, readHomeLevel } from '../core/home-stages.js';
import { TankStore, cleanList, isTank, tankById } from '../core/fish-tank.js';

export function createDecor(game) {
  const { $, STALE, inventory, shop } = game;
  const MAX_PIECES = 60;
  let decor = null; // { home, built, items: [{ id, x, z, ry }], group, editing, piece, carry }
  const homeKey = (id) => 'mk.home.' + id;
  // A layout from storage or from another game: known pieces with real
  // numbers, one of each, at most MAX_PIECES.
  function cleanLayout(a) {
    if (!Array.isArray(a)) return [];
    const list = a.map((i) => (Array.isArray(i) ? { id: i[0], x: i[1], z: i[2], ry: i[3], y: i[4], off: i[5], fish: i[6] } : i));
    return list.filter((i, k) => furnitureById(i?.id) && [i.x, i.z, i.ry].every(Number.isFinite) && list.findIndex((j) => j?.id === i.id) === k).slice(0, MAX_PIECES)
      .map(({ id, x, z, ry, y, off, fish }) => ({ id, x, z, ry, ...(y > 0 && y < 1.5 ? { y } : {}), ...(off ? { off: true } : {}), // y: on a table (isSmall); off: a lamp switched off
        ...(isTank(id) && Array.isArray(fish) ? { fish: cleanList(id, fish) } : {}) })); // fish: in someone else's tank (my own come from mk.tanks)
  }
  function loadDecor(id, room) {
    foldHomes(localStorage); // (the old Sunny Villa layout moves into the one home)
    try {
      const raw = localStorage.getItem(homeKey(id));
      if (raw == null && room) return starterLayout(room.w, room.d); // never opened: not an empty floor
      return cleanLayout(JSON.parse(raw || '[]'));
    } catch { return []; }
  }
  function saveDecor() {
    if (decor.guest) return; // (someone else's home: their game keeps it)
    game.onLayout?.(); // (visitors see the change: game/home-visits.js)
    const r = (v) => Math.round(v * 100) / 100;
    try { localStorage.setItem(homeKey(decor.home), JSON.stringify(decor.items.map((i) => ({ id: i.id, x: r(i.x), z: r(i.z), ry: r(i.ry), ...(i.y ? { y: i.y } : {}), ...(i.off ? { off: true } : {}) })))); } catch { /* storage blocked */ }
  }
  function rebuildDecor() {
    decor.group.clear();
    for (const it of decor.items) {
      const g = buildFurniture(it.id, { off: it.off });
      g.position.set(it.x, it.y || 0, it.z);
      g.rotation.y = it.ry;
      decor.group.add(g);
      it.mesh = g;
    }
    // The piece being carried doesn't block you until it is put down.
    const extra = decor.items.filter((it) => it !== decor.carry).map(furnitureCollider).filter(Boolean);
    game.interior.collision = game.activeCollision = new CollisionMap(decor.built.colliders.concat(extra));
    game.interior.seats = decor.items.flatMap(furnitureSeats);
    unstick();
    saveDecor();
    markPlaced();
    fillTanks();
  }
  // The fish in this room's tanks (core/tank-fish.js, loaded with the first
  // tank): mine from mk.tanks, a host's from the layout they sent.
  let tankFish = null, swimming = [], swimT = 0;
  function fillTanks() {
    for (const f of swimming) f.dispose();
    swimming = [];
    const tanks = decor?.items.filter((it) => isTank(it.id) && it.mesh);
    if (!tanks?.length) return;
    const store = decor.guest ? null : new TankStore();
    (tankFish ||= import('../core/tank-fish.js')).then((m) => {
      for (const it of tanks) {
        if (!decor || it.mesh.parent !== decor.group || swimming.some((f) => f.it === it)) continue; // (rebuilt or gone meanwhile)
        const list = store ? store.list(it.id) : it.fish || [];
        if (list.length) swimming.push({ it, ...m.fillTank(it.mesh, tankById(it.id), list) });
      }
    }).catch(() => { tankFish = null; });
  }
  function tick(dt) {
    if (!swimming.length) return;
    swimT += dt;
    for (const f of swimming) f.tick(swimT);
  }
  // Never shut in by furniture (Yozi 2026-11-16: stuck between a desk and a
  // stool): if a piece now overlaps where I stand, step to the nearest clear
  // spot. (Not while sitting or lying on a piece: that's inside it.)
  function unstick() {
    const p = game.me?.root.position, col = game.interior.collision, r = (game.PLAYER_R || 0.35) + 0.05;
    if (!p || game.seated || !col.blocked(p.x, p.z, r)) return;
    const { w, d } = game.interior.room;
    for (let k = 0.25; k <= 4; k += 0.25) {
      for (let a = 0; a < 16; a++) {
        const g = (a / 16) * Math.PI * 2;
        const x = THREE.MathUtils.clamp(p.x + Math.cos(g) * k, -w / 2 + 0.5, w / 2 - 0.5);
        const z = THREE.MathUtils.clamp(p.z + Math.sin(g) * k, -d / 2 + 0.5, d / 2 - 0.5);
        if (!col.blocked(x, z, r)) { p.x = x; p.z = z; return; }
      }
    }
  }
  // Catalogue buttons show which pieces are already in the room.
  function markPlaced() {
    for (const b of $('decor-grid').children) b.classList.toggle('placed', !!decor?.items.some((i) => i.id === b.dataset.id));
  }
  function openHome(store, built) {
    if (!built.decorGroup) { built.decorGroup = new THREE.Group(); built.scene.add(built.decorGroup); }
    decor = { home: store.id, built, items: loadDecor(store.id, game.interior?.room), group: built.decorGroup, editing: false, piece: null, carry: null };
    rebuildDecor();
    $('decor-btn').hidden = false;
  }
  // Someone else's home (game/home-visits.js): their furniture, sent by their
  // game, shown as it is; nothing to decorate and nothing saved here.
  function openGuest(store, built) {
    if (!built.decorGroup) { built.decorGroup = new THREE.Group(); built.scene.add(built.decorGroup); }
    decor = { home: store.id, built, items: [], group: built.decorGroup, editing: false, piece: null, carry: null, guest: true };
    rebuildDecor();
    $('decor-btn').hidden = true;
  }
  function showLayout(list) {
    if (!decor?.guest) return;
    decor.items = cleanLayout(list);
    rebuildDecor();
  }
  // What this home looks like, to send to visitors.
  const layout = () => {
    if (!decor || decor.guest) return null;
    const store = new TankStore();
    return decor.items.filter((i) => i !== decor.carry).map((i) => {
      const a = [i.id, i.x, i.z, i.ry, i.y || 0, i.off ? 1 : 0];
      if (isTank(i.id) && store.list(i.id).length) a.push(store.list(i.id)); // (visitors see the fish too)
      return a;
    });
  };
  function closeHome() {
    if (!decor) return;
    for (const f of swimming) f.dispose();
    swimming = [];
    tankPanel?.close();
    setDecorating(false);
    $('decor-btn').hidden = true;
    decor = null;
  }
  function setDecorating(on) {
    decor.editing = on;
    $('decor-bar').hidden = !on;
    $('decor-btn').classList.toggle('on', on);
    if (!on) closePiece();
    game.action = STALE; // refresh the action button
  }
  // A spot about 1.6 m in front of the player, inside the room.
  function spotInFront() {
    const p = game.me.root.position, ry = game.me.root.rotation.y;
    const { w, d } = game.interior.room;
    return [
      THREE.MathUtils.clamp(p.x + Math.sin(ry) * 1.6, -w / 2 + 0.8, w / 2 - 0.8),
      THREE.MathUtils.clamp(p.z + Math.cos(ry) * 1.6, -d / 2 + 0.8, d / 2 - 1.8),
      ry + Math.PI, // facing you
    ];
  }
  function placePiece(id) {
    const placed = decor.items.find((i) => i.id === id);
    if (placed) { openPiece(placed, true); return; } // one of each: tap again to edit it
    const def = furnitureById(id);
    if (def?.item && !inventory.has(def.item)) return; // a prize you haven't won yet
    if (!fitsHome(def, readHomeLevel())) return shop.toast(t('home.needLevel', { n: def.needsHomeLevel })); // (a big fish tank: a bigger home first)
    if (decor.items.length >= MAX_PIECES) return shop.toast(t('home.full'));
    const [x, z, ry] = spotInFront();
    const it = { id, x, z, ry: Math.round(ry / (Math.PI / 4)) * (Math.PI / 4) };
    const { w: rw, d: rd } = game.interior.room;
    if (Math.min(...def.size) > Math.min(rw, rd) - 1 || Math.max(...def.size) > Math.max(rw, rd) - 1) return shop.toast(t('home.noRoom')); // (bigger than the room)
    if (!freeSpot(it)) return shop.toast(t('home.blocked'));
    decor.items.push(it);
    rebuildDecor();
  }
  // A small piece over a table stands on it; anything else on the floor.
  function settle(it) { it.y = topUnder(it, decor.items)?.y || 0; }
  // Nudge a new piece to the nearest clear spot (rings round where it
  // landed, inside the room). False if the room has no clear spot near.
  function freeSpot(it) {
    const { w, d } = game.interior.room, p = game.me.root.position;
    const x0 = it.x, z0 = it.z;
    for (let r = 0; r <= 4; r += 0.5) {
      for (let k = 0, n = r ? Math.round(r * 8) : 1; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        it.x = THREE.MathUtils.clamp(x0 + Math.cos(a) * r, -w / 2 + 0.8, w / 2 - 0.8);
        it.z = THREE.MathUtils.clamp(z0 + Math.sin(a) * r, -d / 2 + 0.8, d / 2 - 1.8);
        settle(it);
        if (!pieceBlocked(it, decor.items, p) && !outsideRoom(it, w, d)) return true;
      }
    }
    it.x = x0; it.z = z0;
    return false;
  }
  function nearestPiece(p) {
    let best = null, bd = 1.6;
    for (const it of decor.items) {
      const d = Math.hypot(p.x - it.x, p.z - it.z) - Math.max(...furnitureById(it.id).size) / 2;
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }
  function openPiece(it, picked = false) {
    if (decor.carry && decor.carry !== it && !putDown()) return;
    decor.piece = it;
    decor.picked = picked; // chosen from the catalogue: stays open while you walk
    $('piece-move-label').textContent = t(decor.carry === it ? 'home.putDown' : 'home.carry');
    $('piece-name').textContent = furnitureById(it.id).emoji + ' ' + localName(furnitureById(it.id).name, getLanguage());
    $('piece-bar').hidden = false;
  }
  function closePiece() {
    if (decor?.carry && !putDown()) { // blocked here: it goes back where it was
      Object.assign(decor.carry, decor.carryFrom);
      if (decor.riders) placeRiders(decor.carry, decor.riders);
      putDown(true);
    }
    if (decor) { decor.piece = null; decor.picked = false; }
    $('piece-bar').hidden = true;
  }
  // Carry a piece: it floats in front of you until you put it down.
  function putDown(force = false) {
    if (decor.carry) settle(decor.carry);
    if (!force && decor.carry && (pieceBlocked(decor.carry, decor.items, game.me.root.position) || outsideRoom(decor.carry, game.interior.room.w, game.interior.room.d))) { shop.toast(t('home.blocked')); return false; }
    decor.carry = null;
    decor.riders = null;
    $('decor-bar').hidden = !decor.editing;
    rebuildDecor();
    if (decor.piece) $('piece-move-label').textContent = t('home.carry');
    return true;
  }
  function updateCarry() {
    const it = decor?.carry;
    if (!it?.mesh) return;
    [it.x, it.z] = spotInFront();
    it.mesh.position.set(it.x, (topUnder(it, decor.items)?.y || 0) + 0.08, it.z); // lifted a little while carried (over a table: above it)
    if (decor.riders?.length) { // what stands on it comes along
      placeRiders(it, decor.riders);
      for (const r of decor.riders) { r.it.mesh?.position.set(r.it.x, r.it.y + 0.08, r.it.z); if (r.it.mesh) r.it.mesh.rotation.y = r.it.ry; }
    }
  }
  $('decor-btn').onclick = () => decor && setDecorating(!decor.editing);
  $('decor-grid').append(...FURNITURE.map((f) => {
    const b = document.createElement('button');
    b.className = 'decor-item';
    b.innerHTML = `<span>${f.emoji}</span><small></small>`;
    b.dataset.id = f.id;
    b.onclick = () => placePiece(f.id);
    return b;
  }));
  function labelDecor() {
    for (const b of $('decor-grid').children) {
      const f = furnitureById(b.dataset.id);
      b.querySelector('small').textContent = localName(f.name, getLanguage());
      b.hidden = !!f.item && !inventory.has(f.item); // plushies: once you've won one
      b.classList.toggle('locked', !fitsHome(f, readHomeLevel())); // needs a bigger home
    }
  }
  labelDecor();
  onLanguageChange(labelDecor);
  $('piece-rotate').onclick = () => {
    const it = decor?.piece;
    if (!it) return;
    const riders = it === decor.carry ? null : ridersOf(it, decor.items); // (carried: they follow in updateCarry)
    it.ry += Math.PI / 4;
    if (it !== decor.carry && (pieceBlocked(it, decor.items, game.me.root.position) || outsideRoom(it, game.interior.room.w, game.interior.room.d))) { it.ry -= Math.PI / 4; shop.toast(t('home.blocked')); return; } // (a carried piece is checked when put down)
    if (riders) placeRiders(it, riders);
    rebuildDecor();
  };
  $('piece-move').onclick = () => {
    if (!decor?.piece) return;
    if (decor.carry) { if (putDown()) closePiece(); game.action = STALE; return; }
    decor.carry = decor.piece;
    decor.carryFrom = { x: decor.piece.x, z: decor.piece.z, ry: decor.piece.ry, y: decor.piece.y || 0 };
    decor.riders = ridersOf(decor.piece, decor.items);
    decor.picked = true;
    $('decor-bar').hidden = true; // see where you're walking
    rebuildDecor();
    $('piece-move-label').textContent = t('home.putDown');
  };
  $('piece-remove').onclick = () => {
    if (!decor?.piece) return;
    if (decor.carry === decor.piece) decor.carry = null;
    for (const r of ridersOf(decor.piece, decor.items)) r.it.y = 0; // what stood on it goes to the floor
    decor.items.splice(decor.items.indexOf(decor.piece), 1);
    rebuildDecor();
    closePiece();
    game.action = STALE;
  };
  $('piece-close').onclick = closePiece;
  // Who may visit this home: everyone, friends (the default) or nobody.
  // Kept in mk.homeVisit (it rides in the account save); game/home-visits.js
  // opens or closes the home when it changes.
  const VISITS = ['all', 'friends', 'none'];
  const visit = () => { try { const v = localStorage.getItem('mk.homeVisit'); return VISITS.includes(v) ? v : 'friends'; } catch { return 'friends'; } };
  const markVisit = () => { for (const b of $('visit-row').querySelectorAll('[data-visit]')) b.classList.toggle('on', b.dataset.visit === visit()); };
  for (const b of $('visit-row').querySelectorAll('[data-visit]')) {
    b.onclick = () => {
      if (b.dataset.visit === visit()) return;
      try { localStorage.setItem('mk.homeVisit', b.dataset.visit); } catch { /* storage blocked */ }
      markVisit();
      game.onVisit?.(visit());
    };
  }
  markVisit();

  // Switch a lamp on or off by walking up to it (not while decorating; only
  // in my own home). Saved with the room, and visitors see it.
  function lampAct(p) {
    if (!decor || decor.guest || decor.editing || decor.carry) return null;
    let best = null, bd = 1.2;
    for (const it of decor.items) {
      if (!isLamp(it.id)) continue;
      const d = Math.hypot(p.x - it.x, p.z - it.z);
      if (d < bd) { bd = d; best = it; }
    }
    if (!best) return null;
    return { key: 'lamp:' + best.id + (best.off ? ':off' : ''), label: (best.off ? '💡 ' + t('home.lampOn') : '🌙 ' + t('home.lampOff')),
      run: () => { best.off = !best.off; rebuildDecor(); game.action = STALE; } };
  }
  // Walk up to a tank in my home to put fish in or take them out
  // (game/fish-tank-ui.js, loaded the first time).
  let tankPanel = null, tankPanelLoading = null;
  function tankAct(p) {
    if (!decor || decor.guest || decor.editing || decor.carry) return null;
    let best = null, bd = Infinity;
    for (const it of decor.items) {
      if (!isTank(it.id)) continue;
      const d = Math.hypot(p.x - it.x, p.z - it.z), reach = Math.max(...tankById(it.id).size) / 2 + 0.9;
      if (d < reach && d < bd) { bd = d; best = it; }
    }
    if (!best) return null;
    return { key: 'tank:' + best.id, label: '🐟 ' + t('tank.open'), run: () => openTank(best.id) };
  }
  async function openTank(id) {
    tankPanelLoading ||= import('./fish-tank-ui.js').then((m) => (tankPanel = m.createTankPanel({
      root: $('wallet-panel').parentElement, bag: game.fishBag, toast: (s) => shop.toast(s),
      onChange: () => { fillTanks(); game.onLayout?.(); }, // (visitors see the fish move)
    }))).catch((e) => { tankPanelLoading = null; throw e; });
    await tankPanelLoading;
    if (decor && !decor.guest) tankPanel.open(id);
  }
  // Walked away from the tank: close its panel.
  function tankAway(p) {
    if (!tankPanel?.isOpen) return;
    const it = decor?.items.find((i) => i.id === tankPanel.tankId);
    if (!it || Math.hypot(p.x - it.x, p.z - it.z) > Math.max(...tankById(it.id).size) / 2 + 1.6) tankPanel.close();
  }
  // A bigger home (core/home-stages.js): the buying sheet and the till load
  // the first time you go into your home (game/home-grow.js).
  let growing = null;
  const grow = () => (growing ||= import('./home-grow.js').then((m) => m.createHomeGrow(game, api)).catch((e) => { growing = null; throw e; }));
  // The home's door, sized for its level: mine (asking the server once a
  // session, at most a few seconds) or the host's when visiting. A promise
  // of the same item with store.roomDims (main.js enterStore builds that).
  function sizeHome(item) {
    const host = item.store.visitHost;
    const level = host ? Promise.resolve(host.level || OLD_HOME_LEVEL) : grow().then((g) => g.syncLevel(), () => readHomeLevel());
    return level.then((n) => ({ ...item, homeSized: true, store: { ...item.store, roomDims: homeRoom(n) } }));
  }
  $('grow-btn').onclick = () => grow().then((g) => g.open(), () => {});
  const api = { visit, labelDecor, lampAct, openHome, openGuest, showLayout, layout, closeHome, get decor() { return decor; }, nearestPiece, putDown,
    closePiece, openPiece, updateCarry, tankAct, tankAway, tick, sizeHome, saveDecor: () => decor && saveDecor(), rebuildDecor: () => decor && rebuildDecor(), cleanLayout };
  return api;
}
