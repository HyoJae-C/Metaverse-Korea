// Home decorating: place furniture from a catalogue, then tap it again in the
// catalogue (or walk up to it) to rotate, carry or put it away. One of each
// piece for now, so rooms stay light. Saved in this browser only (for now).
import { CollisionMap } from '../core/collision.js';
import { FURNITURE, buildFurniture, furnitureById, furnitureCollider } from '../core/furniture.js';
import * as THREE from 'three';
import { getLanguage, localName, onLanguageChange, t } from '../core/i18n.js';

export function createDecor(game) {
  const { $, STALE, inventory, shop } = game;
  const MAX_PIECES = 60;
  let decor = null; // { home, built, items: [{ id, x, z, ry }], group, editing, piece, carry }
  const homeKey = (id) => 'mk.home.' + id;
  function loadDecor(id) {
    try {
      const a = JSON.parse(localStorage.getItem(homeKey(id)) || '[]');
      return Array.isArray(a)
        ? a.filter((i, k) => furnitureById(i?.id) && [i.x, i.z, i.ry].every(Number.isFinite) && a.findIndex((j) => j?.id === i.id) === k).slice(0, MAX_PIECES)
        : [];
    } catch { return []; }
  }
  function saveDecor() {
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
    game.interior.seats = decor.items.filter((it) => furnitureById(it.id).seat).map((it) => {
      const fx = Math.sin(it.ry), fz = Math.cos(it.ry);
      const out = furnitureById(it.id).size[1] / 2 + 0.55;
      return { x: it.x + fx * 0.05, z: it.z + fz * 0.05, ry: it.ry, stand: [it.x + fx * out,
        it.z + fz * out] };
    });
    saveDecor();
    markPlaced();
  }
  // Catalogue buttons show which pieces are already in the room.
  function markPlaced() {
    for (const b of $('decor-grid').children) b.classList.toggle('placed', !!decor?.items.some((i) => i.id === b.dataset.id));
  }
  function openHome(store, built) {
    if (!built.decorGroup) { built.decorGroup = new THREE.Group(); built.scene.add(built.decorGroup); }
    decor = { home: store.id, built, items: loadDecor(store.id), group: built.decorGroup, editing: false, piece: null, carry: null };
    rebuildDecor();
    $('decor-btn').hidden = false;
  }
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
    decor.items.push({ id, x, z, ry: Math.round(ry / (Math.PI / 4)) * (Math.PI / 4) });
    rebuildDecor();
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
    if (decor.carry && decor.carry !== it) putDown();
    decor.piece = it;
    decor.picked = picked; // chosen from the catalogue: stays open while you walk
    $('piece-move-label').textContent = t(decor.carry === it ? 'home.putDown' : 'home.carry');
    $('piece-name').textContent = furnitureById(it.id).emoji + ' ' + localName(furnitureById(it.id).name, getLanguage());
    $('piece-bar').hidden = false;
  }
  function closePiece() {
    if (decor?.carry) putDown();
    if (decor) { decor.piece = null; decor.picked = false; }
    $('piece-bar').hidden = true;
  }
  // Carry a piece: it floats in front of you until you put it down.
  function putDown() {
    decor.carry = null;
    $('decor-bar').hidden = !decor.editing;
    rebuildDecor();
    if (decor.piece) $('piece-move-label').textContent = t('home.carry');
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
  $('piece-rotate').onclick = () => { if (decor?.piece) { decor.piece.ry += Math.PI / 4; rebuildDecor(); } };
  $('piece-move').onclick = () => {
    if (!decor?.piece) return;
    if (decor.carry) { putDown(); closePiece(); game.action = STALE; return; }
    decor.carry = decor.piece;
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

  return { labelDecor, openHome, closeHome, get decor() { return decor; }, nearestPiece, putDown,
    closePiece, openPiece, updateCarry };
}
