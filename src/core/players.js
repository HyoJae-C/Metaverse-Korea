// Other players: spawns their characters, interpolates movement and shows
// name tags and emote bubbles.
import { parseRide } from './bike-garage.js';
import { t } from './i18n.js';
import * as THREE from 'three';
import { HELD_KINDS } from './held.js';
// Looping poses others can show (see Character.activity).
const ACTIVITIES = new Set(['dance', 'pushup', 'situp', 'fish', 'run', 'clap', 'lie', 'pullup', 'curl', 'snip', 'read']);
import { seatPosition } from './bikes.js';
import { createCharacter } from './character.js';
import { Companion } from './companion.js';
import { ITEMS, isPet } from './inventory.js';
import { styleNameTag } from './emblems.js';
import { sanitizeLook } from '../data/appearance.js';

export class RemotePlayers {
  constructor(scene, labelLayer) {
    this.scene = scene;
    this.layer = labelLayer;
    this.players = new Map();
  }

  join(peer) {
    if (this.players.has(peer.id)) return;
    const ch = createCharacter(peer.look); // sanitized inside
    this.scene.add(ch.root);
    const tag = document.createElement('div');
    tag.className = 'nametag';
    const name = String(peer.name || 'Traveler').slice(0, 16);
    styleNameTag(tag, name, sanitizeLook(peer.look));
    this.layer.appendChild(tag);
    this.players.set(peer.id, {
      ch, tag, bubble: null, name,
      target: null, ry: 0, s: 0,
    });
  }

  leave(id) {
    const p = this.players.get(id);
    if (!p) return;
    this.scene.remove(p.ch.root);
    p.pet?.dispose();
    p.tag.remove();
    p.bubble?.remove();
    this.players.delete(id);
  }

  setLook(id, look) {
    const p = this.players.get(id);
    if (!p) return;
    const old = p.ch.root;
    p.ch = createCharacter(look);
    styleNameTag(p.tag, p.name, sanitizeLook(look));
    p.bk = false; // re-applied on the next update
    p.hd = null;
    p.ch.root.position.copy(old.position);
    p.ch.root.rotation.copy(old.rotation);
    this.scene.remove(old);
    this.scene.add(p.ch.root);
  }

  // Positions for the map.
  list() {
    return [...this.players.values()].map((p) => ({ x: p.ch.root.position.x, z: p.ch.root.position.z, name: p.name }));
  }

  state(id, st) {
    const p = this.players.get(id);
    if (!p) return;
    if (!p.target) p.ch.root.position.set(st.x, 0, st.z);
    // Estimate their velocity from the last two updates, so we can draw them
    // where they are now rather than where they were when they sent it.
    const now = performance.now();
    p.vx = p.vz = 0;
    if (p.target && p.lastAt && st.s > 0.01) {
      const dt = (now - p.lastAt) / 1000;
      const vx = (st.x - p.target.x) / dt, vz = (st.z - p.target.z) / dt;
      if (dt > 0.03 && dt < 1 && Math.hypot(vx, vz) < 40) { p.vx = vx; p.vz = vz; } // not a teleport
    }
    p.lastAt = now;
    p.target = st;
  }

  // Is someone already sitting on the chair at (x, z)?
  seatTaken(x, z) {
    for (const p of this.players.values()) {
      if (p.target?.sit && Math.hypot(p.target.x - x, p.target.z - z) < 0.3) return true;
    }
    return false;
  }

  // Blocked people: no character, name tag or bubbles on this screen.
  hide(id) {
    const p = this.players.get(id);
    if (!p) return;
    p.hidden = true;
    p.ch.root.visible = false;
    p.pet?.dispose();
    p.pet = null;
    for (const el of [p.tag, p.bubble]) if (el) el.style.display = 'none';
  }
  nameOf(id) { return this.players.get(id)?.name ?? null; }
  // Where another player is right now (x, z), or null.
  // Where someone is, by their latest update (not where the smoothed
  // character has got to yet: after a jump that can lag by many metres).
  positionOf(id) {
    const p = this.players.get(id);
    return p ? (p.target || p.ch.root.position) : null;
  }

  chat(id, text, ms = 6000) {
    const p = this.players.get(id);
    if (!p || p.hidden) return null;
    showBubble(p, this.layer, text, ms, 'chat');
    return p.name;
  }

  // The closest visible player within r metres who is not riding: { id, name }.
  nearestFree(x, z, r) {
    let best = null, bd = r;
    for (const [id, p] of this.players) {
      if (p.hidden || p.target?.bk) continue;
      const d = Math.hypot(p.ch.root.position.x - x, p.ch.root.position.z - z);
      if (d < bd) { bd = d; best = { id, name: p.name }; }
    }
    return best;
  }

