// Home decorating: place furniture from a catalogue, then tap it again in the
// catalogue (or walk up to it) to rotate, carry or put it away. One of each
// piece for now, so rooms stay light. Saved in mk.home.<id>, which rides
// along in the cloud save. A first home starts with a few basics.
import { CollisionMap } from '../core/collision.js';
import { foldHomes } from '../core/home-fold.js';
import { FURNITURE, buildFurniture, furnitureById, furnitureCollider, furnitureSeats, pieceBlocked, starterLayout } from '../core/furniture.js';
import * as THREE from 'three';
import { getLanguage, localName, onLanguageChange, t } from '../core/i18n.js';

export function createDecor(game) {
  const { $, STALE, inventory, shop } = game;
  const MAX_PIECES = 60;
  let decor = null; // { home, built, items: [{ id, x, z, ry }], group, editing, piece, carry }
  const homeKey = (id) => 'mk.home.' + id;
  // A layout from storage or from another game: known pieces with real
  // numbers, one of each, at most MAX_PIECES.
  function cleanLayout(a) {
    if (!Array.isArray(a)) return [];
    const list = a.map((i) => (Array.isArray(i) ? { id: i[0], x: i[1], z: i[2], ry: i[3] } : i));
    return list.filter((i, k) => furnitureById(i?.id) && [i.x, i.z, i.ry].every(Number.isFinite) && list.findIndex((j) => j?.id === i.id) === k).slice(0, MAX_PIECES)
      .map(({ id, x, z, ry }) => ({ id, x, z, ry }));
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
    try { localStorage.setItem(homeKey(decor.home), JSON.stringify(decor.items.map((i) => ({ id: i.id, x: r(i.x), z: r(i.z), ry: r(i.ry) })))); } catch { /* storage blocked */ }
  }
  function rebuildDecor() {
    decor.group.clear();
    for (const it of decor.items) {
      const g = buildFurniture(it.id);
      g.position.set(it.x, 0, it.z);
      g.rotation.y = it.ry;
      decor.group.add(g);
      it.mesh = g;
    }
    // The piece being carried doesn't block you until it is put down.
    const extra = decor.items.filter((it) => it !== decor.carry).map(furnitureCollider).filter(Boolean);
    game.interior.collision = game.activeCollision = new CollisionMap(decor.built.colliders.concat(extra));
    game.interior.seats = decor.items.flatMap(furnitureSeats);
    saveDecor();
    markPlaced();
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
  const layout = () => (decor && !decor.guest ? decor.items.filter((i) => i !== decor.carry).map((i) => [i.id, i.x, i.z, i.ry]) : null);
  function closeHome() {
    if (!decor) return;
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
    if (decor.items.length >= MAX_PIECES) return shop.toast(t('home.full'));
    const [x, z, ry] = spotInFront();
    const it = { id, x, z, ry: Math.round(ry / (Math.PI / 4)) * (Math.PI / 4) };
    if (!freeSpot(it)) return shop.toast(t('home.blocked'));
    decor.items.push(it);
    rebuildDecor();
  }
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
        if (!pieceBlocked(it, decor.items, p)) return true;
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
      putDown(true);
    }
    if (decor) { decor.piece = null; decor.picked = false; }
    $('piece-bar').hidden = true;
  }
  // Carry a piece: it floats in front of you until you put it down.
  function putDown(force = false) {
    if (!force && decor.carry && pieceBlocked(decor.carry, decor.items)) { shop.toast(t('home.blocked')); return false; }
    decor.carry = null;
    $('decor-bar').hidden = !decor.editing;
    rebuildDecor();
    if (decor.piece) $('piece-move-label').textContent = t('home.carry');
    return true;
  }
  function updateCarry() {
    const it = decor?.carry;
    if (!it?.mesh) return;
    [it.x, it.z] = spotInFront();
    it.mesh.position.set(it.x, 0.08, it.z); // lifted a little while carried
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
    }
  }
  labelDecor();
  onLanguageChange(labelDecor);
  $('piece-rotate').onclick = () => {
    const it = decor?.piece;
    if (!it) return;
    it.ry += Math.PI / 4;
    if (it !== decor.carry && pieceBlocked(it, decor.items)) { it.ry -= Math.PI / 4; shop.toast(t('home.blocked')); return; } // (a carried piece is checked when put down)
    rebuildDecor();
  };
  $('piece-move').onclick = () => {
    if (!decor?.piece) return;
    if (decor.carry) { if (putDown()) closePiece(); game.action = STALE; return; }
    decor.carry = decor.piece;
    decor.carryFrom = { x: decor.piece.x, z: decor.piece.z, ry: decor.piece.ry };
    decor.picked = true;
    $('decor-bar').hidden = true; // see where you're walking
    rebuildDecor();
    $('piece-move-label').textContent = t('home.putDown');
  };
  $('piece-remove').onclick = () => {
    if (!decor?.piece) return;
    if (decor.carry === decor.piece) decor.carry = null;
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

  return { visit, labelDecor, openHome, openGuest, showLayout, layout, closeHome, get decor() { return decor; }, nearestPiece, putDown,
    closePiece, openPiece, updateCarry };
}