  kindOf(id) { return this.players.get(id)?.target?.bk || 0; }
  rootOf(id) { return this.players.get(id)?.ch.root ?? null; }
  // Where someone is right now, predicted from their last update and speed
  // (no smoothing delay): used to keep a passenger glued to the driver.
  predicted(id) {
    const p = this.players.get(id);
    if (!p?.target) return null;
    const ahead = Math.min(0.3, (performance.now() - (p.lastAt || 0)) / 1000);
    return { position: { x: p.target.x + (p.vx || 0) * ahead, z: p.target.z + (p.vz || 0) * ahead }, rotation: { y: p.ch.root.rotation.y } };
  }

  emote(id, anim, emoji) {
    const p = this.players.get(id);
    if (!p || p.hidden) return;
    if (anim) p.ch.play(anim);
    showBubble(p, this.layer, emoji);
  }

  // Their pet walking with them (pt: the pet's item id), seen by everyone.
  _pet(p) {
    const id = !p.hidden && isPet(p.target.pt) ? p.target.pt : null;
    if ((p.pet?.id || null) === id) return;
    p.pet?.dispose();
    p.pet = null;
    if (!id) return;
    p.pet = new Companion(id, ITEMS[id].pet);
    this.scene.add(p.pet.root);
    const r = p.ch.root;
    p.pet.place(r.position.x, r.position.z, r.rotation.y);
  }

  update(dt, camera, width, height) {
    const v = new THREE.Vector3();
    for (const p of this.players.values()) {
      const r = p.ch.root;
      if (p.target) {
        const k = 1 - Math.exp(-dt * 10);
        const ahead = Math.min(0.3, (performance.now() - (p.lastAt || 0)) / 1000) + 0.1; // + the smoothing delay
        r.position.x += (p.target.x + (p.vx || 0) * ahead - r.position.x) * k;
        r.position.z += (p.target.z + (p.vz || 0) * ahead - r.position.z) * k;
        r.position.y += ((Number.isFinite(p.target.y) ? Math.max(-4, Math.min(4, p.target.y)) : 0) - r.position.y) * k; // subway stairs
        let d = p.target.ry - r.rotation.y;
        d = Math.atan2(Math.sin(d), Math.cos(d));
        r.rotation.y += d * k;
        const inCar = p.target.bk === 3 && [4, 6].includes(this.players.get(p.target.on)?.target?.bk);
        const bv = p.target.bk === 1 ? String(p.target.bv || '').slice(0, 40) : '';
        if ((p.target.bk || 0) !== (p.bk || 0) || inCar !== !!p.inCar || bv !== (p.bv || '')) {
          p.bk = p.target.bk || 0; p.inCar = inCar; p.bv = bv;
          p.ch.setBike(p.bk, p.bk === 1 ? parseRide(bv) || undefined : undefined, inCar); // their ride and skin
        }
        if ((p.target.hd || null) !== (p.hd || null)) { p.hd = HELD_KINDS.includes(p.target.hd) ? p.target.hd : null; p.ch.setHeld(p.hd); }
        p.ch.setUmbrella(p.target.um === 1);
        p.ch.activity?.(ACTIVITIES.has(p.target.ac) ? p.target.ac : null); // gym, fishing, dancing
        if (p.target.ac === 'read' && !p.bubble) showBubble(p, this.layer, t('book.reading'), 3000); // 📖 reading…
        p.ch.animate(dt, p.target.sit ? 0 : p.target.s || 0, !!p.target.sit);
        this._pet(p);
      }
      // Riding with someone (tandem or car): sit in our seat of their vehicle.
      if (p.target?.bk === 3 && p.target.on) {
        const d = this.players.get(p.target.on);
        if (d) { [r.position.x, r.position.z] = seatPosition(d.ch.root, d.target?.bk, p.target.seat || 0); r.rotation.y = d.ch.root.rotation.y; }
      }
      if (p.pet) p.pet.update(dt, { x: r.position.x, z: r.position.z, ry: r.rotation.y }, !!p.target?.bk, false);
      if (p.hidden) continue;
      v.set(r.position.x, r.position.y + 1.55, r.position.z).project(camera);
      const visible = v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      const dist = camera.position.distanceTo(r.position);
      const show = visible && dist < 60;
      const sx = (v.x * 0.5 + 0.5) * width, sy = (-v.y * 0.5 + 0.5) * height;
      for (const el of [p.tag, p.bubble]) {
        if (!el) continue;
        el.style.display = show ? '' : 'none';
        el.style.transform = `translate(-50%, -100%) translate(${sx}px, ${sy - (el === p.bubble ? 24 : 0)}px)`;
      }
    }
  }
}

export function showBubble(p, layer, text, ms = 2500, kind = '') {
  p.bubble?.remove();
  const b = document.createElement('div');
  b.className = kind ? 'bubble ' + kind : 'bubble';
  b.textContent = text; // always text, never HTML
  layer.appendChild(b);
  p.bubble = b;
  setTimeout(() => {
    if (p.bubble === b) {
      b.remove();
      p.bubble = null;
    }
  }, ms);
}
